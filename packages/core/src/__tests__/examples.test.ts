/**
 * Plugin Examples Validation Tests
 *
 * Automatically tests all .prose files in plugin/examples/ to ensure they
 * parse and compile correctly. This catches regressions when the parser
 * or compiler changes, and ensures shipped examples always work.
 *
 * Note: This does NOT test execution semantics (that's for E2E LLM-as-judge tests)
 * or edge cases/error conditions (that's for unit tests with inline strings).
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from '../parser';
import { compile } from '../compiler';

// Get the examples directory (relative to this test file)
const examplesDir = path.join(__dirname, '../../examples');

// Get all .prose files in the examples directory (not in subdirectories like roadmap/)
function getExampleFiles(): string[] {
  const files = fs.readdirSync(examplesDir);
  return files
    .filter(file => file.endsWith('.prose'))
    .sort(); // Ensure consistent ordering
}

describe('Plugin Examples Validation', () => {
  const exampleFiles = getExampleFiles();

  // Sanity check: we should have some examples
  it('should have example files to test', () => {
    expect(exampleFiles.length).toBeGreaterThan(0);
  });

  describe('Parse', () => {
    exampleFiles.forEach(filename => {
      it(`should parse without errors: ${filename}`, () => {
        const filepath = path.join(examplesDir, filename);
        const source = fs.readFileSync(filepath, 'utf-8');

        const result = parse(source);

        expect(result.errors).toHaveLength(0);
        expect(result.program).toBeDefined();
        expect(result.program.statements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Compile', () => {
    exampleFiles.forEach(filename => {
      it(`should compile without errors: ${filename}`, () => {
        const filepath = path.join(examplesDir, filename);
        const source = fs.readFileSync(filepath, 'utf-8');

        const parseResult = parse(source);
        expect(parseResult.errors).toHaveLength(0);

        // compile() throws on error, returns { code, strippedComments } on success
        const compileResult = compile(parseResult.program);

        expect(compileResult.code).toBeDefined();
        expect(compileResult.code.length).toBeGreaterThan(0);
      });
    });
  });

  // Optional: Snapshot tests for compiled output
  // Uncomment if you want to detect changes in compiled output format
  /*
  describe('Compiled Output Snapshots', () => {
    exampleFiles.forEach(filename => {
      it(`should match snapshot: ${filename}`, () => {
        const filepath = path.join(examplesDir, filename);
        const source = fs.readFileSync(filepath, 'utf-8');

        const parseResult = parse(source);
        const compileResult = compile(parseResult.program);

        expect(compileResult.code).toMatchSnapshot();
      });
    });
  });
  */
});
