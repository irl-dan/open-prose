/**
 * judge.ts - LLM-as-judge for evaluating OpenProse execution
 *
 * This module handles:
 * - Building judge prompts with rubric and execution logs
 * - Invoking Claude as a judge via CLI
 * - Parsing structured judgment responses
 * - Determining pass/fail based on thresholds
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { RunnerResult } from './runner';
import { ExecutionLog, formatLogsForJudge } from './log-collector';

export interface JudgmentScore {
  criterion: string;
  score: number;  // 1-5
  explanation: string;
}

export interface JudgmentResult {
  success: boolean;
  passed: boolean;
  scores: JudgmentScore[];
  averageScore: number;
  lowestScore: number;
  summary: string;
  recommendations: string[];
  rawResponse: string;
  error: string | null;
}

export interface JudgeOptions {
  timeout?: number;
  rubricPath?: string;
}

const DEFAULT_TIMEOUT = 180000; // 3 minutes for judge evaluation

/**
 * The evaluation criteria for the judge
 */
export const EVALUATION_CRITERIA = [
  {
    name: 'Control Flow Accuracy',
    description: 'Did the execution accurately follow the program\'s control flow? Were all statements executed in the correct order?',
  },
  {
    name: 'Clarity of Execution',
    description: 'Did the agent appear confused or lost during execution, or did it proceed with clear understanding?',
  },
  {
    name: 'Intelligent Judgment',
    description: 'Did the agent show good judgment on context passing, condition evaluation, and handling ambiguous situations?',
  },
  {
    name: 'Feature Handling',
    description: 'Did the agent accurately handle the specific language feature being tested (comments, strings, etc.)?',
  },
  {
    name: 'State Management',
    description: 'Did the agent manage state correctly without losing track of variables, context, or progress?',
  },
  {
    name: 'Task Completion',
    description: 'Was the overall task completed successfully? Did the agent finish what it was asked to do?',
  },
  {
    name: 'Compile Phase',
    description: 'Did the compile/parse phase work as expected? Were syntax and structure properly recognized?',
  },
  {
    name: 'Bootup Smoothness',
    description: 'Did the execution begin smoothly without issues in initialization or setup?',
  },
];

/**
 * Reads the rubric file
 */
export function readRubric(rubricPath: string): string {
  if (!fs.existsSync(rubricPath)) {
    throw new Error(`Rubric file not found: ${rubricPath}`);
  }
  return fs.readFileSync(rubricPath, 'utf-8');
}

/**
 * Builds the judge prompt
 */
export function buildJudgePrompt(
  runnerResult: RunnerResult,
  executionLogs: ExecutionLog,
  rubric: string,
  testName: string
): string {
  const logsFormatted = formatLogsForJudge(executionLogs);

  return `You are an expert judge evaluating the execution of an OpenProse program by an AI agent.

Your task is to evaluate how well the agent executed the program and provide scores based on the rubric criteria.

=== TEST INFORMATION ===
Test Name: ${testName}
Program Path: ${runnerResult.programPath}
Execution Duration: ${runnerResult.duration}ms
Execution Success: ${runnerResult.success}
${runnerResult.error ? `Execution Error: ${runnerResult.error}` : ''}

=== PROGRAM BEING TESTED ===
${runnerResult.programContent}

=== AGENT OUTPUT ===
${runnerResult.output || '(No output captured)'}

=== EXECUTION LOGS ===
${logsFormatted || '(No logs captured)'}

=== EVALUATION RUBRIC ===
${rubric}

=== YOUR TASK ===
Evaluate the execution based on each criterion in the rubric. For each criterion:
1. Consider the evidence from the agent output and logs
2. Assign a score from 1-5 (1=very poor, 2=poor, 3=acceptable, 4=good, 5=excellent)
3. Provide a brief explanation for your score

IMPORTANT: You MUST respond with valid JSON in the following exact format:
{
  "scores": [
    {
      "criterion": "Control Flow Accuracy",
      "score": 4,
      "explanation": "The agent correctly followed the program flow..."
    },
    {
      "criterion": "Clarity of Execution",
      "score": 5,
      "explanation": "The agent demonstrated clear understanding..."
    },
    // ... include ALL 8 criteria
  ],
  "summary": "Overall summary of the execution quality...",
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2"
  ]
}

Provide your evaluation now:`;
}

/**
 * Parses the judge's JSON response
 */
function parseJudgeResponse(response: string): {
  scores: JudgmentScore[];
  summary: string;
  recommendations: string[];
} | null {
  // Try to extract JSON from the response
  let jsonStr = response;

  // Look for JSON block in markdown code fence
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Try to find raw JSON object
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.scores || !Array.isArray(parsed.scores)) {
      return null;
    }

    const scores: JudgmentScore[] = parsed.scores.map((s: unknown) => {
      const score = s as Record<string, unknown>;
      return {
        criterion: String(score.criterion || ''),
        score: Number(score.score) || 0,
        explanation: String(score.explanation || ''),
      };
    });

    return {
      scores,
      summary: String(parsed.summary || ''),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String)
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Invokes the LLM judge
 */
