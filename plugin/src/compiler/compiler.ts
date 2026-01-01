/**
 * OpenProse Compiler
 *
 * Compiles OpenProse programs to a canonical form for the Orchestrator.
 * Handles:
 * - Comments (stripped by default)
 * - Sessions (simple and with agents)
 * - Agent definitions
 */

import {
  ProgramNode,
  StatementNode,
  CommentNode,
  CommentStatementNode,
  SessionStatementNode,
  AgentDefinitionNode,
  PropertyNode,
  StringLiteralNode,
  IdentifierNode,
} from '../parser';
import { SourceSpan } from '../parser/tokens';

export interface CompilerOptions {
  /** Whether to preserve comments in the output (default: false) */
  preserveComments?: boolean;
  /** Whether to include source maps (default: false) */
  sourceMaps?: boolean;
  /** Whether to format output for readability (default: true) */
  prettyPrint?: boolean;
  /** Indentation string (default: two spaces) */
  indent?: string;
}

export interface CompiledOutput {
  /** The compiled source code with comments stripped */
  code: string;
  /** Comments that were stripped (for debugging) */
  strippedComments: CommentInfo[];
  /** Source map if enabled */
  sourceMap?: SourceMap;
}

export interface CommentInfo {
  value: string;
  line: number;
  column: number;
  isInline: boolean;
}

export interface SourceMap {
  mappings: SourceMapping[];
}

export interface SourceMapping {
  originalLine: number;
  originalColumn: number;
  generatedLine: number;
  generatedColumn: number;
}

export class Compiler {
  private output: string[] = [];
  private strippedComments: CommentInfo[] = [];
  private sourceMappings: SourceMapping[] = [];
  private currentLine: number = 1;
  private currentColumn: number = 1;
  private options: Required<CompilerOptions>;

  constructor(private program: ProgramNode, options: CompilerOptions = {}) {
    this.options = {
      preserveComments: options.preserveComments ?? false,
      sourceMaps: options.sourceMaps ?? false,
      prettyPrint: options.prettyPrint ?? true,
      indent: options.indent ?? '  ',
    };
  }

  /**
   * Compile the program
   */
  public compile(): CompiledOutput {
    this.output = [];
    this.strippedComments = [];
    this.sourceMappings = [];
    this.currentLine = 1;
    this.currentColumn = 1;

    // Process all statements
    for (const statement of this.program.statements) {
      this.compileStatement(statement);
    }

    return {
      code: this.output.join(''),
      strippedComments: this.strippedComments,
      sourceMap: this.options.sourceMaps
        ? { mappings: this.sourceMappings }
        : undefined,
    };
  }

  /**
   * Compile a statement
   */
  private compileStatement(statement: StatementNode): void {
    switch (statement.type) {
      case 'CommentStatement':
        this.compileCommentStatement(statement);
        break;
      case 'SessionStatement':
        this.compileSessionStatement(statement);
        break;
      case 'AgentDefinition':
        this.compileAgentDefinition(statement);
        break;
      // Other statement types will be added in later tiers
    }
  }

  /**
   * Compile a comment statement
   */
  private compileCommentStatement(statement: CommentStatementNode): void {
    const comment = statement.comment;

    // Record the stripped comment
    this.strippedComments.push({
      value: comment.value,
      line: comment.span.start.line,
      column: comment.span.start.column,
      isInline: comment.isInline,
    });

    // If preserving comments, emit them
    if (this.options.preserveComments) {
      this.emit(comment.value);
      this.emitNewline();
    }
    // Otherwise, they're just recorded and stripped
  }

  /**
   * Compile an agent definition
   */
  private compileAgentDefinition(agent: AgentDefinitionNode): void {
    // Add source mapping
    this.addSourceMapping(agent.span.start.line, agent.span.start.column);

    // Emit: agent name:
    this.emit('agent ');
    this.emit(agent.name.name);
    this.emit(':');
    this.emitNewline();

    // Emit properties with indentation
    for (const prop of agent.properties) {
      this.compileProperty(prop);
    }
  }

