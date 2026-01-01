/**
 * OpenProse Parser Module
 *
 * Exports all parser-related functionality including:
 * - Lexer/Tokenizer
 * - Token types
 * - AST node types
 * - Parser
 */

// Token types and utilities
export {
  TokenType,
  Token,
  SourceLocation,
  SourceSpan,
  StringTokenMetadata,
  EscapeSequenceInfo,
  KEYWORDS,
  isKeyword,
  isTrivia,
} from './tokens';

// Lexer
export {
  Lexer,
  LexerOptions,
  LexerResult,
  LexerError,
  tokenize,
  tokenizeWithoutComments,
  extractComments,
} from './lexer';

// AST types
export {
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
  TryBlockNode,
  LetBindingNode,
  ConstBindingNode,
  AssignmentNode,
  ArrayExpressionNode,
  ObjectExpressionNode,
  PipeExpressionNode,
  ASTVisitor,
  createCommentNode,
  createProgramNode,
  walkAST,
} from './ast';

// Parser
export {
  Parser,
  ParseResult,
  ParseError,
  parse,
  parseComments,
} from './parser';
