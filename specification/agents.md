# OpenProse Specification: Agents

> Derived from CEO interview on 2024-12-30

---

## Overview

Agents are **reusable templates** that bundle model, skills, permissions, and prompt. Sessions can instantiate agents, optionally overriding any property.

---

## Agent Definition

Agents use a **declarative block** syntax:

```
agent researcher:
  model: opus
  skills: ["web-search", "summarizer", "citation"]
  permissions:
    bash: deny
    webfetch: allow
  prompt: "You are a thorough researcher..."
```

### Properties

| Property | Required | Description |
|----------|----------|-------------|
| `model` | No | Model tier (`haiku`/`sonnet`/`opus`) or specific model ID |
| `skills` | No | List of skill names to include |
| `permissions` | No | Tool permission overrides (see below) |
| `prompt` | No | Additional instructions added to system prompt |

### Permissions Syntax

Permissions mirror OpenCode's format:

```
permissions:
  bash: deny          # deny all bash
  webfetch: allow     # allow web fetching
  edit: ask           # ask before editing
  skill: allow        # allow skill loading
```

Values: `allow`, `ask`, `deny`

---

## Session Instantiation

Sessions instantiate agents using **type annotation syntax**. The `session` keyword is always required.

### Named Session with Agent

```
session my-research: researcher
  prompt: "Research AI trends"
```

The colon (`:`) indicates the session's agent type, similar to typed language annotations.

### Unnamed Session with Agent

```
session: researcher
  prompt: "Research AI trends"
```

When a session doesn't need a name, omit the name but keep the `session` keyword.

### Simple Session (Prompt Only)

```
session "Research AI trends"
```

For simple cases where no agent or configuration is needed.

---

## Agent-Session Relationship

**Class/Template Model**: Agent is a class, Session is an instance.

```
agent researcher:           # class definition
  model: sonnet
  skills: ["web-search"]

session task1: researcher   # instance 1
  prompt: "Research X"

session task2: researcher   # instance 2
  prompt: "Research Y"
```

---

## Property Overrides

Sessions can **override any agent property**:

```
agent researcher:
  model: sonnet
  skills: ["web-search"]

session important-research: researcher
  model: opus                  # override model
  skills: ["deep-analysis"]    # override skills
  prompt: "Research thoroughly"
```

---

## Inline Configuration (Anonymous Agents)

Sessions don't require a named agent. Inline configuration is allowed:

```
# Using named agent
session task1: researcher
  prompt: "Research X"

# Inline configuration (no agent)
session task2:
  model: haiku
  skills: ["quick-search"]
  prompt: "Quick lookup"
```

---

## Not Supported

The following are explicitly out of scope:

| Feature | Status | Notes |
|---------|--------|-------|
| Agent inheritance | No | "Leads to bad patterns" |
| Agent composition/mixins | No | Agents are flat |
| Built-in agents | No | Future: importable agent packages |
| Export/import agents | No | Future feature |
| Global agent library | No | Agents are file-local |

---

## Example

```
import "web-search" from "github:example/web-search"
import "summarizer" from "github:example/summarizer"

agent researcher:
  model: sonnet
  skills: ["web-search", "summarizer"]
  permissions:
    bash: deny
  prompt: "You are a thorough researcher. Always cite sources."

agent writer:
  model: opus
  prompt: "You are an excellent technical writer."

# Session using agent
session research-phase: researcher
  prompt: "Research quantum computing trends"

# Session with override
session critical-research: researcher
  model: opus                    # upgrade model for important task
  prompt: "Research AI safety thoroughly"

# Inline session (no agent)
session quick-task:
  model: haiku
  prompt: "Classify this text"
```
