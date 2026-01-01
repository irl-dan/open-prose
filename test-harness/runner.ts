/**
 * runner.ts - Executes OpenProse programs via Claude Code CLI
 *
 * This module handles:
 * - Reading .prose program files
 * - Executing them via `claude -p` command
 * - Capturing execution output and session information
 * - Handling timeouts and errors gracefully
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface RunnerResult {
  success: boolean;
  sessionId: string | null;
  output: string;
  jsonOutput: unknown | null;
  error: string | null;
  duration: number;
  programPath: string;
  programContent: string;
  timestamp: Date;
}

export interface RunnerOptions {
  timeout?: number;  // milliseconds
  workingDir?: string;
}

const DEFAULT_TIMEOUT = 120000; // 2 minutes

/**
 * Reads the content of a .prose program file
 */
export function readProseProgram(programPath: string): string {
  const absolutePath = path.isAbsolute(programPath)
    ? programPath
    : path.resolve(process.cwd(), programPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Program file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  return content;
}

/**
 * Builds the prompt for Claude to execute an OpenProse program
 */
function buildExecutionPrompt(programContent: string, programName: string): string {
  return `You are an OpenProse interpreter. Execute the following OpenProse program step by step.

OpenProse is a domain-specific language for orchestrating AI agent sessions. Here are the key constructs:

- \`session "description"\` - Start a new session with the given description
- Lines starting with \`#\` are comments and should be ignored
- String literals can use single or double quotes
- Escaped quotes within strings should be handled properly

Execute this program and describe what you're doing at each step:

=== PROGRAM: ${programName} ===
${programContent}
=== END PROGRAM ===

After execution, provide a summary of what was executed.`;
}

/**
 * Executes a .prose program via Claude Code CLI
 */
export async function runProseProgram(
  programPath: string,
  options: RunnerOptions = {}
): Promise<RunnerResult> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const workingDir = options.workingDir ?? process.cwd();
  const startTime = Date.now();
  const timestamp = new Date();

  // Read the program content
  let programContent: string;
  try {
    programContent = readProseProgram(programPath);
  } catch (err) {
    return {
      success: false,
      sessionId: null,
      output: '',
      jsonOutput: null,
      error: err instanceof Error ? err.message : String(err),
      duration: Date.now() - startTime,
      programPath,
      programContent: '',
      timestamp,
    };
  }

  const programName = path.basename(programPath);
  const prompt = buildExecutionPrompt(programContent, programName);

  // Write prompt to a temp file to avoid shell escaping issues
  // IMPORTANT: We use execSync instead of spawn because Node's spawn() does not
  // properly capture stdout from the Claude CLI (events never fire, process hangs).
  // See test-harness/README.md for details. Do not refactor to use spawn.
  const tempPromptFile = path.join(
    process.env.TMPDIR || '/tmp',
    `openprose-prompt-${Date.now()}.txt`
  );
  fs.writeFileSync(tempPromptFile, prompt, 'utf-8');

  try {
    const command = `cat "${tempPromptFile}" | claude -p --output-format json`;

    const output = execSync(command, {
      cwd: workingDir,
      timeout,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    const duration = Date.now() - startTime;

    // Try to parse JSON output
    let jsonOutput: unknown = null;
    let sessionId: string | null = null;

    try {
      if (output.trim()) {
        jsonOutput = JSON.parse(output.trim());
        if (typeof jsonOutput === 'object' && jsonOutput !== null) {
          const jsonObj = jsonOutput as Record<string, unknown>;
          if ('session_id' in jsonObj) {
            sessionId = String(jsonObj.session_id);
          } else if ('sessionId' in jsonObj) {
            sessionId = String(jsonObj.sessionId);
          }
        }
      }
    } catch {
      // JSON parsing failed, output might be plain text
    }

    return {
      success: true,
      sessionId,
      output,
      jsonOutput,
      error: null,
      duration,
      programPath,
      programContent,
      timestamp,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const error = err as { message?: string; killed?: boolean; signal?: string; status?: number; stderr?: string };

    // Check if it was a timeout
    if (error.killed && error.signal === 'SIGTERM') {
      return {
        success: false,
        sessionId: null,
        output: '',
        jsonOutput: null,
        error: `Execution timed out after ${timeout}ms`,
        duration,
        programPath,
        programContent,
        timestamp,
      };
    }

    return {
      success: false,
      sessionId: null,
      output: error.stderr || '',
      jsonOutput: null,
      error: error.message || `Process exited with code ${error.status}`,
      duration,
      programPath,
      programContent,
      timestamp,
    };
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(tempPromptFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Finds all .prose files in the test-programs directory
 */
export function findTestPrograms(testProgramsDir: string): string[] {
  if (!fs.existsSync(testProgramsDir)) {
    return [];
  }

  const files = fs.readdirSync(testProgramsDir);
  return files
    .filter(f => f.endsWith('.prose'))
    .map(f => path.join(testProgramsDir, f))
    .sort();
}

/**
 * Finds a specific test program by name (without .prose extension)
 */
export function findTestProgramByName(testProgramsDir: string, name: string): string | null {
  const fileName = name.endsWith('.prose') ? name : `${name}.prose`;
  const programPath = path.join(testProgramsDir, fileName);

  if (fs.existsSync(programPath)) {
    return programPath;
  }

  return null;
}
