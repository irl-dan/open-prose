# OpenProse: Agents Follow-up

Two open items from the Agents interview requiring CEO decision.

---

## 1. Instantiation Style: C1+C3 vs C4

You asked me to help weigh the pros/cons.

### Option A: Type Annotation + Implicit Sugar (C1+C3)

```
# C1: Type annotation style
session my-research: researcher
  prompt: "Research AI trends"

# C3: Implicit shorthand (syntactic sugar)
researcher:
  prompt: "Research AI trends"
```

**Pros:**

- **Familiar to typed language users** - looks like TypeScript/Swift type annotations
- **Concise** - `session x: Agent` is shorter than `session x: agent: Agent`
- **Implicit sugar (C3) is elegant** - when you just want to run an agent, no ceremony
- **Clear inheritance semantic** - the colon reads as "is-a" relationship
- **Differentiation** - `session:` vs `agent:` is visually distinct at definition site

**Cons:**

- **Two syntaxes to learn** - C1 (explicit) and C3 (implicit) are different
- **C3 ambiguity risk** - `researcher:` could be confused with defining an agent named `researcher`
- **Parsing complexity** - need to distinguish `agent foo:` from `foo:` (implicit session)

### Option B: Property Reference (C4)

```
session my-research:
  agent: researcher
  prompt: "Research AI trends"
```

**Pros:**

- **Single consistent syntax** - all sessions use the same form
- **Explicit** - `agent: researcher` is unambiguous
- **Familiar to YAML/config users** - just another property
- **No special shorthand** - everything is spelled out
- **Extensible** - easy to add more properties at the same level

**Cons:**

- **More verbose** - extra line for `agent:` property
- **Less "typed" feel** - doesn't read like class instantiation
- **No shorthand** - can't do the elegant `researcher: prompt: "..."` form

### My Recommendation

**Go with C1+C3** (Type Annotation + Implicit Sugar):

1. The type annotation (`session x: Agent`) is familiar and reads well
2. The implicit shorthand (`Agent: prompt: "..."`) is elegant for simple cases
3. The ambiguity concern is manageable:
   - `agent foo:` = definition (keyword `agent`)
   - `foo:` alone = implicit session (no keyword)
4. The "two syntaxes" concern is mitigated because C3 is just sugar for C1

However, if you value **consistency over elegance**, go with C4.

<CEO timestamp="2025-12-30 08:39:00">I like your recommendation. C1+C3 (Type Annotation + Implicit Sugar) is the way to go.</CEO>

---

## 2. Steelman: Mixin and Alias Models

You asked me to show specific use cases that mixin/alias support but class/template does not.

### Use Case 1: Multiple Capability Sets

**Problem:** You have orthogonal capabilities (web-capable, code-capable, file-capable) and want to mix them.

**With Mixins:**

```
agent web-capable:
  skills: [web-search, webfetch]
  permissions:
    webfetch: allow

agent code-capable:
  skills: [code-analysis, linter]

agent file-capable:
  permissions:
    edit: allow
    bash: allow

# Combine capabilities
agent full-researcher:
  include: [web-capable, code-capable]
  model: opus

agent safe-researcher:
  include: [web-capable]  # no code or file access
  model: sonnet
```

**With Class/Template (your choice):**

```
# Must duplicate or manually compose
agent full-researcher:
  model: opus
  skills: [web-search, webfetch, code-analysis, linter]
  permissions:
    webfetch: allow

agent safe-researcher:
  model: sonnet
  skills: [web-search, webfetch]
  permissions:
    webfetch: allow
```

**Verdict:** Mixins reduce duplication when you have orthogonal capabilities. But this is a **power-user feature** and adds complexity. Your decision to avoid it is valid for MVP.

---

### Use Case 2: Partial Override with Spread

**Problem:** You want to use most of an agent's config but change one thing, without repeating everything.

**With Alias/Spread:**

```
agent base-researcher = {
  model: sonnet
  skills: [web-search, summarizer, citation]
  permissions: { bash: deny }
}

session task1:
  ...base-researcher
  model: opus          # just override model
  prompt: "Research"

session task2:
  ...base-researcher
  skills: [web-search]  # just override skills
  prompt: "Quick search"
```

**With Class/Template (your choice):**

```
agent base-researcher:
  model: sonnet
  skills: [web-search, summarizer, citation]
  permissions:
    bash: deny

# Overrides work at session level
session task1: base-researcher
  model: opus
  prompt: "Research"
```

**Verdict:** Actually, **class/template with session overrides handles this fine**. Since you decided sessions can override any property, the spread operator isn't needed. The class/template model with full override capability covers this use case.

---

### Use Case 3: Ad-hoc Composition in Flows

**Problem:** You want to compose configurations dynamically within a flow, not just at definition time.

**With Alias/Spread:**

```
# Define partial configs
fast = { model: haiku }
thorough = { model: opus }
web = { skills: [web-search] }

# Compose at use site
session task1:
  ...fast
  ...web
  prompt: "Quick search"

session task2:
  ...thorough
  ...web
  prompt: "Deep research"
```

**With Class/Template:**

```
# Must define full agents
agent fast-web:
  model: haiku
  skills: [web-search]

agent thorough-web:
  model: opus
  skills: [web-search]
```

**Verdict:** Alias/spread is more flexible for ad-hoc composition. But it's also more chaotic—harder to know what a session will do without tracing through all the spreads. **Explicit agents are more maintainable.**

---

### Summary: Why Class/Template is the Right Choice

| Concern            | Mixin/Alias Advantage | Why Class/Template is OK              |
| ------------------ | --------------------- | ------------------------------------- |
| Capability mixing  | Less duplication      | Duplication is explicit and auditable |
| Partial overrides  | Spread syntax         | Session-level overrides handle this   |
| Ad-hoc composition | More flexible         | Explicit agents are more maintainable |
| Learning curve     | More expressive       | Simpler mental model                  |

**Your decision is sound.** Class/template with session overrides covers 90% of use cases. The remaining 10% (complex capability mixing) can be addressed later if real-world usage demands it.

---

## Decision Needed

1. **Instantiation style**: C1+C3 (type annotation + implicit) or C4 (property reference)?

<CEO timestamp="2025-12-30 08:40:00">I like your recommendation. C1+C3 (Type Annotation + Implicit Sugar) is the way to go.</CEO>

Once you decide, I'll update the specification.
