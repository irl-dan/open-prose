#!/bin/bash
cd /Users/sl/code/open-prose/plugin

passed=0
failed=0

for i in $(seq 101 130); do
  f="../test-harness/permutation-tests/$(printf '%03d' $i)-*.prose"
  file=$(ls $f 2>/dev/null | head -1)
  if [ -z "$file" ]; then
    continue
  fi
  result=$(bun run validate "$file" 2>&1)
  filename=$(basename "$file")
  if echo "$result" | grep -q "Valid program"; then
    passed=$((passed + 1))
    echo "PASS: $filename"
  else
    failed=$((failed + 1))
    echo "FAIL: $filename"
    echo "$result" | grep -E "(error|Error)" | head -3
    echo ""
  fi
done

echo "========================"
echo "SUMMARY (files 101-130)"
echo "========================"
echo "Passed: $passed"
echo "Failed: $failed"
