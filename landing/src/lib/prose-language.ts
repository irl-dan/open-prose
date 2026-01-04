/**
 * CodeMirror 6 language mode for OpenProse (.prose files)
 *
 * Uses a simple StreamLanguage for syntax highlighting.
 */

import { StreamLanguage, LanguageSupport } from "@codemirror/language";

// OpenProse keywords
const KEYWORDS = new Set([
  "agent",
  "session",
  "model",
  "prompt",
  "block",
  "do",
  "parallel",
  "choice",
  "let",
  "const",
  "loop",
  "until",
  "while",
  "repeat",
  "for",
  "in",
  "as",
  "if",
  "elif",
  "else",
  "option",
  "try",
  "catch",
  "finally",
  "throw",
  "retry",
  "backoff",
  "map",
  "filter",
  "reduce",
  "pmap",
  "skills",
  "permissions",
  "context",
  "import",
  "from",
]);

// Model values
const MODEL_VALUES = new Set(["sonnet", "opus", "haiku"]);

interface ProseState {
  inString: boolean;
  stringChar: string;
  inDiscretion: boolean;
  discretionMarker: string;
}

const proseLanguage = StreamLanguage.define<ProseState>({
  name: "prose",

  startState(): ProseState {
    return {
      inString: false,
      stringChar: "",
      inDiscretion: false,
      discretionMarker: "",
    };
  },

  token(stream, state): string | null {
    // Handle string continuation
    if (state.inString) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "\\") {
          stream.next(); // Skip escaped char
        } else if (ch === state.stringChar) {
          // Check for triple quote end
          if (state.stringChar === '"' && stream.match('""')) {
            state.inString = false;
            state.stringChar = "";
            return "string";
          }
          state.inString = false;
          state.stringChar = "";
          return "string";
        }
      }
      return "string";
    }

    // Handle discretion continuation
    if (state.inDiscretion) {
      const marker = state.discretionMarker;
      while (!stream.eol()) {
        if (stream.match(marker)) {
          state.inDiscretion = false;
          state.discretionMarker = "";
          return "meta";
        }
        stream.next();
      }
      return "meta";
    }

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Comments
    if (stream.match("#")) {
      stream.skipToEnd();
      return "comment";
    }

    // Discretion markers (*** or **)
    if (stream.match("***")) {
      // Check if it closes on same line
      const rest = stream.string.slice(stream.pos);
      const closeIdx = rest.indexOf("***");
      if (closeIdx >= 0) {
        stream.pos += closeIdx + 3;
        return "meta";
      }
      state.inDiscretion = true;
      state.discretionMarker = "***";
      stream.skipToEnd();
      return "meta";
    }

    if (stream.match("**")) {
      // Check if it closes on same line
      const rest = stream.string.slice(stream.pos);
      const closeIdx = rest.indexOf("**");
      if (closeIdx >= 0) {
        stream.pos += closeIdx + 2;
        return "meta";
      }
      state.inDiscretion = true;
      state.discretionMarker = "**";
      stream.skipToEnd();
      return "meta";
    }

    // Triple-quoted strings
    if (stream.match('"""')) {
      state.inString = true;
      state.stringChar = '"';
      return "string";
    }

    // Double-quoted strings
    if (stream.match('"')) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "\\") {
          stream.next();
        } else if (ch === '"') {
          return "string";
        }
      }
      return "string";
    }

    // Single-quoted strings
    if (stream.match("'")) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "\\") {
          stream.next();
        } else if (ch === "'") {
          return "string";
        }
      }
      return "string";
    }

    // Numbers
    if (stream.match(/^\d+(\.\d+)?/)) {
      return "number";
    }

    // Operators
    if (stream.match("->")) {
      return "operator";
    }
    if (stream.match("|")) {
      return "operator";
    }
    if (stream.match("=")) {
      return "operator";
    }
    if (stream.match(":")) {
      return "punctuation";
    }

    // Brackets
    if (stream.match(/^[\[\](){}]/)) {
      return "bracket";
    }

    // Comma
    if (stream.match(",")) {
      return "punctuation";
    }

    // Identifiers and keywords
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_-]*/)) {
      const word = stream.current();
      if (KEYWORDS.has(word)) {
        return "keyword";
      }
      if (MODEL_VALUES.has(word)) {
        return "typeName";
      }
      return "variableName";
    }

    // Skip unknown characters
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: "#" },
  },
});

/**
 * Get the OpenProse language support for CodeMirror
 */
export function prose(): LanguageSupport {
  return new LanguageSupport(proseLanguage);
}
