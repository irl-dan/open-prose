# OpenProse: Skills Deep Dive

Based on CEO answers from QUESTIONS.md (Q5-Q7) and research into OpenCode's skill system.

---

## CEO Direction Summary

From QUESTIONS.md:

- Skills are **referenced by string names**
- **Imported** using some syntax at the top of the file (like ES modules)
- **Assigned to specific sessions**
- Can be **composed into an "Agent"** (a bundle of skills, model, permissions)
- An **Agent** is a reusable template that can be instantiated as Sessions
- Should support GitHub repo imports like:
  ```
  import "dev-browser" from "https://github.com/SawyerHood/dev-browser";
  ```

---

## Research Summary: What OpenCode Provides

**Current Skill Format (SKILL.md):**

```markdown
---
name: skill-name
description: Brief description (1-1024 chars)
license: MIT
---

## What I do

- First capability
- Second capability

## When to use me

Use this when doing X task.
```

**Discovery Locations (searched in order):**

1. `.opencode/skill/<name>/SKILL.md` (project-local)
2. `~/.config/opencode/skill/<name>/SKILL.md` (global)

**How Skills Work Today:**

1. Skills are discovered at startup via filesystem scan
2. Agent sees available skills in the `skill` tool description
3. Agent calls `skill({ name: "git-release" })` to load content
4. Full SKILL.md content is injected into agent context

**Key Limitation:** OpenCode has **no native import mechanism** for external skills. Skills must be present on the filesystem.

---

## A. Import Syntax Design

You want something like ES module imports. Here are options:

### A1. **Import Syntax Style**

```
# Option A: URL-based (like your example)
import "dev-browser" from "https://github.com/SawyerHood/dev-browser";

# Option B: Package-style
import "dev-browser" from "github:SawyerHood/dev-browser";

# Option C: With version
import "dev-browser" from "github:SawyerHood/dev-browser@v1.0.0";

# Option D: Local path support
import "my-skill" from "./skills/my-skill";
import "shared-skill" from "~/.opencode/skill/shared-skill";
```

**Recommendation:** Option B or C with package-style syntax is cleaner and allows versioning.

<CEO timestamp="2025-12-30 09:07:00">I like the recommendation. Let's go with Option B for now and we can always add versioning later if need be.</CEO>

### A2. **Resolution at What Stage?**

When does the import resolve?

- **Option A: Parse time** - Imports are resolved when DSL is parsed (before orchestrator runs)
- **Option B: Compile time** - A separate "install" step clones repos before execution
- **Option C: Runtime** - Orchestrator fetches skills on first use

**Trade-offs:**

- Parse/compile time: Predictable, can validate skills exist before running
- Runtime: More dynamic, but harder to debug missing skills

**Recommendation:** Compile time with an explicit install step (like `npm install`).

<CEO timestamp="2025-12-30 09:08:00">I like the recommendation. Let's go with Compile time for now and we can always add versioning later if need be.</CEO>

### A3. **Installation Mechanism**

How are external skills installed?

- **Option A: Clone to project** - `open-prose install` clones to `.opencode/skill/<name>/`
- **Option B: Clone to global** - Install to `~/.config/opencode/skill/<name>/`
- **Option C: Symlink** - Clone to a cache, symlink into project
- **Option D: Inline embedding** - Extract SKILL.md content into a manifest file

**Recommendation:** Option A (clone to project) for reproducibility. Add to `.gitignore` or commit as needed.

<CEO timestamp="2025-12-30 09:09:00">I like the recommendation. Let's go with Option A.</CEO>

### A4. **Lock File**

Should there be a lock file for skill versions?

- **Option A: Yes** - `open-prose.lock` tracks exact commits
- **Option B: No** - Always fetch latest (or specified version)

**Recommendation:** Yes, for reproducibility. Similar to package-lock.json.

<CEO timestamp="2025-12-30 09:10:00">No, a lock file is is overkill for now, we'll add this later.</CEO>

---

## B. Skill Assignment to Sessions

### B1. **Assignment Syntax**

How are skills attached to sessions?

```
# Option A: Property list
session researcher:
  skills: ["web-search", "summarizer"]

# Option B: Inline references
session researcher(skills: [web-search, summarizer]):
  prompt: "Research this topic"

# Option C: Declarative block
session researcher:
  use web-search
  use summarizer
  prompt: "Research this topic"
```

<CEO timestamp="2025-12-30 09:11:00">I like Option A the best of the three here, though blend this preference with others expressed elsewhere about syntax.</CEO>

### B2. **Skill Parameters**

Can skills accept parameters?

```
# Option A: No parameters (skills are static)
session researcher:
  skills: ["web-search"]

# Option B: Configuration via context
session researcher:
  skills:
    - name: "web-search"
      config: { depth: 3 }

# Option C: Skills define their own parameters
# (Parameters come from skill's frontmatter schema)
```

**Question:** Should skills be parameterizable, or should context be passed via the session prompt?

<CEO timestamp="2025-12-30 09:12:00">No, skills do not need parameters.</CEO>

---

## C. Agent Bundles

<CEO timestamp="2025-12-30 09:13:00">Let's break this out into its own file, this is distinct from Skills.</CEO>

You want "Agent" to be a reusable bundle of skills, model, permissions.

### C1. **Agent Definition Syntax**

```
# Option A: Declarative block
agent researcher:
  model: opus
  skills: [web-search, summarizer, citation]
  permissions:
    bash: deny
    webfetch: allow

# Option B: Function-like
agent researcher(model: opus, skills: [web-search, summarizer]):
  permissions:
    bash: deny

# Option C: Inheritance-based
agent researcher extends base-agent:
  skills: [web-search]  # adds to parent's skills
```

