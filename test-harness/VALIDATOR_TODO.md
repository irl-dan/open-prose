# OpenProse Validator: Open Tasks

**Current Status**: 239/239 valid tests passing, 131/157 invalid tests correctly rejected

## Remaining Work: 26 Invalid Programs Not Yet Rejected

### High Priority (Core Semantics)

| Test | Issue |
|------|-------|
| 124-break-outside-loop | `break` used outside loop context |
| 125-continue-outside-loop | `continue` used outside loop context |
| 126-break-in-parallel | `break`/`continue` in parallel for (should be rejected) |
| 093-circular-block-call | Block calls itself directly |
| 119-mutual-circular-blocks | A calls B, B calls A |
| 105-retry-string-value | `retry: "3"` should require integer |
| 106-retry-float-value | `retry: 1.5` should require integer |
| 050-throw-in-toplevel | `throw` outside try block |

### Medium Priority (Better Errors)

| Test | Issue |
|------|-------|
| 004-missing-colon-session | Missing colon after `session` |
| 115-expression-in-interpolation | `{a + b}` in string (operators not allowed) |
| 116-method-call-in-interpolation | `{foo.bar()}` in string (method calls not allowed) |
| 117-forward-reference-block | `do foo` before `block foo:` defined |
| 033-parallel-any-no-count | `any` without count |
| 060-parallel-any-count-too-high | `any 10` with only 3 items |

### Low Priority (Edge Cases)

| Test | Issue |
|------|-------|
| 062-identifier-special-char | `my-var` should be rejected |
| 068-identifier-only-underscore | `_` alone as identifier |
| 095-nested-interpolation | `{foo{bar}}` nested braces |
| 111-indent-mixed-tabs-spaces | Mixed tabs/spaces in indentation |
| 113-unbalanced-interpolation-close | `}` without matching `{` |
| 122-parallel-result-outside-block | Accessing parallel internals outside |
| 139-context-on-agent | `context:` property on agent block |
| 141-extremely-long-identifier | 1000+ char identifier |
| 142-deeply-nested-30-levels | 30 levels of nesting |
| 143-block-too-many-params | Block with 20 parameters |
| 145-arrow-without-space | `->` without surrounding whitespace |
| 129-deeply-nested-empty | Empty nested blocks |

## Implementation Notes

See `test-harness/VALIDATOR_LEARNINGS.md` for detailed design decisions and scoping semantics.

Key files:
- `plugin/src/validator/validator.ts` - Main validator
- `plugin/src/parser/parser.ts` - Parser
- `test-harness/run-invalid-tests.sh` - Run invalid test suite
