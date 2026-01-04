"use client";

import { useState, useEffect } from "react";
import analytics from "@/lib/analytics";
import ContactModal from "@/components/ContactModal";
import FundingModal from "@/components/FundingModal";

// ============================================
// COMPONENTS
// ============================================

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(text.slice(0, i + 1));
          i++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, 40);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span className="cursor-blink">|</span>}
    </span>
  );
}

function CodeBlock({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <pre className={`code-block ${className}`}>
      <code>{children}</code>
    </pre>
  );
}

function SemanticSpan({ children }: { children: React.ReactNode }) {
  return <span className="token-semantic">**{children}**</span>;
}

// ============================================
// HERO SECTION
// ============================================

function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col justify-center px-6 py-20 md:py-32 overflow-hidden">
      <div className="max-w-4xl mx-auto w-full min-w-0">
        {/* Logo/Name */}
        <div className="mb-8 opacity-0 animate-fade-in-up">
          <h1
            className="text-5xl md:text-7xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-prose)" }}
          >
            <span className="text-[var(--ink-light)]">Open</span> Prose
          </h1>
        </div>

        {/* Tagline */}
        <div className="mb-6 opacity-0 animate-fade-in-up animation-delay-200">
          <p className="text-2xl md:text-3xl font-light leading-relaxed text-[var(--ink-dark)]">
            <TypewriterText
              text="A new kind of language for a new kind of computer."
              delay={800}
            />
          </p>
        </div>

        {/* Subtitle */}
        <div className="mb-8 opacity-0 animate-fade-in-up animation-delay-300">
          <p className="text-lg md:text-xl text-[var(--ink-medium)] max-w-2xl">
            A long-running AI session is a Turing-complete computer. OpenProse
            is a programming language for it.
          </p>
        </div>

        {/* Beta warning */}
        <div className="mb-12 opacity-0 animate-fade-in-up animation-delay-350">
          <a
            href="#beta"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--semantic-gold-bg)] text-[var(--semantic-gold)] rounded-full text-sm font-medium hover:bg-[var(--semantic-gold)] hover:text-white transition-colors"
          >
            <span>⚠️</span>
            <span>Beta Software — Read before using</span>
          </a>
        </div>

        {/* Hero code example */}
        <div className="mb-12 opacity-0 animate-fade-in-up animation-delay-400 min-w-0">
          <CodeBlock>
            <span className="token-comment"># Research and write workflow</span>
            {"\n"}
            <span className="token-keyword">agent</span> researcher:
            {"\n"}
            {"  "}
            <span className="token-property">model</span>: sonnet
            {"\n"}
            {"  "}
            <span className="token-property">skills</span>: [
            <span className="token-string">&quot;web-search&quot;</span>]
            {"\n\n"}
            <span className="token-keyword">agent</span> writer:
            {"\n"}
            {"  "}
            <span className="token-property">model</span>: opus
            {"\n\n"}
            <span className="token-keyword">parallel</span>:{"\n"}
            {"  "}research = <span className="token-keyword">session</span>:
            researcher
            {"\n"}
            {"    "}
            <span className="token-property">prompt</span>:{" "}
            <span className="token-string">
              &quot;Research quantum computing breakthroughs&quot;
            </span>
            {"\n"}
            {"  "}competitive = <span className="token-keyword">session</span>:
            researcher
            {"\n"}
            {"    "}
            <span className="token-property">prompt</span>:{" "}
            <span className="token-string">
              &quot;Analyze competitor landscape&quot;
            </span>
            {"\n\n"}
            <span className="token-keyword">loop until</span>{" "}
            <SemanticSpan>the draft meets publication standards</SemanticSpan>{" "}
            (max: 3):
            {"\n"}
            {"  "}
            <span className="token-keyword">session</span>: writer
            {"\n"}
            {"    "}
            <span className="token-property">prompt</span>:{" "}
            <span className="token-string">
              &quot;Write and refine the article&quot;
            </span>
            {"\n"}
            {"    "}
            <span className="token-property">context</span>: {"{"} research,
            competitive {"}"}
          </CodeBlock>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in-up animation-delay-600">
          <a
            href="https://github.com/openprose/prose"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2"
            onClick={() =>
              analytics.track("cta_click", {
                button: "github",
                section: "hero",
              })
            }
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            View on GitHub
          </a>
          <a
            href="#concept"
            className="btn-secondary"
            onClick={() =>
              analytics.track("cta_click", {
                button: "learn_concept",
                section: "hero",
              })
            }
          >
            Learn the concept
          </a>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CONCEPT SECTION - The Four Key Ideas
