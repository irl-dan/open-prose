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
  ChoiceBlockNode,
  ChoiceOptionNode,
  IfStatementNode,
  ElseIfClauseNode,
  InterpolatedStringNode,
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
  declarationLine: number;  // Track declaration order for use-before-declare checks
}

/** Scope for tracking variables in nested contexts */
interface Scope {
  variables: Map<string, VariableBinding>;
  type: 'global' | 'block' | 'loop' | 'function' | 'try' | 'catch';
}

export class Validator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private definedAgents: Map<string, AgentDefinitionNode> = new Map();
  private importedSkills: Map<string, ImportStatementNode> = new Map();
  private definedBlocks: Map<string, BlockDefinitionNode> = new Map();

  // Scope chain for proper variable tracking
  private scopeStack: Scope[] = [];

  // Track whether we've seen non-import statements (for import ordering)
  private seenNonImportStatement: boolean = false;
  private firstNonImportSpan: SourceSpan | null = null;

  // Track nesting depth to detect nested definitions
  private nestingDepth: number = 0;

  constructor(private program: ProgramNode) {}

  // ========== Scope Chain Methods ==========

  /**
   * Push a new scope onto the stack
   */
  private pushScope(type: Scope['type']): void {
    this.scopeStack.push({
      variables: new Map(),
      type,
    });
  }

  /**
   * Pop the current scope from the stack
   */
  private popScope(): void {
    this.scopeStack.pop();
  }

  /**
   * Define a variable in the current scope
   */
  private defineVariable(name: string, binding: VariableBinding): void {
    if (this.scopeStack.length === 0) {
      // Should not happen, but safety check
      return;
    }
    const currentScope = this.scopeStack[this.scopeStack.length - 1];

    // Check for duplicate in current scope ONLY
    if (currentScope.variables.has(name)) {
      this.addError(`Duplicate variable definition: "${name}"`, binding.span);
      return;
    }

    // Check for conflict with agents
    if (this.definedAgents.has(name)) {
      this.addError(`Variable "${name}" conflicts with agent name`, binding.span);
      return;
    }

    // Check for shadowing in OUTER scopes only (warning only)
    // Skip the current scope when checking for shadowing
    for (let i = this.scopeStack.length - 2; i >= 0; i--) {
      if (this.scopeStack[i].variables.has(name)) {
        this.addWarning(`Variable "${name}" shadows outer variable`, binding.span);
        break;
      }
    }

    currentScope.variables.set(name, binding);
  }

  /**
   * Look up a variable in the scope chain (innermost to outermost)
   */
  private lookupVariable(name: string): VariableBinding | null {
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      const binding = this.scopeStack[i].variables.get(name);
      if (binding) return binding;
    }
    return null;
  }

  /**
   * Check if a variable is defined in any scope
   */
  private isVariableDefined(name: string): boolean {
    return this.lookupVariable(name) !== null;
  }

  // ========== Main Validation ==========

  /**
   * Validate the program
   */
  public validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.definedAgents = new Map();
    this.importedSkills = new Map();
    this.definedBlocks = new Map();
    this.scopeStack = [];
    this.seenNonImportStatement = false;
    this.firstNonImportSpan = null;
    this.nestingDepth = 0;

    // Push global scope
    this.pushScope('global');

    // First pass: collect imports, agent definitions, and block definitions
    // (Variables are collected during validation for proper scope tracking)
    for (const statement of this.program.statements) {
      if (statement.type === 'ImportStatement') {
        this.collectImport(statement);
      } else if (statement.type === 'AgentDefinition') {
        this.collectAgentDefinition(statement);
      } else if (statement.type === 'BlockDefinition') {
        this.collectBlockDefinition(statement);
      }
    }

    // Second pass: validate all statements (variables collected during traversal)
    for (const statement of this.program.statements) {
      this.validateStatement(statement);
    }

    // Validate comments (minimal for now - just structure validation)
    for (const comment of this.program.comments) {
      this.validateComment(comment);
    }

    // Pop global scope
    this.popScope();

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
   * Validate a statement
   */
  private validateStatement(statement: StatementNode): void {
    // Track first non-import statement for import ordering validation
    if (statement.type !== 'ImportStatement' && statement.type !== 'CommentStatement') {
      if (!this.seenNonImportStatement) {
        this.seenNonImportStatement = true;
        this.firstNonImportSpan = statement.span;
      }
    }

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
      case 'ChoiceBlock':
        this.validateChoiceBlock(statement as ChoiceBlockNode);
        break;
      case 'IfStatement':
        this.validateIfStatement(statement as IfStatementNode);
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
      case 'PipeExpression':
        this.validatePipeExpression(statement as PipeExpressionNode);
        break;
      // Other statement types will be added in later tiers
    }
  }

  /**
   * Validate an import statement
   */
  private validateImportStatement(importStmt: ImportStatementNode): void {
    // Check import ordering - imports must come before other statements
    if (this.seenNonImportStatement) {
      this.addError('Import statements must appear at the top of the file', importStmt.span);
    }

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
    // Agent definitions must be at top level
    if (this.nestingDepth > 0) {
      this.addError('Agent definitions must be at top level', agent.span);
    }

    // Validate agent name
    if (!agent.name.name) {
      this.addError('Agent definition must have a name', agent.span);
    }

    // Validate properties
    const seenProps = new Set<string>();
    for (const prop of agent.properties) {
      this.validateProperty(prop, 'agent', seenProps);
    }

    // Check for required properties
    if (!seenProps.has('model')) {
      this.addError('Agent definition requires "model" property', agent.span);
    }
    if (!seenProps.has('prompt')) {
      this.addError('Agent definition requires "prompt" property', agent.span);
    }
  }

  /**
   * Validate a block definition
   */
  private validateBlockDefinition(block: BlockDefinitionNode): void {
    // Block definitions must be at top level
    if (this.nestingDepth > 0) {
      this.addError('Block definitions must be at top level', block.span);
    }

    // Validate block name
    if (!block.name.name) {
      this.addError('Block definition must have a name', block.span);
    }

    // Validate body is not empty
    if (block.body.length === 0) {
      this.addError('Block body cannot be empty', block.span);
    }

    // Check for duplicate parameter names
    const paramNames = new Set<string>();
    for (const param of block.parameters) {
      if (paramNames.has(param.name)) {
        this.addError(`Duplicate parameter name: "${param.name}"`, param.span);
      } else {
        paramNames.add(param.name);
      }
    }

    // Push new scope for block body
    this.pushScope('function');
    this.nestingDepth++;

    // Add parameters to scope
    for (const param of block.parameters) {
      this.defineVariable(param.name, {
        name: param.name,
        isConst: true,  // Block parameters are implicitly const
        span: param.span,
        declarationLine: param.span.start.line,
      });
    }

    // Validate body statements
    for (const stmt of block.body) {
      this.validateStatement(stmt);
    }

    // Pop scope
    this.nestingDepth--;
    this.popScope();
  }

  /**
   * Validate a do block (anonymous or invocation)
   * Anonymous do blocks allow variable shadowing but non-shadowed variables escape.
   */
  private validateDoBlock(doBlock: DoBlockNode): void {
    if (doBlock.name) {
      // Block invocation: do blockname or do blockname(args)
      const blockName = doBlock.name.name;
      if (!this.definedBlocks.has(blockName)) {
        this.addError(`Undefined block: "${blockName}"`, doBlock.name.span);
      } else {
        // Check argument count matches parameter count
        const blockDef = this.definedBlocks.get(blockName)!;
        const expectedParams = blockDef.parameters.length;
        const providedArgs = doBlock.arguments.length;

        if (expectedParams !== providedArgs) {
          this.addError(
            `Block "${blockName}" expects ${expectedParams} argument(s), but ${providedArgs} provided`,
            doBlock.span
          );
        }

        // Validate each argument expression
        for (const arg of doBlock.arguments) {
          this.validateBindingExpression(arg);
        }
      }
    } else {
      // Anonymous do block: push a scope for shadowing support,
      // but non-shadowed variables will be hoisted to parent scope
      this.pushScope('block');
      for (const stmt of doBlock.body) {
        this.validateDoBlockStatement(stmt);
      }
      this.popScope();
    }
  }

  /**
   * Validate a statement inside a do block.
   * Non-shadowed let/const bindings are hoisted to the outermost non-block scope.
   */
  private validateDoBlockStatement(statement: StatementNode): void {
    if (statement.type === 'LetBinding') {
      const binding = statement as LetBindingNode;
      const name = binding.name.name;

      // Check if this name exists in outer scopes (for shadowing)
      const isShadowing = this.lookupVariableInOuterScopes(name);

      // Validate the value expression first (in current scope)
      this.validateBindingExpression(binding.value);

      if (isShadowing) {
        // Variable shadows outer scope - define in CURRENT scope only
        this.addWarning(`Variable "${name}" shadows outer variable`, binding.name.span);
        this.defineVariableInCurrentScope(name, {
          name,
          isConst: false,
          span: binding.name.span,
          declarationLine: binding.span.start.line,
        });
      } else {
        // No shadowing - define in the outermost block scope (escape through nested do blocks)
        const targetScope = this.findEscapeTargetScope();
        if (targetScope) {
          // Check for duplicate in target scope
          if (targetScope.variables.has(name)) {
            this.addError(`Duplicate variable definition: "${name}"`, binding.name.span);
            return;
          }
          // Check for conflict with agents
          if (this.definedAgents.has(name)) {
            this.addError(`Variable "${name}" conflicts with agent name`, binding.name.span);
            return;
          }
          targetScope.variables.set(name, {
            name,
            isConst: false,
            span: binding.name.span,
            declarationLine: binding.span.start.line,
          });
        }
      }
    } else if (statement.type === 'ConstBinding') {
      const binding = statement as ConstBindingNode;
      const name = binding.name.name;

      // Check if this name exists in outer scopes (for shadowing)
      const isShadowing = this.lookupVariableInOuterScopes(name);

      // Validate the value expression first (in current scope)
      this.validateBindingExpression(binding.value);

      if (isShadowing) {
        // Variable shadows outer scope - define in CURRENT scope only
        this.addWarning(`Variable "${name}" shadows outer variable`, binding.name.span);
        this.defineVariableInCurrentScope(name, {
          name,
          isConst: true,
          span: binding.name.span,
          declarationLine: binding.span.start.line,
        });
      } else {
        // No shadowing - define in the outermost block scope (escape through nested do blocks)
        const targetScope = this.findEscapeTargetScope();
        if (targetScope) {
          // Check for duplicate in target scope
          if (targetScope.variables.has(name)) {
            this.addError(`Duplicate variable definition: "${name}"`, binding.name.span);
            return;
          }
          // Check for conflict with agents
          if (this.definedAgents.has(name)) {
            this.addError(`Variable "${name}" conflicts with agent name`, binding.name.span);
            return;
          }
          targetScope.variables.set(name, {
            name,
            isConst: true,
            span: binding.name.span,
            declarationLine: binding.span.start.line,
          });
        }
      }
    } else if (statement.type === 'DoBlock') {
      // Nested do block - recurse with the same special handling
      this.validateDoBlock(statement as DoBlockNode);
    } else {
      // For other statements, validate normally
      this.validateStatement(statement);
    }
  }

  /**
   * Find the scope that variables should escape to.
   * This walks up the scope stack and finds the first non-block scope,
   * or the global scope if we're in nested do blocks.
   */
  private findEscapeTargetScope(): Scope | null {
    // Walk up from parent scope (skip current)
    for (let i = this.scopeStack.length - 2; i >= 0; i--) {
      const scope = this.scopeStack[i];
      // If this is not a 'block' scope type, or if it's the global scope (index 0), use it
      if (scope.type !== 'block' || i === 0) {
        return scope;
      }
    }
    return null;
  }

  /**
   * Look up a variable in outer scopes only (excluding current scope)
   */
  private lookupVariableInOuterScopes(name: string): boolean {
    for (let i = this.scopeStack.length - 2; i >= 0; i--) {
      if (this.scopeStack[i].variables.has(name)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Define a variable in current scope only (without shadowing warning)
   */
  private defineVariableInCurrentScope(name: string, binding: VariableBinding): void {
    if (this.scopeStack.length === 0) {
      return;
    }
    const currentScope = this.scopeStack[this.scopeStack.length - 1];
    currentScope.variables.set(name, binding);
  }

  /**
   * Validate a parallel block
   */
  private validateParallelBlock(parallel: ParallelBlockNode): void {
    // Validate body is not empty
    if (parallel.body.length === 0) {
      this.addError('Parallel block body cannot be empty', parallel.span);
    }

    // Validate join strategy if specified
    if (parallel.joinStrategy) {
      const strategy = parallel.joinStrategy.value;
      if (!VALID_JOIN_STRATEGIES.includes(strategy)) {
        this.addError(
          `Invalid join strategy: "${strategy}". Must be one of: ${VALID_JOIN_STRATEGIES.join(', ')}`,
          parallel.joinStrategy.span
        );
      }

      // Validate branch count for strategies
      if ((strategy === 'first' || strategy === 'any') && parallel.body.length < 2) {
        this.addError(
          `Parallel with "${strategy}" strategy needs at least 2 branches`,
          parallel.span
        );
      }

      // "any" strategy should have count
      if (strategy === 'any' && !parallel.anyCount) {
        this.addWarning(
          'Parallel "any" strategy should specify count parameter',
          parallel.span
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

    // For parallel blocks, variables defined inside are visible after the block completes
    // We pre-register let bindings in the current (outer) scope before pushing a new scope
    for (const stmt of parallel.body) {
      if (stmt.type === 'LetBinding') {
        const binding = stmt as LetBindingNode;
        this.defineVariable(binding.name.name, {
          name: binding.name.name,
          isConst: false,
          span: binding.name.span,
          declarationLine: binding.span.start.line,
        });
      } else if (stmt.type === 'ConstBinding') {
        const binding = stmt as ConstBindingNode;
        this.defineVariable(binding.name.name, {
          name: binding.name.name,
          isConst: true,
          span: binding.name.span,
          declarationLine: binding.span.start.line,
        });
      } else if (stmt.type === 'Assignment') {
        const assignment = stmt as AssignmentNode;
        const name = assignment.name.name;
        // For assignments, only register if not already defined
        if (!this.isVariableDefined(name)) {
          this.defineVariable(name, {
            name,
            isConst: false,
            span: assignment.name.span,
            declarationLine: assignment.span.start.line,
          });
        }
      }
    }

    // Push new scope for parallel block body validation
    // (inner scope for any temporary variables, but main bindings are in parent scope)
    this.pushScope('block');
    this.nestingDepth++;

    // Validate statements in parallel block
    for (const stmt of parallel.body) {
      // Skip re-defining variables since we pre-registered them above
      if (stmt.type === 'LetBinding' || stmt.type === 'ConstBinding') {
        // Just validate the value expression
        const binding = stmt as LetBindingNode | ConstBindingNode;
        this.validateBindingExpression(binding.value);
      } else {
        // Validate the statement normally
        this.validateStatement(stmt);
      }
    }

    // Pop scope
    this.nestingDepth--;
    this.popScope();
  }

  /**
   * Validate a repeat block
   */
  private validateRepeatBlock(repeat: RepeatBlockNode): void {
    // Validate count based on type
    if (repeat.count.type === 'NumberLiteral') {
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
    } else if (repeat.count.type === 'Identifier') {
      // Variable count - check if the variable is defined
      const varName = repeat.count.name;
      if (!this.isVariableDefined(varName)) {
        this.addError(
          `Undefined variable: "${varName}"`,
          repeat.count.span
        );
      }
      // Runtime will need to validate the value is a positive integer
    }

    // Push new scope for repeat body
    this.pushScope('loop');
    this.nestingDepth++;

    // If there's an index variable, add it to scope
    if (repeat.indexVar) {
      this.defineVariable(repeat.indexVar.name, {
        name: repeat.indexVar.name,
        isConst: true,  // Loop variables are implicitly const within each iteration
        span: repeat.indexVar.span,
        declarationLine: repeat.indexVar.span.start.line,
      });
    }

    // Validate body statements
    for (const stmt of repeat.body) {
      this.validateStatement(stmt);
    }

    // Pop scope
    this.nestingDepth--;
    this.popScope();
  }

  /**
   * Validate a for-each block
   */
  private validateForEachBlock(forEach: ForEachBlockNode): void {
    // Validate collection reference if it's an identifier
    if (forEach.collection.type === 'Identifier') {
      const collectionName = (forEach.collection as IdentifierNode).name;
      if (!this.isVariableDefined(collectionName)) {
        this.addError(
          `Undefined collection variable: "${collectionName}"`,
          forEach.collection.span
        );
      }
    }

    // Push new scope for loop body
    this.pushScope('loop');
    this.nestingDepth++;

    // Add item variable
    this.defineVariable(forEach.itemVar.name, {
      name: forEach.itemVar.name,
      isConst: true,  // Loop variables are implicitly const within each iteration
      span: forEach.itemVar.span,
      declarationLine: forEach.itemVar.span.start.line,
    });

    // Add index variable if present
    if (forEach.indexVar) {
      this.defineVariable(forEach.indexVar.name, {
        name: forEach.indexVar.name,
        isConst: true,
        span: forEach.indexVar.span,
        declarationLine: forEach.indexVar.span.start.line,
      });
    }

    // Validate body statements
    for (const stmt of forEach.body) {
      this.validateStatement(stmt);
    }

    // Pop scope
    this.nestingDepth--;
    this.popScope();
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

    // Push new scope for loop body
    this.pushScope('loop');
    this.nestingDepth++;

    // If there's an iteration variable, add it to scope
    if (loop.iterationVar) {
      this.defineVariable(loop.iterationVar.name, {
        name: loop.iterationVar.name,
        isConst: true,  // Loop variables are implicitly const within each iteration
        span: loop.iterationVar.span,
        declarationLine: loop.iterationVar.span.start.line,
      });
    }

    // Validate body statements
    for (const stmt of loop.body) {
      this.validateStatement(stmt);
    }

    // Pop scope
    this.nestingDepth--;
    this.popScope();
  }

  /**
   * Validate a try/catch/finally block (Tier 11)
   * Note: Variables defined inside try/catch/finally are visible after the block.
   * Only the error variable in catch is scoped to the catch block.
   */
  private validateTryBlock(tryBlock: TryBlockNode): void {
    // Must have at least catch or finally
    if (!tryBlock.catchBody && !tryBlock.finallyBody) {
      this.addError(
        'Try block must have at least "catch:" or "finally:"',
        tryBlock.span
      );
    }

    // Validate try body (no new scope - variables escape to parent)
    for (const stmt of tryBlock.tryBody) {
      this.validateStatement(stmt);
    }

    // Validate catch body if present
    if (tryBlock.catchBody) {
      // Push a scope ONLY for the error variable
      // let/const bindings should go to the parent scope
      this.pushScope('catch');

      // If there's an error variable, add it to the catch scope
      if (tryBlock.errorVar) {
        this.defineVariable(tryBlock.errorVar.name, {
          name: tryBlock.errorVar.name,
          isConst: true,  // Error variables are implicitly const
          span: tryBlock.errorVar.span,
          declarationLine: tryBlock.errorVar.span.start.line,
        });
      }

      // Validate catch body, but let/const bindings should escape
      for (const stmt of tryBlock.catchBody) {
        this.validateCatchStatement(stmt);
      }

      this.popScope();
    }

    // Validate finally body if present (no new scope)
    if (tryBlock.finallyBody) {
      for (const stmt of tryBlock.finallyBody) {
        this.validateStatement(stmt);
      }
    }
  }

  /**
   * Validate a statement inside a catch block.
   * let/const bindings are defined in the parent scope (before the catch scope).
   */
  private validateCatchStatement(statement: StatementNode): void {
    if (statement.type === 'LetBinding') {
      const binding = statement as LetBindingNode;
      // Validate the value expression first (in current scope, which includes error var)
      this.validateBindingExpression(binding.value);

      // Define the variable in the PARENT scope (before the catch scope)
      if (this.scopeStack.length >= 2) {
        const parentScope = this.scopeStack[this.scopeStack.length - 2];
        const name = binding.name.name;

        // Check for duplicate in parent scope
        if (parentScope.variables.has(name)) {
          this.addError(`Duplicate variable definition: "${name}"`, binding.name.span);
          return;
        }
        // Check for conflict with agents
        if (this.definedAgents.has(name)) {
          this.addError(`Variable "${name}" conflicts with agent name`, binding.name.span);
          return;
        }

        parentScope.variables.set(name, {
          name,
          isConst: false,
          span: binding.name.span,
          declarationLine: binding.span.start.line,
        });
      }
    } else if (statement.type === 'ConstBinding') {
      const binding = statement as ConstBindingNode;
      // Validate the value expression first (in current scope, which includes error var)
      this.validateBindingExpression(binding.value);

      // Define the variable in the PARENT scope (before the catch scope)
      if (this.scopeStack.length >= 2) {
        const parentScope = this.scopeStack[this.scopeStack.length - 2];
        const name = binding.name.name;

        // Check for duplicate in parent scope
        if (parentScope.variables.has(name)) {
          this.addError(`Duplicate variable definition: "${name}"`, binding.name.span);
          return;
        }
        // Check for conflict with agents
        if (this.definedAgents.has(name)) {
          this.addError(`Variable "${name}" conflicts with agent name`, binding.name.span);
          return;
        }

        parentScope.variables.set(name, {
          name,
          isConst: true,
          span: binding.name.span,
          declarationLine: binding.span.start.line,
        });
      }
    } else {
      // For other statements, validate normally
      this.validateStatement(statement);
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
   * Validate a choice block (Tier 12)
   * Each option has its own isolated scope since only one option executes.
   * Variables defined in options do NOT escape to the parent scope.
   */
  private validateChoiceBlock(choice: ChoiceBlockNode): void {
    // Validate the criteria discretion
    this.validateDiscretion(choice.criteria);

    // Must have at least one option
    if (choice.options.length === 0) {
      this.addError('Choice block must have at least one option', choice.span);
    }

    // Validate each option
    const seenLabels = new Set<string>();
    for (const option of choice.options) {
      // Check for duplicate option labels
      if (seenLabels.has(option.label.value)) {
        this.addWarning(
          `Duplicate option label: "${option.label.value}"`,
          option.label.span
        );
      }
      seenLabels.add(option.label.value);

      // Each option has its own isolated scope
      // Variables don't escape because only one option executes
      this.pushScope('block');
      for (const stmt of option.body) {
        this.validateStatement(stmt);
      }
      this.popScope();
    }
  }

  /**
   * Validate an if/elif/else statement (Tier 12)
   * Note: Unlike traditional languages, OpenProse uses Python-like scoping
   * where variables defined inside if/else are visible after the block.
   */
  private validateIfStatement(ifStmt: IfStatementNode): void {
    // Validate body is not empty
    if (ifStmt.thenBody.length === 0) {
      this.addError('If body cannot be empty', ifStmt.span);
    }

    // Validate the main if condition
    this.validateDiscretion(ifStmt.condition);

    // Validate then body (no new scope - variables escape to parent)
    for (const stmt of ifStmt.thenBody) {
      this.validateStatement(stmt);
    }

    // Validate elif clauses
    for (const elifClause of ifStmt.elseIfClauses) {
      this.validateDiscretion(elifClause.condition);
      for (const stmt of elifClause.body) {
        this.validateStatement(stmt);
      }
    }

    // Validate else body if present
    if (ifStmt.elseBody) {
      for (const stmt of ifStmt.elseBody) {
        this.validateStatement(stmt);
      }
    }
  }

  /**
   * Validate a pipe expression (items | map: ... | filter: ...)
   */
  private validatePipeExpression(pipe: PipeExpressionNode): void {
    // Validate input expression
    if (pipe.input.type === 'Identifier') {
      const inputName = (pipe.input as IdentifierNode).name;
      if (!this.isVariableDefined(inputName)) {
        this.addError(
          `Undefined collection variable: "${inputName}"`,
          pipe.input.span
        );
      }
    }

    // Must have at least one operation
    if (pipe.operations.length === 0) {
      this.addError('Pipeline must have at least one operation', pipe.span);
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
    // Validate that the operation has a body
    if (operation.body.length === 0) {
      this.addError('Pipeline operation body cannot be empty', operation.span);
    }

    // Validate that reduce has required parameters
    if (operation.operator === 'reduce') {
      if (!operation.accVar || !operation.itemVar) {
        this.addError(
          'Reduce operation requires (accumulator, item) parameters',
          operation.span
        );
      }
    }

    // Push new scope for operation body
    this.pushScope('block');

    // Add implicit/explicit variables to scope based on operator type
    if (operation.operator === 'reduce') {
      // For reduce, acc and item are explicit
      if (operation.accVar) {
        this.defineVariable(operation.accVar.name, {
          name: operation.accVar.name,
          isConst: true,
          span: operation.accVar.span,
          declarationLine: operation.accVar.span.start.line,
        });
      }
      if (operation.itemVar) {
        this.defineVariable(operation.itemVar.name, {
          name: operation.itemVar.name,
          isConst: true,
          span: operation.itemVar.span,
          declarationLine: operation.itemVar.span.start.line,
        });
      }
    } else {
      // For map, filter, pmap: 'item' is implicit
      this.defineVariable('item', {
        name: 'item',
        isConst: true,
        span: operation.span,
        declarationLine: operation.span.start.line,
      });
    }

    // Validate body statements
    for (const stmt of operation.body) {
      this.validateStatement(stmt);
    }

    // Pop scope
    this.popScope();
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
    } else if (expr.type === 'ChoiceBlock') {
      this.validateChoiceBlock(expr as ChoiceBlockNode);
    } else if (expr.type === 'IfStatement') {
      this.validateIfStatement(expr as IfStatementNode);
    } else if (expr.type === 'ArrowExpression') {
      this.validateArrowExpression(expr as ArrowExpressionNode);
    }
  }

  /**
   * Validate a let binding
   */
  private validateLetBinding(binding: LetBindingNode): void {
    // Validate the value expression first
    this.validateBindingExpression(binding.value);

    // Define the variable in current scope
    this.defineVariable(binding.name.name, {
      name: binding.name.name,
      isConst: false,
      span: binding.name.span,
      declarationLine: binding.span.start.line,
    });
  }

  /**
   * Validate a const binding
   */
  private validateConstBinding(binding: ConstBindingNode): void {
    // Validate the value expression first
    this.validateBindingExpression(binding.value);

    // Define the variable in current scope
    this.defineVariable(binding.name.name, {
      name: binding.name.name,
      isConst: true,
      span: binding.name.span,
      declarationLine: binding.span.start.line,
    });
  }

  /**
   * Validate an assignment statement
   */
  private validateAssignment(assignment: AssignmentNode): void {
    const name = assignment.name.name;

    // Check if the variable exists
    const binding = this.lookupVariable(name);
    if (!binding) {
      this.addError(`Undefined variable: "${name}"`, assignment.name.span);
      return;
    }

    // Check if trying to assign to a const
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
    } else if (expr.type === 'ChoiceBlock') {
      this.validateChoiceBlock(expr as ChoiceBlockNode);
    } else if (expr.type === 'IfStatement') {
      this.validateIfStatement(expr as IfStatementNode);
    } else if (expr.type === 'ArrowExpression') {
      this.validateArrowExpression(expr as ArrowExpressionNode);
    } else if (expr.type === 'PipeExpression') {
      this.validatePipeExpression(expr as PipeExpressionNode);
    } else if (expr.type === 'Identifier') {
      // Variable reference - check if it exists
      const name = (expr as IdentifierNode).name;
      if (!this.isVariableDefined(name) && !this.definedAgents.has(name)) {
        this.addError(`Undefined variable: "${name}"`, expr.span);
      }
    } else if (expr.type === 'StringLiteral') {
      // Validate interpolations in string literals
      this.validateInterpolatedString(expr as StringLiteralNode);
    }
    // Other expression types (arrays) are generally valid
  }

  /**
   * Validate a session statement
   */
  private validateSessionStatement(statement: SessionStatementNode): void {
    // Check if prompt is in properties
    const hasPromptProperty = statement.properties.some(p => p.name.name === 'prompt');

    // Session must have either a prompt (inline or property), or an agent reference
    if (!statement.prompt && !statement.agent && !hasPromptProperty) {
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
      if (!this.isVariableDefined(name)) {
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
        if (!this.isVariableDefined(name)) {
          this.addError(`Undefined variable in context: "${name}"`, element.span);
        }
      }
    } else if (value.type === 'ObjectExpression') {
      // Object context shorthand: { a, b, c }
      const objValue = value as ObjectExpressionNode;
      for (const propItem of objValue.properties) {
        // For shorthand properties, the name is also the variable reference
        const varName = propItem.name.name;
        if (!this.isVariableDefined(varName)) {
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
   * backoff: "none" | "linear" | "exponential" OR a number (delay in ms)
   */
  private validateBackoffProperty(prop: PropertyNode): void {
    // Accept either a string strategy or a number (delay in ms)
    if (prop.value.type === 'StringLiteral') {
      const backoffValue = (prop.value as StringLiteralNode).value;
      const validBackoffStrategies = ['none', 'linear', 'exponential'];

      if (!validBackoffStrategies.includes(backoffValue)) {
        this.addError(
          `Invalid backoff strategy: "${backoffValue}". Must be one of: ${validBackoffStrategies.join(', ')}`,
          prop.value.span
        );
      }
    } else if (prop.value.type === 'NumberLiteral') {
      const backoffValue = (prop.value as NumberLiteralNode).value;

      // Must be non-negative
      if (backoffValue < 0) {
        this.addError(
          `Backoff delay must be non-negative, got ${backoffValue}`,
          prop.value.span
        );
      }
    } else {
      this.addError('Backoff must be a string ("none", "linear", or "exponential") or a number (delay in ms)', prop.value.span);
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

    // Validate interpolations
    this.validateInterpolatedString(prompt);

    // Error on empty prompt
    if (prompt.value.length === 0) {
      this.addError('Session prompt cannot be empty', prompt.span);
      return;
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
   * Validate interpolated variables in a string literal
   */
  private validateInterpolatedString(str: StringLiteralNode): void {
    const value = str.value;

    // Replace escaped braces {{ and }} with placeholders for validation
    // ({{ and }} are valid escape sequences for literal braces)
    const normalizedValue = value.replace(/\{\{/g, '\x00').replace(/\}\}/g, '\x01');

    // Check for unclosed interpolation (open brace without matching close)
    // Pattern: { followed by chars (not { or }) with no matching }
    const unclosedMatch = normalizedValue.match(/\{[^{}\x00\x01]*$/);
    if (unclosedMatch) {
      this.addError('Unclosed interpolation brace', str.span);
      return;
    }

    // Validate each interpolated variable (on normalized value)
    const interpolationRegex = /\{(\w+)\}/g;
    let match;
    while ((match = interpolationRegex.exec(normalizedValue)) !== null) {
      const varName = match[1];
      if (!this.isVariableDefined(varName)) {
        this.addError(`Undefined variable in interpolation: "${varName}"`, str.span);
      }
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
