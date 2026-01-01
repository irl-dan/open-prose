# OpenProse Skill Hosting Plan

This document outlines how to package and distribute OpenProse as a Claude Code skill/plugin.

---

## Open Questions (Need Alignment)

### Q1: Repository Role - Marketplace vs Plugin?

The repo `git@github.com:irl-dan/open-prose.git` can serve as:

**Option A: Plugin Only**

- Contains `.claude-plugin/plugin.json` with the skill
- Must be added to an existing marketplace to be discoverable
- Users install via `/plugin install open-prose@some-marketplace`

**Option B: Self-Hosted Marketplace + Plugin** (Recommended)

- Contains both `.claude-plugin/marketplace.json` AND the plugin
- Users add this repo as a marketplace directly
- Users install via:
  ```bash
  /plugin marketplace add irl-dan/open-prose
  /plugin install open-prose
  ```

**Recommendation:** Option B - it's simpler and doesn't require coordinating with external marketplaces.

<CEO timestamp="2025-01-01 05:48:00">Yes, we need Option B.</CEO>

---

### Q2: How Should Users Invoke OpenProse?

**Option A: Slash Command**

- User types `/run-prose program.prose`
- Triggers compile + orchestrator session

**Option B: Skill Auto-Activation**

- User mentions `.prose` files or says "run this prose program"
- Skill activates based on description triggers

**Option C: Both**

- Provide `/run-prose` command for explicit invocation
- Also allow skill-based activation for natural language

**Recommendation:** Option C - maximum flexibility.

<CEO timestamp="2025-01-01 05:48:00">Yes, we should support both.</CEO>

---

### Q3: Parser Distribution Strategy

The parser (lexer, compiler, validator) is written in TypeScript. How do we bundle it?

**Option A: NPM Package + CLI**

- Publish `open-prose` npm package
- Skill instructs Claude to run `npx open-prose compile program.prose`
- Requires Node.js on user's machine

**Option B: Bundled Executable**

- Use `pkg` or `bun compile` to create standalone binary
- Include in `scripts/` directory of skill
- No Node.js requirement

**Option C: In-Skill Parser Description**

- Parser logic described in SKILL.md
- Claude parses the DSL itself using the specification
- No external tools needed, but less reliable

**Recommendation:** Option A for MVP (simpler), Option B for polish.

<CEO timestamp="2025-01-01 05:50:00">We should actually start with Option B since it doesn't require an external dependency on node or us creating an npm repository.</CEO>

---

### Q4: Skill vs Agent?

The agentskills.io format supports both Skills and Agents. OpenProse could be:

**Option A: Skill Only**

- SKILL.md contains interpreter documentation
- Activated when user wants to run prose programs
- Uses subagent Task tool internally

**Option B: Skill + Orchestrator Agent**

- SKILL.md for the interpreter docs
- Separate agent definition (`.claude/agents/open-prose-orchestrator.md`)
- More explicit control over model (Opus 4.5)

**Recommendation:** Option A for now - Claude Code's Task tool already handles model selection.

<CEO timestamp="2025-01-01 05:51:00">This actually begs a question. Could we write an agent that is a better Orchestrator agent than the default claude code agent? If that's possbible, is it possible to boot with that agent in interactive mode (ie in place of the default Claude Code agent)? If so, this may be a useful construct. Let's research this later and punt on it for now. I'd love to make this work "out of the box" for the default Claude Code agent, and perhaps this can be an upgrade path later for power users.</CEO>

---

### Q5: What Goes in the Skill?

The SKILL.md needs to include:

1. **Frontmatter** - name, description, triggers
2. **Interpreter Documentation** - how to execute each language construct
3. **Examples** - sample programs
4. **Compile Instructions** - how to validate/expand syntax

**Questions:**

- Should we include the full `interpreter/README.md` content?
- Should we include the specification files for reference?
- How much of the syntax should be documented inline?

---

<CEO timestamp="2025-01-01 06:07:00">I think the "interpreter" should go in a file next to SKILL.md called `prose.md`. This file needs to contain the absolute full documentation of the DSL, introducing the concept, including all syntax, examples, and other relevant information for how to interpret and execute a program. Then, the SKILL.md aside from the frontmatter, should introduce the concept, should add instructions for how and when to reach for the prose.md file and give example commands for how to grep the prose.md file for specific syntax or concepts. It would be sort of nice to auto-generate the syntax documentation from the AST, but I'm not sure that's possible, so you may need to manually write it for now, using what you can see about what has been implemented so far.</CEO>

## Proposed Directory Structure

Based on the agentskills.io specification and HOW_TO_HOST_PLUGIN.md:

