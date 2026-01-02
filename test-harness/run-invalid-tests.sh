#!/bin/bash
# Tests that all programs in invalid-programs/ correctly fail validation
# A test PASSES if validation produces an error
# A test FAILS if validation succeeds (the program should be invalid)

cd /Users/sl/code/open-prose/plugin

echo "=== INVALID PROGRAM TESTS ==="
echo "These programs should ALL fail validation"
echo ""

passed=0
failed=0
total=0

for f in ../test-harness/invalid-programs/*.prose; do
  total=$((total + 1))
  result=$(bun run validate "$f" 2>&1)
  filename=$(basename "$f")

  if echo "$result" | grep -q "Valid program"; then
    # Program validated successfully - this is a FAILURE for invalid tests
    failed=$((failed + 1))
    echo "UNEXPECTED PASS: $filename"
    echo "  This program should have failed validation but passed!"
    echo ""
  elif echo "$result" | grep -q "^Warnings:"; then
    # Program validated with warnings - also a FAILURE for invalid tests
    failed=$((failed + 1))
    echo "UNEXPECTED PASS (with warnings): $filename"
    echo "  This program should have failed validation but passed with warnings!"
    echo ""
  else
    # Program failed validation - this is a PASS for invalid tests
    passed=$((passed + 1))
    error=$(echo "$result" | grep -E "^Error:" | head -1)
    echo "OK: $filename"
    echo "    $error"
  fi
done

echo ""
echo "========================"
echo "SUMMARY"
echo "========================"
echo "Correctly rejected: $passed"
echo "Incorrectly accepted: $failed"
echo "Total: $total"
echo ""

if [ $failed -gt 0 ]; then
  echo "WARNING: Some invalid programs were not rejected!"
  exit 1
else
  echo "All invalid programs correctly rejected."
  exit 0
fi
