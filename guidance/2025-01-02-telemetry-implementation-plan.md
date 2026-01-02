# Telemetry Implementation Plan

**Date:** 2025-01-02
**Status:** API deployed, plugin collector not yet implemented

## Overview

This plan describes how to add anonymous telemetry to the OpenProse plugin to understand feature adoption and usage patterns.

## Current State

### API (Complete)

The telemetry backend is deployed and operational:

- **Production URL:** https://api.prose.md
- **Endpoints:**
  - `POST /v1/telemetry` — Ingest telemetry events
  - `GET /v1/stats` — Aggregated statistics
  - `GET /health` — Health check
- **Database:** SQLite on Fly.io persistent volume
- **Source:** `api/` directory

### Plugin Collector (Not Yet Implemented)

The plugin needs a telemetry module that:
1. Walks the compiled AST to extract feature counts
2. Sends data to the API (non-blocking, fire-and-forget)
3. Respects opt-out preferences

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Plugin (Compile Time)                     │
│                                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────────────┐  │
│  │  Parser  │───▶│ Validator │───▶│       Compiler           │  │
│  └──────────┘    └───────────┘    └───────────┬──────────────┘  │
│                                               │                  │
│                                               ▼                  │
│                                   ┌──────────────────────────┐  │
│                                   │   TelemetryCollector     │  │
│                                   │   (NEW: src/telemetry/)  │  │
│                                   └───────────┬──────────────┘  │
│                                               │                  │
└───────────────────────────────────────────────┼──────────────────┘
                                                │ async, non-blocking
                                                ▼
                                   ┌──────────────────────────┐
                                   │   api.prose.md           │
                                   │   POST /v1/telemetry     │
                                   └──────────────────────────┘
```

**Key principle:** The telemetry module is self-contained in `plugin/src/telemetry/`. It receives the finished AST and extracts metrics without modifying parser/validator/compiler code.

---

## Telemetry Data Schema

```typescript
interface TelemetryPayload {
  // Schema version for evolution
  schemaVersion: number;

  // ISO 8601 timestamp
  timestamp: string;

  // Anonymous installation ID (UUID, no PII)
  installId: string;

  // OpenProse plugin version
  pluginVersion: string;

  // Program metrics
  metrics: {
    lineCount: number;
    statementCount: number;
    maxNestingDepth: number;
  };

  // Feature usage counts
  features: {
    agents: number;
    sessions: number;
    variables: number;
    assignments: number;
    parallelBlocks: number;
    doBlocks: number;
    arrowExpressions: number;
    loops: {
      repeat: number;
      forEach: number;
      parallelForEach: number;
      loop: number;
      loopUntil: number;
      loopWhile: number;
    };
    fourthWall: number;        // **...** discretion nodes
    contextPassing: number;
    imports: number;
    permissions: number;
    tryBlocks: number;
    throwStatements: number;
    retryProperties: number;
    pipelines: {
      map: number;
      filter: number;
      reduce: number;
      pmap: number;
    };
    choiceBlocks: number;
    ifStatements: number;
    blockDefinitions: number;
    blockInvocations: number;
    interpolatedStrings: number;
  };

  // Model usage: arbitrary model names -> count
  models: Record<string, number>;

  // Import sources: full import paths -> count
  imports: Record<string, number>;
}
```

### Privacy Guarantees

| Data Type | Collected? | Notes |
|-----------|------------|-------|
| Prompt text | NO | Never collected |
| Variable names | NO | Only counts |
| Agent names | NO | Only counts |
| File paths | NO | Only line count |
| String literals | NO | Only counts |
| Model names | YES | e.g., "sonnet", "opus" |
| Import paths | YES | Declared dependencies, not user content |
| Feature counts | YES | Anonymous aggregates |
| Install ID | YES | UUID, no PII correlation |

---

## Plugin Implementation Plan

### File Structure

```
plugin/src/telemetry/
├── index.ts          # Public exports, convenience function
├── types.ts          # TelemetryPayload and related types
├── collector.ts      # TelemetryCollector class (AST visitor)
├── sender.ts         # Non-blocking HTTP sender
└── config.ts         # Opt-out detection, install ID management
```

### 1. types.ts

Copy types from `api/src/telemetry-types.ts` (they should match exactly).

### 2. config.ts

```typescript
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const CONFIG_DIR = join(process.env.HOME || '~', '.open-prose');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface TelemetryConfig {
  installId: string;
  telemetryEnabled: boolean;
}

/**
 * Check if telemetry is disabled via environment variables
 */
export function isTelemetryDisabled(): boolean {
  return (
    process.env.OPEN_PROSE_TELEMETRY_DISABLED === '1' ||
    process.env.OPEN_PROSE_TELEMETRY_DISABLED === 'true' ||
    process.env.DO_NOT_TRACK === '1' ||
    process.env.DO_NOT_TRACK === 'true'
  );
}

/**
 * Get or create a stable installation ID
 * Stored in ~/.open-prose/config.json
 */
export function getInstallId(): string {
  if (isTelemetryDisabled()) {
    return 'disabled';
  }

  try {
    if (existsSync(CONFIG_FILE)) {
      const config: TelemetryConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      if (config.installId) {
        return config.installId;
      }
    }

    // Generate new install ID
    const installId = randomUUID();
    const config: TelemetryConfig = { installId, telemetryEnabled: true };

    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return installId;
  } catch {
    return `transient-${randomUUID()}`;
  }
}
```

### 3. collector.ts

The collector performs a single-pass recursive traversal of the AST. It does NOT modify the existing `ASTVisitor` interface—it implements its own focused traversal.

```typescript
import { ProgramNode, StatementNode } from '../parser';
import { TelemetryPayload, FeatureUsage } from './types';
import { getInstallId } from './config';

