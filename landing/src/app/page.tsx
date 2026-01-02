"use client";

import { useState, useEffect } from "react";

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

function CodeBlock({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
    <section className="min-h-screen flex flex-col justify-center px-6 py-20 md:py-32">
      <div className="max-w-4xl mx-auto w-full">
        {/* Logo/Name */}
        <div className="mb-8 opacity-0 animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-prose)" }}>
            prose<span className="text-[var(--ink-light)]">.md</span>
          </h1>
        </div>

        {/* Tagline */}
        <div className="mb-6 opacity-0 animate-fade-in-up animation-delay-200">
          <p className="text-2xl md:text-3xl font-light leading-relaxed text-[var(--ink-dark)]">
            <TypewriterText text="Declarative agents. Intelligent runtime." delay={800} />
          </p>
        </div>

        {/* Subtitle */}
        <div className="mb-12 opacity-0 animate-fade-in-up animation-delay-300">
          <p className="text-lg md:text-xl text-[var(--ink-medium)] max-w-2xl">
            An open standard for AI orchestration—declare your agent architecture,
            let an intelligent interpreter wire it up.
          </p>
        </div>

        {/* Hero code example */}
        <div className="mb-12 opacity-0 animate-fade-in-up animation-delay-400">
          <CodeBlock>
            <span className="token-comment"># Research and write workflow</span>
            {"\n"}
            <span className="token-keyword">agent</span> researcher:
            {"\n"}
            {"  "}<span className="token-property">model</span>: sonnet
            {"\n"}
            {"  "}<span className="token-property">skills</span>: [<span className="token-string">&quot;web-search&quot;</span>]
            {"\n\n"}
            <span className="token-keyword">agent</span> writer:
            {"\n"}
            {"  "}<span className="token-property">model</span>: opus
            {"\n\n"}
            <span className="token-keyword">parallel</span>:
            {"\n"}
            {"  "}research = <span className="token-keyword">session</span>: researcher
            {"\n"}
            {"    "}<span className="token-property">prompt</span>: <span className="token-string">&quot;Research quantum computing breakthroughs&quot;</span>
            {"\n"}
            {"  "}competitive = <span className="token-keyword">session</span>: researcher
            {"\n"}
            {"    "}<span className="token-property">prompt</span>: <span className="token-string">&quot;Analyze competitor landscape&quot;</span>
            {"\n\n"}
            <span className="token-keyword">loop until</span> <SemanticSpan>the draft meets publication standards</SemanticSpan> (max: 3):
            {"\n"}
            {"  "}<span className="token-keyword">session</span>: writer
            {"\n"}
            {"    "}<span className="token-property">prompt</span>: <span className="token-string">&quot;Write and refine the article&quot;</span>
            {"\n"}
            {"    "}<span className="token-property">context</span>: {"{"} research, competitive {"}"}
          </CodeBlock>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in-up animation-delay-600">
          <a href="https://github.com/irl-dan/open-prose" className="btn-primary inline-flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            View on GitHub
          </a>
          <a href="#concept" className="btn-secondary">
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
    <section id="concept" className="px-6 py-24 bg-[var(--paper-warm)]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-light mb-6 tracking-tight">
          The intelligent inversion of control
        </h2>
        <p className="text-lg text-[var(--ink-medium)] mb-16 max-w-2xl">
          Traditional orchestration frameworks require you to write explicit coordination code.
          OpenProse inverts this—you declare agent primitives, and an AI session wires them up and executes them.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Card 1: Intelligent IoC */}
          <div className="bg-[var(--paper-cream)] p-8 rounded-lg border border-[var(--paper-aged)]">
            <div className="w-10 h-10 rounded-full bg-[var(--semantic-gold-bg)] flex items-center justify-center mb-4">
              <span className="text-[var(--semantic-gold)] text-lg">1</span>
            </div>
            <h3 className="text-xl font-medium mb-3 text-[var(--ink-dark)]">
              Intelligent IoC Container
            </h3>
            <p className="text-[var(--ink-medium)] text-base">
              Traditional IoC wires up dependencies from configuration. OpenProse&apos;s runtime is an AI that
              wires up agent sessions using <em>understanding</em>—it knows context, not just config.
            </p>
          </div>

          {/* Card 2: Fourth Wall */}
          <div className="bg-[var(--paper-cream)] p-8 rounded-lg border border-[var(--paper-aged)]">
            <div className="w-10 h-10 rounded-full bg-[var(--semantic-gold-bg)] flex items-center justify-center mb-4">
              <span className="text-[var(--semantic-gold)] text-lg">2</span>
            </div>
            <h3 className="text-xl font-medium mb-3 text-[var(--ink-dark)]">
              The Fourth Wall <code className="inline-code text-sm">**...**</code>
            </h3>
            <p className="text-[var(--ink-medium)] text-base">
              When you need AI judgment instead of strict execution, break out of structure:
              <code className="inline-code text-sm ml-1">loop until **the code is production ready**</code>.
              The interpreter evaluates this semantically.
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
              OpenProse is a skill you import into Claude Code, OpenCode, Codex, Amp, or any compatible AI assistant.
              Switch platforms anytime—your <code className="inline-code text-sm">.prose</code> files work everywhere.
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
              Plain English prompts are ambiguous. Rigid frameworks are inflexible. OpenProse gives you
              unambiguous control flow with natural language conditions where you want flexibility.
            </p>
          </div>
        </div>

        <div className="section-divider"></div>

        {/* The **...** deep dive */}
        <div className="max-w-2xl">
          <h3 className="text-xl font-medium mb-6">Why structure matters</h3>
          <p className="text-[var(--ink-medium)] mb-6">
            &quot;Why not just describe agents in plain English?&quot; You can—that&apos;s what <code className="inline-code">**...**</code> is for.
            But complex workflows need unambiguous structure for control flow. The AI shouldn&apos;t have to guess
            whether you want sequential or parallel execution.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-mono text-[var(--ink-light)] mb-2">Ambiguous (plain English):</p>
              <CodeBlock className="text-sm">
                <span className="token-string">&quot;Research the topic, then write about it, and get feedback until it&apos;s good&quot;</span>
              </CodeBlock>
            </div>
            <div>
              <p className="text-sm font-mono text-[var(--ink-light)] mb-2">Unambiguous (OpenProse):</p>
              <CodeBlock className="text-sm">
                <span className="token-keyword">let</span> research = <span className="token-keyword">session</span> <span className="token-string">&quot;Research&quot;</span>
                {"\n"}<span className="token-keyword">loop until</span> <SemanticSpan>good</SemanticSpan>:
                {"\n"}{"  "}<span className="token-keyword">session</span> <span className="token-string">&quot;Write&quot;</span>
                {"\n"}{"  "}<span className="token-keyword">session</span> <span className="token-string">&quot;Get feedback&quot;</span>
              </CodeBlock>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// FAQ SECTION
