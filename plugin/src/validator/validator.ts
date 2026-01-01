/**
 * OpenProse Validator
 *
 * Performs semantic validation on OpenProse programs.
 * For comments (Tier 0.2), validation is minimal - just ensure parsing succeeded.
 */

import {
  ProgramNode,
  StatementNode,
  CommentNode,
  CommentStatementNode,
  SessionStatementNode,
  StringLiteralNode,
  walkAST,
  ASTVisitor,
} from '../parser';
import { SourceSpan } from '../parser/tokens';

export interface ValidationError {
  message: string;
  span: SourceSpan;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class Validator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  constructor(private program: ProgramNode) {}

  /**
   * Validate the program
   */
  public validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Validate all statements
    for (const statement of this.program.statements) {
      this.validateStatement(statement);
    }

    // Validate comments (minimal for now - just structure validation)
    for (const comment of this.program.comments) {
      this.validateComment(comment);
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Validate a statement
   */
  private validateStatement(statement: StatementNode): void {
    switch (statement.type) {
      case 'CommentStatement':
        this.validateCommentStatement(statement);
        break;
      case 'SessionStatement':
        this.validateSessionStatement(statement);
        break;
      // Other statement types will be added in later tiers
    }
  }

  /**
   * Validate a comment statement
   * For comments, there's minimal validation - they're always valid if parsed
   */
  private validateCommentStatement(statement: CommentStatementNode): void {
    // Comments are always valid if they parsed correctly
    // Future: could add warnings for TODO, FIXME, etc.
    const commentValue = statement.comment.value;

    // Check for common comment patterns that might warrant warnings
    if (commentValue.toLowerCase().includes('todo')) {
      this.addWarning('TODO comment found', statement.span);
    }
    if (commentValue.toLowerCase().includes('fixme')) {
      this.addWarning('FIXME comment found', statement.span);
    }
    if (commentValue.toLowerCase().includes('hack')) {
      this.addWarning('HACK comment found', statement.span);
    }
  }

  /**
   * Validate a comment node
   */
  private validateComment(comment: CommentNode): void {
    // Validate that comment starts with #
    if (!comment.value.startsWith('#')) {
      this.addError('Invalid comment format: must start with #', comment.span);
    }
  }

  /**
   * Validate a session statement
   */
  private validateSessionStatement(statement: SessionStatementNode): void {
    // Session must have a prompt (for simple sessions in Tier 1.1)
    // In later tiers, sessions can also have an agent reference
    if (!statement.prompt && !statement.agent) {
      this.addError('Session statement requires a prompt', statement.span);
      return;
    }

    // Validate the prompt string if present
    if (statement.prompt) {
      this.validateSessionPrompt(statement.prompt);
    }
  }

  /**
   * Validate a session prompt string
   */
  private validateSessionPrompt(prompt: StringLiteralNode): void {
    // First, run general string validation
    this.validateStringLiteral(prompt);

    // Warn on empty prompt
    if (prompt.value.length === 0) {
      this.addWarning('Session has an empty prompt', prompt.span);
    }

    // Warn on very long prompts (over 10,000 characters)
    const MAX_PROMPT_LENGTH = 10000;
    if (prompt.value.length > MAX_PROMPT_LENGTH) {
      this.addWarning(
        `Session prompt is very long (${prompt.value.length} characters). Consider breaking into smaller tasks.`,
        prompt.span
      );
    }

    // Warn on prompts that are just whitespace
    if (prompt.value.length > 0 && prompt.value.trim().length === 0) {
      this.addWarning('Session prompt contains only whitespace', prompt.span);
    }
  }

  /**
   * Validate a string literal node
   */
  private validateStringLiteral(node: StringLiteralNode): void {
    // Check for invalid escape sequences
    if (node.escapeSequences) {
      for (const escape of node.escapeSequences) {
        if (escape.type === 'invalid') {
          this.addWarning(
            `Unrecognized escape sequence: ${escape.sequence}`,
            node.span
          );
        }
      }
    }

    // Validate string is not too long (arbitrary limit for now)
    const MAX_STRING_LENGTH = 1000000; // 1MB
    if (node.value.length > MAX_STRING_LENGTH) {
      this.addWarning(
        `String literal is very long (${node.value.length} characters)`,
        node.span
      );
    }
  }

  private addError(message: string, span: SourceSpan): void {
    this.errors.push({
      message,
      span,
      severity: 'error',
    });
  }

  private addWarning(message: string, span: SourceSpan): void {
    this.warnings.push({
      message,
      span,
      severity: 'warning',
    });
  }
}

/**
 * Validate an OpenProse program
 */
export function validate(program: ProgramNode): ValidationResult {
  const validator = new Validator(program);
  return validator.validate();
}

/**
 * Check if a program is valid (no errors)
 */
export function isValid(program: ProgramNode): boolean {
  const result = validate(program);
  return result.valid;
}
