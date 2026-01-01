/**
 * log-collector.ts - Collects execution logs from Claude Code
 *
 * This module handles:
 * - Finding session logs from ~/.claude/ directory
 * - Parsing JSONL format log files
 * - Extracting relevant execution events
 * - Correlating logs with specific test runs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface LogEntry {
  timestamp: string;
  type: string;
  content: unknown;
  raw: string;
}

export interface ExecutionLog {
  sessionId: string | null;
  entries: LogEntry[];
  toolCalls: ToolCallEntry[];
  agentSpawns: AgentSpawnEntry[];
  responses: ResponseEntry[];
  errors: ErrorEntry[];
  startTime: Date | null;
  endTime: Date | null;
}

export interface ToolCallEntry {
  timestamp: string;
  tool: string;
  input: unknown;
  output: unknown;
}

export interface AgentSpawnEntry {
  timestamp: string;
  agentType: string;
  taskDescription: string;
}

export interface ResponseEntry {
  timestamp: string;
  role: string;
  content: string;
}

export interface ErrorEntry {
  timestamp: string;
  message: string;
  details: unknown;
}

export interface CollectorOptions {
  claudeDir?: string;
  maxAge?: number;  // milliseconds - only consider logs newer than this
  sessionId?: string | null;
}

const DEFAULT_CLAUDE_DIR = path.join(os.homedir(), '.claude');
const DEFAULT_MAX_AGE = 300000; // 5 minutes

/**
 * Gets the path to the Claude configuration directory
 */
export function getClaudeDir(options: CollectorOptions = {}): string {
  return options.claudeDir ?? DEFAULT_CLAUDE_DIR;
}

/**
 * Finds the most recent session log files
 */