  /**
   * Compile a property
   */
  private compileProperty(prop: PropertyNode): void {
    this.emit(this.options.indent);
    this.emit(prop.name.name);
    this.emit(': ');

    if (prop.value.type === 'StringLiteral') {
      const str = prop.value as StringLiteralNode;
      this.emit('"');
      this.emit(this.escapeString(str.value));
      this.emit('"');
    } else if (prop.value.type === 'Identifier') {
      const id = prop.value as IdentifierNode;
      this.emit(id.name);
    }

    this.emitNewline();
  }

  /**
   * Compile a session statement
   */
  private compileSessionStatement(statement: SessionStatementNode): void {
    // Add source mapping
    this.addSourceMapping(statement.span.start.line, statement.span.start.column);

    // Emit the session keyword
    this.emit('session');

    // Simple session with inline prompt
    if (statement.prompt && !statement.agent) {
      this.emit(' ');
      this.emit('"');
      this.emit(this.escapeString(statement.prompt.value));
      this.emit('"');
    }
    // Session with agent reference
    else if (statement.agent) {
      // Named session: session name: agent
      if (statement.name) {
        this.emit(' ');
        this.emit(statement.name.name);
      }
      this.emit(': ');
      this.emit(statement.agent.name);
    }

    // Note: inline comments are stripped by default
    if (statement.inlineComment) {
      this.strippedComments.push({
        value: statement.inlineComment.value,
        line: statement.inlineComment.span.start.line,
        column: statement.inlineComment.span.start.column,
        isInline: true,
      });

      if (this.options.preserveComments) {
        this.emit('  ');
        this.emit(statement.inlineComment.value);
      }
    }

    this.emitNewline();

    // Emit properties with indentation
    for (const prop of statement.properties) {
      this.compileProperty(prop);
    }
  }

  /**
   * Escape special characters in a string
   * Converts processed values back to their escape sequence representation
   */
  private escapeString(str: string): string {
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const code = char.charCodeAt(0);

      switch (char) {
        case '\\': result += '\\\\'; break;
        case '"': result += '\\"'; break;
        case '\n': result += '\\n'; break;
        case '\r': result += '\\r'; break;
        case '\t': result += '\\t'; break;
        case '\0': result += '\\0'; break;
        default:
          // Escape non-printable ASCII and control characters as unicode
          if (code < 32 || code === 127) {
            result += '\\u' + code.toString(16).padStart(4, '0');
          } else {
            result += char;
          }
      }
    }
    return result;
  }

  /**
   * Emit text to the output
   */
  private emit(text: string): void {
    this.output.push(text);
    // Update position tracking
    for (const char of text) {
      if (char === '\n') {
        this.currentLine++;
        this.currentColumn = 1;
      } else {
        this.currentColumn++;
      }
    }
  }

  /**
   * Emit a newline
   */
  private emitNewline(): void {
    if (this.options.prettyPrint) {
      this.emit('\n');
    }
  }

  /**
   * Add a source mapping
   */
  private addSourceMapping(originalLine: number, originalColumn: number): void {
    if (this.options.sourceMaps) {
      this.sourceMappings.push({
        originalLine,
        originalColumn,
        generatedLine: this.currentLine,
        generatedColumn: this.currentColumn,
      });
    }
  }
}

/**
 * Compile an OpenProse program
 */
export function compile(program: ProgramNode, options?: CompilerOptions): CompiledOutput {
  const compiler = new Compiler(program, options);
  return compiler.compile();
}

/**
 * Compile and return just the code (convenience function)
 */
export function compileToString(program: ProgramNode, options?: CompilerOptions): string {
  const result = compile(program, options);
  return result.code;
}

/**
 * Strip comments from source code (convenience function)
 */
export function stripComments(source: string): string {
  // Simple regex-based comment stripping for convenience
  // Note: This doesn't handle comments in strings, use the full parser for that
  const lines = source.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    // Find # that's not inside a string
    let inString = false;
    let escapeNext = false;
    let commentStart = -1;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !inString) {
        inString = true;
        continue;
      }

      if (char === '"' && inString) {
        inString = false;
        continue;
      }

      if (char === '#' && !inString) {
        commentStart = i;
        break;
      }
    }

    if (commentStart === 0) {
      // Entire line is a comment, skip it
      continue;
    } else if (commentStart > 0) {
      // Inline comment, trim it
      result.push(line.substring(0, commentStart).trimEnd());
    } else {
      // No comment, keep the line
      result.push(line);
    }
  }

  return result.join('\n');
}
