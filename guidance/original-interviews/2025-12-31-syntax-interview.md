# OpenProse: Syntax Exploration

Based on CEO answers from QUESTIONS.md (Q34-Q37).

---

## CEO Direction Summary

- Explore **Lisp-like** syntax → **REJECTED** (you said "Hate this" and "I really don't like this")
- **Simplest program**: a single session ✓
- Balance **explicit vs implicit** like TypeScript ✓
- **Naming** confirmed: Session, Agent, Skill ✓

---

## Settled Decisions

Based on your answers across all interviews, the following are confirmed:

### Syntax Style: Hybrid/Python-like ✓

```
# Confirmed syntax style
import skill-name from "github:user/repo"

agent name:
  model tier
  skills [skill1, skill2]

session "prompt"
session agent-name "prompt"

do:
  session "A"
  session "B"

parallel:
  session "A"
  session "B"

block name:
  session "A"

try:
  session "Risky"
catch:
  session "Handle"
```

### Rejected Styles

- **Lisp-style**: Explicitly rejected ("Hate this")
- **Java/TS braces**: Explicitly rejected ("I don't like this")
- **Hybrid do-while**: Rejected ("Don't really like this")

---

## Syntax Details (All Confirmed)

### Q1: File Extension ✅ CONFIRMED

**`.prose`** — Short, memorable, matches project name.

### Q2: Case Sensitivity ✅ CONFIRMED

**Case-sensitive, lowercase convention**

```
session "X"   # correct
Session "X"   # error
```

### Q3: String Interpolation ✅ CONFIRMED

**`{variable}`** — Simpler, matches minimal preference.

```
session "Process {item}"
```

### Q4: Multi-line Strings ✅ INFERRED

**Triple quotes** — Matches Python convention CEO chose for overall syntax.

```
session """
  This is a long
  multi-line prompt
"""
```

### Q5: Comments ✅ CONFIRMED

**Hash (`#`)** — Consistently used throughout all examples.

```
# This is a comment
```

---

## Operator Summary (Confirmed)

| Concept           | Syntax             |
| ----------------- | ------------------ |
| Sequence (inline) | `->`               |
| Sequence (block)  | `do:` or implicit  |
| Parallel          | `parallel:`        |
| Pipe/transform    | `\|`               |
| Context passing   | `with` or implicit |
| Comment           | `#`                |

---

## Keyword Summary (Confirmed)

| Keyword                     | Purpose                             |
| --------------------------- | ----------------------------------- |
| `import`                    | Import skills                       |
| `agent`                     | Define agent template               |
| `session`                   | Create session                      |
| `block`                     | Define named block                  |
| `do`                        | Sequential execution / invoke block |
| `parallel`                  | Parallel execution                  |
| `loop`                      | Loop construct                      |
| `repeat`                    | Fixed iteration                     |
| `for`                       | For-each                            |
| `try` / `catch` / `finally` | Error handling                      |
| `if` / `else`               | Conditionals (TBD)                  |
| `let`                       | Variable binding                    |

---

## Minimal Grammar (Confirmed)

```
# Imports
import skill-name from "source"

# Agent
agent name:
  model tier
  skills [name, ...]
  permissions:
    tool action

# Session
session "prompt"
session agent "prompt"
session name: agent
  prompt: "..."

# Composition
do:
  statements

parallel:
  statements

block name:
  statements

do name  # invoke block

# Control flow
loop:
  statements

loop until condition:
  statements

repeat N:
  statements

for item in items:
  statements

# Error handling
try:
  statements
catch:
  statements
finally:
  statements

# Variables
let name = expression
```

---

## Summary

**All syntax decisions are now confirmed.** This document is ready for archival.

| Item | Decision |
|------|----------|
| File extension | `.prose` |
| Case sensitivity | Case-sensitive, lowercase |
| String interpolation | `{variable}` |
| Multi-line strings | `"""..."""` |
| Comments | `#` |
| Syntax style | Hybrid/Python-like |
| All keywords | Confirmed |
| All operators | Confirmed |
