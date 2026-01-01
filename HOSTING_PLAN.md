# OpenProse Skill Hosting Plan

This document outlines how to package and distribute OpenProse as a Claude Code skill/plugin.

---

## Open Questions (Need Alignment)

### Q1: Repository Role - Marketplace vs Plugin?

The repo `git@github.com:irl-dan/open-prose.git` can serve as:

**Option A: Plugin Only**

- Contains `.claude-plugin/plugin.json` with the skill
- Must be added to an existing marketplace to be discoverable
- Users install via `/plugin install open-prose@some-marketplace`

**Option B: Self-Hosted Marketplace + Plugin** (Recommended)

- Contains both `.claude-plugin/marketplace.json` AND the plugin
- Users add this repo as a marketplace directly
- Users install via:
  ```bash
  /plugin marketplace add irl-dan/open-prose
  /plugin install open-prose
  ```

**Recommendation:** Option B - it's simpler and doesn't require coordinating with external marketplaces.

<CEO timestamp="2025-01-01 05:48:00">Yes, we need Option B.</CEO>

---

### Q2: How Should Users Invoke OpenProse?

**Option A: Slash Command**

- User types `/run-prose program.prose`
- Triggers compile + orchestrator session

**Option B: Skill Auto-Activation**

- User mentions `.prose` files or says "run this prose program"
- Skill activates based on description triggers

**Option C: Both**

- Provide `/run-prose` command for explicit invocation
- Also allow skill-based activation for natural language

**Recommendation:** Option C - maximum flexibility.

<CEO timestamp="2025-01-01 05:48:00">Yes, we should support both.</CEO>

---

### Q3: Parser Distribution Strategy

The parser (lexer, compiler, validator) is written in TypeScript. How do we bundle it?

**Option A: NPM Package + CLI**

- Publish `open-prose` npm package
- Skill instructs Claude to run `npx open-prose compile program.prose`
- Requires Node.js on user's machine

**Option B: Bundled Executable**

- Use `pkg` or `bun compile` to create standalone binary
- Include in `scripts/` directory of skill
- No Node.js requirement

**Option C: In-Skill Parser Description**

- Parser logic described in SKILL.md
- Claude parses the DSL itself using the specification
- No external tools needed, but less reliable

**Recommendation:** Option A for MVP (simpler), Option B for polish.

<CEO timestamp="2025-01-01 05:50:00">We should actually start with Option B since it doesn't require an external dependency on node or us creating an npm repository.</CEO>

---

### Q4: Skill vs Agent?

The agentskills.io format supports both Skills and Agents. OpenProse could be:

**Option A: Skill Only**

- SKILL.md contains interpreter documentation
- Activated when user wants to run prose programs
- Uses subagent Task tool internally

**Option B: Skill + Orchestrator Agent**

- SKILL.md for the interpreter docs
- Separate agent definition (`.claude/agents/open-prose-orchestrator.md`)
- More explicit control over model (Opus 4.5)

**Recommendation:** Option A for now - Claude Code's Task tool already handles model selection.

<CEO timestamp="2025-01-01 05:51:00">This actually begs a question. Could we write an agent that is a better Orchestrator agent than the default claude code agent? If that's possbible, is it possible to boot with that agent in interactive mode (ie in place of the default Claude Code agent)? If so, this may be a useful construct. Let's research this later and punt on it for now. I'd love to make this work "out of the box" for the default Claude Code agent, and perhaps this can be an upgrade path later for power users.</CEO>

---

### Q5: What Goes in the Skill?

The SKILL.md needs to include:

1. **Frontmatter** - name, description, triggers
2. **Interpreter Documentation** - how to execute each language construct
3. **Examples** - sample programs
4. **Compile Instructions** - how to validate/expand syntax

**Questions:**

- Should we include the full `interpreter/README.md` content?
- Should we include the specification files for reference?
- How much of the syntax should be documented inline?

---

<CEO timestamp="2025-01-01 06:07:00">I think the "interpreter" should go in a file next to SKILL.md called `prose.md`. This file needs to contain the absolute full documentation of the DSL, introducing the concept, including all syntax, examples, and other relevant information for how to interpret and execute a program. Then, the SKILL.md aside from the frontmatter, should introduce the concept, should add instructions for how and when to reach for the prose.md file and give example commands for how to grep the prose.md file for specific syntax or concepts. It would be sort of nice to auto-generate the syntax documentation from the AST, but I'm not sure that's possible, so you may need to manually write it for now, using what you can see about what has been implemented so far.</CEO>

## Proposed Directory Structure

Based on the agentskills.io specification and HOW_TO_HOST_PLUGIN.md:

```
open-prose/
├── .claude-plugin/
│   ├── marketplace.json      # Makes this repo a marketplace
│   └── plugin.json           # Plugin manifest
├── skills/
│   └── open-prose/
│       ├── SKILL.md          # Main skill file (references prose.md)
│       ├── prose.md          # Full DSL documentation
│       ├── scripts/          # Bundled executable
│       │   └── compile       # Standalone binary (no Node.js required)
│       └── references/       # Optional: loaded on-demand
│           ├── syntax.md
│           └── examples.md
├── commands/                  # Slash commands
│   └── run-prose.md          # /run-prose command
├── src/                       # Existing parser source
├── specification/             # Existing language specs
└── ... (existing files)
```

---

## Implementation Plan

### Phase 1: Minimum Viable Skill

1. **Create `.claude-plugin/marketplace.json`**

   - Register this repo as a marketplace
   - List the open-prose plugin