// ============================================

function ConceptSection() {
  return (
    <section id="concept" className="py-24 bg-[var(--paper-warm)]">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-light mb-6 tracking-tight">
          The intelligent inversion of control
        </h2>
        <p className="text-lg text-[var(--ink-medium)] mb-12 md:mb-16 max-w-2xl">
          Traditional orchestration requires explicit coordination code.
          OpenProse inverts this—you declare agents and control flow, and an AI
          session wires them up. The session is the IoC container.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12 md:mb-16">
          {/* Card 1: Intelligent IoC */}
          <div className="bg-[var(--paper-cream)] p-8 rounded-lg border border-[var(--paper-aged)]">
            <div className="w-10 h-10 rounded-full bg-[var(--semantic-gold-bg)] flex items-center justify-center mb-4">
              <span className="text-[var(--semantic-gold)] text-lg">1</span>
            </div>
            <h3 className="text-xl font-medium mb-3 text-[var(--ink-dark)]">
              Intelligent IoC Container
            </h3>
            <p className="text-[var(--ink-medium)] text-base">
              Traditional IoC wires up dependencies from configuration.
              OpenProse&apos;s container is an AI session that wires up agents
              using <em>understanding</em>—it knows context, not just config.
            </p>
          </div>

          {/* Card 2: Fourth Wall */}
          <div className="bg-[var(--paper-cream)] p-8 rounded-lg border border-[var(--paper-aged)]">
            <div className="w-10 h-10 rounded-full bg-[var(--semantic-gold-bg)] flex items-center justify-center mb-4">
              <span className="text-[var(--semantic-gold)] text-lg">2</span>
            </div>
            <h3 className="text-xl font-medium mb-3 text-[var(--ink-dark)]">
              The Fourth Wall{" "}
              <code className="inline-code text-sm">**...**</code>
            </h3>
            <p className="text-[var(--ink-medium)] text-base">
              When you need AI judgment instead of strict execution, break out
              of structure:
              <code className="inline-code text-sm ml-1">
                loop until **the code is production ready**
              </code>
              . The OpenProse VM evaluates this semantically.
            </p>
          </div>

          {/* Card 3: Open Standard */}
          <div className="bg-[var(--paper-cream)] p-8 rounded-lg border border-[var(--paper-aged)]">
            <div className="w-10 h-10 rounded-full bg-[var(--semantic-gold-bg)] flex items-center justify-center mb-4">
              <span className="text-[var(--semantic-gold)] text-lg">3</span>
            </div>
            <h3 className="text-xl font-medium mb-3 text-[var(--ink-dark)]">
              Open Standard, Zero Lock-in
            </h3>
            <p className="text-[var(--ink-medium)] text-base">
              OpenProse is a skill you import into Claude Code, OpenCode, Codex,
              Amp, or any compatible AI assistant. Switch platforms anytime—your{" "}
              <code className="inline-code text-sm">.prose</code> files work
              everywhere.
            </p>
          </div>

          {/* Card 4: Structure + Flexibility */}
          <div className="bg-[var(--paper-cream)] p-8 rounded-lg border border-[var(--paper-aged)]">
            <div className="w-10 h-10 rounded-full bg-[var(--semantic-gold-bg)] flex items-center justify-center mb-4">
              <span className="text-[var(--semantic-gold)] text-lg">4</span>
            </div>
            <h3 className="text-xl font-medium mb-3 text-[var(--ink-dark)]">
              Structure + Flexibility
            </h3>
            <p className="text-[var(--ink-medium)] text-base">
              Plain English prompts are ambiguous. Rigid frameworks are
              inflexible. OpenProse gives you unambiguous control flow with
              natural language conditions where you want flexibility.
            </p>
          </div>
        </div>

        <div className="section-divider"></div>

        {/* The **...** deep dive */}
        <div className="max-w-2xl">
          <h3 className="text-xl font-medium mb-6">Why structure matters</h3>
          <p className="text-[var(--ink-medium)] mb-6">
            &quot;Why not just describe agents in plain English?&quot; You
            can—that&apos;s what <code className="inline-code">**...**</code> is
            for. But complex workflows need unambiguous structure for control
            flow. The AI shouldn&apos;t have to guess whether you want
            sequential or parallel execution.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="min-w-0">
              <p className="text-sm font-mono text-[var(--ink-light)] mb-2">
                Ambiguous (plain English):
              </p>
              <CodeBlock className="text-sm">
                <span className="token-string">
                  &quot;Research the topic, then write about it, and get
                  feedback until it&apos;s good&quot;
                </span>
              </CodeBlock>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-mono text-[var(--ink-light)] mb-2">
                Unambiguous (OpenProse):
              </p>
              <CodeBlock className="text-sm">
                <span className="token-keyword">let</span> research ={" "}
                <span className="token-keyword">session</span>{" "}
                <span className="token-string">&quot;Research&quot;</span>
                {"\n"}
                <span className="token-keyword">loop until</span>{" "}
                <SemanticSpan>good</SemanticSpan>:{"\n"}
                {"  "}
                <span className="token-keyword">session</span>{" "}
                <span className="token-string">&quot;Write&quot;</span>
                {"\n"}
                {"  "}
                <span className="token-keyword">session</span>{" "}
                <span className="token-string">&quot;Get feedback&quot;</span>
              </CodeBlock>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// PROSE COMPLETE SECTION
// ============================================

function ProseCompleteSection({
  onOpenFunding,
}: {
  onOpenFunding: () => void;
}) {
  const systems = [
    { name: "Claude Code with Opus 4.5", status: "tested", tier: 1 },
    { name: "Claude Code with Sonnet 4.5", status: "untested", tier: 2 },
    { name: "Claude Code with Opus 4", status: "untested", tier: 3 },
    { name: "Claude Code with Sonnet 4", status: "untested", tier: 4 },
    { name: "Codex", status: "untested", tier: null },
    { name: "OpenCode with Opus 4.5", status: "untested", tier: null },
  ];

  return (
    <section id="prose-complete" className="px-6 py-24">
      <div className="max-w-4xl mx-auto">
        {/* Definition block - academic style */}
        <div className="mb-16">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--semantic-gold)]">
              Definition
            </span>
            <div className="flex-1 h-px bg-[var(--paper-aged)]" />
          </div>

          <h2
            className="text-3xl md:text-4xl font-light mb-6 tracking-tight"
            style={{ fontFamily: "var(--font-prose)" }}
          >
            Prose Complete
          </h2>

          <blockquote className="border-l-2 border-[var(--semantic-gold)] pl-6 py-2 my-8">
            <p className="text-xl md:text-2xl font-light text-[var(--ink-dark)] leading-relaxed italic">
              A System is <span className="not-italic font-medium">Prose Complete</span> if
              it can run a <code className="inline-code text-base">.prose</code> program
              of arbitrary complexity.
            </p>
          </blockquote>

          <p className="text-[var(--ink-medium)] text-lg max-w-2xl">
            Not all systems are Prose Complete. It&apos;s not just the model—it&apos;s
            the model plus the harness. Together, they need to maintain context, follow complex control
            flow, and coordinate agent sessions.
          </p>
        </div>

        {/* Systems ranking */}
        <div className="mb-12">
          <h3 className="text-sm font-mono uppercase tracking-widest text-[var(--ink-light)] mb-6">
            Systems approaching Prose Completeness
          </h3>

          <div className="space-y-3">
            {systems.map((system, index) => (
              <div
                key={system.name}
                className={`
                  flex items-center gap-4 p-4 rounded-lg transition-all
                  ${
                    system.status === "tested"
                      ? "bg-[var(--paper-cream)] border border-[var(--paper-aged)]"
                      : "bg-transparent border border-dashed border-[var(--paper-aged)]"
                  }
                `}
              >
                {/* Rank indicator */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono
                    ${
                      system.tier === 1
                        ? "bg-[var(--semantic-gold)] text-white"
                        : system.tier
                          ? "bg-[var(--paper-warm)] text-[var(--ink-medium)] border border-[var(--paper-aged)]"
                          : "bg-transparent text-[var(--ink-light)]"
                    }
                  `}
                >
                  {system.tier || "?"}
                </div>

                {/* System name */}
                <span
                  className={`
                    flex-1 font-medium
                    ${system.status === "tested" ? "text-[var(--ink-dark)]" : "text-[var(--ink-light)]"}
                  `}
                >
                  {system.name}
                </span>

                {/* Status badge */}
                <span
                  className={`
                    text-xs font-mono uppercase tracking-wider px-2 py-1 rounded
                    ${
                      system.status === "tested"
                        ? "bg-[var(--semantic-gold-bg)] text-[var(--semantic-gold)]"
                        : "bg-[var(--paper-warm)] text-[var(--ink-light)]"
                    }
                  `}
                >
                  {system.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Funding CTA */}
        <div className="border-t border-[var(--paper-aged)] pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-[var(--ink-medium)] text-base">
              <span className="italic">Benchmarks still underway.</span>{" "}
              <span className="text-[var(--ink-light)]">
                Want to help fund my time?
              </span>
            </p>
            <button
              onClick={() => {
                analytics.track("cta_click", {
                  button: "fund_benchmarker",
                  section: "prose_complete",
                });
                onOpenFunding();
              }}
              className="btn-secondary whitespace-nowrap inline-flex items-center justify-center gap-2"
            >
              Fund the benchmarker
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// FAQ SECTION
// ============================================

function FAQSection({
  onOpenFunding,
}: {
  onOpenFunding: () => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: { question: string; answer: React.ReactNode }[] = [
    {
      question: "Why not LangChain, CrewAI, or AutoGen?",
      answer:
        "Those are libraries that orchestrate agents from outside. OpenProse runs inside the agent session—the session itself is the IoC container. This means zero external dependencies and portability across any AI assistant. Switch from Claude Code to Codex? Your .prose files still work.",
    },
    {
      question: "Why not just plain English prompts?",
      answer:
        "You can use **...** for natural language wherever you want AI judgment. But complex workflows need unambiguous structure for control flow—sequential vs parallel, loop conditions, error handling. Plain English is ambiguous; OpenProse gives you structure where it matters.",
    },
    {
      question: 'What\'s "intelligent IoC"?',
      answer:
        "Traditional IoC containers (Spring, Guice) wire up dependencies from configuration files. OpenProse's container is an AI session that wires up agents using understanding. It doesn't just match names—it understands context, intent, and can make intelligent decisions about execution.",
    },
    {
      question: "Does this work today?",
      answer:
        "Yes. Install the Claude Code plugin and run .prose files now. The core language features (agents, sessions, parallel, loops, context passing) are implemented. Advanced features are being added incrementally.",
    },
    {
      question: "What AI assistants are supported?",
      answer:
        "Currently Claude Code via the plugin. OpenCode, Codex, and Amp support are planned. The language is designed to be framework-agnostic—it's just a skill you import.",
    },
    {
      question: "How will you make money?",
      answer: (
        <>
          This project is bootstrapped and does not have a revenue model.
          I&apos;m sure I will find a way. If you want to help fund it:
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenFunding();
            }}
            className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--semantic-gold)] bg-[var(--semantic-gold-bg)] hover:bg-[var(--semantic-gold)] hover:text-white rounded-md transition-colors"
          >
            Fund the creator
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </>
      ),
    },
  ];

  return (
    <section id="faq" className="px-6 py-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-light mb-12 tracking-tight">
          Common questions
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-[var(--paper-aged)] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => {
                  const isOpening = openIndex !== index;
                  setOpenIndex(isOpening ? index : null);
                  if (isOpening) {
                    analytics.track("faq_expand", {
                      question: index,
                      questionText: faq.question,
                    });
                  }
                }}
                className="w-full px-6 py-5 text-left flex justify-between items-center bg-[var(--paper-cream)] hover:bg-[var(--paper-warm)] transition-colors"
              >
                <span className="font-medium text-[var(--ink-dark)]">
                  {faq.question}
                </span>
                <span
                  className={`text-[var(--ink-light)] transition-transform ${openIndex === index ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 py-5 bg-[var(--paper-warm)] border-t border-[var(--paper-aged)]">
                  <p className="text-[var(--ink-medium)]">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// GETTING STARTED SECTION
// ============================================

function GettingStartedSection() {
  return (
    <section id="start" className="py-24 bg-[var(--paper-warm)]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="inline-block px-4 py-1 bg-[var(--semantic-gold-bg)] text-[var(--semantic-gold)] rounded-full text-sm font-mono mb-6">
          Available Now
        </div>

        <h2 className="text-3xl md:text-4xl font-light mb-6 tracking-tight">
          Get started in 30 seconds
        </h2>

        <p className="text-lg text-[var(--ink-medium)] mb-8 max-w-xl">
          OpenProse runs as a Claude Code plugin. Install it and start writing{" "}
          <code className="inline-code">.prose</code> workflows immediately.
        </p>

        <div className="space-y-6 mb-8">
          <div>
            <p className="text-sm font-mono text-[var(--ink-light)] mb-2">
              1. Install the plugin
            </p>
            <CodeBlock className="text-sm">
              /plugin marketplace add git@github.com:openprose/prose.git{"\n"}
              /plugin install open-prose@prose
            </CodeBlock>
          </div>

          <div>
            <p className="text-sm font-mono text-[var(--ink-light)] mb-2">
              2. Restart Claude Code
            </p>
            <p className="text-sm text-[var(--ink-medium)] mb-4">
              Skills load at startup. Quit and reopen Claude Code.
            </p>
          </div>

          <div>
            <p className="text-sm font-mono text-[var(--ink-light)] mb-2">
              3. Boot OpenProse
            </p>
            <CodeBlock className="text-sm">
              openprose boot
            </CodeBlock>
          </div>
        </div>

        <p className="text-sm text-[var(--ink-light)] mb-12">
          By installing, you agree to the{" "}
          <a
            href="https://github.com/openprose/prose/blob/main/PRIVACY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--ink-dark)]"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href="https://github.com/openprose/prose/blob/main/TERMS.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--ink-dark)]"
          >
            Terms of Service
          </a>
          .
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="https://github.com/openprose/prose"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2"
            onClick={() =>
              analytics.track("cta_click", {
                button: "github",
                section: "start",
              })
            }
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            View on GitHub
          </a>
          <a
            href="https://github.com/openprose/prose/tree/main/examples"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center justify-center"
            onClick={() =>
              analytics.track("cta_click", {
                button: "examples",
                section: "start",
              })
            }
          >
            Browse examples
          </a>
        </div>
      </div>
    </section>
  );
}

// ============================================
// SUPPORT SECTION
// ============================================

function DonationTier({
  name,
  amount,
  href,
  isHighlighted = false,
}: {
  name: string;
  amount: string;
  href: string;
  isHighlighted?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => analytics.track("donation_click", { tier: amount, name })}
      className={`
        group relative flex flex-col items-center p-6 rounded-lg transition-all duration-300
        ${
          isHighlighted
            ? "bg-[var(--paper-cream)] border-2 border-[var(--semantic-gold)] shadow-[0_0_0_4px_var(--semantic-gold-bg)] sm:scale-105 z-10 order-first sm:order-none"
            : "bg-[var(--paper-warm)] border border-[var(--paper-aged)] hover:border-[var(--ink-light)] hover:shadow-md"
        }
      `}
    >
      {/* Popular badge for highlighted tier */}
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-[var(--semantic-gold)] text-white text-xs font-mono font-medium rounded-full tracking-wide">
            POPULAR
          </span>
        </div>
      )}

      {/* Amount */}
      <div
        className={`text-3xl md:text-4xl font-light tracking-tight mb-1 ${isHighlighted ? "text-[var(--semantic-gold)]" : "text-[var(--ink-dark)]"}`}
      >
        {amount}
      </div>

      {/* Tier name */}
      <div className="text-sm font-mono text-[var(--ink-light)] uppercase tracking-wider mb-4">
        {name}
      </div>

      {/* Button indicator */}
      <div
        className={`
        w-full py-2 px-4 rounded text-center text-sm font-mono transition-colors
        ${
          isHighlighted
            ? "bg-[var(--semantic-gold)] text-white group-hover:bg-[var(--semantic-gold-soft)]"
            : "bg-[var(--ink-dark)] text-[var(--paper-cream)] group-hover:bg-[var(--ink-medium)]"
        }
      `}
      >
        Select
      </div>
    </a>
  );
}

function SupportSection({ onOpenContact }: { onOpenContact: () => void }) {
  return (
    <section id="support" className="px-6 py-24">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-light mb-6 tracking-tight">
          Support the project
        </h2>

        <p className="text-lg text-[var(--ink-medium)] mb-12 max-w-2xl">
          OpenProse is not venture backed or associated with any of the big
          labs. Small support goes a long way for giving me the time to
          maintain this project.
        </p>

        {/* Donation Tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 items-end">
          <DonationTier
            name="Supporter"
            amount="$20"
            href="https://buy.stripe.com/9B64gA2OH0bwcu76EM5AQ02"
          />
          <DonationTier
            name="Sponsor"
            amount="$100"
            href="https://buy.stripe.com/9B66oI1KDaQa1Ptfbi5AQ03"
            isHighlighted
          />
          <DonationTier
            name="Patron"
            amount="$10k"
            href="https://buy.stripe.com/5kQcN6exp6zUbq35AI5AQ04"
          />
        </div>

        {/* Custom amount link */}
        <div className="text-center mb-16">
          <a
            href="https://buy.stripe.com/9B67sM60TaQacu77IQ5AQ01"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[var(--ink-light)] hover:text-[var(--ink-dark)] transition-colors font-mono"
            onClick={() =>
              analytics.track("donation_click", {
                tier: "custom",
                name: "Custom",
              })
            }
          >
            <span>Or choose your own amount</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>

        <div className="section-divider"></div>

        {/* Consulting card */}
        <div className="max-w-xl mx-auto">
          <div className="bg-[var(--paper-warm)] p-8 rounded-lg border border-[var(--paper-aged)]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--edit-blue)]/10 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-[var(--edit-blue)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium mb-2 text-[var(--ink-dark)]">
                  Hire me for consulting
                </h3>
                <p className="text-[var(--ink-medium)] text-base mb-4">
                  I do freelance agent architecture and AI systems consulting.
                  If you&apos;re building something serious with AI agents,
                  let&apos;s talk.
                </p>
                <button
                  className="btn-secondary inline-flex items-center justify-center gap-2"
                  onClick={() => {
                    analytics.track("cta_click", {
                      button: "consulting",
                      section: "support",
                    });
                    onOpenContact();
                  }}
                >
                  Get in touch
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// BETA & LEGAL SECTION
// ============================================

function BetaLegalSection() {
  return (
    <section id="beta" className="px-6 py-24 bg-[var(--paper-warm)]">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="px-3 py-1 bg-[var(--semantic-gold-bg)] text-[var(--semantic-gold)] text-sm font-mono font-medium rounded-full">
            BETA
          </span>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight">
            Important Information
          </h2>
        </div>

        <div className="space-y-6 mb-12">
          <div className="bg-[var(--paper-cream)] p-6 rounded-lg border border-[var(--paper-aged)]">
            <h3 className="font-medium text-[var(--ink-dark)] mb-3">Beta Status</h3>
            <ul className="space-y-2 text-[var(--ink-medium)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--semantic-gold)]">•</span>
                <span><strong>Telemetry is on by default</strong> — We collect anonymous usage data to improve the project. See our Privacy Policy for details and how to opt out.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--semantic-gold)]">•</span>
                <span><strong>Expect bugs</strong> — The software may behave unexpectedly. Please report issues on GitHub.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--semantic-gold)]">•</span>
                <span><strong>Not for production</strong> — Do not use OpenProse for critical or production workflows yet.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--semantic-gold)]">•</span>
                <span><strong>We want feedback</strong> — Your input shapes the project. Open issues, suggest features, report problems.</span>
              </li>
            </ul>
          </div>

          <div className="bg-[var(--paper-cream)] p-6 rounded-lg border border-[var(--paper-aged)]">
            <h3 className="font-medium text-[var(--ink-dark)] mb-3">Your Responsibility</h3>
            <p className="text-[var(--ink-medium)]">
              You are responsible for all actions performed by AI agents you spawn through OpenProse.
              Review your <code className="inline-code">.prose</code> programs before execution and verify all outputs.
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--paper-aged)] pt-8">
          <h3 className="font-medium text-[var(--ink-dark)] mb-4">Legal</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <a
              href="https://github.com/openprose/prose/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ink-medium)] hover:text-[var(--ink-dark)] underline underline-offset-2"
            >
              MIT License
            </a>
            <a
              href="https://github.com/openprose/prose/blob/main/PRIVACY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ink-medium)] hover:text-[var(--ink-dark)] underline underline-offset-2"
            >
              Privacy Policy
            </a>
            <a
              href="https://github.com/openprose/prose/blob/main/TERMS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ink-medium)] hover:text-[var(--ink-dark)] underline underline-offset-2"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// FOOTER