```
open-prose/
├── .claude-plugin/
│   ├── marketplace.json      # Makes this repo a marketplace
│   └── plugin.json           # Plugin manifest
├── skills/
│   └── open-prose/
│       ├── SKILL.md          # Main skill file (references prose.md)
│       ├── prose.md          # Full DSL documentation
│       ├── scripts/          # Bundled executable
│       │   └── compile       # Standalone binary (no Node.js required)
│       └── references/       # Optional: loaded on-demand
│           ├── syntax.md
│           └── examples.md
├── commands/                  # Slash commands
│   └── run-prose.md          # /run-prose command
├── src/                       # Existing parser source
├── specification/             # Existing language specs
└── ... (existing files)
```

---

## Implementation Plan

### Phase 1: Minimum Viable Skill

1. **Create `.claude-plugin/marketplace.json`**

   - Register this repo as a marketplace
   - List the open-prose plugin

2. **Create `.claude-plugin/plugin.json`**

   - Plugin metadata (name, version, author)

3. **Create `skills/open-prose/prose.md`**

   - Full DSL documentation including:
     - Introduction to OpenProse concept
     - All syntax documentation for implemented features:
       - Comments (Tier 0.2)
       - Single-line strings (Tier 0.3)
       - Simple session (Tier 1.1)
     - How to interpret and execute programs
     - Examples
   - This should be comprehensive reference documentation

4. **Create `skills/open-prose/SKILL.md`**

   - Frontmatter with name and description (triggers for activation)
   - Introduction to OpenProse concept
   - Instructions for when and how to use `prose.md`
   - Example commands for grepping `prose.md` for specific syntax or concepts
   - Brief overview of how to spawn subagent sessions

5. **Create `commands/run-prose.md`**

   - Slash command for explicit program execution
   - Instructions for using `/run-prose program.prose`

6. **Bundle parser as standalone executable**

   - Use `pkg` or `bun compile` to create standalone binary
   - Include in `skills/open-prose/scripts/compile`
   - No Node.js requirement for users

### Phase 2: Polish

1. Add references directory with full spec docs
2. Create more sophisticated examples
3. Add validation/linting capabilities
4. Enhance prose.md with additional features as they're implemented

---

## SKILL.md Draft Outline

```markdown
---
name: open-prose
description: |
  Use when user asks to run, execute, or interpret .prose files.
  Use when user mentions OpenProse or prose programs.
  Use when orchestrating multi-agent sessions from a script.
---

# OpenProse Interpreter

OpenProse is a domain-specific language for orchestrating AI agent sessions.

## Overview

When a user wants to run a `.prose` file or program:

1. **Parse**: Read the program and identify statements
2. **Validate**: Check for syntax errors (optionally use bundled compiler)
3. **Execute**: For each statement, spawn appropriate subagent sessions using Claude Code's Task tool

## Using the Documentation

The complete DSL documentation is in `prose.md` in this same directory. When you need to:

- Look up specific syntax: `grep -i "session" prose.md` or search for the construct
- Understand how to execute a feature: Read the relevant section in `prose.md`
- Find examples: Check the examples section in `prose.md`

## Quick Reference

For a quick start, here are the currently implemented features:

- **Comments**: `# comment` (standalone or inline)
- **Strings**: `"string"` with escape sequences
- **Sessions**: `session "prompt"` spawns a subagent

For complete details, syntax, validation rules, and examples, refer to `prose.md`.

## Execution Model