2. **Create `.claude-plugin/plugin.json`**

   - Plugin metadata (name, version, author)

3. **Create `skills/open-prose/prose.md`**

   - Full DSL documentation including:
     - Introduction to OpenProse concept
     - All syntax documentation for implemented features:
       - Comments (Tier 0.2)
       - Single-line strings (Tier 0.3)
       - Simple session (Tier 1.1)
     - How to interpret and execute programs
     - Examples
   - This should be comprehensive reference documentation

4. **Create `skills/open-prose/SKILL.md`**

   - Frontmatter with name and description (triggers for activation)
   - Introduction to OpenProse concept
   - Instructions for when and how to use `prose.md`
   - Example commands for grepping `prose.md` for specific syntax or concepts
   - Brief overview of how to spawn subagent sessions

5. **Create `commands/run-prose.md`**

   - Slash command for explicit program execution
   - Instructions for using `/run-prose program.prose`

6. **Bundle parser as standalone executable**

   - Use `pkg` or `bun compile` to create standalone binary
   - Include in `skills/open-prose/scripts/compile`
   - No Node.js requirement for users

### Phase 2: Polish

1. Add references directory with full spec docs
2. Create more sophisticated examples
3. Add validation/linting capabilities
4. Enhance prose.md with additional features as they're implemented

---

## SKILL.md Draft Outline

```markdown
---
name: open-prose
description: |
  Use when user asks to run, execute, or interpret .prose files.
  Use when user mentions OpenProse or prose programs.
  Use when orchestrating multi-agent sessions from a script.
---

# OpenProse Interpreter

OpenProse is a domain-specific language for orchestrating AI agent sessions.

## Overview

When a user wants to run a `.prose` file or program:

1. **Parse**: Read the program and identify statements
2. **Validate**: Check for syntax errors (optionally use bundled compiler)
3. **Execute**: For each statement, spawn appropriate subagent sessions using Claude Code's Task tool

## Using the Documentation

The complete DSL documentation is in `prose.md` in this same directory. When you need to:

- Look up specific syntax: `grep -i "session" prose.md` or search for the construct
- Understand how to execute a feature: Read the relevant section in `prose.md`
- Find examples: Check the examples section in `prose.md`

## Quick Reference

For a quick start, here are the currently implemented features:

- **Comments**: `# comment` (standalone or inline)
- **Strings**: `"string"` with escape sequences
- **Sessions**: `session "prompt"` spawns a subagent

For complete details, syntax, validation rules, and examples, refer to `prose.md`.

## Execution Model

OpenProse programs execute sequentially. Each `session` statement spawns a subagent session that completes before the next statement runs. Use Claude Code's Task tool to spawn these sessions.
```

## prose.md Draft Outline

The `prose.md` file should contain comprehensive documentation based on `src/interpreter/README.md` and the specification files. It should include:

- Full introduction to OpenProse
- Complete syntax reference for all implemented features
- Execution semantics
- Validation rules
- Examples
- Compilation details (if using bundled compiler)

---

## Alignment Confirmed

Based on CEO decisions:

1. **Q1**: ✅ Marketplace + Plugin (Option B) - Confirmed
2. **Q2**: ✅ Slash command + skill activation (Option C) - Confirmed
3. **Q3**: ✅ Bundled executable (Option B) - Confirmed (moved to Phase 1)
4. **Q4**: ✅ Skill only for now (Option A) - Confirmed (custom orchestrator agent research deferred)
5. **Q5**: ✅ Separate `prose.md` file with full DSL docs, `SKILL.md` references it - Confirmed

## Remaining Questions

- Any naming preferences? (`open-prose` vs `openprose` vs `prose`)
- Should the skill be immediately usable, or wait until more features are built?
- Are there any additional discovery channels to target (skillsmp.com, claude-plugins.dev)?

---

## Implementation Complete

**Date**: 2025-01-01

All Phase 1 items have been implemented:

### Created Files

| File | Description |
|------|-------------|
| `.claude-plugin/marketplace.json` | Registers repo as marketplace |
| `.claude-plugin/plugin.json` | Plugin metadata |
| `skills/open-prose/SKILL.md` | Main skill file with overview and grep examples |
| `skills/open-prose/prose.md` | Complete DSL reference documentation |
| `skills/open-prose/scripts/compile` | Bundled executable (macOS arm64) |
| `commands/run-prose.md` | `/run-prose` slash command |
| `bin/open-prose.ts` | CLI source code |

### Bundled Executable

The compiler is bundled using `bun build --compile`:

```bash
# Rebuild after changes
bun build bin/open-prose.ts --compile --outfile skills/open-prose/scripts/compile
```

**Note**: Current build is macOS arm64 only. For cross-platform builds, would need:
- Linux x64: `bun build --compile --target=bun-linux-x64`
- Windows x64: `bun build --compile --target=bun-windows-x64`

### Installation Instructions

Users can install with:

```bash
# Add marketplace
/plugin marketplace add irl-dan/open-prose

# Install plugin
/plugin install open-prose
```

### Usage

After installation:

```bash
# Via slash command
/run-prose path/to/program.prose

# Via natural language
"Run the prose program in examples/research.prose"
```

### Next Steps (Phase 2)

1. Cross-platform binary builds (Linux, Windows)
2. GitHub Actions workflow for automated builds
3. Submit to external discovery channels (skillsmp.com, claude-plugins.dev)
4. Add more examples to the skill
5. Update documentation as more language features are implemented
