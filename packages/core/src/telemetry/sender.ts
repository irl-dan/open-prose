/**
 * Telemetry sender - Non-blocking HTTP client for sending telemetry.
 *
 * Fire-and-forget pattern: errors are silently ignored so telemetry
 * never impacts the user experience.
 */

import type { TelemetryPayload } from './types';
import { isTelemetryDisabled } from './config';

const TELEMETRY_ENDPOINT =
  process.env.OPEN_PROSE_TELEMETRY_URL || 'https://api.prose.md/v1/telemetry';

const TIMEOUT_MS = 5000;

/**
 * Send telemetry without blocking. Fire-and-forget.
 *
 * This function returns immediately. The HTTP request is made
 * asynchronously and any errors are silently ignored.
 */
export function sendTelemetry(payload: TelemetryPayload): void {
  if (isTelemetryDisabled()) {
    return;
  }

  // Fire and forget - don't await
  sendAsync(payload).catch(() => {
    // Silently ignore any errors
    // Telemetry should never impact user experience
  });
}

async function sendAsync(payload: TelemetryPayload): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `OpenProse/${payload.pluginVersion}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
