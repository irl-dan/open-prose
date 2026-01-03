# Elegant Simplification

**Status:** Active plan — Immediate priority
**Date:** 2026-01-03

---

## The CEO's Insight

<CEO timestamp="2026-01-03 04:30:00">
Here I want to outline a new idea I've been thinking about.

This will not require that much work, but the key will be testing it.

Currently we ship the skill with the typescript compiler and validator packages. We also ship a giant `prose.md` file that is a complete specification of the language.

However, if you take a moment to read through the TENETS.md and the CEO_PREFERENCES.md files, you'll see that we may be able to simplify this further.

There are two problems with the current setup:

- the need to run compile/validate via node js and the npm package is an external dependency and shipping it as source is ugly, shipping it as an npm package is better but still an external dependency
- the `prose.md` file is massive which adds a huge amount of context to the skill whenever it gets read

I have come up with a very elegant solution to both.

We remove the compiler and validator packages completely from the skill. Instead, those will be published to an npm package that ships completely separately, not bundled with the skill, and only used for development purposes like hosting the LSP, etc.

Then we make the `prose.md` file the _compiler_. The compiler will have two steps:

- validate that it's well-formed and semantically valid
- (optional) expand the syntax sugar into the canonical form

This markdown file _will be interpreted_ by the orchestrator. It doesn't need to happen with a classical lexical parser, it can happen semantically.

Then we create a _second_ markdown file that is the _interpreter_. This will be a sliver of the size of the original `prose.md` file. It will only contain the instructions that describe to the orchestrator that it is an interpreter and how to interpret and run a `.prose` program. It may call out 10k foot view of syntax, context management, operating as a VM, etc. But it does not need to contain the details of the syntax. In fact, the syntax is _designed to be self-evident_. This is the key to the entire project.

My expectation is that this plan lets us ship a simple plugin that is just two markdown files and a few examples, and simultaneously moves the language implementation somewhere into the API package for now such that it can be used by the web IDE and the API.
</CEO>

---

## CEO Clarifications

<CEO timestamp="2026-01-03 05:15:00">
**On `prose.md` naming and purpose:**

I want you to think of the `prose.md` more as both a compiler and validator. It does both—it compiles it (ie. it modifies it into "best practice .prose" as judged by the orchestrator using the knowledge from the `prose.md` file) and it validates it (decides whether a blank agent with only access to the "interpreter.md" file "understands" it as a self-evident system).

This is what it means to "compile". And I want this self-aware compiler to be named as an iconic `prose.md` file.

**On fallback strategy:**

Let's punt on this for now. There are ways of having a meta-orchestrator with access to the full `prose.md` file periodically check in on the orchestrator to raise up any potential mistakes or divergences from the orchestration plan. Add this as a concept for future implementation.

**On examples:**

YES the plugin should still ship with examples, this is very important! Keep those in whatever gets cloned in the skill!

**On repository structure:**

Claude Code plugins cannot clone just a subdirectory—the entire repo gets cloned. So we need to move the plugin to its own repository:

`git@github.com:openprose/prose.git`

Then our backend/frontend can remain in the current repository and reference those public links as needed.

**On timeline:**

This is immediate priority.
</CEO>

---

## Why This Works (Tenet Alignment)

This simplification is the ultimate expression of our tenets:

| Tenet | How This Delivers |
|-------|-------------------|
| **Pattern over framework** | Two markdown files is the simplest possible thing |
| **Ship as a skill** | Zero external dependencies—no npm, no node, no bun |
| **The orchestrator is intelligent** | Semantic validation replaces classical parsing |
| **Structured but self-evident** | If syntax is self-evident, it doesn't need a parser |
| **Files are artifacts** | The skill IS just files |

The key insight: **if the language is truly self-evident, the intelligent orchestrator can validate and interpret it without a classical lexer/parser.**

---

## Target State

### New Repository: `github.com/openprose/prose`

```
prose/                           # The entire plugin repo
├── skills/open-prose/
│   ├── SKILL.md                 # ~100 lines (activation)
│   ├── interpreter.md           # ~200-400 lines (execution semantics)
│   └── prose.md                 # Full spec (compiler + validator)
├── examples/                    # 27 examples (critical!)
└── .claude-plugin/              # Plugin marketplace config
```

### Current Repository: `github.com/irl-dan/open-prose` (or `openprose/open-prose`)

```
open-prose/                      # Backend, frontend, dev tools
├── packages/
│   └── core/                    # @openprose/core (npm package)
│       ├── src/
│       │   ├── parser/          # Classical lexer/parser
│       │   ├── validator/       # Validation rules
│       │   ├── compiler/        # Canonical form expansion
│       │   └── lsp/             # Language Server Protocol
│       └── package.json
├── api/                         # Backend API
├── landing/                     # Website
└── infra/                       # Infrastructure
```

---

## The Two-File Architecture

### File 1: `interpreter.md` (The Interpreter)

**Purpose:** Tell the orchestrator how to execute a `.prose` program.

**Size:** ~200-400 lines (small enough to always fit in context)

**Contents:**
1. What it means to be an OpenProse interpreter
2. The execution model (orchestrator as VM)
3. **Condensed syntax reference** (grammar without validation rules)
4. How to spawn sessions (via Task tool)
5. How to handle parallel execution
6. How to evaluate `**...**` conditions semantically
7. Context passing between sessions
8. Error propagation semantics
9. State tracking approach (in-context)

<CEO timestamp="2026-01-03 05:30:00">
"I do think we want at least some [syntax reference]. The syntax matters and we don't want high-level misinterpretations. In fact we'd rather lean on the 'higher rate of success' than the 'too concise'."
</CEO>