// ============================================

function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-[var(--paper-aged)]">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <div
            className="text-xl font-light tracking-tight mb-1"
            style={{ fontFamily: "var(--font-prose)" }}
          >
            <span className="text-[var(--ink-light)]">Open</span> Prose
          </div>
          <p className="text-sm text-[var(--ink-light)]">
            Intelligent IoC for a new kind of computer.
          </p>
        </div>

        <div className="flex gap-6 text-sm text-[var(--ink-light)]">
          <a
            href="https://github.com/openprose/prose"
            target="_blank"
            rel="noopener noreferrer"
            className="prose-link"
            onClick={() =>
              analytics.track("cta_click", {
                button: "github",
                section: "footer",
              })
            }
          >
            GitHub
          </a>
          <a
            href="https://github.com/openprose/prose/blob/main/skills/open-prose/prose.md"
            target="_blank"
            rel="noopener noreferrer"
            className="prose-link"
            onClick={() =>
              analytics.track("cta_click", {
                button: "vm",
                section: "footer",
              })
            }
          >
            VM
          </a>
          <a
            href="https://github.com/openprose/prose/blob/main/skills/open-prose/docs.md"
            target="_blank"
            rel="noopener noreferrer"
            className="prose-link"
            onClick={() =>
              analytics.track("cta_click", {
                button: "language_spec",
                section: "footer",
              })
            }
          >
            Syntax
          </a>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// NAVIGATION
