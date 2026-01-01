#!/usr/bin/env bun
/**
 * OpenProse CLI
 *
 * Usage:
 *   open-prose compile <file.prose>   - Compile and validate a program
 *   open-prose validate <file.prose>  - Validate without compiling
 *   open-prose help                   - Show this help message
 */

import { readFileSync, existsSync } from 'fs';
import { parse, compile, validate } from '../src';

const args = process.argv.slice(2);

function printUsage(): void {
  console.log(`OpenProse CLI v0.1.0

Usage:
  open-prose compile <file.prose>   Compile and validate a program
  open-prose validate <file.prose>  Validate syntax only
  open-prose help                   Show this help message

Examples:
  open-prose compile program.prose
  open-prose validate examples/research.prose
`);
}

function formatError(error: { message: string; line?: number; column?: number }): string {
  if (error.line !== undefined && error.column !== undefined) {
    return `Error at line ${error.line}, column ${error.column}: ${error.message}`;
  }
  return `Error: ${error.message}`;
}

function compileFile(filePath: string): void {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const source = readFileSync(filePath, 'utf-8');

  // Parse
  const parseResult = parse(source);

  if (parseResult.errors.length > 0) {
    console.error('Parse errors:');
    for (const error of parseResult.errors) {
      console.error(formatError(error));
    }
    process.exit(1);
  }

  // Validate
  const validationResult = validate(parseResult.program);

  if (validationResult.errors.length > 0) {
    console.error('Validation errors:');
    for (const error of validationResult.errors) {
      console.error(formatError(error));
    }
    process.exit(1);
  }

  if (validationResult.warnings.length > 0) {
    console.error('Warnings:');
    for (const warning of validationResult.warnings) {
      console.error(`Warning: ${warning.message}`);
    }
  }

  // Compile
  const compileResult = compile(parseResult.program);

  console.log(compileResult.code);

  if (compileResult.strippedComments.length > 0) {
    console.error(`\n# Stripped ${compileResult.strippedComments.length} comment(s)`);
  }
}

function validateFile(filePath: string): void {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const source = readFileSync(filePath, 'utf-8');

  // Parse
  const parseResult = parse(source);

  if (parseResult.errors.length > 0) {
    console.error('Parse errors:');
    for (const error of parseResult.errors) {
      console.error(formatError(error));
    }
    process.exit(1);
  }

  // Validate
  const validationResult = validate(parseResult.program);

  let hasIssues = false;

  if (validationResult.errors.length > 0) {
    console.error('Validation errors:');
    for (const error of validationResult.errors) {
      console.error(formatError(error));
    }
    hasIssues = true;
  }

  if (validationResult.warnings.length > 0) {
    console.error('Warnings:');
    for (const warning of validationResult.warnings) {
      console.error(`Warning: ${warning.message}`);
    }
    hasIssues = true;
  }

  if (hasIssues) {
    if (validationResult.errors.length > 0) {
      process.exit(1);
    }
  } else {
    console.log('Valid program');
  }
}

// Main
const command = args[0];

switch (command) {
  case 'compile':
    if (!args[1]) {
      console.error('Error: Missing file path');
      console.error('Usage: open-prose compile <file.prose>');
      process.exit(1);
    }
    compileFile(args[1]);
    break;

  case 'validate':
    if (!args[1]) {
      console.error('Error: Missing file path');
      console.error('Usage: open-prose validate <file.prose>');
      process.exit(1);
    }
    validateFile(args[1]);
    break;

  case 'help':
  case '--help':
  case '-h':
    printUsage();
    break;

  case undefined:
    printUsage();
    break;

  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
