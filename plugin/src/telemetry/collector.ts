/**
 * TelemetryCollector - Extracts anonymous usage metrics from a compiled AST.
 *
 * Performs a single-pass recursive traversal of the AST to count feature usage.
 * Does NOT modify the AST or any parser/validator code.
 */

import type {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  SessionStatementNode,
  AgentDefinitionNode,
  ImportStatementNode,
  BlockDefinitionNode,
  DoBlockNode,
  ParallelBlockNode,
  LoopBlockNode,
  RepeatBlockNode,
  ForEachBlockNode,
  TryBlockNode,
  ThrowStatementNode,
  ChoiceBlockNode,
  IfStatementNode,
  LetBindingNode,
  ConstBindingNode,
  AssignmentNode,
  ArrowExpressionNode,
  PipeExpressionNode,
  InterpolatedStringNode,
  PropertyNode,
} from '../parser/ast';
import type {
  TelemetryPayload,
  FeatureUsage,
  LoopCounts,
  PipelineCounts,
} from './types';
import { getInstallId } from './config';

export class TelemetryCollector {
  private features: FeatureUsage;
  private models: Record<string, number> = {};
  private imports: Record<string, number> = {};
  private maxDepth = 0;
  private currentDepth = 0;

  constructor(
    private program: ProgramNode,
    private pluginVersion: string
  ) {
    this.features = this.createEmptyFeatures();
  }

  /**
   * Collect telemetry from the AST.
   * Returns a complete TelemetryPayload ready for transmission.
   */
  public collect(): TelemetryPayload {
    // Walk all top-level statements
    for (const statement of this.program.statements) {
      this.visitStatement(statement);
    }

    return {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      installId: getInstallId(),
      pluginVersion: this.pluginVersion,
      metrics: {
        lineCount: this.calculateLineCount(),
        statementCount: this.countStatements(this.program.statements),
        maxNestingDepth: this.maxDepth,
      },
      features: this.features,
      models: this.models,
      imports: this.imports,
    };
  }

  private visitStatement(stmt: StatementNode): void {
    switch (stmt.type) {
      case 'SessionStatement':
        this.visitSession(stmt);
        break;
      case 'AgentDefinition':
        this.visitAgentDefinition(stmt);
        break;
      case 'ImportStatement':
        this.visitImport(stmt);
        break;
      case 'BlockDefinition':
        this.visitBlockDefinition(stmt);
        break;
      case 'DoBlock':
        this.visitDoBlock(stmt);
        break;
      case 'ParallelBlock':
        this.visitParallelBlock(stmt);
        break;
      case 'LoopBlock':
        this.visitLoopBlock(stmt);
        break;
      case 'RepeatBlock':
        this.visitRepeatBlock(stmt);
        break;
      case 'ForEachBlock':
        this.visitForEachBlock(stmt);
        break;
      case 'TryBlock':
        this.visitTryBlock(stmt);
        break;
      case 'ThrowStatement':
        this.visitThrowStatement(stmt);
        break;
      case 'ChoiceBlock':
        this.visitChoiceBlock(stmt);
        break;
      case 'IfStatement':
        this.visitIfStatement(stmt);
        break;
      case 'LetBinding':
        this.visitLetBinding(stmt);
        break;
      case 'ConstBinding':
        this.visitConstBinding(stmt);
        break;
      case 'Assignment':
        this.visitAssignment(stmt);
        break;
      case 'ArrowExpression':
        this.visitArrowExpression(stmt);
        break;
      case 'PipeExpression':
        this.visitPipeExpression(stmt);
        break;
      case 'CommentStatement':
        // Comments don't count as features
        break;
    }
  }

  private visitExpression(expr: ExpressionNode): void {
    switch (expr.type) {
      case 'SessionStatement':
        this.visitSession(expr);
        break;
      case 'InterpolatedString':
        this.features.interpolatedStrings++;
        break;
      case 'Discretion':
        this.features.fourthWall++;
        break;
      case 'ArrowExpression':
        this.visitArrowExpression(expr);
        break;
      case 'PipeExpression':
        this.visitPipeExpression(expr);
        break;
      case 'DoBlock':
        this.visitDoBlock(expr);
        break;
      case 'ParallelBlock':
        this.visitParallelBlock(expr);
        break;
      case 'LoopBlock':
        this.visitLoopBlock(expr);
        break;
      case 'RepeatBlock':
        this.visitRepeatBlock(expr);
        break;
      case 'ForEachBlock':
        this.visitForEachBlock(expr);
        break;
      case 'TryBlock':
        this.visitTryBlock(expr);
        break;
      case 'ChoiceBlock':
        this.visitChoiceBlock(expr);
        break;
      case 'IfStatement':
        this.visitIfStatement(expr);
        break;
      case 'ArrayExpression':
        for (const element of expr.elements) {
          this.visitExpression(element);
        }
        break;
      case 'ObjectExpression':
        for (const prop of expr.properties) {
          this.visitExpression(prop.value);
        }
        break;
      // Primitives don't need tracking
      case 'StringLiteral':
      case 'NumberLiteral':
      case 'Identifier':
        break;
    }
  }

