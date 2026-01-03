/**
 * Tests for Tier 9: Unbounded Loops (loop, loop until, loop while)
 */

import { parse } from '../parser';
import { validate } from '../validator';
import { compile } from '../compiler';
import type {
  LoopBlockNode,
  ProgramNode,
} from '../parser';

describe('Tier 9: Unbounded Loops', () => {
  describe('Basic Loop - Parsing', () => {
    it('should parse simple loop block', () => {
      const source = `
loop:
  session "Do something"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.type).toBe('LoopBlock');
      expect(loop.variant).toBe('loop');
      expect(loop.condition).toBeNull();
      expect(loop.iterationVar).toBeNull();
      expect(loop.maxIterations).toBeNull();
      expect(loop.body).toHaveLength(1);
    });

    it('should parse loop with iteration variable', () => {
      const source = `
loop as i:
  session "Process iteration"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.type).toBe('LoopBlock');
      expect(loop.variant).toBe('loop');
      expect(loop.iterationVar).not.toBeNull();
      expect(loop.iterationVar?.name).toBe('i');
    });

    it('should parse loop with max iterations', () => {
      const source = `
loop (max: 50):
  session "Limited iterations"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.type).toBe('LoopBlock');
      expect(loop.variant).toBe('loop');
      expect(loop.maxIterations).not.toBeNull();
      expect(loop.maxIterations?.value).toBe(50);
    });

    it('should parse loop with both max and iteration variable', () => {
      const source = `
loop (max: 100) as iteration:
  session "Process with limit"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.maxIterations?.value).toBe(100);
      expect(loop.iterationVar?.name).toBe('iteration');
    });
  });

  describe('Loop Until - Parsing', () => {
    it('should parse loop until with discretion condition', () => {
      const source = `
loop until **the task is complete**:
  session "Work on the task"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.type).toBe('LoopBlock');
      expect(loop.variant).toBe('until');
      expect(loop.condition).not.toBeNull();
      expect(loop.condition?.expression).toBe('the task is complete');
      expect(loop.condition?.isMultiline).toBe(false);
    });

    it('should parse loop until with max iterations', () => {
      const source = `
loop until **done** (max: 10):
  session "Try something"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.variant).toBe('until');
      expect(loop.condition?.expression).toBe('done');
      expect(loop.maxIterations?.value).toBe(10);
    });

    it('should parse loop until with iteration variable', () => {
      const source = `
loop until **all items processed** as attempt:
  session "Process next item"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.variant).toBe('until');
      expect(loop.iterationVar?.name).toBe('attempt');
    });

    it('should parse loop until with all options', () => {
      const source = `
loop until **the solution is correct** (max: 20) as attempt:
  session "Generate solution attempt"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.variant).toBe('until');
      expect(loop.condition?.expression).toBe('the solution is correct');
      expect(loop.maxIterations?.value).toBe(20);
      expect(loop.iterationVar?.name).toBe('attempt');
    });

    it('should parse multi-word discretion conditions', () => {
      const source = `
loop until **the user is satisfied with the result and no more changes are needed**:
  session "Refine the output"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.condition?.expression).toBe('the user is satisfied with the result and no more changes are needed');
    });
  });

  describe('Loop While - Parsing', () => {
    it('should parse loop while with discretion condition', () => {
      const source = `
loop while **there are items to process**:
  session "Process next item"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.type).toBe('LoopBlock');
      expect(loop.variant).toBe('while');
      expect(loop.condition).not.toBeNull();
      expect(loop.condition?.expression).toBe('there are items to process');
    });

    it('should parse loop while with max iterations', () => {
      const source = `
loop while **not finished** (max: 100):
  session "Continue working"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.variant).toBe('while');
      expect(loop.maxIterations?.value).toBe(100);
    });

    it('should parse loop while with iteration variable', () => {
      const source = `
loop while **quality is below threshold** as round:
  session "Improve quality"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.variant).toBe('while');
      expect(loop.iterationVar?.name).toBe('round');
    });
  });

  describe('Multiline Discretion - Parsing', () => {
    it('should parse loop with multiline discretion', () => {
      const source = `
loop until ***
  the poem has been reviewed
  all issues have been addressed
  and the final version is polished
***:
  session "Review and revise"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.variant).toBe('until');
      expect(loop.condition?.isMultiline).toBe(true);
      expect(loop.condition?.expression).toContain('the poem has been reviewed');
    });
  });

  describe('Nested Loops - Parsing', () => {
    it('should parse nested loop blocks', () => {
      const source = `
loop until **outer condition met**:
  loop until **inner condition met**:
    session "Inner work"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const outer = result.program.statements[0] as LoopBlockNode;
      expect(outer.variant).toBe('until');

      const inner = outer.body[0] as LoopBlockNode;
      expect(inner.type).toBe('LoopBlock');
      expect(inner.variant).toBe('until');
    });

    it('should parse loop inside repeat', () => {
      const source = `
repeat 3:
  loop until **done**:
    session "Work in iteration"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse repeat inside loop', () => {
      const source = `
loop until **all batches complete**:
  repeat 5:
    session "Process batch item"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validator - Loop Block', () => {
    it('should warn on unbounded loop without max iterations', () => {
      const source = `
loop:
  session "Infinite potential"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('max'))).toBe(true);
    });

    it('should validate loop with max iterations', () => {
      const source = `
loop (max: 50):
  session "Safe loop"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      // Should not have the "unbounded loop" warning since we have max
      expect(validation.warnings.some(w =>
        w.message.includes('max') && w.message.includes('Unbounded loop')
      )).toBe(false);
    });

    it('should error on zero max iterations', () => {
      const source = `
loop (max: 0):
  session "Invalid"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('positive'))).toBe(true);
    });

    it('should error on negative max iterations', () => {
      // Note: Parser won't handle negative numbers, so this tests the value 0
      const source = `
loop (max: 0):
  session "Invalid"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(false);
    });

    it('should error on non-integer max iterations', () => {
      const source = `
loop (max: 2.5):
  session "Fractional"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('integer'))).toBe(true);
    });

    it('should validate loop until with condition', () => {
      const source = `
loop until **task complete**:
  session "Work"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should validate loop while with condition', () => {
      const source = `
loop while **work remains**:
  session "Continue"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should error on empty discretion condition', () => {
      const source = `
loop until ****:
  session "Empty condition"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('empty'))).toBe(true);
    });

    it('should warn on very short discretion condition', () => {
      const source = `
loop until **ok**:
  session "Short condition"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('short') || w.message.includes('ambiguous'))).toBe(true);
    });

    it('should allow valid iteration variable', () => {
      const source = `
loop until **done** as i:
  session "Use i"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should warn on shadowed iteration variable', () => {
      const source = `
let i = session "outer"
loop until **done** as i:
  session "shadows i"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });
  });

  describe('Compiler - Loop Block', () => {
    it('should compile simple loop block', () => {
      const source = `
loop:
  session "Test"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('loop:');
      expect(compiled.code).toContain('session "Test"');
    });

    it('should compile loop with iteration variable', () => {
      const source = `
loop as i:
  session "Iteration"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('loop as i:');
    });

    it('should compile loop with max iterations', () => {
      const source = `
loop (max: 50):
  session "Limited"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('loop (max: 50):');
    });

    it('should compile loop until', () => {
      const source = `
loop until **task done**:
  session "Work"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('loop until **task done**:');
    });

    it('should compile loop while', () => {
      const source = `
loop while **not finished**:
  session "Continue"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('loop while **not finished**:');
    });

    it('should compile loop until with all options', () => {
      const source = `
loop until **complete** (max: 10) as attempt:
  session "Try"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('loop until **complete**');
      expect(compiled.code).toContain('(max: 10)');
      expect(compiled.code).toContain('as attempt:');
    });

    it('should compile multiline discretion', () => {
      const source = `
loop until ***
  condition one
  condition two
***:
  session "Multi-condition"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('***');
      expect(compiled.code).toContain('condition one');
    });

    it('should preserve loop block through roundtrip', () => {
      const source = `loop until **done** (max: 5) as i:
  session "Test"
`;
      const result1 = parse(source);
      const compiled1 = compile(result1.program);
      const result2 = parse(compiled1.code);
      expect(result2.errors).toHaveLength(0);

      const loop = result2.program.statements[0] as LoopBlockNode;
      expect(loop.type).toBe('LoopBlock');
      expect(loop.variant).toBe('until');
      expect(loop.condition?.expression).toBe('done');
      expect(loop.maxIterations?.value).toBe(5);
      expect(loop.iterationVar?.name).toBe('i');
    });
  });

  describe('Integration - Combined with Other Features', () => {
    it('should handle loop with context', () => {
      const source = `
let items = session "Get items"
loop until **all processed**:
  session "Process next"
    context: items
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle loop inside do block', () => {
      const source = `
do:
  loop until **done**:
    session "Nested work"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle loop inside parallel block', () => {
      const source = `
parallel:
  loop until **task A done** (max: 10):
    session "Work on A"
  loop until **task B done** (max: 10):
    session "Work on B"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle loop with let binding', () => {
      const source = `
loop until **solution found** (max: 20):
  let attempt = session "Generate solution"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle loop assigned to variable', () => {
      const source = `
let result = loop until **done** (max: 5):
  session "Work"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty body loop', () => {
      const source = `
loop until **done**:
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.body).toHaveLength(0);
    });

    it('should handle max iterations of 1', () => {
      const source = `
loop (max: 1):
  session "Just once"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle large max iterations', () => {
      const source = `
loop (max: 1000):
  session "Many iterations"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle deeply nested loops', () => {
      const source = `
loop until **level 1 done**:
  loop until **level 2 done**:
    loop until **level 3 done**:
      session "Deep"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const l1 = result.program.statements[0] as LoopBlockNode;
      const l2 = l1.body[0] as LoopBlockNode;
      const l3 = l2.body[0] as LoopBlockNode;
      expect(l3.type).toBe('LoopBlock');
    });

    it('should handle multiple statements in loop body', () => {
      const source = `
loop until **done** (max: 10):
  session "Step 1"
  session "Step 2"
  session "Step 3"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const loop = result.program.statements[0] as LoopBlockNode;
      expect(loop.body).toHaveLength(3);
    });
  });

  describe('Error Cases', () => {
    it('should error on missing colon', () => {
      const source = `
loop until **done**
  session "Missing colon"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should error on missing discretion after until', () => {
      const source = `
loop until:
  session "Missing condition"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should error on missing discretion after while', () => {
      const source = `
loop while:
  session "Missing condition"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should error on invalid max modifier', () => {
      const source = `
loop (invalid: 10):
  session "Unknown modifier"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should error on missing value for max', () => {
      const source = `
loop (max:):
  session "Missing value"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Variable Scoping', () => {
    it('should scope iteration variable to body', () => {
      const source = `
let i = session "outer"
loop until **done** as i:
  session "uses loop i"
session "uses outer i"
  context: i
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });

    it('should restore scope after loop exits', () => {
      const source = `
let counter = session "outer"
loop until **done** (max: 5) as counter:
  session "loop counter"
session "use outer counter"
  context: counter
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Real-World Examples', () => {
    it('should handle poem refinement loop', () => {
      const source = `
session "Write an initial draft of a short poem about nature"

loop until **the poem has vivid imagery and flows smoothly** (max: 5):
  session "Review the current poem and identify weaknesses"
  session "Revise the poem to address the issues"

session "Present the final polished poem"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle debugging loop', () => {
      const source = `
session "Start debugging the code"

loop until **all bugs are fixed** (max: 10):
  session "Run tests and identify a bug"
  session "Fix the identified bug"

session "Report final status"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle iterative improvement loop', () => {
      const source = `
let draft = session "Create initial document"

loop while **quality score is below threshold** (max: 10) as revision:
  session "Review and improve the document"
    context: draft
  session "Calculate new quality score"

session "Finalize the document"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle consensus-seeking loop', () => {
      const source = `
parallel:
  opinion1 = session "Get first expert opinion"
  opinion2 = session "Get second expert opinion"

loop until **experts have reached consensus** (max: 5):
  session "Identify points of disagreement"
    context: { opinion1, opinion2 }
  session "Facilitate discussion to resolve differences"

session "Report final consensus"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });
});
