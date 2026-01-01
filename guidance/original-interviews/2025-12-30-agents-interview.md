# OpenProse: Agents Deep Dive

Broken out from Skills interview per CEO direction: "Let's break this out into its own file, this is distinct from Skills."

---

## Context

From QUESTIONS.md, the CEO defined:

> **Agent**: a bundle of skills, model, permissions that can be re-used throughout the instructions in multiple Sessions.

Agents are **reusable templates** that Sessions can instantiate.

---

## A. Agent Definition Syntax

How should agents be defined?

### A1. **Declarative Block**

```
agent researcher:
  model: opus
  skills: [web-search, summarizer, citation]
  permissions:
    bash: deny
    webfetch: allow
```

<CEO timestamp="2025-12-30 08:41:00">I like this.</CEO>

### A2. **Function-Like**

```
agent researcher(model: opus, skills: [web-search, summarizer]):
  permissions:
    bash: deny
```

<CEO timestamp="2025-12-30 08:42:00">This is ugly.</CEO>

### A3. **Inheritance-Based**

```
agent researcher extends base-agent:
  skills: [web-search]  # adds to parent's skills
```

<CEO timestamp="2025-12-30 08:43:00">This leads to bad patterns.</CEO>

**Question:** Which syntax style is preferred? Should agents support inheritance?

<CEO timestamp="2025-12-30 08:44:00">Option A1 is great, Declarative Block. I do want you to double check how permissions are declared in OpenCode. The syntax should mirror that as closely as possible. Assuming the above does, let's keep it. If not, tweak it to mirror the OpenCode permissions syntax. No, they should not support inheritance.</CEO>

---

## B. Agent Properties

What can an agent bundle?

### B1. **Core Properties**

| Property      | Required? | Description                                         |
| ------------- | --------- | --------------------------------------------------- |
| `model`       | No        | Model tier (haiku/sonnet/opus) or specific model ID |
| `skills`      | No        | List of skill names to include                      |
| `permissions` | No        | Tool permission overrides                           |

<CEO timestamp="2025-12-30 08:45:00">This is correct.</CEO>

### B2. **Extended Properties**

Should agents also bundle:

- **System prompt additions?** Extra instructions for all sessions using this agent
- **Tool configuration?** Enable/disable specific tools
- **Timeout defaults?** Default timeout for sessions using this agent
- **Retry policy?** Default retry behavior

**Question:** Which properties should agents support beyond the core three?

<CEO timestamp="2025-12-30 08:46:00">I think we want a "prompt" field (which will presumably be added to the system prompt). None of the rest for now, we'll add them in later. These may also be "Session" properties (ie not agent aka template properties) TBD.</CEO>

---

## C. Agent Instantiation

How does an Agent become a Session?

### C1. **Type Annotation Style**

```
session my-research: researcher
  prompt: "Research AI trends"
```

<CEO timestamp="2025-12-30 08:47:00">I like this.</CEO>

### C2. **Explicit Instantiation**

```
session my-research = researcher():
  prompt: "Research AI trends"
```

<CEO timestamp="2025-12-30 08:48:00">These feels clumsy.</CEO>

### C3. **Implicit (Name Matching)**

```
researcher:
  prompt: "Research AI trends"
```

<CEO timestamp="2025-12-30 08:49:00">I like this as syntactical sugar.</CEO>

### C4. **Property Reference**

```
session my-research:
  agent: researcher
  prompt: "Research AI trends"
```

<CEO timestamp="2025-12-30 08:50:00">This is pretty good.</CEO>

**Question:** Which instantiation style is preferred?

<CEO timestamp="2025-12-30 08:51:00">I'm sort of split betwen [C1+C3] and C4. Help me weigh the pros/cons.</CEO>

---

## D. Agent vs Session Relationship

### D1. **Class/Template Model**

Agent is a class, Session is an instance:

```
agent researcher:     # class definition
  model: sonnet
  skills: [web-search]

session task1: researcher    # instance 1
  prompt: "Research X"

session task2: researcher    # instance 2
  prompt: "Research Y"
```

<CEO timestamp="2025-12-30 08:52:00">This was my mental model coming into this.</CEO>

### D2. **Mixin Model**

Agent is a configuration that sessions include:

```
agent researcher:
  model: sonnet
  skills: [web-search]

session task1:
  include: researcher    # mixin
  prompt: "Research X"
  skills: [extra-skill]  # additional skills
```

<CEO timestamp="2025-12-30 08:53:00">This is interesting and in some ways more _composition_ based, correct? I'm open to this but not sold on it.</CEO>

### D3. **Alias Model**

Agent is just an alias for common configuration:

```
agent researcher = { model: sonnet, skills: [web-search] }

session task1:
  ...researcher    # spread operator
  prompt: "Research X"
```

<CEO timestamp="2025-12-30 08:54:00">This is interesting too.</CEO>

**My Recommendation:** Class/Template model (D1) is clearest and most familiar.

**Question:** Is the class/template model correct, or do you prefer mixins or aliases?

<CEO timestamp="2025-12-30 08:55:00">I think let's go with the class/template model. It's probably most familiar. However, I'd be curious for you to stealman the reasons for using the other models. Do this by showing specific use cases that these support that the class/template model does not.</CEO>

---

## E. Agent Defaults and Overrides

Can a session override agent properties?

### E1. **No Overrides**

Session inherits agent exactly:

```
agent researcher:
  model: sonnet

session task: researcher
  prompt: "Research"
  # Cannot change model
```

<CEO timestamp="2025-12-30 08:56:00">This seems too rigid.</CEO>

### E2. **Allow Overrides**

Session can override any property:

```
agent researcher:
  model: sonnet

session task: researcher
  model: opus          # override agent's model
  prompt: "Research"
```

<CEO timestamp="2025-12-30 08:57:00">I like this.</CEO>

### E3. **Additive Only**

Session can add but not replace:

```
agent researcher:
  skills: [web-search]

session task: researcher
  skills: [extra-skill]  # adds to agent's skills
  prompt: "Research"
```

**Question:** Should sessions be able to override agent properties? If so, which ones?

<CEO timestamp="2025-12-30 08:58:00">A session should be able to override any agent properties.</CEO>

---

## F. Agent Composition

Can agents compose other agents?

### F1. **No Composition**

Agents are flat:

```
agent researcher:
  model: sonnet
  skills: [web-search]

# Cannot reference other agents
```

### F2. **Inheritance**

Agents can extend other agents:

```
agent base-researcher:
  model: sonnet

agent advanced-researcher extends base-researcher:
  skills: [web-search, deep-analysis]
```

### F3. **Mixins**

Agents can include other agents:

```
agent web-capable:
  skills: [web-search, webfetch]

agent researcher:
  include: web-capable
  model: sonnet
```

**Question:** Should agents support composition? If so, inheritance or mixins?

<CEO timestamp="2025-12-30 08:59:00">I think Agents should NOT support composition by mixing in with one another. What we _should_ do is allow them to compose across control flow blocks (ie think functions), but that's a separate question.</CEO>

---

## G. Anonymous Agents

Must sessions always reference a named agent?

### G1. **Named Agents Only**

```
agent researcher:
  model: sonnet

session task: researcher
  prompt: "Research"
```

### G2. **Inline Configuration Allowed**

```
session task:
  model: sonnet
  skills: [web-search]
  prompt: "Research"
```

### G3. **Both**

Named agents for reuse, inline for one-offs:

```
# Reusable
agent researcher:
  model: sonnet

session task1: researcher
  prompt: "Research X"

# One-off
session task2:
  model: haiku
  prompt: "Quick task"
```

**Recommendation:** Both (G3). Named agents for reuse, inline for simple one-offs.

**Question:** Should inline agent configuration be allowed?

<CEO timestamp="2025-12-30 09:00:00">Yes, I like the recommendation. We should support both.</CEO>

---

## H. Built-in Agents

Should OpenProse provide built-in agents?

### H1. **No Built-ins**

Users define all agents.

### H2. **Minimal Built-ins**

```
# Provided by OpenProse
agent default:    # default configuration
agent fast:       # haiku model
agent careful:    # sonnet model
agent best:       # opus model
```

### H3. **Role-Based Built-ins**

```
agent researcher:  # optimized for research tasks
agent coder:       # optimized for coding tasks
agent reviewer:    # optimized for review tasks
```

**Question:** Should OpenProse provide any built-in agents?

<CEO timestamp="2025-12-30 09:01:00">Not for now. If we do support built-ins it would be via packages that get shared and imported. This will be a feature we add in the future but not for now.</CEO>

---

## I. Agent Visibility

Where can agents be used?

### I1. **File-Local Only**

Agents are only visible in the file they're defined.

<CEO timestamp="2025-12-30 09:02:00">For now, yes.</CEO>

### I2. **Exportable**

Agents can be exported and imported:

```
# agents.prose
export agent researcher:
  model: sonnet

# main.prose
import { researcher } from "./agents.prose"
```

<CEO timestamp="2025-12-30 09:03:00">We will punt on this and build it out in the future.</CEO>

### I3. **Global Library**

Agents can be defined in a global location:

```
# ~/.config/open-prose/agents.prose
agent researcher:
  model: sonnet
```

**Question:** Should agents be exportable/importable between files?

<CEO timestamp="2025-12-30 09:04:00">For now, local only. In the future we'll want to do export/import.</CEO>

---

## Open Questions Summary

1. **Definition syntax** (A): Declarative block, function-like, or inheritance-based?
2. **Extended properties** (B2): System prompt? Tool config? Timeouts?
3. **Instantiation style** (C): Type annotation, explicit, implicit, or property?
4. **Relationship model** (D): Class/template, mixin, or alias?
5. **Override policy** (E): No overrides, allow overrides, or additive only?
6. **Composition** (F): No composition, inheritance, or mixins?
7. **Anonymous agents** (G): Allow inline configuration?
8. **Built-in agents** (H): None, minimal (tiers), or role-based?
9. **Visibility** (I): File-local, exportable, or global?

---

## Proposed Minimal Syntax

Based on my recommendations:

```
# Agent definition (declarative block)
agent researcher:
  model: sonnet
  skills: [web-search, summarizer]
  permissions:
    bash: deny

# Session using agent (type annotation)
session task1: researcher
  prompt: "Research quantum computing"

# Session with inline config (no agent)
session task2:
  model: haiku
  prompt: "Quick classification"

# Session with agent + override
session task3: researcher
  model: opus    # override to use better model
  prompt: "Important research"
```

<CEO timestamp="2025-12-30 09:05:00">This is really solid as you have it. Factor in my feedback from above but I like where this is going.</CEO>
