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
  ImportStatementNode,
  PropertyNode,
  StringLiteralNode,
  IdentifierNode,
  ArrayExpressionNode,
  ObjectExpressionNode,
  LetBindingNode,
  ConstBindingNode,
  AssignmentNode,
  ExpressionNode,
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

/** Variable binding info */
interface VariableBinding {
  name: string;
  isConst: boolean;
  span: SourceSpan;
}

export class Validator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private definedAgents: Map<string, AgentDefinitionNode> = new Map();
  private importedSkills: Map<string, ImportStatementNode> = new Map();
  private definedVariables: Map<string, VariableBinding> = new Map();

  constructor(private program: ProgramNode) {}

  /**
   * Validate the program
   */
  public validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.definedAgents = new Map();
    this.importedSkills = new Map();
    this.definedVariables = new Map();

    // First pass: collect imports, agent definitions, and variable bindings
    for (const statement of this.program.statements) {
      if (statement.type === 'ImportStatement') {
        this.collectImport(statement);
      } else if (statement.type === 'AgentDefinition') {
        this.collectAgentDefinition(statement);
      } else if (statement.type === 'LetBinding') {
        this.collectLetBinding(statement);
      } else if (statement.type === 'ConstBinding') {
        this.collectConstBinding(statement);
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
   * Collect import statement (first pass)
   */
  private collectImport(importStmt: ImportStatementNode): void {
    const skillName = importStmt.skillName.value;

    if (this.importedSkills.has(skillName)) {
      this.addError(`Duplicate import: "${skillName}"`, importStmt.skillName.span);
    } else {
      this.importedSkills.set(skillName, importStmt);
    }
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
   * Collect let binding (first pass)
   */
  private collectLetBinding(binding: LetBindingNode): void {
    const name = binding.name.name;

    if (this.definedVariables.has(name)) {
      this.addError(`Duplicate variable definition: "${name}"`, binding.name.span);
    } else if (this.definedAgents.has(name)) {
      this.addError(`Variable "${name}" conflicts with agent name`, binding.name.span);
    } else {
      this.definedVariables.set(name, {
        name,
        isConst: false,
        span: binding.name.span,
      });
    }
  }

  /**
   * Collect const binding (first pass)
   */
  private collectConstBinding(binding: ConstBindingNode): void {
    const name = binding.name.name;

    if (this.definedVariables.has(name)) {
      this.addError(`Duplicate variable definition: "${name}"`, binding.name.span);
    } else if (this.definedAgents.has(name)) {
      this.addError(`Variable "${name}" conflicts with agent name`, binding.name.span);
    } else {
      this.definedVariables.set(name, {
        name,
        isConst: true,
        span: binding.name.span,
      });
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
      case 'ImportStatement':
        this.validateImportStatement(statement);
        break;
      case 'SessionStatement':
        this.validateSessionStatement(statement);
        break;
      case 'AgentDefinition':
        this.validateAgentDefinition(statement);
        break;
      case 'LetBinding':
        this.validateLetBinding(statement);
        break;
      case 'ConstBinding':
        this.validateConstBinding(statement);
        break;
      case 'Assignment':
        this.validateAssignment(statement);
        break;
      // Other statement types will be added in later tiers
    }
  }

  /**
   * Validate an import statement
   */
  private validateImportStatement(importStmt: ImportStatementNode): void {
    // Validate skill name is not empty
    if (!importStmt.skillName.value) {
      this.addError('Import skill name cannot be empty', importStmt.skillName.span);
    }

    // Validate source is not empty
    if (!importStmt.source.value) {
      this.addError('Import source cannot be empty', importStmt.source.span);
    }

    // Validate source format (github:, npm:, or local path)
    const source = importStmt.source.value;
    if (source && !this.isValidImportSource(source)) {
      this.addWarning(
        `Import source "${source}" should start with "github:", "npm:", or "./" for local paths`,
        importStmt.source.span
      );
    }
  }

  /**
   * Check if an import source is valid
   */
  private isValidImportSource(source: string): boolean {
    return source.startsWith('github:') ||
           source.startsWith('npm:') ||
           source.startsWith('./') ||
           source.startsWith('../') ||
           source.startsWith('/');
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
   * Validate a let binding
   */
  private validateLetBinding(binding: LetBindingNode): void {
    // Validate the value expression
    this.validateBindingExpression(binding.value);
  }

  /**
   * Validate a const binding
   */
  private validateConstBinding(binding: ConstBindingNode): void {
    // Validate the value expression
    this.validateBindingExpression(binding.value);
  }

  /**
   * Validate an assignment statement
   */
  private validateAssignment(assignment: AssignmentNode): void {
    const name = assignment.name.name;

    // Check if the variable exists
    if (!this.definedVariables.has(name)) {
      this.addError(`Undefined variable: "${name}"`, assignment.name.span);
      return;
    }

    // Check if trying to assign to a const
    const binding = this.definedVariables.get(name)!;
    if (binding.isConst) {
      this.addError(`Cannot reassign const variable: "${name}"`, assignment.name.span);
      return;
    }

    // Validate the value expression
    this.validateBindingExpression(assignment.value);
  }

  /**
   * Validate an expression used in a binding (let/const/assignment)
   */
  private validateBindingExpression(expr: ExpressionNode): void {
    if (expr.type === 'SessionStatement') {
      this.validateSessionStatement(expr as SessionStatementNode);
    } else if (expr.type === 'Identifier') {
      // Variable reference - check if it exists
      const name = (expr as IdentifierNode).name;
      if (!this.definedVariables.has(name) && !this.definedAgents.has(name)) {
        this.addError(`Undefined variable: "${name}"`, expr.span);
      }
    }
    // Other expression types (strings, arrays) are generally valid
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
      case 'skills':
        if (context !== 'agent') {
          this.addWarning('Skills property is only valid in agent definitions', prop.name.span);
        } else {
          this.validateSkillsProperty(prop);
        }
        break;
      case 'permissions':
        if (context !== 'agent') {
          this.addWarning('Permissions property is only valid in agent definitions', prop.name.span);
        } else {
          this.validatePermissionsProperty(prop);
        }
        break;
      case 'context':
        if (context !== 'session') {
          this.addWarning('Context property is only valid in session statements', prop.name.span);
        } else {
          this.validateContextProperty(prop);
        }
        break;
      default:
        // Unknown properties - warn for now (could be future features)
        this.addWarning(`Unknown property: "${propName}"`, prop.name.span);
    }
  }

  /**
   * Validate skills property
   */
  private validateSkillsProperty(prop: PropertyNode): void {
    if (prop.value.type !== 'ArrayExpression') {
      this.addError('Skills must be an array of skill names', prop.value.span);
      return;
    }

    const arrayValue = prop.value as ArrayExpressionNode;

    // Validate each skill reference
    for (const element of arrayValue.elements) {
      if (element.type !== 'StringLiteral') {
        this.addError('Skill name must be a string', element.span);
        continue;
      }

      const skillName = (element as StringLiteralNode).value;

      // Check if skill is imported
      if (!this.importedSkills.has(skillName)) {
        this.addWarning(`Skill "${skillName}" is not imported`, element.span);
      }
    }

    // Warn on empty skills array
    if (arrayValue.elements.length === 0) {
      this.addWarning('Skills array is empty', prop.value.span);
    }
  }

  /**
   * Validate permissions property
   */
  private validatePermissionsProperty(prop: PropertyNode): void {
    if (prop.value.type !== 'ObjectExpression') {
      this.addError('Permissions must be a block of permission rules', prop.value.span);
      return;
    }

    const objectValue = prop.value as ObjectExpressionNode;
    const validPermissionTypes = ['read', 'write', 'execute', 'bash', 'network'];

    for (const permProp of objectValue.properties) {
      const permType = permProp.name.name;

      // Check for known permission types
      if (!validPermissionTypes.includes(permType)) {
        this.addWarning(`Unknown permission type: "${permType}"`, permProp.name.span);
      }

      // Validate permission value (array or identifier like 'deny'/'allow')
      if (permProp.value.type === 'ArrayExpression') {
        // Validate each pattern in the array
        const arrayValue = permProp.value as ArrayExpressionNode;
        for (const element of arrayValue.elements) {
          if (element.type !== 'StringLiteral') {
            this.addError('Permission pattern must be a string', element.span);
          }
        }
      } else if (permProp.value.type === 'Identifier') {
        // Allow 'deny', 'allow', etc.
        const identValue = (permProp.value as IdentifierNode).name;
        if (!['deny', 'allow', 'prompt'].includes(identValue)) {
          this.addWarning(
            `Unknown permission value: "${identValue}". Expected 'deny', 'allow', or 'prompt'`,
            permProp.value.span
          );
        }
      } else {
        this.addError('Permission value must be an array of patterns or an identifier', permProp.value.span);
      }
    }
  }

  /**
   * Validate context property
   * Valid forms:
   * - context: varname (single variable reference)
   * - context: [var1, var2, ...] (array of variable references)
   * - context: [] (empty context - start fresh)
   */
  private validateContextProperty(prop: PropertyNode): void {
    const value = prop.value;

    if (value.type === 'Identifier') {
      // Single variable reference
      const name = (value as IdentifierNode).name;
      if (!this.definedVariables.has(name)) {
        this.addError(`Undefined variable in context: "${name}"`, value.span);
      }
    } else if (value.type === 'ArrayExpression') {
      // Array of variable references (can be empty)
      const arrayValue = value as ArrayExpressionNode;
      for (const element of arrayValue.elements) {
        if (element.type !== 'Identifier') {
          this.addError('Context array elements must be variable references', element.span);
          continue;
        }
        const name = (element as IdentifierNode).name;
        if (!this.definedVariables.has(name)) {
          this.addError(`Undefined variable in context: "${name}"`, element.span);
        }
      }
    } else {
      this.addError('Context must be a variable reference or an array of variable references', value.span);
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