OpenProse programs execute sequentially. Each `session` statement spawns a subagent session that completes before the next statement runs. Use Claude Code's Task tool to spawn these sessions.
```

## prose.md Draft Outline

The `prose.md` file should contain comprehensive documentation based on `src/interpreter/README.md` and the specification files. It should include:

- Full introduction to OpenProse
- Complete syntax reference for all implemented features
- Execution semantics
- Validation rules
- Examples
- Compilation details (if using bundled compiler)

---

## Alignment Confirmed

Based on CEO decisions:

1. **Q1**: ✅ Marketplace + Plugin (Option B) - Confirmed
2. **Q2**: ✅ Slash command + skill activation (Option C) - Confirmed
3. **Q3**: ✅ Bundled executable (Option B) - Confirmed (moved to Phase 1)
4. **Q4**: ✅ Skill only for now (Option A) - Confirmed (custom orchestrator agent research deferred)
5. **Q5**: ✅ Separate `prose.md` file with full DSL docs, `SKILL.md` references it - Confirmed

## Remaining Questions

- Any naming preferences? (`open-prose` vs `openprose` vs `prose`) <CEO timestamp="2025-01-01 06:10:00">I like `prose`.</CEO>
- Should the skill be immediately usable, or wait until more features are built? <CEO timestamp="2025-01-01 06:10:00">The skill should be immediately usable. We should be building out the skill such that we can use it end to end even with very limited language features.</CEO>
- Are there any additional discovery channels to target (skillsmp.com, claude-plugins.dev)? <CEO timestamp="2025-01-01 06:10:00">No, I will tweet about it and that's it for now.</CEO>

---

## Implementation Complete

**Date**: 2025-01-01

All Phase 1 items have been implemented:

### Created Files

| File                                | Description                                     |
| ----------------------------------- | ----------------------------------------------- |
| `.claude-plugin/marketplace.json`   | Registers repo as marketplace                   |
| `.claude-plugin/plugin.json`        | Plugin metadata                                 |
| `skills/open-prose/SKILL.md`        | Main skill file with overview and grep examples |
| `skills/open-prose/prose.md`        | Complete DSL reference documentation            |
| `skills/open-prose/scripts/compile` | Bundled executable (macOS arm64)                |
| `commands/run-prose.md`             | `/run-prose` slash command                      |
| `bin/open-prose.ts`                 | CLI source code                                 |

### Bundled Executable

The compiler is bundled using `bun build --compile`:

```bash
# Rebuild after changes
bun build bin/open-prose.ts --compile --outfile skills/open-prose/scripts/compile
```

**Note**: Current build is macOS arm64 only. For cross-platform builds, would need:

- Linux x64: `bun build --compile --target=bun-linux-x64`
- Windows x64: `bun build --compile --target=bun-windows-x64`

### Installation Instructions

Users can install with:

```bash
# Add marketplace
/plugin marketplace add irl-dan/open-prose

# Install plugin
/plugin install open-prose
```

### Usage

After installation:

```bash
# Via slash command
/run-prose path/to/program.prose

# Via natural language
"Run the prose program in examples/research.prose"
```

### Next Steps (Phase 2)

1. Resolve binary distribution strategy (see below)
2. Submit to external discovery channels (skillsmp.com, claude-plugins.dev)
3. Add more examples to the skill
4. Update documentation as more language features are implemented

---

## Binary Distribution: Troubles & Options

### The Problem

The compiled Bun binary is 57MB. When attempting to commit:

- `git add` kept timing out/getting interrupted
- Even with extended timeouts, the large binary caused issues
- Standard git isn't designed for large binaries

**Current workaround**: Binary added to `.gitignore`, users must build locally.

### Option A: GitHub Releases + CI

Standard approach for distributing compiled binaries:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ["v*"]

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: bun-darwin-arm64
            artifact: compile-darwin-arm64
          - os: macos-latest
            target: bun-darwin-x64
            artifact: compile-darwin-x64
          - os: ubuntu-latest
            target: bun-linux-x64
            artifact: compile-linux-x64
          - os: windows-latest
            target: bun-windows-x64
            artifact: compile-windows-x64.exe

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - run: bun install
      - run: bun build bin/open-prose.ts --compile --target=${{ matrix.target }} --outfile=${{ matrix.artifact }}

      - uses: softprops/action-gh-release@v1
        with:
          files: ${{ matrix.artifact }}
```

**Pros**: Cross-platform, professional, standard pattern
**Cons**: Skill needs to download binary on first use, adds network dependency

### Option B: Source Distribution (Bun runs TypeScript directly)

```bash
# Users just need bun installed, then:
bun run bin/open-prose.ts compile program.prose
```

**Pros**: No compilation step, works cross-platform, simpler maintenance
**Cons**: Requires Bun installed, less portable

### Option C: Hybrid

- Provide source for Bun users
- Provide GitHub Releases download script for others
- Document both options in SKILL.md

### Open Questions

1. **When a plugin is installed, what gets cloned?**

   - Full repo including `bin/`, `src/`?
   - Or just `skills/`, `commands/`, `.claude-plugin/`?
   - This determines if source distribution is viable.

2. **Where is the plugin installed?**

   - What's the path structure?
   - Can Claude construct the path to `bin/open-prose.ts` from skill context?
   - Example: Is it `~/.claude/plugins/open-prose/bin/open-prose.ts`?

3. **Is Bun available to Claude Code users?**

   - Claude Code requires Node.js
   - Bun is increasingly common but not guaranteed
   - Could fall back to `npx ts-node` but adds dependency

4. **Does `bun run` work without `bun install`?**

   - Our project has zero runtime dependencies (only devDependencies)
   - Bun should run TS directly without install
   - Need to verify this assumption

