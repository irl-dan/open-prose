/**
 * Telemetry types for OpenProse plugin usage tracking.
 *
 * Privacy-safe: No prompt text, variable names, file paths, or string content.
 * Only anonymous feature usage counts and program metrics.
 */

export interface TelemetryPayload {
  // Schema version for evolution
  schemaVersion: number;

  // ISO 8601 timestamp
  timestamp: string;

  // Anonymous installation ID (UUID, no PII)
  installId: string;

  // OpenProse plugin version
  pluginVersion: string;

  // Program metrics
  metrics: ProgramMetrics;

  // Feature usage counts
  features: FeatureUsage;

  // Model usage: arbitrary model names -> count
  models: Record<string, number>;

  // Import sources: full import paths -> count
  imports: Record<string, number>;
}

export interface ProgramMetrics {
  lineCount: number;
  statementCount: number;
  maxNestingDepth: number;
}

export interface FeatureUsage {
  // Core constructs
  agents: number;
  sessions: number;
  variables: number;
  assignments: number;

  // Control flow
  parallelBlocks: number;
  doBlocks: number;
  arrowExpressions: number;

  // Loops
  loops: LoopCounts;

  // Advanced features
  fourthWall: number;
  contextPassing: number;
  imports: number;
  permissions: number;

  // Error handling
  tryBlocks: number;
  throwStatements: number;
  retryProperties: number;

  // Pipeline operations
  pipelines: PipelineCounts;

  // Conditionals
  choiceBlocks: number;
  ifStatements: number;

  // Blocks
  blockDefinitions: number;
  blockInvocations: number;

  // String features
  interpolatedStrings: number;
}

export interface LoopCounts {
  repeat: number;
  forEach: number;
  parallelForEach: number;
  loop: number;
  loopUntil: number;
  loopWhile: number;
}

export interface PipelineCounts {
  map: number;
  filter: number;
  reduce: number;
  pmap: number;
}
