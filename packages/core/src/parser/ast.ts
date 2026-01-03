/**
 * AST Node Types for OpenProse
 *
 * This module defines the Abstract Syntax Tree node types used to represent
 * parsed OpenProse programs.
 */

import { SourceSpan } from './tokens';

/**
 * Base interface for all AST nodes
 */
export interface ASTNode {
  type: string;
  span: SourceSpan;
}

/**
 * A comment node (preserved for source mapping and documentation)
 */
export interface CommentNode extends ASTNode {
  type: 'Comment';
  value: string;  // The comment text including the #
  isInline: boolean;  // True if the comment follows code on the same line
}

/**
 * The root node of an OpenProse program
 */
export interface ProgramNode extends ASTNode {
  type: 'Program';
  statements: StatementNode[];
  comments: CommentNode[];  // All comments in the program
}

/**
 * Represents an escape sequence found in a string literal
 */
export interface EscapeSequence {
  type: 'standard' | 'unicode' | 'invalid';
  sequence: string;      // The raw escape sequence (e.g., "\\n", "\\u0041")
  resolved: string;      // The resolved character (e.g., "\n", "A")
  offset: number;        // Offset within the string where the escape starts
}

/**
 * A string literal
 */
export interface StringLiteralNode extends ASTNode {
  type: 'StringLiteral';
  value: string;           // The processed string value (escapes resolved)
  raw: string;             // The raw string (with quotes, escapes unresolved)
  isTripleQuoted: boolean;
  escapeSequences?: EscapeSequence[];  // Tracked escape sequences for validation
}

/**
 * A number literal
 */
export interface NumberLiteralNode extends ASTNode {
  type: 'NumberLiteral';
  value: number;
  raw: string;
}

/**
 * An identifier (variable name, agent name, etc.)
 */
export interface IdentifierNode extends ASTNode {
  type: 'Identifier';
  name: string;
}

/**
 * Orchestrator discretion expression (**...** or ***...***)
 */
export interface DiscretionNode extends ASTNode {
  type: 'Discretion';
  expression: string;  // The content between the asterisks
  isMultiline: boolean;  // True for *** variant
}

// Statement types - placeholders for now, will be expanded in later tiers

export type StatementNode =
  | SessionStatementNode
  | ImportStatementNode
  | AgentDefinitionNode
  | BlockDefinitionNode
  | DoBlockNode
  | ParallelBlockNode
  | LoopBlockNode
  | RepeatBlockNode
  | ForEachBlockNode
  | TryBlockNode
  | ThrowStatementNode
  | ChoiceBlockNode
  | IfStatementNode
  | LetBindingNode
  | ConstBindingNode
  | AssignmentNode
  | CommentStatementNode
  | ArrowExpressionNode
  | PipeExpressionNode;

/**
 * A standalone comment as a statement
 */
export interface CommentStatementNode extends ASTNode {
  type: 'CommentStatement';
  comment: CommentNode;
}

/**
 * A simple session statement
 */
export interface SessionStatementNode extends ASTNode {
  type: 'SessionStatement';
  prompt: StringLiteralNode | null;
  agent: IdentifierNode | null;
  name: IdentifierNode | null;
  properties: PropertyNode[];
  inlineComment: CommentNode | null;
}

/**
 * A property assignment (e.g., model: sonnet)
 */
export interface PropertyNode extends ASTNode {
  type: 'Property';
  name: IdentifierNode;
  value: ExpressionNode;
}

/**
 * Import statement
 */
export interface ImportStatementNode extends ASTNode {
  type: 'ImportStatement';
  skillName: StringLiteralNode;
  source: StringLiteralNode;
}

/**
 * Agent definition
 */
export interface AgentDefinitionNode extends ASTNode {
  type: 'AgentDefinition';
  name: IdentifierNode;
  properties: PropertyNode[];
  body: StatementNode[];
}

/**
 * Named block definition
 */
export interface BlockDefinitionNode extends ASTNode {
  type: 'BlockDefinition';
  name: IdentifierNode;
  parameters: IdentifierNode[];
  body: StatementNode[];
}

/**
 * Do block (sequential execution)
 */
export interface DoBlockNode extends ASTNode {
  type: 'DoBlock';
  name: IdentifierNode | null;  // null for anonymous do:
  arguments: ExpressionNode[];
  body: StatementNode[];
}

/**
 * Parallel block
 */
export interface ParallelBlockNode extends ASTNode {
  type: 'ParallelBlock';
  joinStrategy: StringLiteralNode | null;  // "all", "first", "any"
  anyCount: NumberLiteralNode | null;  // For "any" strategy: how many results needed
  onFail: StringLiteralNode | null;  // "fail-fast", "continue", "ignore"
  body: StatementNode[];
}

