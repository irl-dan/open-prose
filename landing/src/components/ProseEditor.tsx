"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { prose } from "@/lib/prose-language";

interface ProseEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}

// Custom theme to match the landing page design
const proseTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--code-bg, #1a1a2e)",
    color: "var(--code-text, #e0e0e0)",
    height: "100%",
  },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    fontSize: "14px",
    padding: "16px 0",
  },
  ".cm-gutters": {
    backgroundColor: "var(--code-bg, #1a1a2e)",
    borderRight: "1px solid rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.3)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(139, 92, 246, 0.3) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(139, 92, 246, 0.4) !important",
  },
  ".cm-cursor": {
    borderLeftColor: "#8b5cf6",
  },
  // Syntax highlighting
  ".cm-keyword": {
    color: "#c792ea",
    fontWeight: "500",
  },
  ".cm-string": {
    color: "#c3e88d",
  },
  ".cm-number": {
    color: "#f78c6c",
  },
  ".cm-comment": {
    color: "#676e95",
    fontStyle: "italic",
  },
  ".cm-meta": {
    color: "#ffcb6b",
    fontWeight: "600",
  },
  ".cm-variableName": {
    color: "#82aaff",
  },
  ".cm-typeName": {
    color: "#89ddff",
  },
  ".cm-operator": {
    color: "#89ddff",
  },
  ".cm-punctuation": {
    color: "#89ddff",
  },
  ".cm-bracket": {
    color: "#bfc7d5",
  },
});

export function ProseEditor({
  value,
  onChange,
  className = "",
  readOnly = false,
}: ProseEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isExternalUpdate = useRef(false);

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isExternalUpdate.current) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        prose(),
        proseTheme,
        keymap.of([indentWithTab]),
        updateListener,
        EditorState.readOnly.of(readOnly),
        EditorView.lineWrapping,
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []); // Only run on mount

  // Update content when value changes externally (e.g., from SSE)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (value !== currentContent) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  // Update readOnly state
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: EditorState.readOnly.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      className={`prose-editor ${className}`}
      style={{ height: "100%", overflow: "auto" }}
    />
  );
}
