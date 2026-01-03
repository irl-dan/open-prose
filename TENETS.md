# OpenProse Tenets

## The Project

1. **Pattern over framework.** The simplest and most elegant solution is barely anything at all.
2. **Ship as a skill.** No product, no service, no dependencies.
3. **Platform-agnostic by design.** Works with any major agent framework, present and future.
4. **Files are artifacts.** `.prose` is the portable unit.

## The Runtime

1. **An AI session is a Turing-complete computer.** OpenProse is a language for it.
2. **English is already an agent framework.** We're not replacing it, we're structuring it.
3. **The OpenProse VM is intelligent.** Design for understanding, not parsing.
4. **Inversion of control.** The AI is the container.

## The Language

1. **Structured but self-evident.** Unambiguous interpretation with minimal documentation.
2. **Break the fourth wall.** `**...**` speaks directly to the OpenProse VM when you want to lean on its wisdom.

## Separation of Concerns

The OpenProse skill ships as three distinct files, each with a clear responsibility:

| File | Role | Concerns |
|------|------|----------|
| **SKILL.md** | Distribution wrapper | Activation triggers, onboarding flow, telemetry opt-in, plugin-specific behavior, analytics integration |
| **prose.md** | Execution semantics | How to run programs, spawn sessions, manage state, handle errors, coordinate parallel execution |
| **docs.md** | Language specification | Syntax grammar, validation rules, error codes, compilation to canonical form, edge case behavior |

### Design Rationale

1. **SKILL.md is the plugin boundary.** It handles everything specific to the distribution context (Claude Code plugin, IDE integration, telemetry). A different host could use prose.md and docs.md with a different wrapper.

2. **prose.md is minimal and always in context.** An agent with only this file should successfully execute valid programs. It contains execution semantics but not validation edge cases.

3. **docs.md is the source of truth.** It's read when compiling, validating, or resolving ambiguous syntax. The intelligent OpenProse VM uses it as a semantic compiler—the spec IS the compiler.