/**
 * Loop block (unbounded - Tier 9)
 * Supports AI-evaluated termination conditions using discretion markers.
 *
 * Syntax variants:
 *   loop:                                    # Infinite loop (safeguards apply)
 *   loop as i:                               # With iteration counter
 *   loop until **condition**:                # Until condition becomes true
 *   loop while **condition**:                # While condition remains true
 *   loop until **condition** (max: 50):      # With safety limit
 *   loop until **condition** as i:           # With iteration counter
 */
export interface LoopBlockNode extends ASTNode {
  type: 'LoopBlock';
  variant: 'loop' | 'until' | 'while';  // Type of loop
  condition: DiscretionNode | null;  // AI-evaluated condition (for until/while)
  iterationVar: IdentifierNode | null;  // Optional "as i" variable
  maxIterations: NumberLiteralNode | null;  // Optional safety limit (max: N)
  body: StatementNode[];
}

/**
 * Repeat block (Tier 8) - fixed iteration count
 * Syntax:
 *   repeat 3:
 *     body...
 *   repeat 5 as i:
 *     body...
 */
export interface RepeatBlockNode extends ASTNode {
  type: 'RepeatBlock';
  count: NumberLiteralNode | IdentifierNode;  // The iteration count (number or variable)
  indexVar: IdentifierNode | null;  // Optional "as i" variable
  body: StatementNode[];
}

/**
 * For-each block (Tier 8) - iteration over collection
 * Syntax:
 *   for item in items:
 *     body...
 *   for item, i in items:
 *     body...
 *   parallel for item in items:
 *     body...
 */
export interface ForEachBlockNode extends ASTNode {
  type: 'ForEachBlock';
  itemVar: IdentifierNode;  // The item variable
  indexVar: IdentifierNode | null;  // Optional index variable
  collection: ExpressionNode;  // Array or variable reference
  isParallel: boolean;  // Whether this is "parallel for"
  modifiers: PropertyNode[];  // Inline modifiers like (on-fail: "continue")
  body: StatementNode[];
}

/**
 * Try/catch/finally block
 *
 * Syntax:
 *   try:
 *     body...
 *   catch [as err]:
 *     handleError...
 *   finally:
 *     cleanup...
 */
export interface TryBlockNode extends ASTNode {
  type: 'TryBlock';
  tryBody: StatementNode[];
  catchBody: StatementNode[] | null;
  finallyBody: StatementNode[] | null;
  errorVar: IdentifierNode | null;  // Optional "catch as err:" variable
}

/**
 * Throw statement for raising/rethrowing errors
 *
 * Syntax:
 *   throw              # Rethrow current error
 *   throw "message"    # Throw with custom message
 */
export interface ThrowStatementNode extends ASTNode {
  type: 'ThrowStatement';
  message: StringLiteralNode | null;  // Optional error message
}

/**
 * Interpolated string - a string containing variable interpolations
 *
 * Syntax:
 *   "Process {item} and return {result}"
 *
 * The parts alternate between string literal segments and variable references
 */
export interface InterpolatedStringNode extends ASTNode {
  type: 'InterpolatedString';
  parts: (StringLiteralNode | IdentifierNode)[];  // Alternating text and variables
  raw: string;  // The original raw string
  isTripleQuoted: boolean;
}

/**
 * Choice block - Orchestrator-selected branch execution
 *
 * Syntax:
 *   choice **which approach is best**:
 *     option "quick":
 *       session "Do the fast approach"
 *     option "thorough":
 *       session "Do the comprehensive approach"
 */
export interface ChoiceBlockNode extends ASTNode {
  type: 'ChoiceBlock';
  criteria: DiscretionNode;  // The **criteria** condition
  options: ChoiceOptionNode[];
}

/**
 * A single option in a choice block
 *
 * Syntax:
 *   option "label":
 *     body...
 */
export interface ChoiceOptionNode extends ASTNode {
  type: 'ChoiceOption';
  label: StringLiteralNode;  // The option name
  body: StatementNode[];
}

/**
 * If/elif/else conditional statement
 *
 * Syntax:
 *   if **condition**:
 *     thenBody...
 *   elif **condition**:
 *     elifBody...
 *   else:
 *     elseBody...
 */
export interface IfStatementNode extends ASTNode {
  type: 'IfStatement';
  condition: DiscretionNode;  // The **condition**
  thenBody: StatementNode[];
  elseIfClauses: ElseIfClauseNode[];
  elseBody: StatementNode[] | null;
}

