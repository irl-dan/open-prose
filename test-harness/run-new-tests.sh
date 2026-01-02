#!/bin/bash
cd /Users/sl/code/open-prose/plugin

echo "=== Testing New Valid Tests (201-250) ==="
passed=0
failed=0

for f in ../test-harness/permutation-tests/2*.prose; do
  result=$(bun run validate "$f" 2>&1)
  if echo "$result" | grep -q "Valid program"; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
    filename=$(basename "$f")
    echo "FAIL: $filename"
    echo "$result" | grep -E "(error|Error)" | head -2
    echo ""
  fi
done

echo "========================"
echo "Valid Tests - PASSED: $passed, FAILED: $failed"
echo ""

echo "=== Testing Invalid Programs (051-100) ==="
correctly_rejected=0
incorrectly_accepted=0

for f in ../test-harness/invalid-programs/0[5-9]*.prose ../test-harness/invalid-programs/100*.prose; do
  if [ ! -f "$f" ]; then continue; fi
  result=$(bun run validate "$f" 2>&1)
  if echo "$result" | grep -q "Valid program"; then
    incorrectly_accepted=$((incorrectly_accepted + 1))
    filename=$(basename "$f")
    echo "SHOULD FAIL: $filename"
  else
    correctly_rejected=$((correctly_rejected + 1))
  fi
done

echo "========================"
echo "Invalid Tests - Correctly rejected: $correctly_rejected, Incorrectly accepted: $incorrectly_accepted"