5. **For GitHub Releases approach:**
   - Where would the downloaded binary be stored?
   - How does the skill trigger the download on first use?
   - Network access assumptions?

### Recommendation

**Lean toward Option B (source distribution)** for simplicity, but need to answer:

- Does the full repo get cloned on plugin install?
- What's the reliable path to reference source files?

If those answers are favorable, update SKILL.md to use:

```bash
bun run <plugin-path>/bin/open-prose.ts compile program.prose
```

If not, implement Option A with a first-use download script.

---

## Option B Deep Dive: Source Distribution

<CEO timestamp="2025-01-01 06:35:00">
I want to explore how Option B would work. Explore what files we'd need to ship alongside the plugin. And explore what directory structure would make that possible.

For example, we'd want to not install all the tests, examples, etc... if avoidable, but if that makes it easier in the meantime, it's not that big of a deal. If we need to ship the entire repository as the skill to preserve a sane state, that's acceptable for now. However, we won't want to ship the webapp, and that's making me wonder if all of this should be one step deeper.
</CEO>

### Current Repository Structure

```
open-prose/
├── .claude-plugin/           # Plugin metadata - NEEDED
├── bin/                      # CLI source - NEEDED for bun run
├── commands/                 # Slash commands - NEEDED
├── dist/                     # Compiled JS - gitignored, not shipped
├── examples/                 # Example .prose files - nice to have
├── guidance/                 # Design interviews - NOT needed
├── infra/                    # Terraform for landing page - NOT needed
├── landing/                  # Next.js webapp - NOT needed (problematic)
├── node_modules/             # gitignored, not shipped
├── skills/                   # Skills - NEEDED
├── specification/            # Language spec - useful as reference
├── src/                      # TypeScript source - NEEDED for bun run
├── test-harness/             # LLM-as-judge tests - NOT needed
├── package.json              # NEEDED for bun
├── tsconfig.json             # NEEDED for TypeScript
└── various .md files
```

### What's Required for Source Distribution

For `bun run bin/open-prose.ts` to work, we need:

| Directory/File | Required | Reason |
|----------------|----------|--------|
| `src/` | Yes | TypeScript source imported by CLI |
| `bin/open-prose.ts` | Yes | CLI entry point |
| `skills/` | Yes | SKILL.md and prose.md |
| `commands/` | Yes | Slash commands |
| `.claude-plugin/` | Yes | Plugin/marketplace metadata |
| `package.json` | Yes | Bun needs this for module resolution |
| `tsconfig.json` | Yes | TypeScript configuration |
| `specification/` | Optional | Useful reference for Claude |
| `examples/` | Optional | Nice for users to see |

### What Should NOT Be Shipped

| Directory | Size | Reason to Exclude |
|-----------|------|-------------------|
| `landing/` | ~230MB (with node_modules) | Separate webapp, unrelated to skill |
| `infra/` | Small | Terraform config, not relevant |
| `test-harness/` | Medium | Testing infrastructure |
| `guidance/` | Small | Internal design docs |
| `dist/` | N/A | Already gitignored |

### The Problem: `landing/` Directory

The `landing/` directory is a Next.js app with its own `node_modules/`. Even though `landing/node_modules/` is gitignored, the source files and config are still there. This bloats the plugin unnecessarily and could confuse the skill context.

### Structural Options

#### Option B1: Nested Plugin Directory

Move all plugin-related files into a `plugin/` subdirectory:

```
open-prose/
├── plugin/                        # THIS is the plugin
│   ├── .claude-plugin/
│   │   ├── marketplace.json
│   │   └── plugin.json
│   ├── bin/
│   │   └── open-prose.ts
│   ├── commands/
│   │   └── run-prose.md
│   ├── skills/
│   │   └── open-prose/
│   │       ├── SKILL.md
│   │       └── prose.md
│   ├── src/                       # Full parser source
│   │   ├── parser/
│   │   ├── compiler/
│   │   ├── validator/
│   │   └── ...
│   ├── package.json
│   └── tsconfig.json
├── landing/                       # Webapp - NOT part of plugin
├── infra/                         # Terraform - NOT part of plugin
├── test-harness/                  # Tests - NOT part of plugin
├── specification/                 # Could symlink or copy relevant parts
└── guidance/                      # Design docs - NOT part of plugin
```

Then `marketplace.json` would reference:
```json
{
  "plugins": [{
    "name": "open-prose",
    "source": "./",  // Relative to plugin/ directory
    ...
  }]
}
```

And users would add the marketplace as:
```
/plugin marketplace add irl-dan/open-prose/plugin
```

**Pros:**
- Clean separation between plugin and other repo contents
- Only ships what's needed
- Clear boundary

