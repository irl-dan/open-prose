/**
 * Token types for the OpenProse lexer
 */

export enum TokenType {
  // Literals
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  IDENTIFIER = 'IDENTIFIER',

  // Comments (trivia)
  COMMENT = 'COMMENT',

  // Keywords
  IMPORT = 'IMPORT',
  FROM = 'FROM',
  AGENT = 'AGENT',
  SESSION = 'SESSION',
  BLOCK = 'BLOCK',
  DO = 'DO',
  PARALLEL = 'PARALLEL',
  CHOICE = 'CHOICE',
  LET = 'LET',
  CONST = 'CONST',
  LOOP = 'LOOP',
  UNTIL = 'UNTIL',
  WHILE = 'WHILE',
  REPEAT = 'REPEAT',
  FOR = 'FOR',
  IN = 'IN',
  AS = 'AS',
  IF = 'IF',
  ELSE = 'ELSE',
  TRY = 'TRY',
  CATCH = 'CATCH',
  FINALLY = 'FINALLY',
  THROW = 'THROW',
  MAP = 'MAP',
  FILTER = 'FILTER',
  REDUCE = 'REDUCE',
  PMAP = 'PMAP',

  // Operators
  ARROW = 'ARROW',          // ->
  PIPE = 'PIPE',            // |
  EQUALS = 'EQUALS',        // =
  COLON = 'COLON',          // :
  COMMA = 'COMMA',          // ,
  LPAREN = 'LPAREN',        // (
  RPAREN = 'RPAREN',        // )
  LBRACKET = 'LBRACKET',    // [
  RBRACKET = 'RBRACKET',    // ]
  LBRACE = 'LBRACE',        // {
  RBRACE = 'RBRACE',        // }

  // Orchestrator discretion syntax
  DISCRETION = 'DISCRETION',           // **...**
  MULTILINE_DISCRETION = 'MULTILINE_DISCRETION',  // ***...***

  // Whitespace and structure
  NEWLINE = 'NEWLINE',
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',

  // Special
  EOF = 'EOF',
  ERROR = 'ERROR'
}

/**
 * Represents a location in the source code
 */
export interface SourceLocation {
  line: number;    // 1-based line number
  column: number;  // 1-based column number
  offset: number;  // 0-based character offset
}

/**
 * Represents a span in the source code
 */
export interface SourceSpan {
  start: SourceLocation;
  end: SourceLocation;
}

/**
 * Metadata specific to string tokens
 */
export interface StringTokenMetadata {
  raw: string;                    // The raw string including quotes
  isTripleQuoted: boolean;        // True for """ strings
  escapeSequences: EscapeSequenceInfo[];  // Tracked escape sequences
}

/**
 * Information about an escape sequence in a string
 */
export interface EscapeSequenceInfo {
  type: 'standard' | 'unicode' | 'invalid';
  sequence: string;      // The raw escape sequence (e.g., "\\n", "\\u0041")
  resolved: string;      // The resolved character (e.g., "\n", "A")
  offset: number;        // Offset within the raw string where the escape starts
}

/**
 * Represents a token produced by the lexer
 */
export interface Token {
  type: TokenType;
  value: string;
  span: SourceSpan;
  isTrivia?: boolean;  // True for comments, whitespace, etc.
  stringMetadata?: StringTokenMetadata;  // Additional data for STRING tokens
}

/**
 * Keywords mapping
 */
export const KEYWORDS: Record<string, TokenType> = {
  'import': TokenType.IMPORT,
  'from': TokenType.FROM,
  'agent': TokenType.AGENT,
  'session': TokenType.SESSION,
  'block': TokenType.BLOCK,
  'do': TokenType.DO,
  'parallel': TokenType.PARALLEL,
  'choice': TokenType.CHOICE,
  'let': TokenType.LET,
  'const': TokenType.CONST,
  'loop': TokenType.LOOP,
  'until': TokenType.UNTIL,
  'while': TokenType.WHILE,
  'repeat': TokenType.REPEAT,
  'for': TokenType.FOR,
  'in': TokenType.IN,
  'as': TokenType.AS,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'try': TokenType.TRY,
  'catch': TokenType.CATCH,
  'finally': TokenType.FINALLY,
  'throw': TokenType.THROW,
  'map': TokenType.MAP,
  'filter': TokenType.FILTER,
  'reduce': TokenType.REDUCE,
  'pmap': TokenType.PMAP,
};

/**
 * Check if a token type is a keyword
 */
export function isKeyword(type: TokenType): boolean {
  return Object.values(KEYWORDS).includes(type);
}

/**
 * Check if a token is trivia (comment, whitespace that doesn't affect structure)
 */
export function isTrivia(token: Token): boolean {
  return token.type === TokenType.COMMENT || token.isTrivia === true;
}
