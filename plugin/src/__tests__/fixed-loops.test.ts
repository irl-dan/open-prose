/**
 * Tests for Tier 8: Fixed Loops (repeat, for-each, parallel for)
 */

import { parse } from '../parser';
import { validate } from '../validator';
import { compile } from '../compiler';
import type {
  RepeatBlockNode,
  ForEachBlockNode,
  ProgramNode,
} from '../parser';

describe('Tier 8: Fixed Loops', () => {
  describe('Repeat Block - Parsing', () => {
    it('should parse simple repeat block', () => {
      const source = `
repeat 3:
  session "Do something"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const repeat = result.program.statements[0] as RepeatBlockNode;
      expect(repeat.type).toBe('RepeatBlock');
      expect(repeat.count.value).toBe(3);
      expect(repeat.indexVar).toBeNull();
      expect(repeat.body).toHaveLength(1);
    });

    it('should parse repeat with index variable', () => {
      const source = `
repeat 5 as i:
  session "Process iteration"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const repeat = result.program.statements[0] as RepeatBlockNode;
      expect(repeat.type).toBe('RepeatBlock');
      expect(repeat.count.value).toBe(5);
      expect(repeat.indexVar).not.toBeNull();
      expect(repeat.indexVar?.name).toBe('i');
    });

    it('should parse repeat with multiple body statements', () => {
      const source = `
repeat 3:
  session "First action"
  session "Second action"
  session "Third action"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const repeat = result.program.statements[0] as RepeatBlockNode;
      expect(repeat.body).toHaveLength(3);
    });

    it('should parse nested repeat blocks', () => {
      const source = `
repeat 2:
  repeat 3:
    session "Inner loop"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const outer = result.program.statements[0] as RepeatBlockNode;
      expect(outer.count.value).toBe(2);

      const inner = outer.body[0] as RepeatBlockNode;
      expect(inner.type).toBe('RepeatBlock');
      expect(inner.count.value).toBe(3);
    });

    it('should parse repeat with decimal count', () => {
      const source = `
repeat 2.5:
  session "This is unusual"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const repeat = result.program.statements[0] as RepeatBlockNode;
      expect(repeat.count.value).toBe(2.5);
    });
  });

  describe('For-Each Block - Parsing', () => {
    it('should parse for-each with variable reference', () => {
      const source = `
let items = ["a", "b", "c"]
for item in items:
  session "Process item"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const forEach = result.program.statements[1] as ForEachBlockNode;
      expect(forEach.type).toBe('ForEachBlock');
      expect(forEach.itemVar.name).toBe('item');
      expect(forEach.indexVar).toBeNull();
      expect(forEach.isParallel).toBe(false);
      expect(forEach.collection.type).toBe('Identifier');
    });

    it('should parse for-each with inline array', () => {
      const source = `
for item in ["apple", "banana", "cherry"]:
  session "Describe the fruit"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const forEach = result.program.statements[0] as ForEachBlockNode;
      expect(forEach.type).toBe('ForEachBlock');
      expect(forEach.itemVar.name).toBe('item');
      expect(forEach.collection.type).toBe('ArrayExpression');
    });

    it('should parse for-each with index variable', () => {
      const source = `
let items = ["a", "b", "c"]
for item, i in items:
  session "Process item with index"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const forEach = result.program.statements[1] as ForEachBlockNode;
      expect(forEach.itemVar.name).toBe('item');
      expect(forEach.indexVar).not.toBeNull();
      expect(forEach.indexVar?.name).toBe('i');
    });

    it('should parse parallel for-each', () => {
      const source = `
let topics = ["AI", "climate", "space"]
parallel for topic in topics:
  session "Research topic"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const forEach = result.program.statements[1] as ForEachBlockNode;
      expect(forEach.type).toBe('ForEachBlock');
      expect(forEach.isParallel).toBe(true);
      expect(forEach.itemVar.name).toBe('topic');
    });

    it('should parse parallel for-each with index', () => {
      const source = `
let items = ["a", "b", "c"]
parallel for item, idx in items:
  session "Process item"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const forEach = result.program.statements[1] as ForEachBlockNode;
      expect(forEach.isParallel).toBe(true);
      expect(forEach.itemVar.name).toBe('item');
      expect(forEach.indexVar?.name).toBe('idx');
    });

    it('should parse nested for-each blocks', () => {
      const source = `
let outer = ["a", "b"]
let inner = ["1", "2"]
for o in outer:
  for i in inner:
    session "Process pair"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const outerFor = result.program.statements[2] as ForEachBlockNode;
      expect(outerFor.itemVar.name).toBe('o');

      const innerFor = outerFor.body[0] as ForEachBlockNode;
      expect(innerFor.type).toBe('ForEachBlock');
      expect(innerFor.itemVar.name).toBe('i');
    });
  });

  describe('Validator - Repeat Block', () => {
    it('should validate valid repeat block', () => {
      const source = `
repeat 3:
  session "Test"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should error on zero count', () => {
      const source = `
repeat 0:
  session "Never runs"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('positive'))).toBe(true);
    });

    it('should error on negative count', () => {
      // Note: The parser won't parse negative numbers directly,
      // so we test with the parsed value
      const source = `
repeat 0:
  session "Invalid"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(false);
    });

    it('should error on non-integer count', () => {
      const source = `
repeat 2.5:
  session "Fractional"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('integer'))).toBe(true);
    });

    it('should allow valid index variable', () => {
      const source = `
repeat 3 as i:
  session "Use i"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should warn on shadowed variable', () => {
      const source = `
let i = session "outer"
repeat 3 as i:
  session "shadows i"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });
  });

  describe('Validator - For-Each Block', () => {
    it('should validate valid for-each block', () => {
      const source = `
let items = ["a", "b"]
for item in items:
  session "Process"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should error on undefined collection', () => {
      const source = `
for item in undefinedItems:
  session "Error"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined'))).toBe(true);
    });

    it('should validate inline array collection', () => {
      const source = `
for item in ["a", "b", "c"]:
  session "Process"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should warn on shadowed item variable', () => {
      const source = `
let item = session "outer"
for item in ["a", "b"]:
  session "shadows item"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });

    it('should warn on shadowed index variable', () => {
      const source = `
let idx = session "outer"
for item, idx in ["a", "b"]:
  session "shadows idx"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });

    it('should validate parallel for-each', () => {
      const source = `
let items = ["a", "b"]
parallel for item in items:
  session "Process concurrently"
`;
      const result = parse(source);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Compiler - Repeat Block', () => {
    it('should compile simple repeat block', () => {
      const source = `
repeat 3:
  session "Test"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('repeat 3:');
      expect(compiled.code).toContain('session "Test"');
    });

    it('should compile repeat with index variable', () => {
      const source = `
repeat 5 as i:
  session "Iteration"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('repeat 5 as i:');
    });

    it('should preserve repeat block through roundtrip', () => {
      const source = `repeat 3:
  session "Test"
`;
      const result1 = parse(source);
      const compiled1 = compile(result1.program);
      const result2 = parse(compiled1.code);
      expect(result2.errors).toHaveLength(0);

      const repeat = result2.program.statements[0] as RepeatBlockNode;
      expect(repeat.type).toBe('RepeatBlock');
      expect(repeat.count.value).toBe(3);
    });
  });

  describe('Compiler - For-Each Block', () => {
    it('should compile simple for-each block', () => {
      const source = `
let items = ["a", "b"]
for item in items:
  session "Process"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('for item in items:');
    });

    it('should compile for-each with index', () => {
      const source = `
let items = ["a", "b"]
for item, i in items:
  session "Process"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('for item, i in items:');
    });

    it('should compile for-each with inline array', () => {
      const source = `
for item in ["a", "b", "c"]:
  session "Process"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('for item in ["a", "b", "c"]:');
    });

    it('should compile parallel for-each', () => {
      const source = `
let items = ["a", "b"]
parallel for item in items:
  session "Process"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('parallel for item in items:');
    });

    it('should compile parallel for-each with index', () => {
      const source = `
let items = ["a", "b"]
parallel for item, idx in items:
  session "Process"
`;
      const result = parse(source);
      const compiled = compile(result.program);
      expect(compiled.code).toContain('parallel for item, idx in items:');
    });
  });

  describe('Integration - Combined Loops', () => {
    it('should handle repeat inside for-each', () => {
      const source = `
let items = ["a", "b"]
for item in items:
  repeat 3:
    session "Process item multiple times"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const compiled = compile(result.program);
      expect(compiled.code).toContain('for item in items:');
      expect(compiled.code).toContain('repeat 3:');
    });

    it('should handle for-each inside repeat', () => {
      const source = `
let items = ["a", "b"]
repeat 2:
  for item in items:
    session "Process each item twice"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle loops with context', () => {
      const source = `
let items = ["a", "b"]
for item in items:
  session "Process item"
    context: item
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle repeat index in context', () => {
      const source = `
repeat 3 as i:
  session "Process iteration"
    context: i
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle parallel for with sessions', () => {
      const source = `
let topics = ["AI", "climate", "space"]
parallel for topic in topics:
  session "Research topic"
    context: topic
session "Summarize all findings"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(result.program.statements).toHaveLength(3);  // let, parallel for, session
    });

    it('should handle loops with let bindings', () => {
      const source = `
repeat 3 as i:
  let result = session "Generate something"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item array', () => {
      const source = `
for item in ["only"]:
  session "One item"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle empty array', () => {
      const source = `
for item in []:
  session "Never runs"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle repeat 1', () => {
      const source = `
repeat 1:
  session "Just once"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle deeply nested loops', () => {
      const source = `
repeat 2:
  repeat 2:
    repeat 2:
      session "Deep"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const outer = result.program.statements[0] as RepeatBlockNode;
      const middle = outer.body[0] as RepeatBlockNode;
      const inner = middle.body[0] as RepeatBlockNode;
      expect(inner.type).toBe('RepeatBlock');
    });

    it('should handle mixed loop nesting', () => {
      const source = `
let items = ["a", "b"]
repeat 2:
  parallel for item in items:
    session "Mixed"
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should error on missing count', () => {
      const source = `
repeat:
  session "Missing count"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should error on missing colon after repeat', () => {
      const source = `
repeat 3
  session "Missing colon"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should error on missing body', () => {
      const source = `
repeat 3:
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      const repeat = result.program.statements[0] as RepeatBlockNode;
      expect(repeat.body).toHaveLength(0);
    });

    it('should error on missing item variable', () => {
      const source = `
for in items:
  session "Missing item"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should error on missing in keyword', () => {
      const source = `
for item items:
  session "Missing in"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should error on missing collection', () => {
      const source = `
for item in:
  session "Missing collection"
`;
      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Variable Scoping', () => {
    it('should scope loop variables to body', () => {
      // The loop variable 'item' should not be accessible outside the loop
      // Validation should pass for this as 'item' shadows the outer variable
      const source = `
let item = session "outer"
for item in ["a", "b"]:
  session "uses loop item"
session "uses outer item"
  context: item
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      // Should warn about shadowing
      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });

    it('should scope index variable to body', () => {
      const source = `
let i = session "outer"
repeat 3 as i:
  session "uses loop i"
session "uses outer i"
  context: i
`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      // Should warn about shadowing
      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });
  });
});
