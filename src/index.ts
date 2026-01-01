/**
 * OpenProse - A DSL for orchestrating AI agent sessions
 *
 * This is the main entry point for the OpenProse language toolkit.
 */

// Import for internal use
import { parse as _parse, ParseError as _ParseError } from './parser';
import { compile as _compile, CommentInfo as _CommentInfo } from './compiler';

// Parser exports
export {
  // Token types
  TokenType,
  Token,
  SourceLocation,
  SourceSpan,
  KEYWORDS,
  isKeyword,
  isTrivia,

  // Lexer
  Lexer,
  LexerOptions,
  LexerResult,
  LexerError,
  tokenize,
  tokenizeWithoutComments,
  extractComments,

  // AST types
  ASTNode,
  ProgramNode,
  StatementNode,
  ExpressionNode,
  CommentNode,
  CommentStatementNode,
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

  // Parser
  Parser,
  ParseResult,
  ParseError,
  parse,
  parseComments,
} from './parser';

// Validator exports
export {
  Validator,
  ValidationError,
  ValidationResult,
  validate,
  isValid,
} from './validator';

// Compiler exports
export {
  Compiler,
  CompilerOptions,
  CompiledOutput,
  CommentInfo,
  SourceMap,
  SourceMapping,
  compile,
  compileToString,
  stripComments,
} from './compiler';

// LSP exports
export {
  SemanticTokenType,
  SemanticTokenModifier,
  SemanticToken,
  EncodedSemanticTokens,
  SemanticTokensLegend,
  SemanticTokensProvider,
  getSemanticTokensLegend,
  getSemanticTokens,
  getEncodedSemanticTokens,
} from './lsp';

/**
 * Version of the OpenProse toolkit
 */
export const VERSION = '0.1.0';

/**
 * Parse and compile source code in one step
 */
export function parseAndCompile(
  source: string,
  options?: { preserveComments?: boolean }
): {
  code: string;
  errors: _ParseError[];
  strippedComments: _CommentInfo[];
} {
  const parseResult = _parse(source);

  if (parseResult.errors.length > 0) {
    return {
      code: '',
      errors: parseResult.errors,
      strippedComments: [],
    };
  }

  const compileResult = _compile(parseResult.program, options);

  return {
    code: compileResult.code,
    errors: [],
    strippedComments: compileResult.strippedComments,
  };
}
