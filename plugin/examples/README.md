# OpenProse Examples

These examples demonstrate common workflows using OpenProse's currently implemented syntax.

## Available Examples

| File | Description |
|------|-------------|
| `01-hello-world.prose` | Simplest possible program - a single session |
| `02-research-and-summarize.prose` | Research a topic, then summarize findings |
| `03-code-review.prose` | Multi-perspective code review pipeline |
| `04-write-and-refine.prose` | Draft content and iteratively improve it |
| `05-debug-issue.prose` | Step-by-step debugging workflow |
| `06-explain-codebase.prose` | Progressive exploration of a codebase |
| `07-refactor.prose` | Systematic refactoring workflow |
| `08-blog-post.prose` | End-to-end content creation |

## Running Examples

Ask Claude to run any example:

```
Run the code review example from the OpenProse examples
```

Or reference the file directly:

```
Execute examples/03-code-review.prose
```

## Current Syntax

These examples use only the currently implemented features:

- **Comments**: `# This is a comment`
- **Sessions**: `session "Your prompt here"`

Each `session` statement spawns a subagent that completes the task before the next session starts.

## Future Syntax

See the `roadmap/` directory for examples of planned features like:
- Agent definitions
- Parallel execution
- Variables and context passing
- Loops and conditionals

These features are designed but not yet implemented.