/**
 * An elif clause in an if statement
 */
export interface ElseIfClauseNode extends ASTNode {
  type: 'ElseIfClause';
  condition: DiscretionNode;
  body: StatementNode[];
}

/**
 * Let binding
 */
export interface LetBindingNode extends ASTNode {
  type: 'LetBinding';
  name: IdentifierNode;
  value: ExpressionNode;
}

/**
 * Const binding
 */
export interface ConstBindingNode extends ASTNode {
  type: 'ConstBinding';
  name: IdentifierNode;
  value: ExpressionNode;
}

/**
 * Assignment
 */
export interface AssignmentNode extends ASTNode {
  type: 'Assignment';
  name: IdentifierNode;
  value: ExpressionNode;
}

// Expression types

export type ExpressionNode =
  | StringLiteralNode
  | InterpolatedStringNode
  | NumberLiteralNode
  | IdentifierNode
  | DiscretionNode
  | SessionStatementNode
  | ArrayExpressionNode
  | ObjectExpressionNode
  | PipeExpressionNode
  | ArrowExpressionNode
  | DoBlockNode
  | ParallelBlockNode
  | LoopBlockNode
  | RepeatBlockNode
  | ForEachBlockNode
  | TryBlockNode
  | ChoiceBlockNode
  | IfStatementNode;

/**
 * Array expression
 */
export interface ArrayExpressionNode extends ASTNode {
  type: 'ArrayExpression';
  elements: ExpressionNode[];
}

/**
 * Object expression
 */
export interface ObjectExpressionNode extends ASTNode {
  type: 'ObjectExpression';
  properties: PropertyNode[];
}

/**
 * Pipe expression - functional collection transformations
 * Syntax:
 *   items | map:
 *     session "Process"
 *       context: item
 *   items | filter:
 *     session "Is valid?"
 *       context: item
 *   items | reduce(acc, item):
 *     session "Combine"
 *       context: [acc, item]
 *   items | pmap:
 *     session "Process in parallel"
 *       context: item
 *   items | filter: ... | map: ... | reduce(acc, item): ...
 */
export interface PipeExpressionNode extends ASTNode {
  type: 'PipeExpression';
  input: ExpressionNode;  // The input collection (identifier, array, or another pipe)
  operations: PipeOperationNode[];  // Chain of pipeline operations
}

/**
 * A single pipeline operation (map, filter, reduce, pmap)
 */
export interface PipeOperationNode extends ASTNode {
  type: 'PipeOperation';
  operator: 'map' | 'filter' | 'reduce' | 'pmap';
  accVar: IdentifierNode | null;  // For reduce: the accumulator variable name
  itemVar: IdentifierNode | null;  // For reduce: the item variable name (implicit 'item' for others)
  body: StatementNode[];
}

/**
 * Arrow expression for inline sequence (session "A" -> session "B")
 */
export interface ArrowExpressionNode extends ASTNode {
  type: 'ArrowExpression';
  left: ExpressionNode;
  right: ExpressionNode;
}

/**
 * Helper function to create a comment node
 */
export function createCommentNode(
  value: string,
  span: SourceSpan,
  isInline: boolean = false
): CommentNode {
  return {
    type: 'Comment',
    value,
    span,
    isInline,
  };
}

/**
 * Helper function to create a program node
 */
export function createProgramNode(
  statements: StatementNode[],
  comments: CommentNode[],
  span: SourceSpan
): ProgramNode {
  return {
    type: 'Program',
    statements,
    comments,
    span,
  };
}

/**
 * Visitor interface for traversing AST
 */
