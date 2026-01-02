#!/bin/bash
cd /Users/sl/code/open-prose/plugin

passed=0
failed=0
failed_files=""

for f in ../test-harness/permutation-tests/*.prose; do
  result=$(bun run validate "$f" 2>&1)
  if echo "$result" | grep -q "Valid program"; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
    filename=$(basename "$f")
    failed_files="$failed_files$filename\n"
    echo "FAIL: $filename"
    echo "$result" | grep -E "(error|Error)" | head -3
    echo ""
  fi
done

echo "========================"
echo "SUMMARY"
echo "========================"
echo "Passed: $passed"
echo "Failed: $failed"