  private visitSession(session: SessionStatementNode): void {
    this.features.sessions++;

    // Check properties for model, context, retry
    for (const prop of session.properties) {
      const propName = prop.name.name;

      if (propName === 'model') {
        this.trackModel(prop);
      } else if (propName === 'context') {
        this.features.contextPassing++;
      } else if (propName === 'retry') {
        this.features.retryProperties++;
      }

      // Visit property values for nested expressions
      this.visitExpression(prop.value);
    }
  }

  private visitAgentDefinition(agent: AgentDefinitionNode): void {
    this.features.agents++;

    for (const prop of agent.properties) {
      const propName = prop.name.name;

      if (propName === 'model') {
        this.trackModel(prop);
      } else if (propName === 'permissions') {
        this.features.permissions++;
      }

      this.visitExpression(prop.value);
    }

    // Visit body statements
    this.enterBlock();
    for (const stmt of agent.body) {
      this.visitStatement(stmt);
    }
    this.exitBlock();
  }

  private visitImport(importStmt: ImportStatementNode): void {
    this.features.imports++;

    // Track full import source path
    const source = importStmt.source.value;
    this.imports[source] = (this.imports[source] || 0) + 1;
  }

  private visitBlockDefinition(block: BlockDefinitionNode): void {
    this.features.blockDefinitions++;

    this.enterBlock();
    for (const stmt of block.body) {
      this.visitStatement(stmt);
    }
    this.exitBlock();
  }

  private visitDoBlock(doBlock: DoBlockNode): void {
    this.features.doBlocks++;

    // Check if this is a block invocation (has a name)
    if (doBlock.name) {
      this.features.blockInvocations++;
    }

    this.enterBlock();
    for (const stmt of doBlock.body) {
      this.visitStatement(stmt);
    }
    this.exitBlock();
  }

  private visitParallelBlock(parallel: ParallelBlockNode): void {
    this.features.parallelBlocks++;

    this.enterBlock();
    for (const stmt of parallel.body) {
      this.visitStatement(stmt);
    }
    this.exitBlock();
  }

  private visitLoopBlock(loop: LoopBlockNode): void {
    // Categorize by variant
    switch (loop.variant) {
      case 'until':
        this.features.loops.loopUntil++;
        break;
      case 'while':
        this.features.loops.loopWhile++;
        break;
      default:
        this.features.loops.loop++;
    }

    // Track fourth wall usage in condition
    if (loop.condition) {
      this.features.fourthWall++;
    }

    this.enterBlock();
    for (const stmt of loop.body) {
      this.visitStatement(stmt);
    }
    this.exitBlock();
  }

  private visitRepeatBlock(repeat: RepeatBlockNode): void {
    this.features.loops.repeat++;

    this.enterBlock();
    for (const stmt of repeat.body) {
      this.visitStatement(stmt);
    }
    this.exitBlock();
  }

  private visitForEachBlock(forEach: ForEachBlockNode): void {
    if (forEach.isParallel) {
      this.features.loops.parallelForEach++;
    } else {
      this.features.loops.forEach++;
    }

    // Visit collection expression
    this.visitExpression(forEach.collection);

    this.enterBlock();
    for (const stmt of forEach.body) {
      this.visitStatement(stmt);
    }
    this.exitBlock();
  }

  private visitTryBlock(tryBlock: TryBlockNode): void {
    this.features.tryBlocks++;

    this.enterBlock();
    for (const stmt of tryBlock.tryBody) {
      this.visitStatement(stmt);
    }
    this.exitBlock();

    if (tryBlock.catchBody) {
      this.enterBlock();
      for (const stmt of tryBlock.catchBody) {
        this.visitStatement(stmt);
      }
      this.exitBlock();
    }

    if (tryBlock.finallyBody) {
      this.enterBlock();
      for (const stmt of tryBlock.finallyBody) {
        this.visitStatement(stmt);
      }
      this.exitBlock();
    }
  }

  private visitThrowStatement(_throw: ThrowStatementNode): void {
    this.features.throwStatements++;
  }

  private visitChoiceBlock(choice: ChoiceBlockNode): void {
    this.features.choiceBlocks++;

    // The criteria is a discretion node
    this.features.fourthWall++;

    for (const option of choice.options) {
      this.enterBlock();
      for (const stmt of option.body) {
        this.visitStatement(stmt);
      }
      this.exitBlock();
    }
  }

  private visitIfStatement(ifStmt: IfStatementNode): void {
    this.features.ifStatements++;

    // The condition is a discretion node
    this.features.fourthWall++;

    this.enterBlock();
    for (const stmt of ifStmt.thenBody) {
      this.visitStatement(stmt);
    }
    this.exitBlock();

    for (const elseIf of ifStmt.elseIfClauses) {
      this.features.fourthWall++; // Each elif has a condition
      this.enterBlock();
      for (const stmt of elseIf.body) {
        this.visitStatement(stmt);
      }
      this.exitBlock();
    }

    if (ifStmt.elseBody) {
      this.enterBlock();
      for (const stmt of ifStmt.elseBody) {
        this.visitStatement(stmt);
      }
      this.exitBlock();
    }
  }

