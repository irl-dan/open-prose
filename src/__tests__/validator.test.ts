/**
 * Unit tests for the OpenProse Validator
 *
 * Tests comment validation as specified in Tier 0.2
 */

import { parse } from '../parser';
import { validate, isValid } from '../validator';

describe('Validator', () => {
  describe('Comment validation', () => {
    it('should pass validation for valid comments', () => {
      const source = '# This is a valid comment';
      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should pass validation for multiple comments', () => {
      const source = `# First comment
# Second comment
# Third comment`;

      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.valid).toBe(true);
    });

    it('should pass validation for inline comments', () => {
      const source = 'session "Hello"  # inline comment';
      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.valid).toBe(true);
    });

    it('should pass validation for empty comments', () => {
      const source = '#';
      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.valid).toBe(true);
    });
  });

  describe('Warning generation', () => {
    it('should generate warning for TODO comments', () => {
      const source = '# TODO: Fix this later';
      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.warnings).toHaveLength(1);
      expect(validationResult.warnings[0].message).toContain('TODO');
    });

    it('should generate warning for FIXME comments', () => {
      const source = '# FIXME: This is broken';
      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.warnings).toHaveLength(1);
      expect(validationResult.warnings[0].message).toContain('FIXME');
    });

    it('should generate warning for HACK comments', () => {
      const source = '# HACK: Temporary workaround';
      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.warnings).toHaveLength(1);
      expect(validationResult.warnings[0].message).toContain('HACK');
    });

    it('should be case insensitive for warning patterns', () => {
      const source = '# todo: lowercase';
      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.warnings).toHaveLength(1);
    });
  });

  describe('isValid helper', () => {
    it('should return true for valid programs', () => {
      const source = `# Comment
session "Hello"`;
      const parseResult = parse(source);

      expect(isValid(parseResult.program)).toBe(true);
    });
  });

  describe('Comments do not break validation', () => {
    it('should validate program with mixed statements and comments', () => {
      const source = `# Header comment
session "First"
# Middle comment
session "Second"
# Footer comment`;

      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.valid).toBe(true);
    });
  });
});