**Cons:**
- Requires restructuring the repo
- Duplicates or moves src/ away from tests
- More complex development workflow (changes in plugin/src/ vs root)

#### Option B2: Accept the Bloat (Temporary)

Ship the entire repo as the plugin. The extra directories are small (except landing/).

```
open-prose/                        # THIS is the plugin
├── .claude-plugin/
├── bin/
├── commands/
├── skills/
├── src/
├── landing/                       # Included but ignored
├── infra/                         # Included but ignored
├── ...
```

**Pros:**
- No restructuring needed
- Simple to maintain
- Can improve later

**Cons:**
- Ships unnecessary files
- `landing/` source files included (though node_modules gitignored)
- Less professional

#### Option B3: Separate Repository

Create a new repo `irl-dan/prose-skill` that contains only the plugin:

```
prose-skill/                       # Dedicated plugin repo
├── .claude-plugin/
├── bin/
├── commands/
├── skills/
├── src/
├── package.json
└── tsconfig.json
```

The main `open-prose` repo would be for development, and releases would be published to the skill repo.

**Pros:**
- Cleanest separation
- Plugin repo stays lean
- Clear versioning

**Cons:**
- Two repos to maintain
- Sync complexity
- More release overhead

### Analysis: Recommended Approach

**Short-term (now):** Option B2 - Accept the bloat. The `landing/` source is small without node_modules, and we can ship the whole repo. This gets us to a working state quickly.

**Medium-term:** Option B1 - Nested plugin directory. Once we validate the plugin works, restructure to `plugin/` subdirectory. This keeps everything in one repo but cleanly separates concerns.

**If B1 proves awkward:** Option B3 - Separate repo. But this adds maintenance burden, so only if needed.

---

## Restructure Complete: Option B1 Implemented

**Date**: 2025-01-01

The repository has been restructured to use a nested `plugin/` directory:

### New Directory Structure

```
open-prose/
├── plugin/                        # THE PLUGIN (install from here)
│   ├── .claude-plugin/
│   │   ├── marketplace.json
│   │   └── plugin.json
│   ├── bin/
│   │   └── open-prose.ts          # CLI entry point
│   ├── commands/
│   │   └── run-prose.md           # /run-prose slash command
│   ├── examples/                  # Example .prose files
│   ├── skills/
│   │   └── open-prose/
│   │       ├── SKILL.md
│   │       └── prose.md
│   ├── src/                       # Parser/compiler/validator source
│   ├── package.json               # Plugin package (minimal)
│   └── tsconfig.json              # Plugin TypeScript config
├── landing/                       # Webapp (NOT part of plugin)
├── infra/                         # Terraform (NOT part of plugin)
├── test-harness/                  # E2E tests (NOT part of plugin)
├── specification/                 # Language spec (development reference)
├── guidance/                      # Design docs (development reference)
├── package.json                   # Dev workspace package
├── tsconfig.json                  # Dev TypeScript config
└── jest.config.js                 # Test configuration
```

### Installation Instructions

Users install the plugin from the `plugin/` subdirectory:

```bash
/plugin marketplace add irl-dan/open-prose/plugin
/plugin install open-prose
```

### Running the CLI

From within the plugin directory:

```bash
cd plugin
bun run bin/open-prose.ts compile program.prose
bun run bin/open-prose.ts validate program.prose
```

### Development Workflow

From the repo root:

```bash
npm test          # Run all tests
npm run build     # Build TypeScript
npm run lint      # Type check
```

### Bun Type Export Fix

During restructuring, we discovered a Bun bug with re-exported types. Fixed by using `export type` for interface/type-only exports in barrel files:

```typescript
// Before (broken in Bun)
export { TryBlockNode } from './ast';

// After (works in Bun)
export type { TryBlockNode } from './ast';
```

Applied to all barrel exports in:
- `plugin/src/parser/index.ts`
- `plugin/src/validator/index.ts`
- `plugin/src/compiler/index.ts`
- `plugin/src/lsp/index.ts`
- `plugin/src/index.ts`

### Path Resolution Question

For `bun run bin/open-prose.ts` to work when the skill is installed, we need to know:

1. Where does Claude Code install plugins?
2. Can the skill reference files relative to its own location?
3. Does Bun need to be in the plugin directory, or can it run from anywhere?

Example: If plugin is installed to `~/.claude/plugins/open-prose/`:
```bash
cd ~/.claude/plugins/open-prose && bun run bin/open-prose.ts compile /path/to/program.prose
```

Or with explicit path:
```bash
bun run ~/.claude/plugins/open-prose/bin/open-prose.ts compile program.prose
```

This needs testing to confirm.
