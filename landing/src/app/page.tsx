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

// Simple keyword highlighter for code examples
function highlightKeywords(text: string, keyPrefix: number): React.ReactNode {
  const keywords = ["agent", "session", "parallel", "loop", "let", "const", "import", "model", "prompt", "context", "filter", "map", "reduce", "pmap", "until", "while", "for", "in"];
  const keywordRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");

  const parts = text.split(keywordRegex);
  return parts.map((part, idx) =>
    keywords.includes(part) ? (
      <span key={`${keyPrefix}-${idx}`} className="token-keyword">{part}</span>
    ) : (
      <span key={`${keyPrefix}-${idx}`}>{part}</span>
    )
  );
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
        <div className="mb-12 opacity-0 animate-fade-in-up animation-delay-200">
          <p className="text-2xl md:text-3xl font-light leading-relaxed text-[var(--ink-medium)]">
            <TypewriterText text="A programming language you can talk to." delay={800} />
          </p>
        </div>

        {/* Hero code example */}
        <div className="mb-12 opacity-0 animate-fade-in-up animation-delay-400">
          <CodeBlock>
            <span className="token-comment"># What if you could just... ask?</span>
            {"\n\n"}
            <span className="token-keyword">loop until</span> <SemanticSpan>the user is satisfied</SemanticSpan>:
            {"\n"}
            {"  "}<span className="token-keyword">session</span> <span className="token-string">&quot;Propose a solution&quot;</span>
            {"\n"}
            {"  "}<span className="token-keyword">session</span> <span className="token-string">&quot;Get feedback&quot;</span>
            {"\n\n"}
            <span className="token-keyword">choice</span> <SemanticSpan>based on urgency</SemanticSpan>:
            {"\n"}
            {"  "}<span className="token-keyword">session</span> <span className="token-string">&quot;Quick fix&quot;</span>
            {"\n"}
            {"  "}<span className="token-keyword">session</span> <span className="token-string">&quot;Thorough solution&quot;</span>
          </CodeBlock>
        </div>

        {/* Subtext */}
        <div className="opacity-0 animate-fade-in-up animation-delay-600">
          <p className="text-lg text-[var(--ink-light)] max-w-2xl">
            The <code className="inline-code">**...**</code> syntax lets you speak directly to the
            interpreter. Because when your interpreter is an LLM, you can break the fourth wall.
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CONCEPT SECTION
// ============================================

function ConceptSection() {
  return (
    <section id="concept" className="px-6 py-24 bg-[var(--paper-warm)]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-light mb-12 tracking-tight">
          An intelligent inversion of control container
        </h2>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h3 className="text-xl font-medium mb-4 text-[var(--ink-medium)]">
              Traditional interpreters
            </h3>
            <p className="text-[var(--ink-medium)] mb-4">
              Execute your code mechanically. A condition like <code className="inline-code">x &gt; 5</code> is
              evaluated exactly as written. There&apos;s no room for interpretation.
            </p>
            <CodeBlock className="text-sm">
              <span className="token-keyword">while</span> (attempts &lt; 3) {"{"}
              {"\n"}{"  "}retry();
              {"\n"}{"}"}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-4 text-[var(--ink-medium)]">
              The Orchestrator
            </h3>
            <p className="text-[var(--ink-medium)] mb-4">
              An LLM that interprets your program. When you write
              <code className="inline-code">**approved**</code>, it understands what that <em>means</em>.
            </p>
            <CodeBlock className="text-sm">
              <span className="token-keyword">loop until</span> <SemanticSpan>approved</SemanticSpan>:
              {"\n"}{"  "}<span className="token-keyword">session</span> <span className="token-string">&quot;Write draft&quot;</span>
              {"\n"}{"  "}<span className="token-keyword">session</span> <span className="token-string">&quot;Get review&quot;</span>
            </CodeBlock>
          </div>
        </div>

        <div className="section-divider"></div>

        <div className="max-w-2xl">
          <h3 className="text-xl font-medium mb-6">The <code className="inline-code">**...**</code> syntax</h3>
          <p className="text-[var(--ink-medium)] mb-6">
            Think of it as markdown bold, but semantic. When you wrap something in double asterisks,
            you&apos;re telling the Orchestrator: &quot;Use your judgment here.&quot;
          </p>
          <ul className="space-y-4 text-[var(--ink-medium)]">
            <li className="flex items-start gap-3">
              <span className="text-[var(--semantic-gold)] mt-1">&#8226;</span>
              <span><code className="inline-code">loop until **done**</code> — The Orchestrator decides when &quot;done&quot; means done</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--semantic-gold)] mt-1">&#8226;</span>
              <span><code className="inline-code">choice **based on context**</code> — The Orchestrator picks the right branch</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--semantic-gold)] mt-1">&#8226;</span>
              <span><code className="inline-code">loop while **making progress**</code> — Keep going until we&apos;re stuck</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CODE EXAMPLES SECTION
// ============================================