export async function invokeJudge(
  runnerResult: RunnerResult,
  executionLogs: ExecutionLog,
  rubricPath: string,
  testName: string,
  options: JudgeOptions = {}
): Promise<JudgmentResult> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  // Read the rubric
  let rubric: string;
  try {
    rubric = readRubric(rubricPath);
  } catch (err) {
    return {
      success: false,
      passed: false,
      scores: [],
      averageScore: 0,
      lowestScore: 0,
      summary: '',
      recommendations: [],
      rawResponse: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const prompt = buildJudgePrompt(runnerResult, executionLogs, rubric, testName);

  // Write prompt to a temp file to avoid shell escaping issues
  // IMPORTANT: We use execSync instead of spawn because Node's spawn() does not
  // properly capture stdout from the Claude CLI (events never fire, process hangs).
  // See test-harness/README.md for details. Do not refactor to use spawn.
  const tempPromptFile = path.join(
    process.env.TMPDIR || '/tmp',
    `openprose-judge-${Date.now()}.txt`
  );
  fs.writeFileSync(tempPromptFile, prompt, 'utf-8');

  try {
    const command = `cat "${tempPromptFile}" | claude -p`;

    const output = execSync(command, {
      timeout,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    // Parse the judge's response
    const parsed = parseJudgeResponse(output);

    if (!parsed) {
      return {
        success: false,
        passed: false,
        scores: [],
        averageScore: 0,
        lowestScore: 0,
        summary: '',
        recommendations: [],
        rawResponse: output,
        error: 'Failed to parse judge response as JSON',
      };
    }

    // Calculate metrics
    const validScores = parsed.scores.filter(s => s.score >= 1 && s.score <= 5);
    const averageScore = validScores.length > 0
      ? validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length
      : 0;
    const lowestScore = validScores.length > 0
      ? Math.min(...validScores.map(s => s.score))
      : 0;

    // Determine pass/fail
    // Passing: average >= 4.0 AND no individual score below 3
    const passed = averageScore >= 4.0 && lowestScore >= 3;

    return {
      success: true,
      passed,
      scores: parsed.scores,
      averageScore,
      lowestScore,
      summary: parsed.summary,
      recommendations: parsed.recommendations,
      rawResponse: output,
      error: null,
    };
  } catch (err) {
    const error = err as { message?: string; killed?: boolean; signal?: string; status?: number; stderr?: string };

    // Check if it was a timeout
    if (error.killed && error.signal === 'SIGTERM') {
      return {
        success: false,
        passed: false,
        scores: [],
        averageScore: 0,
        lowestScore: 0,
        summary: '',
        recommendations: [],
        rawResponse: '',
        error: `Judge timed out after ${timeout}ms`,
      };
    }

    return {
      success: false,
      passed: false,
      scores: [],
      averageScore: 0,
      lowestScore: 0,
      summary: '',
      recommendations: [],
      rawResponse: error.stderr || '',
      error: error.message || `Judge process exited with code ${error.status}`,
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
 * Formats the judgment result as a string for display
 */
export function formatJudgmentResult(result: JudgmentResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('JUDGMENT RESULT');
  lines.push('='.repeat(60));
  lines.push('');

  if (!result.success) {
    lines.push(`ERROR: ${result.error}`);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
  lines.push(`Average Score: ${result.averageScore.toFixed(2)} / 5.0`);
  lines.push(`Lowest Score: ${result.lowestScore} / 5`);
  lines.push('');

  lines.push('SCORES BY CRITERION:');
  lines.push('-'.repeat(40));

  for (const score of result.scores) {
    const passIndicator = score.score >= 3 ? 'OK' : 'LOW';
    lines.push(`[${passIndicator}] ${score.criterion}: ${score.score}/5`);
    lines.push(`    ${score.explanation}`);
    lines.push('');
  }

  lines.push('SUMMARY:');
  lines.push('-'.repeat(40));
  lines.push(result.summary);
  lines.push('');

  if (result.recommendations.length > 0) {
    lines.push('RECOMMENDATIONS:');
    lines.push('-'.repeat(40));
    for (const rec of result.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Generates a JSON report file
 */
export function generateJsonReport(
  testName: string,
  runnerResult: RunnerResult,
  executionLogs: ExecutionLog,
  judgmentResult: JudgmentResult,
  reportsDir: string
): string {
  const report = {
    testName,
    timestamp: new Date().toISOString(),
    runner: {
      success: runnerResult.success,
      duration: runnerResult.duration,
      programPath: runnerResult.programPath,
      error: runnerResult.error,
    },
    logs: {
      entryCount: executionLogs.entries.length,
      toolCallCount: executionLogs.toolCalls.length,
      errorCount: executionLogs.errors.length,
    },
    judgment: {
      success: judgmentResult.success,
      passed: judgmentResult.passed,
      averageScore: judgmentResult.averageScore,
      lowestScore: judgmentResult.lowestScore,
      scores: judgmentResult.scores,
      summary: judgmentResult.summary,
      recommendations: judgmentResult.recommendations,
    },
  };

  // Ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFileName = `${testName}-${timestamp}.json`;
  const reportPath = path.join(reportsDir, reportFileName);

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return reportPath;
}