export interface ASTVisitor<T = void> {
  visitProgram?(node: ProgramNode): T;
  visitComment?(node: CommentNode): T;
  visitCommentStatement?(node: CommentStatementNode): T;
  visitStringLiteral?(node: StringLiteralNode): T;
  visitInterpolatedString?(node: InterpolatedStringNode): T;
  visitNumberLiteral?(node: NumberLiteralNode): T;
  visitIdentifier?(node: IdentifierNode): T;
  visitDiscretion?(node: DiscretionNode): T;
  visitSession?(node: SessionStatementNode): T;
  visitImport?(node: ImportStatementNode): T;
  visitAgentDefinition?(node: AgentDefinitionNode): T;
  visitBlockDefinition?(node: BlockDefinitionNode): T;
  visitDoBlock?(node: DoBlockNode): T;
  visitParallelBlock?(node: ParallelBlockNode): T;
  visitLoopBlock?(node: LoopBlockNode): T;
  visitRepeatBlock?(node: RepeatBlockNode): T;
  visitForEachBlock?(node: ForEachBlockNode): T;
  visitTryBlock?(node: TryBlockNode): T;
  visitThrowStatement?(node: ThrowStatementNode): T;
  visitChoiceBlock?(node: ChoiceBlockNode): T;
  visitChoiceOption?(node: ChoiceOptionNode): T;
  visitIfStatement?(node: IfStatementNode): T;
  visitElseIfClause?(node: ElseIfClauseNode): T;
  visitLetBinding?(node: LetBindingNode): T;
  visitConstBinding?(node: ConstBindingNode): T;
  visitAssignment?(node: AssignmentNode): T;
  visitArrayExpression?(node: ArrayExpressionNode): T;
  visitObjectExpression?(node: ObjectExpressionNode): T;
  visitPipeExpression?(node: PipeExpressionNode): T;
  visitPipeOperation?(node: PipeOperationNode): T;
  visitArrowExpression?(node: ArrowExpressionNode): T;
  visitProperty?(node: PropertyNode): T;
}

/**
 * Walk the AST and call visitor methods
 */
export function walkAST<T>(node: ASTNode, visitor: ASTVisitor<T>): T | undefined {
  switch (node.type) {
    case 'Program':
      return visitor.visitProgram?.(node as ProgramNode);
    case 'Comment':
      return visitor.visitComment?.(node as CommentNode);
    case 'CommentStatement':
      return visitor.visitCommentStatement?.(node as CommentStatementNode);
    case 'StringLiteral':
      return visitor.visitStringLiteral?.(node as StringLiteralNode);
    case 'InterpolatedString':
      return visitor.visitInterpolatedString?.(node as InterpolatedStringNode);
    case 'NumberLiteral':
      return visitor.visitNumberLiteral?.(node as NumberLiteralNode);
    case 'Identifier':
      return visitor.visitIdentifier?.(node as IdentifierNode);
    case 'Discretion':
      return visitor.visitDiscretion?.(node as DiscretionNode);
    case 'SessionStatement':
      return visitor.visitSession?.(node as SessionStatementNode);
    case 'ImportStatement':
      return visitor.visitImport?.(node as ImportStatementNode);
    case 'AgentDefinition':
      return visitor.visitAgentDefinition?.(node as AgentDefinitionNode);
    case 'BlockDefinition':
      return visitor.visitBlockDefinition?.(node as BlockDefinitionNode);
    case 'DoBlock':
      return visitor.visitDoBlock?.(node as DoBlockNode);
    case 'ParallelBlock':
      return visitor.visitParallelBlock?.(node as ParallelBlockNode);
    case 'LoopBlock':
      return visitor.visitLoopBlock?.(node as LoopBlockNode);
    case 'RepeatBlock':
      return visitor.visitRepeatBlock?.(node as RepeatBlockNode);
    case 'ForEachBlock':
      return visitor.visitForEachBlock?.(node as ForEachBlockNode);
    case 'TryBlock':
      return visitor.visitTryBlock?.(node as TryBlockNode);
    case 'ThrowStatement':
      return visitor.visitThrowStatement?.(node as ThrowStatementNode);
    case 'ChoiceBlock':
      return visitor.visitChoiceBlock?.(node as ChoiceBlockNode);
    case 'ChoiceOption':
      return visitor.visitChoiceOption?.(node as ChoiceOptionNode);
    case 'IfStatement':
      return visitor.visitIfStatement?.(node as IfStatementNode);
    case 'ElseIfClause':
      return visitor.visitElseIfClause?.(node as ElseIfClauseNode);
    case 'LetBinding':
      return visitor.visitLetBinding?.(node as LetBindingNode);
    case 'ConstBinding':
      return visitor.visitConstBinding?.(node as ConstBindingNode);
    case 'Assignment':
      return visitor.visitAssignment?.(node as AssignmentNode);
    case 'ArrayExpression':
      return visitor.visitArrayExpression?.(node as ArrayExpressionNode);
    case 'ObjectExpression':
      return visitor.visitObjectExpression?.(node as ObjectExpressionNode);
    case 'PipeExpression':
      return visitor.visitPipeExpression?.(node as PipeExpressionNode);
    case 'PipeOperation':
      return visitor.visitPipeOperation?.(node as PipeOperationNode);
    case 'ArrowExpression':
      return visitor.visitArrowExpression?.(node as ArrowExpressionNode);
    case 'Property':
      return visitor.visitProperty?.(node as PropertyNode);
  }
  return undefined;
}
