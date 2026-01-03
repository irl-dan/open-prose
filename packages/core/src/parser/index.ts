/**
 * OpenProse Parser Module
 *
 * Exports all parser-related functionality including:
 * - Lexer/Tokenizer
 * - Token types
 * - AST node types
 * - Parser
 */

// Token types and utilities (types)
export type {
  TokenType,
  Token,
  SourceLocation,
  SourceSpan,
  StringTokenMetadata,
  EscapeSequenceInfo,
  InterpolationInfo,
} from './tokens';

// Token utilities (values)
export {
  KEYWORDS,
  isKeyword,
  isTrivia,
} from './tokens';

// Lexer types
export type {
  LexerOptions,
  LexerResult,
  LexerError,
} from './lexer';

// Lexer class and functions
export {
  Lexer,
  tokenize,
  tokenizeWithoutComments,
  extractComments,
} from './lexer';

// AST types
export type {
  ASTNode,
  ProgramNode,
  StatementNode,
  ExpressionNode,
  CommentNode,
  CommentStatementNode,
  EscapeSequence,
  StringLiteralNode,
  NumberLiteralNode,
  IdentifierNode,
  DiscretionNode,
  SessionStatementNode,
  PropertyNode,
  ImportStatementNode,
  AgentDefinitionNode,
  BlockDefinitionNode,
  DoBlockNode,
  ParallelBlockNode,
  LoopBlockNode,
  RepeatBlockNode,
  ForEachBlockNode,
  TryBlockNode,
  ThrowStatementNode,
  InterpolatedStringNode,
  ChoiceBlockNode,
  ChoiceOptionNode,
  IfStatementNode,
  ElseIfClauseNode,
  LetBindingNode,
  ConstBindingNode,
  AssignmentNode,
  ArrayExpressionNode,
  ObjectExpressionNode,
  PipeExpressionNode,
  PipeOperationNode,
  ArrowExpressionNode,
  ASTVisitor,
} from './ast';

// AST functions
export {
  createCommentNode,
  createProgramNode,
  walkAST,
} from './ast';

// Parser types
export type {
  ParseResult,
  ParseError,
} from './parser';

// Parser class and functions
export {
  Parser,
  parse,
  parseComments,
} from './parser';
