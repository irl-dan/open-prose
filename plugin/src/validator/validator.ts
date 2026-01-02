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
  NumberLiteralNode,
  IdentifierNode,
  DiscretionNode,
  ArrayExpressionNode,
  ObjectExpressionNode,
  LetBindingNode,
  ConstBindingNode,
  AssignmentNode,
  ExpressionNode,
  DoBlockNode,
  BlockDefinitionNode,
  ArrowExpressionNode,
  ParallelBlockNode,
  LoopBlockNode,
  RepeatBlockNode,
  ForEachBlockNode,
  TryBlockNode,
  ThrowStatementNode,
  PipeExpressionNode,
  PipeOperationNode,
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

/** Valid parallel join strategies */
const VALID_JOIN_STRATEGIES = ['all', 'first', 'any'];

/** Valid on-fail policies */
const VALID_ON_FAIL_POLICIES = ['fail-fast', 'continue', 'ignore'];

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
  private definedBlocks: Map<string, BlockDefinitionNode> = new Map();

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
    this.definedBlocks = new Map();

    // First pass: collect imports, agent definitions, block definitions, and variable bindings
    for (const statement of this.program.statements) {
      if (statement.type === 'ImportStatement') {
        this.collectImport(statement);
      } else if (statement.type === 'AgentDefinition') {
        this.collectAgentDefinition(statement);
      } else if (statement.type === 'BlockDefinition') {
        this.collectBlockDefinition(statement);
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
   * Collect block definition (first pass)
   */
  private collectBlockDefinition(block: BlockDefinitionNode): void {
    const name = block.name.name;

    if (this.definedBlocks.has(name)) {
      this.addError(`Duplicate block definition: "${name}"`, block.name.span);
    } else if (this.definedAgents.has(name)) {
      this.addError(`Block "${name}" conflicts with agent name`, block.name.span);
    } else {
      this.definedBlocks.set(name, block);
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
      case 'BlockDefinition':
        this.validateBlockDefinition(statement);
        break;
      case 'DoBlock':
        this.validateDoBlock(statement);
        break;
      case 'ParallelBlock':
        this.validateParallelBlock(statement);
        break;
      case 'RepeatBlock':
        this.validateRepeatBlock(statement);
        break;
      case 'ForEachBlock':
        this.validateForEachBlock(statement);
        break;
      case 'LoopBlock':
        this.validateLoopBlock(statement);
        break;
      case 'TryBlock':
        this.validateTryBlock(statement);
        break;
      case 'ThrowStatement':
        this.validateThrowStatement(statement);
        break;
      case 'ArrowExpression':
        this.validateArrowExpression(statement);
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
   * Validate a block definition
   */
  private validateBlockDefinition(block: BlockDefinitionNode): void {
    // Validate block name
    if (!block.name.name) {
      this.addError('Block definition must have a name', block.span);
    }

    // Validate body statements
    for (const stmt of block.body) {
      this.validateStatement(stmt);
    }
  }

  /**
   * Validate a do block (anonymous or invocation)
   */
  private validateDoBlock(doBlock: DoBlockNode): void {
    if (doBlock.name) {
      // Block invocation: do blockname
      const blockName = doBlock.name.name;
      if (!this.definedBlocks.has(blockName)) {
        this.addError(`Undefined block: "${blockName}"`, doBlock.name.span);
      }
    } else {
      // Anonymous do block: validate body
      for (const stmt of doBlock.body) {
        this.validateStatement(stmt);
      }
    }
  }

  /**
   * Validate a parallel block
   */
  private validateParallelBlock(parallel: ParallelBlockNode): void {
    // Validate join strategy if specified
    if (parallel.joinStrategy) {
      const strategy = parallel.joinStrategy.value;
      if (!VALID_JOIN_STRATEGIES.includes(strategy)) {
        this.addError(
          `Invalid join strategy: "${strategy}". Must be one of: ${VALID_JOIN_STRATEGIES.join(', ')}`,
          parallel.joinStrategy.span
        );
      }
    }

    // Validate on-fail policy if specified
    if (parallel.onFail) {
      const onFailValue = parallel.onFail.value;
      if (!VALID_ON_FAIL_POLICIES.includes(onFailValue)) {
        this.addError(
          `Invalid on-fail policy: "${onFailValue}". Must be one of: ${VALID_ON_FAIL_POLICIES.join(', ')}`,
          parallel.onFail.span
        );
      }
    }

    // Validate anyCount (count) if specified
    if (parallel.anyCount) {
      // count is only valid with "any" strategy
      if (!parallel.joinStrategy || parallel.joinStrategy.value !== 'any') {
        this.addError(
          'The "count" modifier is only valid with the "any" join strategy',
          parallel.anyCount.span
        );
      }

      // count must be a positive integer
      const countValue = parallel.anyCount.value;
      if (countValue < 1) {
        this.addError(
          `Invalid count: ${countValue}. Count must be at least 1`,
          parallel.anyCount.span
        );
      }

      // count should not exceed the number of branches
      if (parallel.body.length > 0 && countValue > parallel.body.length) {
        this.addWarning(
          `Count (${countValue}) exceeds number of parallel branches (${parallel.body.length})`,
          parallel.anyCount.span
        );
      }
    }

    // Collect any variable assignments inside the parallel block
    for (const stmt of parallel.body) {
      // For assignments inside parallel blocks, register them as variables
      if (stmt.type === 'Assignment') {
        const assignment = stmt as AssignmentNode;
        const name = assignment.name.name;

        // Check for duplicates with existing variables
        if (this.definedVariables.has(name)) {
          this.addError(`Duplicate variable definition: "${name}"`, assignment.name.span);
        } else if (this.definedAgents.has(name)) {
          this.addError(`Variable "${name}" conflicts with agent name`, assignment.name.span);
        } else {
          // Register the variable (parallel assignments are implicitly const-like but we treat as let)
          this.definedVariables.set(name, {
            name,
            isConst: false,
            span: assignment.name.span,
          });
        }
      }

      // Validate the statement
      this.validateStatement(stmt);
    }
  }

  /**
   * Validate a repeat block
   */
  private validateRepeatBlock(repeat: RepeatBlockNode): void {
    // Validate count is positive
    if (repeat.count.value <= 0) {
      this.addError(
        `Repeat count must be positive, got ${repeat.count.value}`,
        repeat.count.span
      );
    }

    // Validate count is an integer
    if (!Number.isInteger(repeat.count.value)) {
      this.addError(
        `Repeat count must be an integer, got ${repeat.count.value}`,
        repeat.count.span
      );
    }

    // If there's an index variable, temporarily add it to scope
    const savedVariables = new Map(this.definedVariables);
    if (repeat.indexVar) {
      const indexName = repeat.indexVar.name;
      // Check for shadowing
      if (this.definedVariables.has(indexName)) {
        this.addWarning(
          `Loop variable "${indexName}" shadows outer variable`,
          repeat.indexVar.span
        );
      }
      this.definedVariables.set(indexName, {
        name: indexName,
        isConst: true,  // Loop variables are implicitly const within each iteration
        span: repeat.indexVar.span,
      });
    }

    // Validate body statements
    for (const stmt of repeat.body) {
      this.validateStatement(stmt);
    }

    // Restore previous scope
    this.definedVariables = savedVariables;
  }

  /**
   * Validate a for-each block
   */
  private validateForEachBlock(forEach: ForEachBlockNode): void {
    // Validate collection reference if it's an identifier
    if (forEach.collection.type === 'Identifier') {
      const collectionName = (forEach.collection as IdentifierNode).name;
      if (!this.definedVariables.has(collectionName)) {
        this.addError(
          `Undefined collection variable: "${collectionName}"`,
          forEach.collection.span
        );
      }
    }

    // Temporarily add loop variables to scope
    const savedVariables = new Map(this.definedVariables);

    // Add item variable
    const itemName = forEach.itemVar.name;
    if (this.definedVariables.has(itemName)) {
      this.addWarning(
        `Loop variable "${itemName}" shadows outer variable`,
        forEach.itemVar.span
      );
    }
    this.definedVariables.set(itemName, {
      name: itemName,
      isConst: true,  // Loop variables are implicitly const within each iteration
      span: forEach.itemVar.span,
    });

    // Add index variable if present
    if (forEach.indexVar) {
      const indexName = forEach.indexVar.name;
      if (this.definedVariables.has(indexName)) {
        this.addWarning(
          `Loop index variable "${indexName}" shadows outer variable`,
          forEach.indexVar.span
        );
      }
      this.definedVariables.set(indexName, {
        name: indexName,
        isConst: true,
        span: forEach.indexVar.span,
      });
    }

    // Validate body statements
    for (const stmt of forEach.body) {
      this.validateStatement(stmt);
    }

    // Restore previous scope
    this.definedVariables = savedVariables;
  }

  /**
   * Validate a loop block (unbounded - Tier 9)
   */
  private validateLoopBlock(loop: LoopBlockNode): void {
    // Warn about infinite loops without safety limits
    if (loop.variant === 'loop' && !loop.maxIterations) {
      this.addWarning(
        'Unbounded loop without max iterations. Consider adding (max: N) for safety.',
        loop.span
      );
    }

    // Validate max iterations if specified
    if (loop.maxIterations) {
      if (loop.maxIterations.value <= 0) {
        this.addError(
          `Max iterations must be positive, got ${loop.maxIterations.value}`,
          loop.maxIterations.span
        );
      }
      if (!Number.isInteger(loop.maxIterations.value)) {
        this.addError(
          `Max iterations must be an integer, got ${loop.maxIterations.value}`,
          loop.maxIterations.span
        );
      }
    }

    // Validate condition if present (for until/while variants)
    if (loop.condition) {
      this.validateDiscretion(loop.condition);
    }

    // If there's an iteration variable, temporarily add it to scope
    const savedVariables = new Map(this.definedVariables);
    if (loop.iterationVar) {
      const indexName = loop.iterationVar.name;
      // Check for shadowing
      if (this.definedVariables.has(indexName)) {
        this.addWarning(
          `Loop variable "${indexName}" shadows outer variable`,
          loop.iterationVar.span
        );
      }
      this.definedVariables.set(indexName, {
        name: indexName,
        isConst: true,  // Loop variables are implicitly const within each iteration
        span: loop.iterationVar.span,
      });
    }

    // Validate body statements
    for (const stmt of loop.body) {
      this.validateStatement(stmt);
    }

    // Restore previous scope
    this.definedVariables = savedVariables;
  }

  /**
   * Validate a try/catch/finally block (Tier 11)
   */
  private validateTryBlock(tryBlock: TryBlockNode): void {
    // Must have at least catch or finally
    if (!tryBlock.catchBody && !tryBlock.finallyBody) {
      this.addError(
        'Try block must have at least "catch:" or "finally:"',
        tryBlock.span
      );
    }

    // Validate try body
    for (const stmt of tryBlock.tryBody) {
      this.validateStatement(stmt);
    }

    // Validate catch body if present
    if (tryBlock.catchBody) {
      // If there's an error variable, temporarily add it to scope
      const savedVariables = new Map(this.definedVariables);

      if (tryBlock.errorVar) {
        const errorName = tryBlock.errorVar.name;
        // Check for shadowing
        if (this.definedVariables.has(errorName)) {
          this.addWarning(
            `Error variable "${errorName}" shadows outer variable`,
            tryBlock.errorVar.span
          );
        }
        this.definedVariables.set(errorName, {
          name: errorName,
          isConst: true,  // Error variables are implicitly const
          span: tryBlock.errorVar.span,
        });
      }

      for (const stmt of tryBlock.catchBody) {
        this.validateStatement(stmt);
      }

      // Restore previous scope
      this.definedVariables = savedVariables;
    }

    // Validate finally body if present
    if (tryBlock.finallyBody) {
      for (const stmt of tryBlock.finallyBody) {
        this.validateStatement(stmt);
      }
    }
  }

  /**
   * Validate a throw statement (Tier 11)
   */
  private validateThrowStatement(throwStmt: ThrowStatementNode): void {
    // Validate message if present
    if (throwStmt.message) {
      if (!throwStmt.message.value.trim()) {
        this.addWarning(
          'Throw message is empty',
          throwStmt.message.span
        );
      }
    }
    // Note: throw without message is valid (rethrow)
  }

  /**
   * Validate a pipe expression (items | map: ... | filter: ...)
   */
  private validatePipeExpression(pipe: PipeExpressionNode): void {
    // Validate input expression
    if (pipe.input.type === 'Identifier') {
      const inputName = (pipe.input as IdentifierNode).name;
      if (!this.definedVariables.has(inputName)) {
        this.addError(
          `Undefined collection variable: "${inputName}"`,
          pipe.input.span
        );
      }
    }

    // Validate each operation in the chain
    for (const operation of pipe.operations) {
      this.validatePipeOperation(operation);
    }
  }

  /**
   * Validate a single pipe operation (map, filter, reduce, pmap)
   */
  private validatePipeOperation(operation: PipeOperationNode): void {
    // Save current scope
    const savedVariables = new Map(this.definedVariables);

    // Add implicit/explicit variables to scope based on operator type
    if (operation.operator === 'reduce') {
      // For reduce, acc and item are explicit
      if (operation.accVar) {
        const accName = operation.accVar.name;
        if (this.definedVariables.has(accName)) {
          this.addWarning(
            `Reduce accumulator variable "${accName}" shadows outer variable`,
            operation.accVar.span
          );
        }
        this.definedVariables.set(accName, {
          name: accName,
          isConst: true,
          span: operation.accVar.span,
        });
      }
      if (operation.itemVar) {
        const itemName = operation.itemVar.name;
        if (this.definedVariables.has(itemName)) {
          this.addWarning(
            `Reduce item variable "${itemName}" shadows outer variable`,
            operation.itemVar.span
          );
        }
        this.definedVariables.set(itemName, {
          name: itemName,
          isConst: true,
          span: operation.itemVar.span,
        });
      }
    } else {
      // For map, filter, pmap: 'item' is implicit
      // Check if 'item' shadows an outer variable (warning only)
      if (this.definedVariables.has('item')) {
        this.addWarning(
          `Implicit pipeline variable "item" shadows outer variable`,
          operation.span
        );
      }
      this.definedVariables.set('item', {
        name: 'item',
        isConst: true,
        span: operation.span,
      });
    }

    // Validate body statements
    for (const stmt of operation.body) {
      this.validateStatement(stmt);
    }

    // Restore previous scope
    this.definedVariables = savedVariables;
  }

  /**
   * Validate a discretion node (AI-evaluated expression)
   */
  private validateDiscretion(discretion: DiscretionNode): void {
    // Validate that the expression is not empty
    if (!discretion.expression || discretion.expression.trim().length === 0) {
      this.addError('Discretion condition cannot be empty', discretion.span);
    }

    // Warn on very short conditions that might be ambiguous
    if (discretion.expression && discretion.expression.trim().length < 3) {
      this.addWarning(
        'Discretion condition is very short and may be ambiguous',
        discretion.span
      );
    }
  }

  /**
   * Validate an arrow expression (session -> session)
   */
  private validateArrowExpression(arrow: ArrowExpressionNode): void {
    // Validate left side
    this.validateExpressionInArrow(arrow.left);

    // Validate right side
    this.validateExpressionInArrow(arrow.right);
  }

  /**
   * Validate an expression in an arrow sequence
   */
  private validateExpressionInArrow(expr: ExpressionNode): void {
    if (expr.type === 'SessionStatement') {
      this.validateSessionStatement(expr as SessionStatementNode);
    } else if (expr.type === 'DoBlock') {
      this.validateDoBlock(expr as DoBlockNode);
    } else if (expr.type === 'TryBlock') {
      this.validateTryBlock(expr as TryBlockNode);
    } else if (expr.type === 'ArrowExpression') {
      this.validateArrowExpression(expr as ArrowExpressionNode);
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
    } else if (expr.type === 'DoBlock') {
      this.validateDoBlock(expr as DoBlockNode);
    } else if (expr.type === 'ParallelBlock') {
      this.validateParallelBlock(expr as ParallelBlockNode);
    } else if (expr.type === 'RepeatBlock') {
      this.validateRepeatBlock(expr as RepeatBlockNode);
    } else if (expr.type === 'ForEachBlock') {
      this.validateForEachBlock(expr as ForEachBlockNode);
    } else if (expr.type === 'LoopBlock') {
      this.validateLoopBlock(expr as LoopBlockNode);
    } else if (expr.type === 'TryBlock') {
      this.validateTryBlock(expr as TryBlockNode);
    } else if (expr.type === 'ArrowExpression') {
      this.validateArrowExpression(expr as ArrowExpressionNode);
    } else if (expr.type === 'PipeExpression') {
      this.validatePipeExpression(expr as PipeExpressionNode);
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
      case 'retry':
        if (context !== 'session') {
          this.addWarning('Retry property is only valid in session statements', prop.name.span);
        } else {
          this.validateRetryProperty(prop);
        }
        break;
      case 'backoff':
        if (context !== 'session') {
          this.addWarning('Backoff property is only valid in session statements', prop.name.span);
        } else {
          this.validateBackoffProperty(prop);
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
   * - context: { a, b, c } (object shorthand - pass multiple named results)
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
    } else if (value.type === 'ObjectExpression') {
      // Object context shorthand: { a, b, c }
      const objValue = value as ObjectExpressionNode;
      for (const propItem of objValue.properties) {
        // For shorthand properties, the name is also the variable reference
        const varName = propItem.name.name;
        if (!this.definedVariables.has(varName)) {
          this.addError(`Undefined variable in context: "${varName}"`, propItem.name.span);
        }
      }
    } else {
      this.addError('Context must be a variable reference, an array of variable references, or an object { a, b, c }', value.span);
    }
  }

  /**
   * Validate retry property (Tier 11)
   * retry: 3
   */
  private validateRetryProperty(prop: PropertyNode): void {
    if (prop.value.type !== 'NumberLiteral') {
      this.addError('Retry must be a number', prop.value.span);
      return;
    }

    const retryValue = (prop.value as NumberLiteralNode).value;

    // Must be positive integer
    if (retryValue <= 0) {
      this.addError(
        `Retry count must be positive, got ${retryValue}`,
        prop.value.span
      );
    }

    if (!Number.isInteger(retryValue)) {
      this.addError(
        `Retry count must be an integer, got ${retryValue}`,
        prop.value.span
      );
    }

    // Warn if retry count seems excessive
    if (retryValue > 10) {
      this.addWarning(
        `Retry count ${retryValue} is unusually high. Consider a lower value.`,
        prop.value.span
      );
    }
  }

  /**
   * Validate backoff property (Tier 11)
   * backoff: "none" | "linear" | "exponential"
   */
  private validateBackoffProperty(prop: PropertyNode): void {
    if (prop.value.type !== 'StringLiteral') {
      this.addError('Backoff must be a string ("none", "linear", or "exponential")', prop.value.span);
      return;
    }

    const backoffValue = (prop.value as StringLiteralNode).value;
    const validBackoffStrategies = ['none', 'linear', 'exponential'];

    if (!validBackoffStrategies.includes(backoffValue)) {
      this.addError(
        `Invalid backoff strategy: "${backoffValue}". Must be one of: ${validBackoffStrategies.join(', ')}`,
        prop.value.span
      );
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