**Key property:** Includes syntax grammar but NOT detailed validation rules. An agent with ONLY this file should be able to run valid `.prose` programs with high success rate.

### File 2: `prose.md` (The Compiler + Validator)

**Purpose:** Full language specification that serves as both compiler and validator.

**The dual role:**
1. **Compiler:** Transforms input into "best practice .prose" (canonical form, optimizations, sugar expansion)
2. **Validator:** Determines whether a blank agent with only `interpreter.md` would understand the program as self-evident

**Size:** ~2000+ lines (read when compiling/validating)

**Contents:**
- Complete syntax grammar
- All validation rules
- All error codes
- Edge case behaviors
- Canonical form expansion rules
- Best practice guidance

**When to read:**
- When compilation is requested
- When validation is explicitly requested
- When encountering ambiguous or complex syntax

### File 3: `SKILL.md` (Activation)

**Purpose:** Tell Claude Code when/how to activate this skill.

**Size:** ~100 lines

**Contents:**
- Skill metadata (name, description)
- Activation triggers
- Pointer to interpreter.md and prose.md
- Quick reference for common patterns

---

## How Semantic Compilation Works

**"Compile" means:**
1. Parse the `.prose` file semantically (using `prose.md` as reference)
2. Validate that a blank agent with only `interpreter.md` would understand it
3. Optionally expand syntax sugar into canonical form
4. Output "best practice .prose"

**This replaces:**
```bash
bun run open-prose.ts compile program.prose
```

**With:**
```
"Compile this .prose file using the prose.md specification"
```

The orchestrator reads `prose.md`, understands the language specification, and applies it to validate and transform the input program.

---

## Migration Plan

### Phase 1: Create New Repository

1. Create `github.com/openprose/prose` repository
2. Set up Claude Code plugin structure:
   ```
   prose/
   ├── skills/open-prose/
   │   ├── SKILL.md
   │   ├── interpreter.md      # NEW - extract from prose.md
   │   └── prose.md            # KEEP - full spec
   ├── examples/               # COPY from current plugin/examples/
   └── .claude-plugin/
       ├── marketplace.json
       └── plugin.json
   ```

### Phase 2: Create `interpreter.md`

Extract execution semantics from current `prose.md` into a small, focused document:

1. Execution model (orchestrator as intelligent VM)
2. **Condensed syntax grammar** (all constructs, no validation edge cases)
3. Session spawning (Task tool usage)
4. Parallel execution (concurrent Task calls)
5. Loop execution (with `**...**` evaluation)
6. Context passing (how results flow)
7. Error handling (propagation semantics)
8. State management (in-context tracking)

**Target:** ~200-400 lines that fit comfortably in context.

**Validation criterion:** An agent with ONLY `interpreter.md` should be able to execute valid `.prose` programs with a high success rate. Lean toward completeness over brevity.

### Phase 3: Refactor `prose.md` for Dual Role

1. Add header clarifying its role as compiler + validator
2. Add section on "best practice" transformations
3. Add section on self-evidence validation criteria
4. Keep all syntax details, validation rules, error codes

### Phase 4: Slim Down `SKILL.md`

1. Remove execution instructions (now in interpreter.md)
2. Keep only activation triggers and quick reference
3. Point to interpreter.md and prose.md
4. Explain the compile vs interpret distinction

### Phase 5: Copy Examples

Copy all 27 examples from `plugin/examples/` to new repo's `examples/` directory.

### Phase 6: Move TypeScript to Current Repo

1. Move `plugin/src/` to `packages/core/` in current repo
2. Set up npm package structure for `@openprose/core`
3. This powers: LSP, Web IDE, API validation, CLI

### Phase 7: Update Current Repo

1. Remove `plugin/` directory (now in separate repo)
2. Update any references to point to new repo
3. Update landing page installation instructions

### Phase 8: Testing

**Critical:** Validate semantic interpretation works.

Test cases:
1. All 27 examples execute correctly via interpreter.md only
2. Compilation catches the same errors as classical validator
3. Edge cases are handled properly

---

## Future Concept: Meta-Orchestrator

> Punted for now, but documented for future implementation.

A meta-orchestrator with access to the full `prose.md` file could periodically check in on the executing orchestrator to:
- Raise potential mistakes
- Identify divergences from the orchestration plan
- Suggest corrections

This would provide a safety net without requiring the executing orchestrator to always have the full spec in context.

---

## Success Criteria

1. **New repo (`openprose/prose`) contains only:**
   - `SKILL.md` (~100 lines)
   - `interpreter.md` (~200-400 lines)
   - `prose.md` (full spec)
   - `examples/` (27 examples)
   - Plugin config files

2. **All 27 examples execute correctly** with only `interpreter.md` in context

3. **Compilation works semantically** using `prose.md` as the specification

4. **TypeScript implementation lives in `packages/core/`** in current repo for dev tools

5. **Zero external dependencies** in the plugin

---

## Repository Summary

| Repository | Contents | Purpose |
|------------|----------|---------|
| `github.com/openprose/prose` | SKILL.md, interpreter.md, prose.md, examples/ | The Claude Code plugin |
| `github.com/irl-dan/open-prose` | packages/core/, api/, landing/, infra/ | Dev tools, backend, frontend |

---

## Deprecated

This plan supersedes:
- `guidance/2025-01-02-npm-package-restructure-plan.md` — The npm restructure is still relevant for dev tools in the current repo, but the plugin no longer depends on it.
