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
  ImportStatementNode,
  PropertyNode,
  StringLiteralNode,
  IdentifierNode,
  ArrayExpressionNode,
  ObjectExpressionNode,
  ExpressionNode,
  LetBindingNode,
  ConstBindingNode,
  AssignmentNode,
  DoBlockNode,
  BlockDefinitionNode,
  ArrowExpressionNode,
  ParallelBlockNode,
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
      case 'ImportStatement':
        this.compileImportStatement(statement);
        break;
      case 'SessionStatement':
        this.compileSessionStatement(statement);
        break;
      case 'AgentDefinition':
        this.compileAgentDefinition(statement);
        break;
      case 'BlockDefinition':
        this.compileBlockDefinition(statement);
        break;
      case 'DoBlock':
        this.compileDoBlock(statement);
        break;
      case 'ParallelBlock':
        this.compileParallelBlock(statement);
        break;
      case 'ArrowExpression':
        this.compileArrowExpression(statement);
        break;
      case 'LetBinding':
        this.compileLetBinding(statement);
        break;
      case 'ConstBinding':
        this.compileConstBinding(statement);
        break;
      case 'Assignment':
        this.compileAssignment(statement);
        break;
      // Other statement types will be added in later tiers
    }
  }

  /**
   * Compile an import statement
   */
  private compileImportStatement(statement: ImportStatementNode): void {
    // Add source mapping
    this.addSourceMapping(statement.span.start.line, statement.span.start.column);

    // Emit: import "skill-name" from "source"
    this.emit('import "');
    this.emit(this.escapeString(statement.skillName.value));
    this.emit('" from "');
    this.emit(this.escapeString(statement.source.value));
    this.emit('"');
    this.emitNewline();
  }

  /**
   * Compile a let binding
   * Syntax: let name = expression
   */
  private compileLetBinding(binding: LetBindingNode): void {
    // Add source mapping
    this.addSourceMapping(binding.span.start.line, binding.span.start.column);

    // Emit: let name = ...
    this.emit('let ');
    this.emit(binding.name.name);
    this.emit(' = ');

    // Compile the value expression (typically a session)
    this.compileBindingValue(binding.value);
  }

  /**
   * Compile a const binding
   * Syntax: const name = expression
   */
  private compileConstBinding(binding: ConstBindingNode): void {
    // Add source mapping
    this.addSourceMapping(binding.span.start.line, binding.span.start.column);

    // Emit: const name = ...
    this.emit('const ');
    this.emit(binding.name.name);
    this.emit(' = ');

    // Compile the value expression (typically a session)
    this.compileBindingValue(binding.value);
  }

  /**
   * Compile an assignment
   * Syntax: name = expression
   */
  private compileAssignment(assignment: AssignmentNode): void {
    // Add source mapping
    this.addSourceMapping(assignment.span.start.line, assignment.span.start.column);

    // Emit: name = ...
    this.emit(assignment.name.name);
    this.emit(' = ');

    // Compile the value expression
    this.compileBindingValue(assignment.value);
  }

  /**
   * Compile a value expression in a binding (let/const/assignment)
   */
  private compileBindingValue(value: ExpressionNode): void {
    if (value.type === 'SessionStatement') {
      // Handle session as value - inline or with properties
      const session = value as SessionStatementNode;

      if (session.prompt && !session.agent && session.properties.length === 0) {
        // Simple session with inline prompt
        this.emit('session "');
        this.emit(this.escapeString(session.prompt.value));
        this.emit('"');
        this.emitNewline();
      } else if (session.agent) {
        // Session with agent
        this.emit('session');
        if (session.name) {
          this.emit(' ');
          this.emit(session.name.name);
        }
        this.emit(': ');
        this.emit(session.agent.name);
        this.emitNewline();

        // Emit properties
        for (const prop of session.properties) {
          this.compileProperty(prop);
        }
      } else {
        // Just emit newline for malformed sessions
        this.emitNewline();
      }
    } else if (value.type === 'DoBlock') {
      // Do block as value
      const doBlock = value as DoBlockNode;
      if (doBlock.name) {
        this.emit('do ');
        this.emit(doBlock.name.name);
        this.emitNewline();
      } else {
        this.emit('do:');
        this.emitNewline();
        for (const stmt of doBlock.body) {
          this.emit(this.options.indent);
          this.compileStatementInline(stmt);
        }
      }
    } else if (value.type === 'ParallelBlock') {
      // Parallel block as value
      const parallel = value as ParallelBlockNode;
      this.emit('parallel:');
      this.emitNewline();
      for (const stmt of parallel.body) {
        this.emit(this.options.indent);
        this.compileStatementInline(stmt);
      }
    } else if (value.type === 'ArrowExpression') {
      // Arrow expression as value
      this.compileExpressionInArrow(value.left);
      this.emit(' -> ');
      this.compileExpressionInArrow(value.right);
      this.emitNewline();
    } else if (value.type === 'Identifier') {
      // Variable reference
      const id = value as IdentifierNode;
      this.emit(id.name);
      this.emitNewline();
    } else if (value.type === 'StringLiteral') {
      // String literal
      const str = value as StringLiteralNode;
      this.emit('"');
      this.emit(this.escapeString(str.value));
      this.emit('"');
      this.emitNewline();
    } else if (value.type === 'ArrayExpression') {
      // Array
      this.compileArrayExpression(value as ArrayExpressionNode);
      this.emitNewline();
    } else {
      this.emitNewline();
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
   * Compile a block definition
   * Syntax: block name:
   *           body...
   */
  private compileBlockDefinition(block: BlockDefinitionNode): void {
    // Add source mapping
    this.addSourceMapping(block.span.start.line, block.span.start.column);

    // Emit: block name:
    this.emit('block ');
    this.emit(block.name.name);
    this.emit(':');
    this.emitNewline();

    // Emit body with indentation
    for (const stmt of block.body) {
      this.emit(this.options.indent);
      this.compileStatementInline(stmt);
    }
  }

  /**
   * Compile a do block (anonymous or invocation)
   */
  private compileDoBlock(doBlock: DoBlockNode, indentLevel: number = 0): void {
    // Add source mapping
    this.addSourceMapping(doBlock.span.start.line, doBlock.span.start.column);

    const indent = this.options.indent.repeat(indentLevel);

    if (doBlock.name) {
      // Block invocation: do blockname
      this.emit(indent);
      this.emit('do ');
      this.emit(doBlock.name.name);
      this.emitNewline();
    } else {
      // Anonymous do block
      this.emit(indent);
      this.emit('do:');
      this.emitNewline();

      // Emit body with indentation
      for (const stmt of doBlock.body) {
        this.emit(indent);
        this.emit(this.options.indent);
        this.compileStatementInline(stmt);
      }
    }
  }

  /**
   * Compile a parallel block
   */
  private compileParallelBlock(parallel: ParallelBlockNode, indentLevel: number = 0): void {
    // Add source mapping
    this.addSourceMapping(parallel.span.start.line, parallel.span.start.column);

    const indent = this.options.indent.repeat(indentLevel);

    this.emit(indent);
    this.emit('parallel:');
    this.emitNewline();

    // Emit body with indentation
    for (const stmt of parallel.body) {
      this.emit(indent);
      this.emit(this.options.indent);
      this.compileStatementInline(stmt);
    }
  }

  /**
   * Compile an arrow expression (session "A" -> session "B")
   */
  private compileArrowExpression(arrow: ArrowExpressionNode, indentLevel: number = 0): void {
    // Add source mapping
    this.addSourceMapping(arrow.span.start.line, arrow.span.start.column);

    const indent = this.options.indent.repeat(indentLevel);
    this.emit(indent);

    // Compile the left side inline
    this.compileExpressionInArrow(arrow.left);

    this.emit(' -> ');

    // Compile the right side inline
    this.compileExpressionInArrow(arrow.right);

    this.emitNewline();
  }

  /**
   * Compile an expression in an arrow sequence (inline, no trailing newline)
   */
  private compileExpressionInArrow(expr: ExpressionNode): void {
    if (expr.type === 'SessionStatement') {
      this.compileSessionInline(expr as SessionStatementNode);
    } else if (expr.type === 'DoBlock') {
      const doBlock = expr as DoBlockNode;
      if (doBlock.name) {
        this.emit('do ');
        this.emit(doBlock.name.name);
      } else {
        // Anonymous do blocks in arrow expressions don't make sense,
        // but we'll handle it gracefully
        this.emit('do: ...');
      }
    } else if (expr.type === 'ArrowExpression') {
      const nested = expr as ArrowExpressionNode;
      this.compileExpressionInArrow(nested.left);
      this.emit(' -> ');
      this.compileExpressionInArrow(nested.right);
    }
  }

  /**
   * Compile a session inline (without trailing newline)
   */
  private compileSessionInline(session: SessionStatementNode): void {
    this.emit('session');

    if (session.prompt && !session.agent) {
      this.emit(' "');
      this.emit(this.escapeString(session.prompt.value));
      this.emit('"');
    } else if (session.agent) {
      if (session.name) {
        this.emit(' ');
        this.emit(session.name.name);
      }
      this.emit(': ');
      this.emit(session.agent.name);
    }
  }

  /**
   * Compile a statement inline (used inside blocks)
   */
  private compileStatementInline(stmt: StatementNode): void {
    switch (stmt.type) {
      case 'SessionStatement':
        this.compileSessionStatement(stmt);
        break;
      case 'DoBlock':
        this.compileDoBlock(stmt, 0);
        break;
      case 'ParallelBlock':
        this.compileParallelBlock(stmt, 0);
        break;
      case 'ArrowExpression':
        this.compileArrowExpression(stmt, 0);
        break;
      case 'LetBinding':
        this.compileLetBinding(stmt);
        break;
      case 'ConstBinding':
        this.compileConstBinding(stmt);
        break;
      case 'Assignment':
        this.compileAssignment(stmt);
        break;
      default:
        this.compileStatement(stmt);
    }
  }

  /**
   * Compile a property
   */
  private compileProperty(prop: PropertyNode, indentLevel: number = 1): void {
    const indent = this.options.indent.repeat(indentLevel);
    this.emit(indent);
    this.emit(prop.name.name);
    this.emit(': ');

    this.compileExpression(prop.value, indentLevel);

    this.emitNewline();
  }

  /**
   * Compile an expression
   */
  private compileExpression(expr: ExpressionNode, indentLevel: number = 1): void {
    switch (expr.type) {
      case 'StringLiteral': {
        const str = expr as StringLiteralNode;
        this.emit('"');
        this.emit(this.escapeString(str.value));
        this.emit('"');
        break;
      }
      case 'Identifier': {
        const id = expr as IdentifierNode;
        this.emit(id.name);
        break;
      }
      case 'ArrayExpression': {
        this.compileArrayExpression(expr as ArrayExpressionNode);
        break;
      }
      case 'ObjectExpression': {
        this.compileObjectExpression(expr as ObjectExpressionNode, indentLevel);
        break;
      }
      default:
        // Fallback for other expression types
        break;
    }
  }

  /**
   * Compile an array expression
   */
  private compileArrayExpression(arr: ArrayExpressionNode): void {
    this.emit('[');

    for (let i = 0; i < arr.elements.length; i++) {
      if (i > 0) {
        this.emit(', ');
      }
      this.compileExpression(arr.elements[i]);
    }

    this.emit(']');
  }

  /**
   * Compile an object expression (for permissions block or context shorthand)
   */
  private compileObjectExpression(obj: ObjectExpressionNode, indentLevel: number, isContextShorthand: boolean = false): void {
    if (obj.properties.length === 0) {
      this.emit('{}');
      return;
    }

    // Check if this is a shorthand context expression { a, b, c }
    // These have properties where name === value (both are identifiers with same name)
    const isShorthand = isContextShorthand || obj.properties.every(p =>
      p.value.type === 'Identifier' && p.name.name === (p.value as IdentifierNode).name
    );

    if (isShorthand) {
      // Emit inline shorthand: { a, b, c }
      this.emit('{ ');
      for (let i = 0; i < obj.properties.length; i++) {
        if (i > 0) {
          this.emit(', ');
        }
        this.emit(obj.properties[i].name.name);
      }
      this.emit(' }');
    } else {
      // Object expressions in permissions are rendered as nested blocks
      // Emit a newline and then each property with increased indentation
      this.emitNewline();
      for (const prop of obj.properties) {
        this.compileProperty(prop, indentLevel + 1);
      }
    }
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
