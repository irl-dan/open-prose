---
name: run-prose
description: Execute an OpenProse program file
args: <file.prose>
---

# Run OpenProse Program

Execute the specified OpenProse program file.

## Usage

```
/run-prose path/to/program.prose
```

## What This Command Does

1. **Read** the specified `.prose` file
2. **Validate** the program syntax
3. **Execute** each statement sequentially, spawning subagent sessions as needed

## Execution Steps

When you receive this command:

1. Read the file at the provided path
2. Load the `open-prose` skill for language reference
3. Parse the program to identify statements
4. For each statement:
   - Skip comments (lines starting with `#`)
   - For `session "prompt"` statements, spawn a subagent using the Task tool
   - Wait for completion before proceeding

## Example

Given `/run-prose examples/research.prose` where the file contains:

```prose
# Research task
session "Research AI developments in 2024"
session "Summarize the top 3 breakthroughs"
```

Execute by:
1. Reading the file
2. Skipping the comment line
3. Spawning a session with "Research AI developments in 2024"
4. Waiting for completion
5. Spawning a session with "Summarize the top 3 breakthroughs"
6. Waiting for completion

## Error Handling

- If the file doesn't exist, report the error
- If the syntax is invalid, report validation errors with line numbers
- If a session fails, report which session failed and why

## Reference

For complete language documentation, see the `prose.md` file in the `open-prose` skill directory.
