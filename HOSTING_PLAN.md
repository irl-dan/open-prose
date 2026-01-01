# OpenProse Skill Hosting Plan

This document outlines how to package and distribute OpenProse as a Claude Code skill/plugin.

---

## Current Architecture (Skills-Only)

**Date**: 2025-01-01

After research and iteration, we've settled on a **skills-only architecture** that sidesteps the Command environment variable bug (#9354).

### How It Works

1. **Skill-based activation**: Claude reads `SKILL.md` when user mentions `.prose` files
2. **Source distribution**: Bun runs TypeScript directly from `bin/open-prose.ts`
3. **Environment variable**: `${CLAUDE_PLUGIN_ROOT}` works in Bash tool calls (but not in Commands)

### Plugin Structure

```
plugin/
├── .claude-plugin/
│   ├── marketplace.json      # Registers as marketplace
│   └── plugin.json           # Plugin metadata
├── bin/
│   └── open-prose.ts         # CLI entry point
├── skills/
│   └── open-prose/
│       ├── SKILL.md          # Instructions (uses ${CLAUDE_PLUGIN_ROOT})
│       └── prose.md          # Full DSL reference
├── src/                      # Parser/compiler source
├── examples/                 # Example .prose files
├── package.json              # For Bun module resolution
└── tsconfig.json             # TypeScript config
```

### Installation

```bash
/plugin marketplace add irl-dan/open-prose/plugin
/plugin install open-prose
```

### Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Distribution | Skills only (no Commands) | Commands don't expand `${CLAUDE_PLUGIN_ROOT}` |
| Binary | Source distribution (Bun) | 57MB binary too large, cross-platform issues |
| Fallback | `npx ts-node` | For systems without Bun |
| Structure | Nested `plugin/` directory | Separates skill from webapp/infra |

---

## Decision History

<details>
<summary>Click to expand historical decisions (Q1-Q8)</summary>

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

- Any naming preferences? (`open-prose` vs `openprose` vs `prose`) <CEO timestamp="2025-01-01 06:10:00">I like `prose`.</CEO>
- Should the skill be immediately usable, or wait until more features are built? <CEO timestamp="2025-01-01 06:10:00">The skill should be immediately usable. We should be building out the skill such that we can use it end to end even with very limited language features.</CEO>
- Are there any additional discovery channels to target (skillsmp.com, claude-plugins.dev)? <CEO timestamp="2025-01-01 06:10:00">No, I will tweet about it and that's it for now.</CEO>

---

## Implementation Complete

**Date**: 2025-01-01

All Phase 1 items have been implemented:

### Created Files

| File                                | Description                                     |
| ----------------------------------- | ----------------------------------------------- |
| `.claude-plugin/marketplace.json`   | Registers repo as marketplace                   |
| `.claude-plugin/plugin.json`        | Plugin metadata                                 |
| `skills/open-prose/SKILL.md`        | Main skill file with overview and grep examples |
| `skills/open-prose/prose.md`        | Complete DSL reference documentation            |
| `skills/open-prose/scripts/compile` | Bundled executable (macOS arm64)                |
| `commands/run-prose.md`             | `/run-prose` slash command                      |
| `bin/open-prose.ts`                 | CLI source code                                 |

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

1. Resolve binary distribution strategy (see below)
2. Submit to external discovery channels (skillsmp.com, claude-plugins.dev)
3. Add more examples to the skill
4. Update documentation as more language features are implemented

---

## Binary Distribution: Troubles & Options

### The Problem

The compiled Bun binary is 57MB. When attempting to commit:

- `git add` kept timing out/getting interrupted
- Even with extended timeouts, the large binary caused issues
- Standard git isn't designed for large binaries

**Current workaround**: Binary added to `.gitignore`, users must build locally.

### Option A: GitHub Releases + CI

Standard approach for distributing compiled binaries:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ["v*"]

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: bun-darwin-arm64
            artifact: compile-darwin-arm64
          - os: macos-latest
            target: bun-darwin-x64
            artifact: compile-darwin-x64
          - os: ubuntu-latest
            target: bun-linux-x64
            artifact: compile-linux-x64
          - os: windows-latest
            target: bun-windows-x64
            artifact: compile-windows-x64.exe

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - run: bun install
      - run: bun build bin/open-prose.ts --compile --target=${{ matrix.target }} --outfile=${{ matrix.artifact }}

      - uses: softprops/action-gh-release@v1
        with:
          files: ${{ matrix.artifact }}
