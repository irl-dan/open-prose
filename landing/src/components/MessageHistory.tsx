"use client";

import { useEffect, useRef } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MessageHistoryProps {
  messages: Message[];
  isStreaming?: boolean;
}

export function MessageHistory({
  messages,
  isStreaming = false,
}: MessageHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-xs">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--paper-warm)] flex items-center justify-center">
            <svg
              className="w-6 h-6 text-[var(--ink-light)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm text-[var(--ink-light)]">
            Describe what you want to build in the command bar below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`message ${msg.role === "user" ? "message-user" : "message-assistant"}`}
        >
          <div
            className={`
              p-3 rounded-lg text-sm
              ${
                msg.role === "user"
                  ? "bg-[var(--paper-warm)] ml-8 border border-[var(--paper-aged)]"
                  : "bg-[var(--code-bg, #1a1a2e)] text-[var(--code-text, #e0e0e0)] mr-4"
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`
                  text-xs font-mono uppercase tracking-wider
                  ${msg.role === "user" ? "text-[var(--ink-light)]" : "text-[var(--semantic-gold)]"}
                `}
              >
                {msg.role === "user" ? "You" : "OpenProse"}
              </span>
              {msg.role === "assistant" && i === messages.length - 1 && isStreaming && (
                <span className="flex items-center gap-1 text-xs text-[var(--semantic-gold)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--semantic-gold)] animate-pulse" />
                  generating
                </span>
              )}
            </div>
            <div className="whitespace-pre-wrap font-mono leading-relaxed">
              {msg.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
