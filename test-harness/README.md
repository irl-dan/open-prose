# OpenProse Test Harness

LLM-as-judge E2E testing for OpenProse programs.

## Usage

```bash
cd test-harness
npm install

# List available tests
npx ts-node index.ts --list

# Run a specific test
npx ts-node index.ts tier-00-comments

# Run all tests
npx ts-node index.ts --all

# Run with verbose output
npx ts-node index.ts --all --verbose

# Skip judge evaluation (just run the program)
npx ts-node index.ts tier-00-comments --skip-judge
```

## How It Works

1. **Runner** (`runner.ts`): Executes `.prose` programs via `claude -p`
2. **Log Collector** (`log-collector.ts`): Collects execution logs from `~/.claude/`
3. **Judge** (`judge.ts`): Invokes Claude as an LLM judge to evaluate execution
4. **Rubric** (`rubric.md`): Evaluation criteria for the judge

## Test Programs

Add `.prose` files to `test-programs/`. Each file should exercise specific language features:

```
test-programs/
├── tier-00-comments.prose      # Comment handling
├── tier-00-strings.prose       # String literals
├── tier-01-simple-session.prose # Single session
└── tier-01-sequence.prose      # Multiple sessions in sequence
```

## Passing Criteria

From `rubric.md`:
- Average score ≥ 4.0/5.0
- No individual criterion below 3/5

## Architecture Note: Why execSync Instead of spawn

**Important**: Both `runner.ts` and `judge.ts` use `execSync` with temp files instead of `spawn`. This is intentional.

### The Problem

Node.js `spawn()` does not properly capture stdout/stderr from the Claude CLI:

```typescript
// This does NOT work - stdout events never fire
const child = spawn('claude', ['-p', 'Say hello']);
child.stdout.on('data', d => console.log(d)); // Never called!
child.on('close', code => ...); // Process hangs until timeout
```

The process runs but no output is received, causing tests to time out.

### The Solution

Use `execSync` with the prompt written to a temp file:

```typescript
// This WORKS
const tempFile = '/tmp/prompt.txt';
fs.writeFileSync(tempFile, prompt);
const output = execSync(`cat "${tempFile}" | claude -p`, { encoding: 'utf-8' });
```

### Why This Happens

The Claude CLI likely uses some form of output buffering or TTY detection that doesn't play well with Node's spawn pipes. The exact cause is unclear, but `execSync` reliably works while `spawn` does not.

### If You're Tempted to Refactor

Do not change this to use `spawn()` without verifying it works. Test with:

```bash
node -e "
const { spawn } = require('child_process');
const child = spawn('claude', ['-p', 'Say hello']);
child.stdout.on('data', d => console.log('GOT:', d.toString()));
child.on('close', code => console.log('EXIT:', code));
setTimeout(() => child.kill(), 10000);
"
```

If you see output, great - spawn works on your system. If it hangs with no output, stick with execSync.

## Reports

Test reports are saved to `reports/` as JSON files with timestamps.
