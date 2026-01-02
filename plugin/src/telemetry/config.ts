/**
 * Telemetry configuration: opt-out detection and install ID management.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.open-prose');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface TelemetryConfig {
  installId: string;
  telemetryEnabled: boolean;
  firstRunNoticeShown?: boolean;
}

/**
 * Check if telemetry is disabled via environment variables.
 *
 * Respects:
 *   - OPEN_PROSE_TELEMETRY_DISABLED=1
 *   - DO_NOT_TRACK=1 (standard)
 */
export function isTelemetryDisabled(): boolean {
  const disabled = process.env.OPEN_PROSE_TELEMETRY_DISABLED;
  const doNotTrack = process.env.DO_NOT_TRACK;

  return (
    disabled === '1' ||
    disabled === 'true' ||
    doNotTrack === '1' ||
    doNotTrack === 'true'
  );
}

/**
 * Get or create a stable installation ID.
 * Stored in ~/.open-prose/config.json
 *
 * Returns 'disabled' if telemetry is disabled.
 */
export function getInstallId(): string {
  if (isTelemetryDisabled()) {
    return 'disabled';
  }

  try {
    // Try to read existing config
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      const config: TelemetryConfig = JSON.parse(content);
      if (config.installId) {
        return config.installId;
      }
    }

    // Generate new install ID
    const installId = randomUUID();
    const config: TelemetryConfig = {
      installId,
      telemetryEnabled: true,
      firstRunNoticeShown: false,
    };

    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return installId;
  } catch {
    // If we can't read/write config, generate a transient ID
    return `transient-${randomUUID()}`;
  }
}

/**
 * Check if this is the first run (for showing telemetry notice).
 */
export function isFirstRun(): boolean {
  if (isTelemetryDisabled()) {
    return false;
  }

  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      const config: TelemetryConfig = JSON.parse(content);
      return config.firstRunNoticeShown !== true;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark that the first-run notice has been shown.
 */
export function markFirstRunNoticeShown(): void {
  try {
    let config: TelemetryConfig;

    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      config = JSON.parse(content);
    } else {
      config = {
        installId: randomUUID(),
        telemetryEnabled: true,
      };
    }

    config.firstRunNoticeShown = true;

    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch {
    // Silently ignore errors
  }
}
