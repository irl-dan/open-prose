#!/bin/bash
cd /Users/sl/code/open-prose/plugin

echo "=== FINAL SUMMARY: ALL 200 PERMUTATION TESTS ==="
echo ""

valid=0
warned=0
errors=0

for f in ../test-harness/permutation-tests/*.prose; do
  result=$(bun run validate "$f" 2>&1)
  if echo "$result" | grep -q "Valid program"; then
    valid=$((valid + 1))
  elif echo "$result" | grep -q "^Warnings:"; then
    warned=$((warned + 1))
  else
    errors=$((errors + 1))
  fi
done

echo "Valid (clean): $valid"
echo "Valid (warnings): $warned"
echo "Errors: $errors"
echo "Total: $((valid + warned + errors))"
echo ""
echo "=== ALL UNIQUE ERRORS ==="
echo ""

for f in ../test-harness/permutation-tests/*.prose; do
  result=$(bun run validate "$f" 2>&1)
  if ! echo "$result" | grep -q "Valid program" && ! echo "$result" | grep -q "^Warnings:"; then
    echo "$result" | grep -E "^Error:" | head -1
  fi
done | sort | uniq -c | sort -rn