// ============================================

function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "#concept", label: "Concept" },
    { href: "#faq", label: "FAQ" },
    { href: "#start", label: "Get Started" },
    { href: "#support", label: "Support" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[var(--paper-cream)]/95 backdrop-blur-sm shadow-sm"
            : ""
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <a
            href="#"
            className="text-lg font-light tracking-tight"
            style={{ fontFamily: "var(--font-prose)" }}
          >
            <span className="text-[var(--ink-light)]">Open</span> Prose
          </a>

          {/* Desktop navigation */}
          <div className="hidden md:flex gap-8 text-sm text-[var(--ink-light)]">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-[var(--ink-dark)] transition-colors"
                onClick={() =>
                  analytics.track("nav_click", {
                    target: link.label.toLowerCase(),
                  })
                }
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile hamburger button */}
          <button
            className="hamburger-btn md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile menu drawer */}
      <div className={`mobile-menu-drawer ${mobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-menu-header">
          <span
            className="text-lg font-light tracking-tight"
            style={{ fontFamily: "var(--font-prose)" }}
          >
            <span className="text-[var(--ink-light)]">Open</span> Prose
          </span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center text-[var(--ink-medium)] hover:text-[var(--ink-dark)]"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="mobile-menu-links">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                analytics.track("nav_click", {
                  target: link.label.toLowerCase(),
                  mobile: true,
                });
                setMobileMenuOpen(false);
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function Home() {
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [fundingModalOpen, setFundingModalOpen] = useState(false);
  const [fundingModalTitle, setFundingModalTitle] = useState("Fund the benchmarker");

  // Initialize analytics on mount
  useEffect(() => {
    analytics.init();
  }, []);

  return (
    <>
      <Navigation />
      <main>
        <HeroSection />
        <GettingStartedSection />
        <ConceptSection />
        <ProseCompleteSection onOpenFunding={() => {
          setFundingModalTitle("Fund the benchmarker");
          setFundingModalOpen(true);
        }} />
        <FAQSection onOpenFunding={() => {
          setFundingModalTitle("Fund the creator");
          setFundingModalOpen(true);
        }} />
        <BetaLegalSection />
        <SupportSection onOpenContact={() => setContactModalOpen(true)} />
      </main>
      <Footer />
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
      <FundingModal
        isOpen={fundingModalOpen}
        onClose={() => setFundingModalOpen(false)}
        title={fundingModalTitle}
      />
    </>
  );
}
