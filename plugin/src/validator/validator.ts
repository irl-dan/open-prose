/**
 * OpenProse Validator
 *
 * Performs semantic validation on OpenProse programs including:
 * - Comment validation
 * - Session validation (prompts and agent references)
 * - Agent definition validation (names, properties)
 */

import {
  ProgramNode,
  StatementNode,
  CommentNode,
  CommentStatementNode,
  SessionStatementNode,
  AgentDefinitionNode,
  PropertyNode,
  StringLiteralNode,
  IdentifierNode,
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

/** Valid model values */
const VALID_MODELS = ['sonnet', 'opus', 'haiku'];

export class Validator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private definedAgents: Map<string, AgentDefinitionNode> = new Map();

  constructor(private program: ProgramNode) {}

  /**
   * Validate the program
   */
  public validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.definedAgents = new Map();

    // First pass: collect agent definitions
    for (const statement of this.program.statements) {
      if (statement.type === 'AgentDefinition') {
        this.collectAgentDefinition(statement);
      }
    }

    // Second pass: validate all statements
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
   * Collect agent definition (first pass)
   */
  private collectAgentDefinition(agent: AgentDefinitionNode): void {
    const name = agent.name.name;

    if (this.definedAgents.has(name)) {
      this.addError(`Duplicate agent definition: "${name}"`, agent.name.span);
    } else {
      this.definedAgents.set(name, agent);
    }
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
      case 'AgentDefinition':
        this.validateAgentDefinition(statement);
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
   * Validate an agent definition
   */
  private validateAgentDefinition(agent: AgentDefinitionNode): void {
    // Validate agent name
    if (!agent.name.name) {
      this.addError('Agent definition must have a name', agent.span);
    }

    // Validate properties
    const seenProps = new Set<string>();
    for (const prop of agent.properties) {
      this.validateProperty(prop, 'agent', seenProps);
    }
  }

  /**
   * Validate a session statement
   */
  private validateSessionStatement(statement: SessionStatementNode): void {
    // Session must have either a prompt or an agent reference
    if (!statement.prompt && !statement.agent) {
      this.addError('Session statement requires a prompt or agent reference', statement.span);
      return;
    }

    // Validate the prompt string if present
    if (statement.prompt) {
      this.validateSessionPrompt(statement.prompt);
    }

    // Validate agent reference if present
    if (statement.agent) {
      const agentName = statement.agent.name;
      if (!this.definedAgents.has(agentName)) {
        this.addError(`Undefined agent: "${agentName}"`, statement.agent.span);
      }
    }

    // Validate properties
    const seenProps = new Set<string>();
    for (const prop of statement.properties) {
      this.validateProperty(prop, 'session', seenProps);
    }

    // If session has agent but no prompt in properties, that's fine
    // The session inherits the agent's prompt

    // If session has both inline prompt and properties, warn
    if (statement.prompt && statement.properties.some(p => p.name.name === 'prompt')) {
      this.addWarning(
        'Session has both inline prompt and prompt property; prompt property will override',
        statement.span
      );
    }
  }

  /**
   * Validate a property
   */
  private validateProperty(prop: PropertyNode, context: 'agent' | 'session', seenProps: Set<string>): void {
    const propName = prop.name.name;

    // Check for duplicate properties
    if (seenProps.has(propName)) {
      this.addError(`Duplicate property: "${propName}"`, prop.name.span);
      return;
    }
    seenProps.add(propName);

    // Validate specific properties
    switch (propName) {
      case 'model':
        this.validateModelProperty(prop);
        break;
      case 'prompt':
        this.validatePromptProperty(prop);
        break;
      default:
        // Unknown properties - warn for now (could be future features)
        this.addWarning(`Unknown property: "${propName}"`, prop.name.span);
    }
  }

  /**
   * Validate model property
   */
  private validateModelProperty(prop: PropertyNode): void {
    if (prop.value.type !== 'Identifier') {
      this.addError('Model must be an identifier (sonnet, opus, or haiku)', prop.value.span);
      return;
    }

    const modelValue = (prop.value as IdentifierNode).name;
    if (!VALID_MODELS.includes(modelValue)) {
      this.addError(
        `Invalid model: "${modelValue}". Must be one of: ${VALID_MODELS.join(', ')}`,
        prop.value.span
      );
    }
  }

  /**
   * Validate prompt property
   */
  private validatePromptProperty(prop: PropertyNode): void {
    if (prop.value.type !== 'StringLiteral') {
      this.addError('Prompt must be a string literal', prop.value.span);
      return;
    }

    // Validate the string content
    const stringValue = prop.value as StringLiteralNode;

    // Warn on empty prompt
    if (stringValue.value.length === 0) {
      this.addWarning('Prompt property has an empty value', prop.value.span);
    }

    // Warn on whitespace-only prompt
    if (stringValue.value.length > 0 && stringValue.value.trim().length === 0) {
      this.addWarning('Prompt property contains only whitespace', prop.value.span);
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
