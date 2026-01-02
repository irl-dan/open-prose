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
  | TryBlockNode
  | LetBindingNode
  | ConstBindingNode
  | AssignmentNode
  | CommentStatementNode
  | ArrowExpressionNode;

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
  joinStrategy: StringLiteralNode | null;  // "all", "first", "any", "regardless"
  body: StatementNode[];
}

/**
 * Loop block
 */
export interface LoopBlockNode extends ASTNode {
  type: 'LoopBlock';
  variant: 'loop' | 'until' | 'while' | 'repeat' | 'for';
  condition: ExpressionNode | null;
  count: NumberLiteralNode | null;
  iterator: IdentifierNode | null;
  iterable: ExpressionNode | null;
  body: StatementNode[];
}

/**
 * Try/catch/finally block
 */
export interface TryBlockNode extends ASTNode {
  type: 'TryBlock';
  tryBody: StatementNode[];
  catchBody: StatementNode[] | null;
  finallyBody: StatementNode[] | null;
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
  | NumberLiteralNode
  | IdentifierNode
  | DiscretionNode
  | SessionStatementNode
  | ArrayExpressionNode
  | ObjectExpressionNode
  | PipeExpressionNode
  | ArrowExpressionNode
  | DoBlockNode;

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
 * Pipe expression (a | b | c)
 */
export interface PipeExpressionNode extends ASTNode {
  type: 'PipeExpression';
  left: ExpressionNode;
  operator: 'map' | 'filter' | 'reduce' | 'pmap';
  right: ExpressionNode;
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
  visitTryBlock?(node: TryBlockNode): T;
  visitLetBinding?(node: LetBindingNode): T;
  visitConstBinding?(node: ConstBindingNode): T;
  visitAssignment?(node: AssignmentNode): T;
  visitArrayExpression?(node: ArrayExpressionNode): T;
  visitObjectExpression?(node: ObjectExpressionNode): T;
  visitPipeExpression?(node: PipeExpressionNode): T;
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
    case 'TryBlock':
      return visitor.visitTryBlock?.(node as TryBlockNode);
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
    case 'ArrowExpression':
      return visitor.visitArrowExpression?.(node as ArrowExpressionNode);
    case 'Property':
      return visitor.visitProperty?.(node as PropertyNode);
  }
  return undefined;
}