```

**Pros**: Cross-platform, professional, standard pattern
**Cons**: Skill needs to download binary on first use, adds network dependency

### Option B: Source Distribution (Bun runs TypeScript directly)

```bash
# Users just need bun installed, then:
bun run bin/open-prose.ts compile program.prose
```

**Pros**: No compilation step, works cross-platform, simpler maintenance
**Cons**: Requires Bun installed, less portable

### Option C: Hybrid

- Provide source for Bun users
- Provide GitHub Releases download script for others
- Document both options in SKILL.md

### Open Questions

1. **When a plugin is installed, what gets cloned?**

   - Full repo including `bin/`, `src/`?
   - Or just `skills/`, `commands/`, `.claude-plugin/`?
   - This determines if source distribution is viable.

2. **Where is the plugin installed?**

   - What's the path structure?
   - Can Claude construct the path to `bin/open-prose.ts` from skill context?
   - Example: Is it `~/.claude/plugins/open-prose/bin/open-prose.ts`?

3. **Is Bun available to Claude Code users?**

   - Claude Code requires Node.js
   - Bun is increasingly common but not guaranteed
   - Could fall back to `npx ts-node` but adds dependency

4. **Does `bun run` work without `bun install`?**

   - Our project has zero runtime dependencies (only devDependencies)
   - Bun should run TS directly without install
   - Need to verify this assumption

5. **For GitHub Releases approach:**
   - Where would the downloaded binary be stored?
   - How does the skill trigger the download on first use?
   - Network access assumptions?

### Recommendation

**Lean toward Option B (source distribution)** for simplicity, but need to answer:

- Does the full repo get cloned on plugin install?
- What's the reliable path to reference source files?

If those answers are favorable, update SKILL.md to use:

```bash
bun run <plugin-path>/bin/open-prose.ts compile program.prose
```

If not, implement Option A with a first-use download script.

---

## Option B Deep Dive: Source Distribution

<CEO timestamp="2025-01-01 06:35:00">
I want to explore how Option B would work. Explore what files we'd need to ship alongside the plugin. And explore what directory structure would make that possible.

For example, we'd want to not install all the tests, examples, etc... if avoidable, but if that makes it easier in the meantime, it's not that big of a deal. If we need to ship the entire repository as the skill to preserve a sane state, that's acceptable for now. However, we won't want to ship the webapp, and that's making me wonder if all of this should be one step deeper.
</CEO>

### Current Repository Structure

```
open-prose/
├── .claude-plugin/           # Plugin metadata - NEEDED
├── bin/                      # CLI source - NEEDED for bun run
├── commands/                 # Slash commands - NEEDED
├── dist/                     # Compiled JS - gitignored, not shipped
├── examples/                 # Example .prose files - nice to have
├── guidance/                 # Design interviews - NOT needed
├── infra/                    # Terraform for landing page - NOT needed
├── landing/                  # Next.js webapp - NOT needed (problematic)
├── node_modules/             # gitignored, not shipped
├── skills/                   # Skills - NEEDED
├── specification/            # Language spec - useful as reference
├── src/                      # TypeScript source - NEEDED for bun run
├── test-harness/             # LLM-as-judge tests - NOT needed
├── package.json              # NEEDED for bun
├── tsconfig.json             # NEEDED for TypeScript
└── various .md files
```

### What's Required for Source Distribution

For `bun run bin/open-prose.ts` to work, we need:

| Directory/File      | Required | Reason                               |
| ------------------- | -------- | ------------------------------------ |
| `src/`              | Yes      | TypeScript source imported by CLI    |
| `bin/open-prose.ts` | Yes      | CLI entry point                      |
| `skills/`           | Yes      | SKILL.md and prose.md                |
| `commands/`         | Yes      | Slash commands                       |
| `.claude-plugin/`   | Yes      | Plugin/marketplace metadata          |
| `package.json`      | Yes      | Bun needs this for module resolution |
| `tsconfig.json`     | Yes      | TypeScript configuration             |
| `specification/`    | Optional | Useful reference for Claude          |
| `examples/`         | Optional | Nice for users to see                |

### What Should NOT Be Shipped

| Directory       | Size                       | Reason to Exclude                   |
| --------------- | -------------------------- | ----------------------------------- |
| `landing/`      | ~230MB (with node_modules) | Separate webapp, unrelated to skill |
| `infra/`        | Small                      | Terraform config, not relevant      |
| `test-harness/` | Medium                     | Testing infrastructure              |
| `guidance/`     | Small                      | Internal design docs                |
| `dist/`         | N/A                        | Already gitignored                  |

### The Problem: `landing/` Directory

The `landing/` directory is a Next.js app with its own `node_modules/`. Even though `landing/node_modules/` is gitignored, the source files and config are still there. This bloats the plugin unnecessarily and could confuse the skill context.

### Structural Options

#### Option B1: Nested Plugin Directory

Move all plugin-related files into a `plugin/` subdirectory:

```
open-prose/
├── plugin/                        # THIS is the plugin
│   ├── .claude-plugin/
│   │   ├── marketplace.json
│   │   └── plugin.json
│   ├── bin/
│   │   └── open-prose.ts
│   ├── commands/
│   │   └── run-prose.md
│   ├── skills/
│   │   └── open-prose/
│   │       ├── SKILL.md
│   │       └── prose.md
│   ├── src/                       # Full parser source
│   │   ├── parser/
│   │   ├── compiler/
│   │   ├── validator/
│   │   └── ...
│   ├── package.json
│   └── tsconfig.json
├── landing/                       # Webapp - NOT part of plugin
├── infra/                         # Terraform - NOT part of plugin
├── test-harness/                  # Tests - NOT part of plugin
├── specification/                 # Could symlink or copy relevant parts
└── guidance/                      # Design docs - NOT part of plugin
```

Then `marketplace.json` would reference:

```json
{
  "plugins": [{
    "name": "open-prose",
    "source": "./",  // Relative to plugin/ directory
    ...
  }]
}
```

And users would add the marketplace as:

```
/plugin marketplace add irl-dan/open-prose/plugin
```

**Pros:**

- Clean separation between plugin and other repo contents
- Only ships what's needed
- Clear boundary

**Cons:**

- Requires restructuring the repo
- Duplicates or moves src/ away from tests
- More complex development workflow (changes in plugin/src/ vs root)

#### Option B2: Accept the Bloat (Temporary)

Ship the entire repo as the plugin. The extra directories are small (except landing/).

```
open-prose/                        # THIS is the plugin
├── .claude-plugin/
├── bin/
├── commands/
├── skills/
├── src/
├── landing/                       # Included but ignored
├── infra/                         # Included but ignored
├── ...
```

**Pros:**

- No restructuring needed
- Simple to maintain
- Can improve later

**Cons:**

- Ships unnecessary files
- `landing/` source files included (though node_modules gitignored)
- Less professional

#### Option B3: Separate Repository

Create a new repo `irl-dan/prose-skill` that contains only the plugin:

```
prose-skill/                       # Dedicated plugin repo
├── .claude-plugin/
├── bin/
├── commands/
├── skills/
├── src/
├── package.json
└── tsconfig.json
```

The main `open-prose` repo would be for development, and releases would be published to the skill repo.

**Pros:**

- Cleanest separation
- Plugin repo stays lean
- Clear versioning

**Cons:**

- Two repos to maintain
- Sync complexity
- More release overhead

### Analysis: Recommended Approach

**Short-term (now):** Option B2 - Accept the bloat. The `landing/` source is small without node_modules, and we can ship the whole repo. This gets us to a working state quickly.

**Medium-term:** Option B1 - Nested plugin directory. Once we validate the plugin works, restructure to `plugin/` subdirectory. This keeps everything in one repo but cleanly separates concerns.

**If B1 proves awkward:** Option B3 - Separate repo. But this adds maintenance burden, so only if needed.

---

## Restructure Complete: Option B1 Implemented

**Date**: 2025-01-01

The repository has been restructured to use a nested `plugin/` directory:

### New Directory Structure

```
open-prose/
├── plugin/                        # THE PLUGIN (install from here)
│   ├── .claude-plugin/
│   │   ├── marketplace.json
│   │   └── plugin.json
│   ├── bin/
│   │   └── open-prose.ts          # CLI entry point
│   ├── commands/
│   │   └── run-prose.md           # /run-prose slash command
│   ├── examples/                  # Example .prose files
│   ├── skills/
│   │   └── open-prose/
│   │       ├── SKILL.md
│   │       └── prose.md
│   ├── src/                       # Parser/compiler/validator source
│   ├── package.json               # Plugin package (minimal)
│   └── tsconfig.json              # Plugin TypeScript config
├── landing/                       # Webapp (NOT part of plugin)
├── infra/                         # Terraform (NOT part of plugin)
├── test-harness/                  # E2E tests (NOT part of plugin)
├── specification/                 # Language spec (development reference)
├── guidance/                      # Design docs (development reference)
├── package.json                   # Dev workspace package
├── tsconfig.json                  # Dev TypeScript config
└── jest.config.js                 # Test configuration
```

### Installation Instructions

Users install the plugin from the `plugin/` subdirectory:

```bash
/plugin marketplace add irl-dan/open-prose/plugin
/plugin install open-prose
```

### Running the CLI

From within the plugin directory:

```bash
cd plugin
bun run bin/open-prose.ts compile program.prose
bun run bin/open-prose.ts validate program.prose
```

### Development Workflow

From the repo root:

```bash
npm test          # Run all tests
npm run build     # Build TypeScript
npm run lint      # Type check
```

### Bun Type Export Fix

During restructuring, we discovered a Bun bug with re-exported types. Fixed by using `export type` for interface/type-only exports in barrel files:

```typescript
// Before (broken in Bun)
export { TryBlockNode } from "./ast";