// ============================================

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Why not LangChain, CrewAI, or AutoGen?",
      answer: "Those are libraries locked to specific runtimes and APIs. OpenProse is a language specification that runs inside any AI assistant that supports skills. Switch from Claude Code to Codex? Your .prose files still work."
    },
    {
      question: "Why not just plain English prompts?",
      answer: "You can use **...** for natural language wherever you want AI judgment. But complex workflows need unambiguous structure for control flow—sequential vs parallel, loop conditions, error handling. Plain English is ambiguous; OpenProse gives you structure where it matters."
    },
    {
      question: "What's \"intelligent IoC\"?",
      answer: "Traditional IoC containers (Spring, Guice) wire up dependencies from configuration files. OpenProse's container is an AI that wires up agent sessions using understanding. It doesn't just match names—it understands context and intent."
    },
    {
      question: "Does this work today?",
      answer: "Yes. Install the Claude Code plugin and run .prose files now. The core language features (agents, sessions, parallel, loops, context passing) are implemented. Advanced features are being added incrementally."
    },
    {
      question: "What AI assistants are supported?",
      answer: "Currently Claude Code via the plugin. OpenCode, Codex, and Amp support are planned. The language is designed to be framework-agnostic—it's just a skill you import."
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
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 text-left flex justify-between items-center bg-[var(--paper-cream)] hover:bg-[var(--paper-warm)] transition-colors"
              >
                <span className="font-medium text-[var(--ink-dark)]">{faq.question}</span>
                <span className={`text-[var(--ink-light)] transition-transform ${openIndex === index ? 'rotate-45' : ''}`}>
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
    <section id="start" className="px-6 py-24 bg-[var(--paper-warm)]">
      <div className="max-w-3xl mx-auto">
        <div className="inline-block px-4 py-1 bg-[var(--semantic-gold-bg)] text-[var(--semantic-gold)] rounded-full text-sm font-mono mb-6">
          Available Now
        </div>

        <h2 className="text-3xl md:text-4xl font-light mb-6 tracking-tight">
          Get started in 30 seconds
        </h2>

        <p className="text-lg text-[var(--ink-medium)] mb-8 max-w-xl">
          OpenProse runs as a Claude Code plugin. Install it and start writing <code className="inline-code">.prose</code> workflows immediately.
        </p>

        <div className="space-y-6 mb-12">
          <div>
            <p className="text-sm font-mono text-[var(--ink-light)] mb-2">1. Install the plugin</p>
            <CodeBlock className="text-sm">
              /plugin marketplace add irl-dan/open-prose{"\n"}
              /plugin install open-prose
            </CodeBlock>
          </div>

          <div>
            <p className="text-sm font-mono text-[var(--ink-light)] mb-2">2. Run a workflow</p>
            <CodeBlock className="text-sm">
              <span className="token-comment"># Ask Claude to run an example</span>{"\n"}
              <span className="token-string">&quot;Run the code review example from OpenProse&quot;</span>{"\n\n"}
              <span className="token-comment"># Or run your own .prose file</span>{"\n"}
              <span className="token-string">&quot;Execute my-workflow.prose&quot;</span>
            </CodeBlock>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a href="https://github.com/irl-dan/open-prose" className="btn-primary inline-flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            View on GitHub
          </a>
          <a
            href="https://github.com/irl-dan/open-prose/tree/main/plugin/examples"
            className="btn-secondary inline-flex items-center justify-center"
          >
            Browse examples
          </a>
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
          <div className="text-xl font-light tracking-tight mb-1" style={{ fontFamily: "var(--font-prose)" }}>
            prose<span className="text-[var(--ink-light)]">.md</span>
          </div>
          <p className="text-sm text-[var(--ink-light)]">
            An open standard for AI orchestration.
          </p>
        </div>

        <div className="flex gap-6 text-sm text-[var(--ink-light)]">
          <a href="https://github.com/irl-dan/open-prose" className="prose-link">GitHub</a>
          <a href="https://github.com/irl-dan/open-prose/blob/main/plugin/skills/open-prose/prose.md" className="prose-link">Language Spec</a>
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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-[var(--paper-cream)]/95 backdrop-blur-sm shadow-sm" : ""
    }`}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
        <a href="#" className="text-lg font-light tracking-tight" style={{ fontFamily: "var(--font-prose)" }}>
          prose<span className="text-[var(--ink-light)]">.md</span>
        </a>
        <div className="hidden md:flex gap-8 text-sm text-[var(--ink-light)]">
          <a href="#concept" className="hover:text-[var(--ink-dark)] transition-colors">Concept</a>
          <a href="#faq" className="hover:text-[var(--ink-dark)] transition-colors">FAQ</a>
          <a href="#start" className="hover:text-[var(--ink-dark)] transition-colors">Get Started</a>
        </div>
      </div>
    </nav>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function Home() {
  return (
    <>
      <Navigation />
      <main>
        <HeroSection />
        <ConceptSection />
        <FAQSection />
        <GettingStartedSection />
      </main>
      <Footer />
    </>
  );
}