function CodeExamplesSection() {
  const [activeExample, setActiveExample] = useState(0);

  const examples = [
    {
      title: "Iterative Refinement",
      description: "Write, review, improve. Loop until it's actually good.",
      code: `# Iterative Refinement
# Write, get feedback, refine until approved

agent writer:
  model: opus

agent reviewer:
  model: sonnet

let draft = session: writer
  prompt: "Write a first draft about AI safety"

loop until **approved**:
  let feedback = session: reviewer
    prompt: "Review this draft and provide feedback"
    context: draft

  draft = session: writer
    prompt: "Improve the draft based on feedback"
    context: { draft, feedback }`,
    },
    {
      title: "Parallel Review",
      description: "Three reviewers, one synthesis. Parallel orchestration.",
      code: `# Parallel Review
# Three reviewers analyze in parallel, then synthesize

agent reviewer:
  model: sonnet

parallel:
  security = session: reviewer
    prompt: "Review for security issues"
  performance = session: reviewer
    prompt: "Review for performance issues"
  style = session: reviewer
    prompt: "Review for style and readability"

session synthesizer:
  model: opus
  prompt: "Synthesize the reviews into a unified report"
  context: { security, performance, style }`,
    },
    {
      title: "Pipeline Processing",
      description: "Functional-style transformations with AI agents.",
      code: `# Pipeline Processing
# Filter, transform, and reduce with AI

files
  | filter: session "Is {item} relevant to the task?"
  | map: session "Extract key information from {item}"
  | reduce(report, info):
      session "Add {info} to {report}"

# Or in parallel for speed
items | pmap: session "Process {item}"`,
    },
  ];

  return (
    <section id="examples" className="px-6 py-24">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-light mb-4 tracking-tight">
          Real programs, readable syntax
        </h2>
        <p className="text-lg text-[var(--ink-light)] mb-12 max-w-2xl">
          prose.md is Python-like, indentation-based, and designed to be understood at a glance.
        </p>

        {/* Example tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => setActiveExample(index)}
              className={`px-4 py-2 rounded text-sm font-mono transition-all ${
                activeExample === index
                  ? "bg-[var(--ink-dark)] text-[var(--paper-cream)]"
                  : "bg-[var(--paper-aged)] text-[var(--ink-medium)] hover:bg-[var(--paper-shadow)]"
              }`}
            >
              {example.title}
            </button>
          ))}
        </div>

        {/* Active example */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <CodeBlock>
              {examples[activeExample].code.split("\n").map((line, i) => {
                // Comments
                if (line.trim().startsWith("#")) {
                  return <span key={i} className="token-comment">{line}{"\n"}</span>;
                }

                // Highlight **semantic** parts
                if (line.includes("**")) {
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <span key={i}>
                      {parts.map((part, j) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return <span key={j} className="token-semantic">{part}</span>;
                        }
                        return highlightKeywords(part, j);
                      })}
                      {"\n"}
                    </span>
                  );
                }

                return <span key={i}>{highlightKeywords(line, i)}{"\n"}</span>;
              })}
            </CodeBlock>
          </div>
          <div>
            <h3 className="text-xl font-medium mb-3">{examples[activeExample].title}</h3>
            <p className="text-[var(--ink-medium)]">{examples[activeExample].description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// PHILOSOPHY SECTION
// ============================================

function PhilosophySection() {
  return (
    <section id="philosophy" className="px-6 py-24 bg-[var(--paper-warm)]">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-light mb-12 tracking-tight">
          An honest experiment
        </h2>

        <div className="space-y-8 text-lg text-[var(--ink-medium)]">
          <p>
            Let&apos;s be real: as models get smarter, a lot of what we build today will become
            irrelevant. The &quot;bitter lesson&quot; of AI research is that general methods powered
            by more compute tend to win over clever domain-specific approaches.
          </p>

          <p>
            prose.md doesn&apos;t pretend to be the future of programming. It&apos;s an
            experiment in a novel interaction model: <em>what if you could write programs that
            your computer actually understands?</em>
          </p>

          <div className="py-8 border-l-2 border-[var(--semantic-gold)] pl-6 my-8 bg-[var(--semantic-gold-bg)] rounded-r">
            <p className="font-medium text-[var(--ink-dark)] mb-2">Why it&apos;s still useful:</p>
            <ul className="space-y-2 text-base">
              <li>&#8226; Agent orchestration is genuinely hard. Structure helps.</li>
              <li>&#8226; Semantic conditions are more expressive than boolean flags.</li>
              <li>&#8226; Readable programs are debuggable programs.</li>
              <li>&#8226; And honestly? It&apos;s just fun to try new things.</li>
            </ul>
          </div>

          <p>
            If you&apos;re a developer who likes to tinker with novel agent architectures,
            prose.md might be interesting to you. If you&apos;re looking for production-ready
            enterprise software, maybe wait a bit.
          </p>
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
    <section id="start" className="px-6 py-24">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-block px-4 py-1 bg-[var(--semantic-gold-bg)] text-[var(--semantic-gold)] rounded-full text-sm font-mono mb-6">
          Early Development
        </div>

        <h2 className="text-3xl md:text-4xl font-light mb-6 tracking-tight">
          Coming soon
        </h2>

        <p className="text-lg text-[var(--ink-medium)] mb-12 max-w-xl mx-auto">
          prose.md is under active development. The language specification is stabilizing,
          and we&apos;re building the interpreter. Want to follow along?
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="https://github.com/prose-md/prose" className="btn-primary inline-flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            View on GitHub
          </a>
          <a href="#concept" className="btn-secondary">
            Read the docs
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
            A fun experiment in talking to your programs.
          </p>
        </div>

        <div className="flex gap-6 text-sm text-[var(--ink-light)]">
          <a href="https://github.com/prose-md/prose" className="prose-link">GitHub</a>
          <a href="https://open.prose.md" className="prose-link">Documentation</a>
          <a href="#" className="prose-link">Discord</a>
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
          <a href="#examples" className="hover:text-[var(--ink-dark)] transition-colors">Examples</a>
          <a href="#philosophy" className="hover:text-[var(--ink-dark)] transition-colors">Philosophy</a>
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
        <CodeExamplesSection />
        <PhilosophySection />
        <GettingStartedSection />
      </main>
      <Footer />
    </>
  );
}