// After (works in Bun)
export type { TryBlockNode } from "./ast";
```

Applied to all barrel exports in:

- `plugin/src/parser/index.ts`
- `plugin/src/validator/index.ts`
- `plugin/src/compiler/index.ts`
- `plugin/src/lsp/index.ts`
- `plugin/src/index.ts`

### Path Resolution Question

For `bun run bin/open-prose.ts` to work when the skill is installed, we need to know:

1. Where does Claude Code install plugins?
2. Can the skill reference files relative to its own location?
3. Does Bun need to be in the plugin directory, or can it run from anywhere?

Example: If plugin is installed to `~/.claude/plugins/open-prose/`:

```bash
cd ~/.claude/plugins/open-prose && bun run bin/open-prose.ts compile /path/to/program.prose
```

Or with explicit path:

```bash
bun run ~/.claude/plugins/open-prose/bin/open-prose.ts compile program.prose
```

This needs testing to confirm.

===============================================

<CEO timestamp="2025-01-01 06:40:00">
I did some followup research to figure out how to do this and encountered an issue with our plugin plan. However, I think we have a solution to do this exclusively with skills.
</CEO>

===============================================

I'll research how Claude Code plugins work to answer these questions.Excellent! I found a key piece of information - the `${CLAUDE_PLUGIN_ROOT}` environment variable. Let me get more details on the official documentation.Let me get the detailed plugins reference for more specifics on file paths and what gets installed.This is very helpful! I found the key information. Let me search for one more detail about what gets cloned during installation.I've gathered all the key information. Here's the complete research summary:

---

## Research Findings: Claude Code Plugin Installation

### 1. Where Plugins Are Installed

**Installation Path Pattern:**

```
~/.claude/plugins/cache/{marketplace-name}/{plugin-name}/{version}/
```

Example:

```
~/.claude/plugins/cache/irl-dan-open-prose/open-prose/1.0.0/
```

### 2. What Gets Cloned/Copied

From the [official docs](https://code.claude.com/docs/en/plugins-reference):

> "For plugins with `.claude-plugin/plugin.json`: The implicit root directory (the directory containing `.claude-plugin/plugin.json`) is **copied recursively**."

**Key behaviors:**

- The **entire directory** containing `.claude-plugin/plugin.json` is copied
- External files outside the plugin directory are **NOT copied**
- Symlinks **ARE honored** during copy (symlinked content gets copied)
- Each version gets its own cache directory (old versions remain)

### 3. The `${CLAUDE_PLUGIN_ROOT}` Environment Variable

This variable contains the absolute path to the installed plugin directory.

**Where it works:**

- ✅ `hooks/hooks.json` - command paths
- ✅ `.mcp.json` - server command arguments
- ✅ Executed scripts (bash, node, etc.)

**Where it does NOT work (BUG!):**

- ❌ **Command markdown files** ([Issue #9354](https://github.com/anthropics/claude-code/issues/9354) - 27+ upvotes)

This is a **critical bug** for your use case. The issue states:

> "Currently, the `${CLAUDE_PLUGIN_ROOT}` environment variable... only works in JSON configurations (hooks, MCP servers) but **not in command markdown files**. This makes it impossible for /plugin commands to execute bundled scripts."

### 4. Implications for OpenProse

**Source Distribution (Option B) Assessment:**

| Aspect                                        | Status                                         |
| --------------------------------------------- | ---------------------------------------------- |
| Full repo gets cloned                         | ✅ Yes - entire plugin root is copied          |
| `src/`, `bin/` would be included              | ✅ Yes                                         |
| Path construction via `${CLAUDE_PLUGIN_ROOT}` | ⚠️ Only works in hooks, not commands           |
| `/run-prose` command can call `bun run ...`   | ❌ **No** - env var doesn't expand in commands |

### 5. Workarounds

**Option A: Use a Hook Instead of Command**

Instead of a slash command, use a `SessionStart` hook or custom trigger:

```json
// hooks/hooks.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*\\.prose$",
        "hooks": [
          {
            "type": "command",
            "command": "bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts compile $TOOL_INPUT"
          }
        ]
      }
    ]
  }
}
```

**Option B: MCP Server**

Package the compiler as an MCP server. The `.mcp.json` can use `${CLAUDE_PLUGIN_ROOT}`:

```json
{
  "mcpServers": {
    "open-prose": {
      "command": "bun",
      "args": ["run", "${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts", "serve"]
    }
  }
}
```

**Option C: Hardcode Expected Path (Fragile)**

Document that users must know the path:

```bash
bun run ~/.claude/plugins/cache/irl-dan-open-prose/open-prose/*/bin/open-prose.ts
```

**Option D: Wait for Bug Fix**

The issue has significant upvotes and is tagged for attention. Could be fixed soon.

**Option E: Skill-Based Interpretation**

Don't use the compiler at all. Have Claude interpret `.prose` files directly using the documentation in `prose.md`. This is what you're partially doing already.

---

### Recommendation

Given the bug, I'd suggest a **hybrid approach**:

1. **For now**: Rely on skill-based interpretation (Claude reads `prose.md` and interprets programs directly)
2. **Add an MCP server** for the compiler (works with `${CLAUDE_PLUGIN_ROOT}`)
3. **Watch Issue #9354** - once fixed, add proper `/run-prose` command support

The `landing/` directory bloat issue is real but secondary - you can address it later with Option B1 (nested `plugin/` directory) once the core functionality works.

===============================================

<CEO timestamp="2025-01-01 06:41:00">
Can we execute the script from a skill instead of a plugin? Perhaps plugin is the wrong construct?
</CEO>

===============================================

That's a great question. Let me think through the distinction:

**Commands** = Claude executes instructions from the markdown file
**Skills** = Claude _reads_ the markdown and gains knowledge/instructions, then uses its _own tools_ (Bash, Read, etc.)

The bug (#9354) is about `${CLAUDE_PLUGIN_ROOT}` not being expanded in command markdown. But Skills work differently - they provide knowledge to Claude, and Claude then decides what tools to use.

So a Skill could say:

```markdown
# SKILL.md

When executing a .prose program, use the bundled compiler:

\`\`\`bash
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts compile <file>
\`\`\`
```

When Claude reads this and then runs `Bash(...)`, does `${CLAUDE_PLUGIN_ROOT}` exist in that shell environment?

Let me check if there's documentation on this specific case.This is the key insight! Based on the research:

## Skills vs Commands: Critical Difference

**Commands** (the bug):

```
Command markdown → Claude Code directly processes → env var NOT expanded
```

**Skills** (should work):

```
SKILL.md instructions → Claude reads them → Claude invokes Bash tool → env var IS available
```

From the [official docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview):

> "When instructions mention executable scripts, **Claude runs them via bash** and receives only the output (the script code itself never enters context)."

And from real-world usage (motlin.com example):

````markdown
## Plugin Health Check

Run the master doctor script:

```bash
${CLAUDE_PLUGIN_ROOT}/../orchestration/scripts/doctor-all.sh
```
````

So **YES** - a Skill should work because:

1. `SKILL.md` contains instructions like "run `bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts compile <file>`"
2. Claude reads these as _instructions_, not as commands to directly execute
3. When Claude decides to run the script, it uses its **Bash tool**
4. The Bash environment has `${CLAUDE_PLUGIN_ROOT}` set by Claude Code
5. Script executes successfully

## Recommended Architecture

```
open-prose/
├── .claude-plugin/
│   ├── marketplace.json
│   └── plugin.json
├── skills/
│   └── open-prose/
│       ├── SKILL.md          # Instructions + when to use compiler
│       ├── prose.md          # Full DSL reference
│       └── scripts/          # Optional helper scripts
├── bin/
│   └── open-prose.ts         # CLI entry point
├── src/                      # Parser source
└── package.json
```

The `SKILL.md` would say:

````markdown
---
name: open-prose
description: |
  This skill should be used when the user asks to run, execute, 
  or interpret .prose files, or when orchestrating multi-agent 
  sessions from a prose program.
---

# OpenProse Interpreter

## Compilation (Optional)

For validation or to see the canonical form:

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts compile <file.prose>
```
````

## Interpretation

For full DSL syntax, read: `${CLAUDE_PLUGIN_ROOT}/skills/open-prose/prose.md`
...

```

This sidesteps the Command bug entirely by leveraging how Skills work.

===============================================

## Revised Plan: Skills-Only Architecture

Based on the research findings, we're pivoting to a skills-only approach.

### Open Questions Resolved

**Q6: Bun availability** - Is Bun commonly available on Claude Code users' machines?

<CEO timestamp="2025-01-01 09:00:00">We will assume that it is but add instructions to fall back to `npx ts-node` if not.</CEO>

**Q7: Compile vs Interpret** - Should Claude always compile, interpret directly, or hybrid?

<CEO timestamp="2025-01-01 09:00:00">We should make a cheap method of checking whether it's been compiled yet, with instructions to check and compile if it's not yet compiled.</CEO>

**Q8: Command retention** - Should we keep `commands/run-prose.md`?

<CEO timestamp="2025-01-01 09:00:00">Yes, let's delete it completely. There are no users and we don't need to maintain anything for documentation or backward compatibility reasons for now.</CEO>

### Implementation Plan

1. **Update `SKILL.md`**:
   - Use `${CLAUDE_PLUGIN_ROOT}` for all paths
   - Add compile check instructions
   - Add Bun fallback to `npx ts-node`

2. **Delete `commands/run-prose.md`**:
   - Commands don't work due to bug #9354
   - No backward compatibility concerns

3. **Remove bundled binary references**:
   - Switch to source distribution
   - Bun runs TypeScript directly

</details>

---

## Implementation Complete

**Date**: 2025-01-01

All items from the revised skills-only plan have been implemented:

| Task | Status |
|------|--------|
| Update SKILL.md with `${CLAUDE_PLUGIN_ROOT}` paths | Done |
| Add compile check instructions | Done |
| Add Bun/ts-node fallback | Done |
| Delete `commands/run-prose.md` | Done |
| Remove bundled binary | Done |
| Update HOSTING_PLAN.md | Done |

### What Changed

1. **SKILL.md** now uses `${CLAUDE_PLUGIN_ROOT}` for all paths
2. **commands/** directory deleted (Commands don't expand env vars)
3. **scripts/compile** binary removed (using source distribution)
4. Execution flow: Validate with Bun → Interpret statements → Spawn subagents

### Next Steps

1. Test the plugin installation: `/plugin marketplace add irl-dan/open-prose/plugin`
2. Verify `${CLAUDE_PLUGIN_ROOT}` expands correctly in Bash calls
3. Continue building language features per BUILD_PLAN.md
