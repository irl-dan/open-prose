/**
 * OpenProse LSP Semantic Tokens Provider
 *
 * Provides semantic token information for syntax highlighting in editors.
 * Comments are marked with the "comment" token type to appear grayed out.
 */

import { Token, TokenType, SourceSpan } from '../parser/tokens';
import { Lexer } from '../parser/lexer';

/**
 * LSP Semantic Token Types
 * These correspond to the LSP specification's SemanticTokenTypes
 */
export enum SemanticTokenType {
  Namespace = 0,
  Type = 1,
  Class = 2,
  Enum = 3,
  Interface = 4,
  Struct = 5,
  TypeParameter = 6,
  Parameter = 7,
  Variable = 8,
  Property = 9,
  EnumMember = 10,
  Event = 11,
  Function = 12,
  Method = 13,
  Macro = 14,
  Keyword = 15,
  Modifier = 16,
  Comment = 17,
  String = 18,
  Number = 19,
  Regexp = 20,
  Operator = 21,
}

/**
 * LSP Semantic Token Modifiers
 */
export enum SemanticTokenModifier {
  Declaration = 0,
  Definition = 1,
  Readonly = 2,
  Static = 3,
  Deprecated = 4,
  Abstract = 5,
  Async = 6,
  Modification = 7,
  Documentation = 8,
  DefaultLibrary = 9,
}

/**
 * A semantic token for LSP
 */
export interface SemanticToken {
  line: number;        // 0-based line number
  startChar: number;   // 0-based character offset
  length: number;      // Token length
  tokenType: SemanticTokenType;
  tokenModifiers: number;  // Bit flags for modifiers
}

/**
 * Encoded semantic tokens for LSP (delta encoding)
 */
export interface EncodedSemanticTokens {
  data: number[];
}

/**
 * Semantic token legend for LSP registration
 */
export interface SemanticTokensLegend {
  tokenTypes: string[];
  tokenModifiers: string[];
}

/**
 * Get the semantic tokens legend
 */
export function getSemanticTokensLegend(): SemanticTokensLegend {
  return {
    tokenTypes: [
      'namespace',
      'type',
      'class',
      'enum',
      'interface',
      'struct',
      'typeParameter',
      'parameter',
      'variable',
      'property',
      'enumMember',
      'event',
      'function',
      'method',
      'macro',
      'keyword',
      'modifier',
      'comment',
      'string',
      'number',
      'regexp',
      'operator',
    ],
    tokenModifiers: [
      'declaration',
      'definition',
      'readonly',
      'static',
      'deprecated',
      'abstract',
      'async',
      'modification',
      'documentation',
      'defaultLibrary',
    ],
  };
}

/**
 * Provider for semantic tokens
 */
export class SemanticTokensProvider {
  /**
   * Get semantic tokens for source code
   */
  public getSemanticTokens(source: string): SemanticToken[] {
    const lexer = new Lexer(source, { includeComments: true });
    const result = lexer.tokenize();
    const tokens: SemanticToken[] = [];

    for (const token of result.tokens) {
      const semanticToken = this.tokenToSemanticToken(token);
      if (semanticToken) {
        tokens.push(semanticToken);
      }
    }

    return tokens;
  }

  /**
   * Get encoded semantic tokens for LSP
   */
  public getEncodedSemanticTokens(source: string): EncodedSemanticTokens {
    const tokens = this.getSemanticTokens(source);
    return this.encodeTokens(tokens);
  }

  /**
   * Convert a lexer token to a semantic token
   */
  private tokenToSemanticToken(token: Token): SemanticToken | null {
    const tokenType = this.getSemanticTokenType(token.type);
    if (tokenType === null) {
      return null;
    }

    // Calculate token length
    const length = token.span.end.offset - token.span.start.offset;
    if (length <= 0) {
      return null;
    }

    return {
      line: token.span.start.line - 1,  // Convert to 0-based
      startChar: token.span.start.column - 1,  // Convert to 0-based
      length,
      tokenType,
      tokenModifiers: 0,
    };
  }

  /**
   * Map lexer token type to semantic token type
   */
  private getSemanticTokenType(tokenType: TokenType): SemanticTokenType | null {
    switch (tokenType) {
      // Comments
      case TokenType.COMMENT:
        return SemanticTokenType.Comment;

      // Strings
      case TokenType.STRING:
        return SemanticTokenType.String;

      // Numbers
      case TokenType.NUMBER:
        return SemanticTokenType.Number;

      // Keywords
      case TokenType.IMPORT:
      case TokenType.FROM:
      case TokenType.AGENT:
      case TokenType.SESSION:
      case TokenType.MODEL:
      case TokenType.PROMPT:
      case TokenType.BLOCK:
      case TokenType.DO:
      case TokenType.PARALLEL:
      case TokenType.CHOICE:
      case TokenType.LET:
      case TokenType.CONST:
      case TokenType.LOOP:
      case TokenType.UNTIL:
      case TokenType.WHILE:
      case TokenType.REPEAT:
      case TokenType.FOR:
      case TokenType.IN:
      case TokenType.AS:
      case TokenType.IF:
      case TokenType.ELSE:
      case TokenType.TRY:
      case TokenType.CATCH:
      case TokenType.FINALLY:
      case TokenType.THROW:
      case TokenType.MAP:
      case TokenType.FILTER:
      case TokenType.REDUCE:
      case TokenType.PMAP:
        return SemanticTokenType.Keyword;

      // Operators
      case TokenType.ARROW:
      case TokenType.PIPE:
      case TokenType.EQUALS:
      case TokenType.COLON:
        return SemanticTokenType.Operator;

      // Identifiers
      case TokenType.IDENTIFIER:
        return SemanticTokenType.Variable;

      // Discretion markers (treat as special)
      case TokenType.DISCRETION:
      case TokenType.MULTILINE_DISCRETION:
        return SemanticTokenType.Macro;

      // Skip structural tokens
      case TokenType.NEWLINE:
      case TokenType.INDENT:
      case TokenType.DEDENT:
      case TokenType.EOF:
      case TokenType.LPAREN:
      case TokenType.RPAREN:
      case TokenType.LBRACKET:
      case TokenType.RBRACKET:
      case TokenType.LBRACE:
      case TokenType.RBRACE:
      case TokenType.COMMA:
      case TokenType.ERROR:
        return null;

      default:
        return null;
    }
  }

  /**
   * Encode tokens using LSP delta encoding
   * Format: [deltaLine, deltaStartChar, length, tokenType, tokenModifiers]
   */
  private encodeTokens(tokens: SemanticToken[]): EncodedSemanticTokens {
    // Sort tokens by position
    tokens.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.startChar - b.startChar;
    });

    const data: number[] = [];
    let prevLine = 0;
    let prevChar = 0;

    for (const token of tokens) {
      const deltaLine = token.line - prevLine;
      const deltaChar = deltaLine === 0 ? token.startChar - prevChar : token.startChar;

      data.push(
        deltaLine,
        deltaChar,
        token.length,
        token.tokenType,
        token.tokenModifiers
      );

      prevLine = token.line;
      prevChar = token.startChar;
    }

    return { data };
  }
}

/**
 * Get semantic tokens for source code
 */
export function getSemanticTokens(source: string): SemanticToken[] {
  const provider = new SemanticTokensProvider();
  return provider.getSemanticTokens(source);
}

/**
 * Get encoded semantic tokens for LSP
 */
export function getEncodedSemanticTokens(source: string): EncodedSemanticTokens {
  const provider = new SemanticTokensProvider();
  return provider.getEncodedSemanticTokens(source);
}
