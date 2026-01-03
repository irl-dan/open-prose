/**
 * OpenProse - A DSL for orchestrating AI agent sessions
 *
 * This is the main entry point for the OpenProse language toolkit.
 */

// Import for internal use
import type { ParseError as _ParseError } from './parser';
import type { CommentInfo as _CommentInfo } from './compiler';
import { parse as _parse } from './parser';
import { compile as _compile } from './compiler';

// Parser type exports
export type {
  TokenType,
  Token,
  SourceLocation,
  SourceSpan,
  LexerOptions,
  LexerResult,
  LexerError,
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
  ParseResult,
  ParseError,
} from './parser';

// Parser value exports
export {
  KEYWORDS,
  isKeyword,
  isTrivia,
  Lexer,
  tokenize,
  tokenizeWithoutComments,
  extractComments,
  createCommentNode,
  createProgramNode,
  walkAST,
  Parser,
  parse,
  parseComments,
} from './parser';

// Validator type exports
export type {
  ValidationError,
  ValidationResult,
} from './validator';

// Validator value exports
export {
  Validator,
  validate,
  isValid,
} from './validator';

// Compiler type exports
export type {
  CompilerOptions,
  CompiledOutput,
  CommentInfo,
  SourceMap,
  SourceMapping,
} from './compiler';

// Compiler value exports
export {
  Compiler,
  compile,
  compileToString,
  stripComments,
} from './compiler';

// LSP type exports
export type {
  SemanticTokenType,
  SemanticTokenModifier,
  SemanticToken,
  EncodedSemanticTokens,
  SemanticTokensLegend,
} from './lsp';

// LSP value exports
export {
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
