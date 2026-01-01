# OpenProse Specification: Skills

> Derived from CEO interview on 2024-12-30

---

## Overview

Skills in OpenProse are **standard OpenCode skills** with a custom import mechanism. OpenProse adds no modifications to the skill format itself—only syntax for importing and installing external skills.

---

## Skill Format

Skills use the standard OpenCode SKILL.md format:

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

**Naming requirements:**
- 1-64 characters
- Lowercase alphanumeric with single hyphens
- Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`

---

## Import Syntax

Skills are imported at the top of an OpenProse program using package-style syntax:

```
import "skill-name" from "github:owner/repo"
import "local-skill" from "./path/to/skill"
```

**Note:** Skill names use quoted strings to distinguish them from keywords.

### Supported Sources

| Source | Syntax | Example |
|--------|--------|---------|
| GitHub | `github:owner/repo` | `github:SawyerHood/dev-browser` |
| Local path | `./path` or `~/path` | `./skills/my-skill` |

### Versioning (Optional)

If easy to implement, support version specifiers:

```
import "skill" from "github:owner/repo@v1.0.0"   # tag
import "skill" from "github:owner/repo@main"     # branch
import "skill" from "github:owner/repo@abc123"   # commit
```

This is optional for MVP—implement only if straightforward.

---

## Import Rules

1. **Hoisted**: All imports must appear at the top of the file
2. **No duplicates**: Two imports with the same skill name throw an error
3. **No aliasing** (for now): Cannot rename skills on import

---

## Installation

Skills are installed via a compile-time step before execution:

```bash
open-prose install my-program.prose
```

### Installation Behavior

1. Parse the program file
2. Extract all import statements
3. For each GitHub import:
   - Clone the repository
   - Install to `.opencode/skill/<name>/`
4. For each local import:
   - Verify the skill exists at the path
5. Validate all installed skills:
   - Name format matches regex
   - Required frontmatter fields present (`name`, `description`)
   - SKILL.md file exists

### Installation Location

Skills are installed to the **project directory**: `.opencode/skill/<name>/`

This ensures:
- OpenCode discovers them naturally
- Reproducibility (skills are local to project)
- Option to commit or `.gitignore` as needed

---

## Skill Assignment

Skills are assigned to sessions via a quoted string list:

```
session researcher:
  skills: ["web-search", "summarizer"]
  prompt: "Research this topic"
```

### Rules

- Skills are **referenced by quoted name** (the string used in the import)
- Skills are **not parameterizable**—context comes from the session prompt
- Multiple skills can be assigned to one session
- Skills can be assigned directly to sessions or via Agent bundles (see Agents spec)

---

## Discovery & Runtime

At runtime, skills work exactly as they do in OpenCode:

1. OpenCode scans `.opencode/skill/*/SKILL.md` at startup
2. Agent sees available skills in the `skill` tool description
3. Agent calls `skill({ name: "skill-name" })` to load content
4. Full SKILL.md content is injected into agent context

OpenProse adds no runtime modifications to this process.

---

## Validation

At installation time, validate:

| Check | Error |
|-------|-------|
| Name matches regex | `Invalid skill name: {name}` |
| `name` frontmatter present | `Missing required field: name` |
| `description` frontmatter present | `Missing required field: description` |
| SKILL.md exists | `Skill not found: {path}` |
| No duplicate names | `Duplicate skill name: {name}` |

---

## Not Supported (Deferred)

The following are explicitly out of scope for now:

- **Lock file**: No `open-prose.lock` for pinning versions
- **Skill caching**: No global cache, always clone fresh
- **Private repos**: No authentication for private GitHub repos
- **Skill marketplace**: No registry or discovery service
- **Skill parameters**: Skills cannot accept configuration
- **Skill dependencies**: Skills cannot require other skills
- **Custom format**: No OpenProse-specific frontmatter fields

---

## Example

```
# Imports at top of file
import "web-search" from "github:example/web-search"
import "summarizer" from "./skills/summarizer"

# Use in session
session researcher:
  skills: ["web-search", "summarizer"]
  prompt: "Research quantum computing trends"
```

After running `open-prose install`:

```
.opencode/
└── skill/
    ├── web-search/
    │   └── SKILL.md
    └── summarizer/
        └── SKILL.md
```