export class TelemetryCollector {
  private features: FeatureUsage;
  private models: Record<string, number> = {};
  private imports: Record<string, number> = {};
  private maxDepth = 0;
  private currentDepth = 0;

  constructor(private program: ProgramNode, private pluginVersion: string) {
    this.features = this.createEmptyFeatures();
  }

  public collect(): TelemetryPayload {
    for (const statement of this.program.statements) {
      this.visitStatement(statement);
    }

    return {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      installId: getInstallId(),
      pluginVersion: this.pluginVersion,
      metrics: {
        lineCount: this.calculateLineCount(),
        statementCount: this.program.statements.length,
        maxNestingDepth: this.maxDepth,
      },
      features: this.features,
      models: this.models,
      imports: this.imports,
    };
  }

  private visitStatement(stmt: StatementNode): void {
    // Switch on stmt.type and increment appropriate counters
    // Track model usage from agent/session properties
    // Track import paths from import statements
    // Recursively visit nested blocks, tracking depth
  }

  // ... helper methods
}
```

**Key insight:** The collector reads the AST node types that already exist. Reference `plugin/src/parser/ast.ts` for all node type definitions and `plugin/src/validator/validator.ts` for the pattern of traversing all statement types.

### 4. sender.ts

```typescript
import { TelemetryPayload } from './types';
import { isTelemetryDisabled } from './config';

const TELEMETRY_ENDPOINT = 'https://api.prose.md/v1/telemetry';

/**
 * Send telemetry without blocking. Fire-and-forget.
 */
export function sendTelemetry(payload: TelemetryPayload): void {
  if (isTelemetryDisabled()) return;

  // Fire and forget - don't await
  sendAsync(payload).catch(() => {
    // Silently ignore errors - telemetry should never impact UX
  });
}

async function sendAsync(payload: TelemetryPayload): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
```

### 5. index.ts

```typescript
export { TelemetryPayload } from './types';
export { TelemetryCollector } from './collector';
export { sendTelemetry } from './sender';
export { isTelemetryDisabled } from './config';

import { ProgramNode } from '../parser';
import { TelemetryCollector } from './collector';
import { sendTelemetry } from './sender';
import { isTelemetryDisabled } from './config';

const VERSION = '1.0.0'; // TODO: read from package.json

/**
 * Convenience: collect and send telemetry in one call
 */
export function collectAndSendTelemetry(program: ProgramNode): void {
  if (isTelemetryDisabled()) return;

  const collector = new TelemetryCollector(program, VERSION);
  const payload = collector.collect();
  sendTelemetry(payload);
}
```

---

## CLI Integration

The integration point is minimal—one line in `plugin/bin/open-prose.ts` after successful compilation:

```typescript
import { collectAndSendTelemetry } from '../src/telemetry';

function compileFile(filePath: string): void {
  // ... existing parse/validate/compile code ...

  const compileResult = compile(parseResult.program);
  console.log(compileResult.code);

  // NEW: Collect and send telemetry (non-blocking)
  collectAndSendTelemetry(parseResult.program);
}
```

---

## Opt-Out Mechanism

Users can disable telemetry via environment variables:

```bash
# Either of these works
export OPEN_PROSE_TELEMETRY_DISABLED=1
export DO_NOT_TRACK=1
```

The first compile will also print a one-time notice (TODO: implement):

```
OpenProse collects anonymous usage statistics to improve the language.
To opt out: export OPEN_PROSE_TELEMETRY_DISABLED=1
```

---

## Testing Strategy

```typescript
// plugin/src/__tests__/telemetry.test.ts

describe('TelemetryCollector', () => {
  it('counts basic features correctly', () => {
    const source = `
      agent researcher:
        model: sonnet

      session: researcher
        prompt: "Research topic"
        context: data
    `;

    const { program } = parse(source);
    const collector = new TelemetryCollector(program, '1.0.0');
    const payload = collector.collect();

    expect(payload.features.agents).toBe(1);
    expect(payload.features.sessions).toBe(1);
    expect(payload.features.contextPassing).toBe(1);
    expect(payload.models['sonnet']).toBe(1);
  });

  it('respects opt-out environment variable', () => {
    process.env.OPEN_PROSE_TELEMETRY_DISABLED = '1';
    expect(isTelemetryDisabled()).toBe(true);
    delete process.env.OPEN_PROSE_TELEMETRY_DISABLED;
  });
});
```

---

## Implementation Sequence

1. Create `plugin/src/telemetry/` directory
2. Implement `types.ts` (copy from API)
3. Implement `config.ts` (opt-out, install ID)
4. Implement `collector.ts` (AST visitor)
5. Implement `sender.ts` (HTTP client)
6. Implement `index.ts` (exports)
7. Add one line to `bin/open-prose.ts`
8. Add tests
9. Update plugin README with telemetry disclosure

---

## References

- **API source:** `api/src/`
- **API types:** `api/src/telemetry-types.ts`
- **AST definitions:** `plugin/src/parser/ast.ts`
- **Validator pattern:** `plugin/src/validator/validator.ts` (shows how to traverse all statement types)