  private visitLetBinding(letBinding: LetBindingNode): void {
    this.features.variables++;
    this.visitExpression(letBinding.value);
  }

  private visitConstBinding(constBinding: ConstBindingNode): void {
    this.features.variables++;
    this.visitExpression(constBinding.value);
  }

  private visitAssignment(assignment: AssignmentNode): void {
    this.features.assignments++;
    this.visitExpression(assignment.value);
  }

  private visitArrowExpression(arrow: ArrowExpressionNode): void {
    this.features.arrowExpressions++;
    this.visitExpression(arrow.left);
    this.visitExpression(arrow.right);
  }

  private visitPipeExpression(pipe: PipeExpressionNode): void {
    // Visit input
    this.visitExpression(pipe.input);

    // Count each pipeline operation
    for (const op of pipe.operations) {
      switch (op.operator) {
        case 'map':
          this.features.pipelines.map++;
          break;
        case 'filter':
          this.features.pipelines.filter++;
          break;
        case 'reduce':
          this.features.pipelines.reduce++;
          break;
        case 'pmap':
          this.features.pipelines.pmap++;
          break;
      }

      // Visit body of each operation
      this.enterBlock();
      for (const stmt of op.body) {
        this.visitStatement(stmt);
      }
      this.exitBlock();
    }
  }

  private trackModel(prop: PropertyNode): void {
    // Model value could be an identifier or string
    if (prop.value.type === 'Identifier') {
      const modelName = prop.value.name;
      this.models[modelName] = (this.models[modelName] || 0) + 1;
    } else if (prop.value.type === 'StringLiteral') {
      const modelName = prop.value.value;
      this.models[modelName] = (this.models[modelName] || 0) + 1;
    }
  }

  private enterBlock(): void {
    this.currentDepth++;
    if (this.currentDepth > this.maxDepth) {
      this.maxDepth = this.currentDepth;
    }
  }

  private exitBlock(): void {
    this.currentDepth--;
  }

  private calculateLineCount(): number {
    const statements = this.program.statements;
    if (statements.length === 0) {
      return 0;
    }
    const lastStmt = statements[statements.length - 1];
    return lastStmt.span.end.line;
  }

  private countStatements(statements: StatementNode[]): number {
    let count = 0;
    for (const stmt of statements) {
      if (stmt.type !== 'CommentStatement') {
        count++;
      }
      // Count nested statements
      count += this.countNestedStatements(stmt);
    }
    return count;
  }

  private countNestedStatements(stmt: StatementNode): number {
    let count = 0;
    switch (stmt.type) {
      case 'AgentDefinition':
        count += this.countStatements(stmt.body);
        break;
      case 'BlockDefinition':
        count += this.countStatements(stmt.body);
        break;
      case 'DoBlock':
        count += this.countStatements(stmt.body);
        break;
      case 'ParallelBlock':
        count += this.countStatements(stmt.body);
        break;
      case 'LoopBlock':
        count += this.countStatements(stmt.body);
        break;
      case 'RepeatBlock':
        count += this.countStatements(stmt.body);
        break;
      case 'ForEachBlock':
        count += this.countStatements(stmt.body);
        break;
      case 'TryBlock':
        count += this.countStatements(stmt.tryBody);
        if (stmt.catchBody) count += this.countStatements(stmt.catchBody);
        if (stmt.finallyBody) count += this.countStatements(stmt.finallyBody);
        break;
      case 'ChoiceBlock':
        for (const option of stmt.options) {
          count += this.countStatements(option.body);
        }
        break;
      case 'IfStatement':
        count += this.countStatements(stmt.thenBody);
        for (const elseIf of stmt.elseIfClauses) {
          count += this.countStatements(elseIf.body);
        }
        if (stmt.elseBody) count += this.countStatements(stmt.elseBody);
        break;
    }
    return count;
  }

  private createEmptyFeatures(): FeatureUsage {
    return {
      agents: 0,
      sessions: 0,
      variables: 0,
      assignments: 0,
      parallelBlocks: 0,
      doBlocks: 0,
      arrowExpressions: 0,
      loops: this.createEmptyLoopCounts(),
      fourthWall: 0,
      contextPassing: 0,
      imports: 0,
      permissions: 0,
      tryBlocks: 0,
      throwStatements: 0,
      retryProperties: 0,
      pipelines: this.createEmptyPipelineCounts(),
      choiceBlocks: 0,
      ifStatements: 0,
      blockDefinitions: 0,
      blockInvocations: 0,
      interpolatedStrings: 0,
    };
  }

  private createEmptyLoopCounts(): LoopCounts {
    return {
      repeat: 0,
      forEach: 0,
      parallelForEach: 0,
      loop: 0,
      loopUntil: 0,
      loopWhile: 0,
    };
  }

  private createEmptyPipelineCounts(): PipelineCounts {
    return {
      map: 0,
      filter: 0,
      reduce: 0,
      pmap: 0,
    };
  }
}
