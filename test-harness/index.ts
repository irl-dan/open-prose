#!/usr/bin/env ts-node
/**
 * index.ts - Main entry point for OpenProse test harness
 *
 * Usage:
 *   npx ts-node index.ts <test-name>         # Run a specific test
 *   npx ts-node index.ts --all               # Run all tests
 *   npx ts-node index.ts --list              # List available tests
 *   npx ts-node index.ts --help              # Show help
 *
 * Examples:
 *   npx ts-node index.ts tier-00-comments
 *   npx ts-node index.ts tier-00-strings
 *   npx ts-node index.ts --all
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  runProseProgram,
  findTestPrograms,
  findTestProgramByName,
  RunnerResult,
} from './runner';
import {
  collectExecutionLogs,
  filterLogsAfterTime,
  ExecutionLog,
} from './log-collector';
import {
  invokeJudge,
  formatJudgmentResult,
  generateJsonReport,
  JudgmentResult,
} from './judge';

// Directory paths
const HARNESS_DIR = __dirname;
const TEST_PROGRAMS_DIR = path.join(HARNESS_DIR, 'test-programs');
const REPORTS_DIR = path.join(HARNESS_DIR, 'reports');
const RUBRIC_PATH = path.join(HARNESS_DIR, 'rubric.md');

interface TestResult {
  testName: string;
  runnerResult: RunnerResult;
  executionLogs: ExecutionLog;
  judgmentResult: JudgmentResult;
  reportPath: string;
}

interface HarnessOptions {
  verbose?: boolean;
  skipJudge?: boolean;
  timeout?: number;
}

/**
 * Prints usage information
 */
function printUsage(): void {
  console.log(`
OpenProse Test Harness
======================

Usage:
  npx ts-node index.ts <test-name>         Run a specific test
  npx ts-node index.ts --all               Run all tests
  npx ts-node index.ts --list              List available tests
  npx ts-node index.ts --help              Show this help

Options:
  --verbose                                Show detailed output
  --skip-judge                             Skip the LLM judge evaluation
  --timeout <ms>                           Set execution timeout (default: 120000)

Examples:
  npx ts-node index.ts tier-00-comments
  npx ts-node index.ts tier-00-strings
  npx ts-node index.ts --all --verbose
`);
}

/**
 * Lists available test programs
 */
function listTests(): void {
  const programs = findTestPrograms(TEST_PROGRAMS_DIR);

  console.log('\nAvailable tests:');
  console.log('-'.repeat(40));

  if (programs.length === 0) {
    console.log('  (No test programs found)');
    console.log(`  Add .prose files to: ${TEST_PROGRAMS_DIR}`);
  } else {
    for (const program of programs) {
      const name = path.basename(program, '.prose');
      console.log(`  ${name}`);
    }
  }

  console.log('');
}

/**
 * Runs a single test
 */
