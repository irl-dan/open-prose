/**
 * Fetches the OpenProse spec from GitHub with TTL caching.
 * Single source of truth: https://github.com/openprose/prose
 */

const PROSE_SPEC_URL =
  'https://raw.githubusercontent.com/openprose/prose/main/skills/open-prose/prose.md';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface Cache {
  content: string;
  fetchedAt: number;
}

let cache: Cache | null = null;

/**
 * System prompt prefix that wraps the prose.md spec
 */
const SYSTEM_PROMPT_PREFIX = `You are an expert OpenProse programmer. Your task is to help users write .prose files - programs that orchestrate AI agent sessions.

When the user describes what they want to build, generate a complete, valid .prose file that accomplishes their goal. Focus on:
1. Correct syntax according to the OpenProse spec
2. Appropriate use of agents, sessions, parallel blocks, loops, and context passing
3. Clear, descriptive prompts for each session
4. Using **discretion markers** where AI judgment is needed

Here is the complete OpenProse language specification:

---

`;

const SYSTEM_PROMPT_SUFFIX = `

---

When generating .prose files:
1. Always include helpful comments explaining the workflow
2. Use appropriate indentation (2 spaces)
3. Choose the right model for each task (opus for complex reasoning, sonnet for general tasks, haiku for simple operations)
4. Use parallel blocks when tasks are independent
5. Use loops with discretion conditions when iteration is needed
6. Always specify max iterations for unbounded loops

Respond with ONLY the .prose file content, no explanations before or after. The user will see the code directly in their editor.`;

/**
 * Get the OpenProse system prompt, fetching from GitHub if cache is stale.
 * Throws if fetch fails - caller should handle appropriately.
 */
export async function getProseSystemPrompt(): Promise<string> {
  const now = Date.now();

  // Return cached version if still valid
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.content;
  }

  // Fetch fresh from GitHub
  console.log('Fetching prose.md from GitHub...');
  const response = await fetch(PROSE_SPEC_URL, {
    headers: {
      'Accept': 'text/plain',
      'User-Agent': 'OpenProse-API/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch prose.md: ${response.status} ${response.statusText}`);
  }

  const specContent = await response.text();
  const fullPrompt = SYSTEM_PROMPT_PREFIX + specContent + SYSTEM_PROMPT_SUFFIX;

  // Update cache
  cache = {
    content: fullPrompt,
    fetchedAt: now,
  };

  console.log(`prose.md cached (${specContent.length} bytes, TTL: ${CACHE_TTL_MS / 1000}s)`);
  return fullPrompt;
}

/**
 * Pre-warm the cache on startup (optional, non-blocking)
 */
export async function warmCache(): Promise<void> {
  try {
    await getProseSystemPrompt();
  } catch (error) {
    console.warn('Failed to pre-warm prose.md cache:', error);
  }
}
