<CEO timestamp="2025-01-01 05:27:00">
I'd like you to follow the below guide to understand how to package and distribute skills for Claude Code.

Using the below knowledge, combined with the understanding of how OpenProse works, I want you to create the necessary artifacts such that we could host this skill/plugin the current github repository where it already is pushed: git@github.com:irl-dan/open-prose.git
</CEO>

Let me research this. I'll start by examining the skill-creator documentation I have access to, then search for current information on Claude Code's plugin distribution model.Now let me search for information about Claude Code's plugin/skill distribution model:Now I have a complete picture. Let me synthesize this into a practical guide.

---

## Packaging and Distributing Skills for Claude Code

The distribution model for Claude Code is genuinely **decentralized** — anyone can host a marketplace on GitHub (or any git host), and users add marketplaces by URL. There's no central approval or gatekeeping.

### Part 1: The Skill Format (agentskills.io Standard)

Skills follow the open **Agent Skills** specification at [agentskills.io](https://agentskills.io/specification). This format is now adopted by OpenAI Codex, GitHub Copilot, Cursor, Amp, Letta, goose, and VS Code — so what you build is portable.

**Minimum viable skill:**

```
my-skill/
└── SKILL.md
```

**Full structure:**

```
my-skill/
├── SKILL.md              # Required: frontmatter + instructions
├── scripts/              # Optional: executable code (Python/Bash/JS)
├── references/           # Optional: docs Claude loads on-demand
└── assets/               # Optional: templates, images, fonts used in output
```

**SKILL.md format:**

```markdown
---
name: my-skill
description: Use when [specific triggers]. Does [what it does].
---

# My Skill

Instructions Claude follows when this skill activates...
```

The `description` field is critical — it's what triggers skill activation. Be specific about _when_ to use it.

### Part 2: Packaging as a Plugin

Skills get distributed inside **plugins**. A plugin can contain skills, slash commands, agents, hooks, and MCP servers.

**Plugin structure:**

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json       # Plugin manifest
├── skills/
│   └── my-skill/
│       └── SKILL.md
├── commands/             # Optional: slash commands
├── agents/               # Optional: subagents
└── hooks/                # Optional: event handlers
```

**plugin.json:**

```json
{
  "name": "my-plugin",
  "description": "What this plugin provides",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

### Part 3: The Decentralized Marketplace Model

This is the key part you asked about. **Any GitHub repo can be a marketplace** — you just need a `.claude-plugin/marketplace.json` file.

**Marketplace structure:**

```
my-marketplace/
├── .claude-plugin/
│   └── marketplace.json
├── my-plugin/            # Inline plugin
│   └── ...
└── README.md
```

**marketplace.json:**

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./my-plugin",
      "description": "What it does"
    },
    {
      "name": "external-plugin",
      "source": {
        "source": "github",
        "repo": "someone/their-plugin"
      }
    }
  ]
}
```

**Source types supported:**

- `./local-path` — relative path in same repo
- `{"source": "github", "repo": "owner/repo"}` — GitHub repo
- `{"source": "url", "url": "https://..."}` — Any git URL

### Part 4: Distribution & Installation

Users add your marketplace and install plugins:

```bash
# Add the marketplace
/plugin marketplace add your-username/your-marketplace

# Browse and install
/plugin

# Or direct install
/plugin install my-plugin@your-marketplace
```

**For team distribution**, add to `.claude/settings.json` in shared repos:

```json
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "my-plugin@team-tools": true
  }
}
```

### Part 5: Discovery Channels

The ecosystem has several discovery surfaces:

1. **[claude-plugins.dev](https://claude-plugins.dev/)** — Community CLI registry with `npx claude-plugins install` support
2. **[skillsmp.com](https://skillsmp.com/)** — 25,000+ skills indexed from GitHub
3. **[claudecodemarketplace.com](https://claudecodemarketplace.com/)** — Another aggregator
4. **[github.com/anthropics/skills](https://github.com/anthropics/skills)** — Official Anthropic examples
5. **Direct GitHub links** — Users can add any repo as a marketplace

### Quick Start Workflow

```bash
# 1. Create marketplace structure
mkdir -p my-marketplace/.claude-plugin
mkdir -p my-marketplace/my-skill-plugin/skills/my-skill

# 2. Create marketplace.json
cat > my-marketplace/.claude-plugin/marketplace.json << 'EOF'
{
  "name": "my-marketplace",
  "owner": {"name": "Your Name"},
  "plugins": [{
    "name": "my-skill-plugin",
    "source": "./my-skill-plugin",
    "description": "My awesome skill"
  }]
}
EOF

# 3. Create plugin.json
mkdir -p my-marketplace/my-skill-plugin/.claude-plugin
cat > my-marketplace/my-skill-plugin/.claude-plugin/plugin.json << 'EOF'
{"name": "my-skill-plugin", "version": "1.0.0"}
EOF

# 4. Create SKILL.md
cat > my-marketplace/my-skill-plugin/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: Use when doing X. Helps with Y.
---
# Instructions here
EOF

# 5. Push to GitHub, then users install with:
# /plugin marketplace add your-username/my-marketplace
# /plugin install my-skill-plugin@my-marketplace
```

The model is genuinely federated — no approval process, no central store. You push to GitHub, users add your marketplace URL, done.
