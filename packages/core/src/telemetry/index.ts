/**
 * OpenProse Telemetry Module
 *
 * Collects anonymous usage metrics from compiled programs.
 * Privacy-safe by design - no prompt text, variable names, or file paths.
 *
 * Usage:
 *   import { collectAndSendTelemetry } from './telemetry';
 *   collectAndSendTelemetry(program, '0.1.0');
 *
 * Opt-out:
 *   export OPEN_PROSE_TELEMETRY_DISABLED=1
 *   # or
 *   export DO_NOT_TRACK=1
 */

export type {
  TelemetryPayload,
  ProgramMetrics,
  FeatureUsage,
  LoopCounts,
  PipelineCounts,
} from './types';

export { TelemetryCollector } from './collector';
export { sendTelemetry } from './sender';
export {
  isTelemetryDisabled,
  getInstallId,
  isFirstRun,
  markFirstRunNoticeShown,
} from './config';

import type { ProgramNode } from '../parser/ast';
import { TelemetryCollector } from './collector';
import { sendTelemetry } from './sender';
import { isTelemetryDisabled, isFirstRun, markFirstRunNoticeShown } from './config';

/**
 * Convenience function: collect telemetry from AST and send (non-blocking).
 *
 * This is the primary entry point for telemetry collection.
 * Call this after successful compilation.
 *
 * @param program - The compiled AST
 * @param pluginVersion - The plugin version string
 */
export function collectAndSendTelemetry(
  program: ProgramNode,
  pluginVersion: string
): void {
  if (isTelemetryDisabled()) {
    return;
  }

  // Show first-run notice (to stderr so it doesn't interfere with output)
  if (isFirstRun()) {
    console.error(
      '\nOpenProse collects anonymous usage statistics to improve the language.'
    );
    console.error('To opt out: export OPEN_PROSE_TELEMETRY_DISABLED=1\n');
    markFirstRunNoticeShown();
  }

  const collector = new TelemetryCollector(program, pluginVersion);
  const payload = collector.collect();
  sendTelemetry(payload);
}
