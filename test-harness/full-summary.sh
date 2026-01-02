#!/bin/bash
cd /Users/sl/code/open-prose/plugin

echo "=== FULL SUMMARY OF ALL 160 PERMUTATION TESTS ==="
echo ""

passed=0
warned=0
failed=0

for f in ../test-harness/permutation-tests/*.prose; do
  result=$(bun run validate "$f" 2>&1)
  if echo "$result" | grep -q "Valid program"; then
    passed=$((passed + 1))
  elif echo "$result" | grep -q "^Warnings:"; then
    warned=$((warned + 1))
  else
    failed=$((failed + 1))
  fi
done

echo "Valid (no warnings): $passed"
echo "Valid (with warnings): $warned"
echo "Invalid (errors): $failed"
echo ""
echo "Total: $((passed + warned + failed))"
echo ""
echo "=== ERROR BREAKDOWN ==="
echo ""

for f in ../test-harness/permutation-tests/*.prose; do
  result=$(bun run validate "$f" 2>&1)
  if ! echo "$result" | grep -q "Valid program" && ! echo "$result" | grep -q "^Warnings:"; then
    filename=$(basename "$f")
    error=$(echo "$result" | grep -E "^Error:" | head -1)
    echo "$filename: $error"
  fi
done
