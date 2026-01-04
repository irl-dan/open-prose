"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ProseEditor } from "@/components/ProseEditor";
import { CommandBar } from "@/components/CommandBar";
import { MessageHistory, type Message } from "@/components/MessageHistory";

const INITIAL_PROSE = `# My workflow
# Describe what you want to build in the command bar below

agent researcher:
  model: sonnet

session: researcher
  prompt: "Get started..."
`;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.prose.md";

export default function IdePage() {
  const [code, setCode] = useState(INITIAL_PROSE);
  const [history, setHistory] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (prompt: string) => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsStreaming(true);

      // Add user message to history
      const userMessage: Message = { role: "user", content: prompt };
      setHistory((h) => [...h, userMessage]);

      try {
        const response = await fetch(`${API_URL}/v1/ide/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentProse: code,
            history: history,
            prompt,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Request failed" }));
          throw new Error(error.error || "Request failed");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const json = JSON.parse(data);
                if (json.content) {
                  assistantContent += json.content;
                  // Update the code editor with streamed content
                  setCode(assistantContent);
                }
                if (json.error) {
                  throw new Error(json.error);
                }
              } catch (e) {
                // Ignore parse errors for malformed chunks
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }

        // Add assistant response to history
        if (assistantContent) {
          const assistantMessage: Message = {
            role: "assistant",
            content: assistantContent,
          };
          setHistory((h) => [...h, assistantMessage]);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was cancelled, ignore
          return;
        }
        console.error("Generate error:", error);
        // Add error message to history
        const errorMessage: Message = {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
        setHistory((h) => [...h, errorMessage]);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [code, history]
  );

  const handleClear = useCallback(() => {
    setHistory([]);
    setCode(INITIAL_PROSE);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[var(--paper-cream)]">
      {/* Header */}
      <header className="h-14 border-b border-[var(--paper-aged)] flex items-center justify-between px-4 bg-[var(--paper-warm)]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-lg font-light tracking-tight hover:opacity-70 transition-opacity"
            style={{ fontFamily: "var(--font-prose)" }}
          >
            <span className="text-[var(--ink-light)]">Open</span> Prose
          </Link>
          <span className="text-xs font-mono text-[var(--ink-light)] bg-[var(--paper-cream)] px-2 py-1 rounded">
            IDE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="text-xs font-mono text-[var(--ink-light)] hover:text-[var(--ink-dark)] transition-colors px-3 py-1.5 rounded hover:bg-[var(--paper-cream)]"
          >
            Clear
          </button>
          <a
            href="https://github.com/openprose/prose/blob/main/skills/open-prose/docs.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[var(--ink-light)] hover:text-[var(--ink-dark)] transition-colors px-3 py-1.5 rounded hover:bg-[var(--paper-cream)]"
          >
            Docs
          </a>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Editor panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <ProseEditor
              value={code}
              onChange={setCode}
              readOnly={isStreaming}
              className="h-full"
            />
          </div>
        </div>

        {/* Side panel - chat history */}
        <div className="w-80 border-l border-[var(--paper-aged)] flex flex-col bg-[var(--paper-cream)]">
          <div className="h-10 border-b border-[var(--paper-aged)] flex items-center px-4">
            <span className="text-xs font-mono text-[var(--ink-light)] uppercase tracking-wider">
              Conversation
            </span>
          </div>
          <MessageHistory messages={history} isStreaming={isStreaming} />
        </div>
      </div>

      {/* Command bar at bottom */}
      <CommandBar onSubmit={handleSubmit} isLoading={isStreaming} />
    </div>
  );
}