### C2. **Agent Instantiation**

How does an Agent become a Session?

```
# Option A: Explicit instantiation
session my-research = researcher():
  prompt: "Research AI trends"

# Option B: Type annotation
session my-research: researcher
  prompt: "Research AI trends"

# Option C: Implicit (session name matches agent)
researcher:
  prompt: "Research AI trends"
```

### C3. **Agent vs Session Relationship**

Is an Agent:

- **Option A**: A class/template that Sessions instantiate
- **Option B**: A configuration mixin that Sessions can include
- **Option C**: An alias for a pre-configured session type

**My recommendation:** Option A (class/template). Agents define the "shape" of a session, Sessions are runtime instances with specific prompts.

---

## D. Skill Composition Questions

### D1. **Skill Conflicts**

If two skills define conflicting behaviors, what happens?

- **Option A**: Last skill wins (order matters)
- **Option B**: Error at parse time
- **Option C**: Skills are merged (content concatenated)

### D2. **Skill Dependencies**

Can skills depend on other skills?

- **Option A**: No (skills are independent)
- **Option B**: Yes, skills can `require` other skills
- **Option C**: Agent bundles handle composition

**Recommendation:** Start with Option A (no dependencies). Add complexity later if needed.

### D3. **Built-in Skills**

Should OpenProse provide any built-in skills?

- `loom-control` - The return/error signaling skill
- `loom-context` - Context management helpers
- `loom-logging` - Telemetry/debugging skill

---

## E. Relationship to OpenCode Skills

### E1. **Compatibility**

Should OpenProse skills be compatible with OpenCode's native skill format?

- **Option A**: Full compatibility (SKILL.md format, same discovery)
- **Option B**: Superset (OpenProse adds features, but base format works)
- **Option C**: Separate format

**Recommendation:** Option B. Use SKILL.md format but add OpenProse-specific frontmatter fields.

<CEO timestamp="2025-12-30 09:14:00">No, these are 100% OpenCode skills, we shouldn't be adding anything. The syntax for installing them is all we're concerned about.</CEO>

### E2. **Discovery Interaction**

When OpenProse runs, should it:

- **Option A**: Install skills to `.opencode/skill/` so OpenCode discovers them naturally
- **Option B**: Inject skills via system prompt transformation
- **Option C**: Use a separate skill directory

**Recommendation:** Option A. This makes skills available to both OpenProse and native OpenCode.

<CEO timestamp="2025-12-30 09:15:00">Yes, Option A is good. We should just be conforming to what already happens in opencode skills.</CEO>

---

## F. Implementation Questions

### F1. **Skill Validation**

Should OpenProse validate skills at parse time?

- Name format matches regex
- Required frontmatter fields present
- Skill file exists (for local paths)

<CEO timestamp="2025-12-30 09:16:00">Yes, these are simple validations and would be good to have at installation time.</CEO>

### F2. **Skill Caching**

For GitHub imports:

- Cache location?
- Cache invalidation strategy?
- Offline support?

<CEO timestamp="2025-12-30 09:17:00">Hmmm... no, don't worry about any of this for now.</CEO>

### F3. **Skill Versioning**

For GitHub imports, support:

- Branches (`@main`, `@develop`)
- Tags (`@v1.0.0`)
- Commits (`@abc123`)

<CEO timestamp="2025-12-30 09:18:00">This is good for now unless any of this is hard to implement. If these are easy out of the box then this is good, otherwise don't go chasing something that isn't.</CEO>

---

## Open Questions

1. **Import semantics**: Should imports be hoisted (all at top) or inline?

<CEO timestamp="2025-12-30 09:19:00">All at the top.</CEO>

2. **Skill namespacing**: If two imports have the same name, how to disambiguate?

   ```
   import "formatter" from "github:user1/formatter";
   import "formatter" from "github:user2/formatter";
   // Conflict!
   ```

<CEO timestamp="2025-12-30 09:20:00">Throw an error and we'll figure out how to alias effectively later.</CEO>

3. **Skill update workflow**: How do users update to newer versions of imported skills?

<CEO timestamp="2025-12-30 09:21:00">Don't worry about this for now.</CEO>

4. **Private skills**: Support for private GitHub repos (auth tokens)?

<CEO timestamp="2025-12-30 09:22:00">Not for now.</CEO>

5. **Skill marketplace**: Is there a future registry/marketplace vision?

<CEO timestamp="2025-12-30 09:23:00">No.</CEO>

---

## Proposed Minimal Syntax

Based on the above, here's a proposed minimal syntax for skills:

```
# Imports at top
import "dev-browser" from "github:SawyerHood/dev-browser@v1.0";
import "web-search" from "./skills/web-search";

# Agent as reusable bundle
agent researcher:
  model: sonnet
  skills: [web-search, dev-browser]
  permissions:
    bash: deny

# Session uses agent
session research-task: researcher
  prompt: "Research the latest AI developments"

# Or inline skills without agent
session quick-search:
  skills: [web-search]
  prompt: "Find information about X"
```

<CEO timestamp="2025-12-30 09:24:00">This is great.</CEO>

---

## Next Steps

Please review and answer the open questions. Key decisions:

1. **Import syntax** (A1) - Which style?
2. **Installation mechanism** (A3) - Clone to project vs global?
3. **Agent as class** (C3) - Is the class/template model correct?
4. **OpenCode compatibility** (E1, E2) - How tightly integrated?