async function runTest(
  testName: string,
  options: HarnessOptions = {}
): Promise<TestResult | null> {
  const { verbose = false, skipJudge = false, timeout = 120000 } = options;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${testName}`);
  console.log('='.repeat(60));

  // Find the test program
  const programPath = findTestProgramByName(TEST_PROGRAMS_DIR, testName);
  if (!programPath) {
    console.error(`ERROR: Test program not found: ${testName}`);
    console.error(`       Expected: ${path.join(TEST_PROGRAMS_DIR, testName + '.prose')}`);
    return null;
  }

  console.log(`Program: ${programPath}`);
  console.log('');

  // Step 1: Run the program
  console.log('Step 1: Executing program via Claude Code...');
  const startTime = new Date();
  const runnerResult = await runProseProgram(programPath, { timeout });

  console.log(`  Duration: ${runnerResult.duration}ms`);
  console.log(`  Success: ${runnerResult.success}`);

  if (runnerResult.error) {
    console.log(`  Error: ${runnerResult.error}`);
  }

  if (verbose && runnerResult.output) {
    console.log('\n--- Agent Output ---');
    console.log(runnerResult.output.substring(0, 2000));
    if (runnerResult.output.length > 2000) {
      console.log('... (truncated)');
    }
    console.log('--- End Output ---\n');
  }

  // Step 2: Collect logs
  console.log('\nStep 2: Collecting execution logs...');
  let executionLogs = collectExecutionLogs({
    maxAge: 300000, // 5 minutes
    sessionId: runnerResult.sessionId,
  });

  // Filter to only logs after our test started
  executionLogs = filterLogsAfterTime(executionLogs, startTime);

  console.log(`  Log entries found: ${executionLogs.entries.length}`);
  console.log(`  Tool calls: ${executionLogs.toolCalls.length}`);
  console.log(`  Responses: ${executionLogs.responses.length}`);
  console.log(`  Errors: ${executionLogs.errors.length}`);

  // Step 3: Judge the execution
  let judgmentResult: JudgmentResult;

  if (skipJudge) {
    console.log('\nStep 3: Skipping judge evaluation (--skip-judge)');
    judgmentResult = {
      success: false,
      passed: false,
      scores: [],
      averageScore: 0,
      lowestScore: 0,
      summary: 'Judge evaluation was skipped',
      recommendations: [],
      rawResponse: '',
      error: 'Skipped by user request',
    };
  } else {
    console.log('\nStep 3: Invoking LLM judge...');

    // Check if rubric exists
    if (!fs.existsSync(RUBRIC_PATH)) {
      console.error(`ERROR: Rubric file not found: ${RUBRIC_PATH}`);
      judgmentResult = {
        success: false,
        passed: false,
        scores: [],
        averageScore: 0,
        lowestScore: 0,
        summary: '',
        recommendations: [],
        rawResponse: '',
        error: `Rubric file not found: ${RUBRIC_PATH}`,
      };
    } else {
      judgmentResult = await invokeJudge(
        runnerResult,
        executionLogs,
        RUBRIC_PATH,
        testName,
        { timeout: 180000 }
      );
    }

    console.log(`  Judge success: ${judgmentResult.success}`);
    console.log(`  Test passed: ${judgmentResult.passed}`);

    if (judgmentResult.success) {
      console.log(`  Average score: ${judgmentResult.averageScore.toFixed(2)}/5.0`);
      console.log(`  Lowest score: ${judgmentResult.lowestScore}/5`);
    }

    if (judgmentResult.error) {
      console.log(`  Error: ${judgmentResult.error}`);
    }
  }

  // Step 4: Generate report
  console.log('\nStep 4: Generating report...');
  const reportPath = generateJsonReport(
    testName,
    runnerResult,
    executionLogs,
    judgmentResult,
    REPORTS_DIR
  );
  console.log(`  Report saved: ${reportPath}`);

  // Print judgment result
  if (!skipJudge && judgmentResult.success) {
    console.log('\n' + formatJudgmentResult(judgmentResult));
  }

  // Print final status
  console.log('\n' + '-'.repeat(60));
  if (skipJudge) {
    console.log(`RESULT: ${testName} - EVALUATION SKIPPED`);
  } else if (!judgmentResult.success) {
    console.log(`RESULT: ${testName} - JUDGE ERROR`);
  } else if (judgmentResult.passed) {
    console.log(`RESULT: ${testName} - PASSED`);
  } else {
    console.log(`RESULT: ${testName} - FAILED`);
  }
  console.log('-'.repeat(60));

  return {
    testName,
    runnerResult,
    executionLogs,
    judgmentResult,
    reportPath,
  };
}

/**
 * Runs all tests
 */
async function runAllTests(options: HarnessOptions = {}): Promise<void> {
  const programs = findTestPrograms(TEST_PROGRAMS_DIR);

  if (programs.length === 0) {
    console.log('No test programs found.');
    console.log(`Add .prose files to: ${TEST_PROGRAMS_DIR}`);
    return;
  }

  console.log(`\nRunning ${programs.length} test(s)...\n`);

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;

  for (const programPath of programs) {
    const testName = path.basename(programPath, '.prose');
    const result = await runTest(testName, options);

    if (result) {
      results.push(result);

      if (!result.judgmentResult.success) {
        errors++;
      } else if (result.judgmentResult.passed) {
        passed++;
      } else {
        failed++;
      }
    } else {
      errors++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:  ${programs.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Errors: ${errors}`);
  console.log('='.repeat(60));

  // Exit with appropriate code
  if (failed > 0 || errors > 0) {
    process.exitCode = 1;
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse options
  const options: HarnessOptions = {
    verbose: args.includes('--verbose'),
    skipJudge: args.includes('--skip-judge'),
  };

  // Parse timeout
  const timeoutIndex = args.indexOf('--timeout');
  if (timeoutIndex !== -1 && args[timeoutIndex + 1]) {
    options.timeout = parseInt(args[timeoutIndex + 1], 10);
  }

  // Filter out option flags
  const positionalArgs = args.filter(
    arg => !arg.startsWith('--') &&
           (args.indexOf('--timeout') === -1 || args.indexOf(arg) !== args.indexOf('--timeout') + 1)
  );

  // Handle commands
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  if (args.includes('--list')) {
    listTests();
    return;
  }

  if (args.includes('--all')) {
    await runAllTests(options);
    return;
  }

  if (positionalArgs.length === 0) {
    printUsage();
    console.error('Error: Please specify a test name or use --all');
    process.exitCode = 1;
    return;
  }

  // Run specified test(s)
  for (const testName of positionalArgs) {
    await runTest(testName, options);
  }
}

// Run main
main().catch(err => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});
