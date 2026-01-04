"use client";

import { useState, useCallback, KeyboardEvent } from "react";

interface CommandBarProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function CommandBar({
  onSubmit,
  isLoading,
  placeholder = "Describe what you want to build...",
}: CommandBarProps) {
  const [input, setInput] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setInput("");
  }, [input, isLoading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="command-bar flex items-end gap-3 p-4 border-t border-[var(--paper-aged)] bg-[var(--paper-cream)]">
      <div className="flex-1 relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="w-full px-4 py-3 rounded-lg bg-[var(--paper-warm)] border border-[var(--paper-aged)]
                     font-mono text-sm text-[var(--ink-dark)] placeholder-[var(--ink-light)]
                     focus:outline-none focus:border-[var(--semantic-gold)] focus:ring-1 focus:ring-[var(--semantic-gold)]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     resize-none overflow-hidden"
          style={{
            minHeight: "44px",
            maxHeight: "120px",
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={isLoading || !input.trim()}
        className="px-6 py-3 rounded-lg font-medium text-sm transition-colors
                   bg-[var(--ink-dark)] text-[var(--paper-cream)]
                   hover:bg-[var(--ink-medium)]
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating...
          </>
        ) : (
          <>
            Generate
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
