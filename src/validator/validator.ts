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
    // For Tier 0.2, minimal validation
    // Just check that session has either a prompt or agent
    if (!statement.prompt && !statement.agent) {
      this.addWarning('Session statement has no prompt or agent', statement.span);
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