export function findRecentLogFiles(options: CollectorOptions = {}): string[] {
  const claudeDir = getClaudeDir(options);
  const maxAge = options.maxAge ?? DEFAULT_MAX_AGE;
  const now = Date.now();
  const logFiles: Array<{ path: string; mtime: number }> = [];

  // Check various possible log locations
  const possiblePaths = [
    path.join(claudeDir, 'projects'),
    path.join(claudeDir, 'logs'),
    claudeDir,
  ];

  for (const basePath of possiblePaths) {
    if (!fs.existsSync(basePath)) {
      continue;
    }

    try {
      // Look for .jsonl files recursively (up to 2 levels deep)
      const searchPaths = [basePath];

      // Add subdirectories
      if (fs.statSync(basePath).isDirectory()) {
        const entries = fs.readdirSync(basePath);
        for (const entry of entries) {
          const entryPath = path.join(basePath, entry);
          try {
            if (fs.statSync(entryPath).isDirectory()) {
              searchPaths.push(entryPath);

              // One more level
              const subEntries = fs.readdirSync(entryPath);
              for (const subEntry of subEntries) {
                const subEntryPath = path.join(entryPath, subEntry);
                try {
                  if (fs.statSync(subEntryPath).isDirectory()) {
                    searchPaths.push(subEntryPath);
                  }
                } catch {
                  // Skip inaccessible directories
                }
              }
            }
          } catch {
            // Skip inaccessible directories
          }
        }
      }

      // Find .jsonl files in all search paths
      for (const searchPath of searchPaths) {
        try {
          const files = fs.readdirSync(searchPath);
          for (const file of files) {
            if (file.endsWith('.jsonl')) {
              const filePath = path.join(searchPath, file);
              try {
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs <= maxAge) {
                  logFiles.push({ path: filePath, mtime: stat.mtimeMs });
                }
              } catch {
                // Skip inaccessible files
              }
            }
          }
        } catch {
          // Skip inaccessible directories
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  // Also check for history.jsonl specifically
  const historyPath = path.join(claudeDir, 'history.jsonl');
  if (fs.existsSync(historyPath)) {
    try {
      const stat = fs.statSync(historyPath);
      if (now - stat.mtimeMs <= maxAge) {
        logFiles.push({ path: historyPath, mtime: stat.mtimeMs });
      }
    } catch {
      // Skip if inaccessible
    }
  }

  // Sort by modification time (newest first) and return paths
  return logFiles
    .sort((a, b) => b.mtime - a.mtime)
    .map(f => f.path);
}

/**
 * Parses a single line of JSONL
 */
function parseJsonlLine(line: string): LogEntry | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return {
      timestamp: parsed.timestamp || parsed.ts || new Date().toISOString(),
      type: parsed.type || parsed.event || 'unknown',
      content: parsed,
      raw: trimmed,
    };
  } catch {
    // Not valid JSON, skip
    return null;
  }
}

/**
 * Reads and parses a JSONL log file
 */
export function parseLogFile(filePath: string): LogEntry[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries: LogEntry[] = [];

  for (const line of lines) {
    const entry = parseJsonlLine(line);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Extracts tool call entries from log entries
 */
function extractToolCalls(entries: LogEntry[]): ToolCallEntry[] {
  const toolCalls: ToolCallEntry[] = [];

  for (const entry of entries) {
    const content = entry.content as Record<string, unknown>;

    // Look for various patterns of tool calls
    if (entry.type === 'tool_call' || entry.type === 'tool_use') {
      toolCalls.push({
        timestamp: entry.timestamp,
        tool: String(content.tool || content.name || 'unknown'),
        input: content.input || content.parameters || null,
        output: content.output || content.result || null,
      });
    } else if (content.tool_calls && Array.isArray(content.tool_calls)) {
      for (const tc of content.tool_calls) {
        toolCalls.push({
          timestamp: entry.timestamp,
          tool: String(tc.name || tc.tool || 'unknown'),
          input: tc.input || tc.parameters || null,
          output: tc.output || tc.result || null,
        });
      }
    }
  }

  return toolCalls;
}

/**
 * Extracts agent spawn entries from log entries
 */
function extractAgentSpawns(entries: LogEntry[]): AgentSpawnEntry[] {
  const spawns: AgentSpawnEntry[] = [];

  for (const entry of entries) {
    const content = entry.content as Record<string, unknown>;

    if (entry.type === 'agent_spawn' || entry.type === 'spawn_agent') {
      spawns.push({
        timestamp: entry.timestamp,
        agentType: String(content.agent_type || content.type || 'unknown'),
        taskDescription: String(content.task || content.description || ''),
      });
    }
  }

  return spawns;
}

/**
 * Extracts response entries from log entries
 */
function extractResponses(entries: LogEntry[]): ResponseEntry[] {
  const responses: ResponseEntry[] = [];

  for (const entry of entries) {
    const content = entry.content as Record<string, unknown>;

    if (entry.type === 'response' || entry.type === 'message' || entry.type === 'assistant') {
      responses.push({
        timestamp: entry.timestamp,
        role: String(content.role || 'assistant'),
        content: String(content.content || content.text || content.message || ''),
      });
    }
  }

  return responses;
}

/**
 * Extracts error entries from log entries
 */
function extractErrors(entries: LogEntry[]): ErrorEntry[] {
  const errors: ErrorEntry[] = [];

  for (const entry of entries) {
    const content = entry.content as Record<string, unknown>;

    if (entry.type === 'error' || content.error) {
      errors.push({
        timestamp: entry.timestamp,
        message: String(content.message || content.error || 'Unknown error'),
        details: content,
      });
    }
  }

  return errors;
}

/**
 * Collects execution logs for a specific run
 */
export function collectExecutionLogs(options: CollectorOptions = {}): ExecutionLog {
  const logFiles = findRecentLogFiles(options);
  const allEntries: LogEntry[] = [];

  for (const logFile of logFiles) {
    const entries = parseLogFile(logFile);
    allEntries.push(...entries);
  }

  // Sort entries by timestamp
  allEntries.sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  // Extract structured data
  const toolCalls = extractToolCalls(allEntries);
  const agentSpawns = extractAgentSpawns(allEntries);
  const responses = extractResponses(allEntries);
  const errors = extractErrors(allEntries);

  // Determine time range
  let startTime: Date | null = null;
  let endTime: Date | null = null;

  if (allEntries.length > 0) {
    startTime = new Date(allEntries[0].timestamp);
    endTime = new Date(allEntries[allEntries.length - 1].timestamp);
  }

  return {
    sessionId: options.sessionId ?? null,
    entries: allEntries,
    toolCalls,
    agentSpawns,
    responses,
    errors,
    startTime,
    endTime,
  };
}

/**
 * Filters logs to entries after a specific timestamp
 */
export function filterLogsAfterTime(logs: ExecutionLog, afterTime: Date): ExecutionLog {
  const filteredEntries = logs.entries.filter(entry => {
    return new Date(entry.timestamp) >= afterTime;
  });

  return {
    ...logs,
    entries: filteredEntries,
    toolCalls: extractToolCalls(filteredEntries),
    agentSpawns: extractAgentSpawns(filteredEntries),
    responses: extractResponses(filteredEntries),
    errors: extractErrors(filteredEntries),
  };
}

/**
 * Formats execution logs as a string for the judge
 */
export function formatLogsForJudge(logs: ExecutionLog): string {
  const sections: string[] = [];

  sections.push('=== EXECUTION LOG SUMMARY ===');
  sections.push(`Session ID: ${logs.sessionId || 'N/A'}`);
  sections.push(`Start Time: ${logs.startTime?.toISOString() || 'N/A'}`);
  sections.push(`End Time: ${logs.endTime?.toISOString() || 'N/A'}`);
  sections.push(`Total Entries: ${logs.entries.length}`);
  sections.push('');

  if (logs.toolCalls.length > 0) {
    sections.push('=== TOOL CALLS ===');
    for (const tc of logs.toolCalls) {
      sections.push(`[${tc.timestamp}] Tool: ${tc.tool}`);
      sections.push(`  Input: ${JSON.stringify(tc.input, null, 2)}`);
      if (tc.output) {
        sections.push(`  Output: ${JSON.stringify(tc.output, null, 2)}`);
      }
    }
    sections.push('');
  }

  if (logs.agentSpawns.length > 0) {
    sections.push('=== AGENT SPAWNS ===');
    for (const spawn of logs.agentSpawns) {
      sections.push(`[${spawn.timestamp}] Agent: ${spawn.agentType}`);
      sections.push(`  Task: ${spawn.taskDescription}`);
    }
    sections.push('');
  }

  if (logs.responses.length > 0) {
    sections.push('=== RESPONSES ===');
    for (const resp of logs.responses) {
      sections.push(`[${resp.timestamp}] ${resp.role}: ${resp.content.substring(0, 500)}${resp.content.length > 500 ? '...' : ''}`);
    }
    sections.push('');
  }

  if (logs.errors.length > 0) {
    sections.push('=== ERRORS ===');
    for (const err of logs.errors) {
      sections.push(`[${err.timestamp}] ${err.message}`);
    }
    sections.push('');
  }

  sections.push('=== RAW LOG ENTRIES (First 50) ===');
  const entriesToShow = logs.entries.slice(0, 50);
  for (const entry of entriesToShow) {
    sections.push(entry.raw);
  }

  return sections.join('\n');
}
