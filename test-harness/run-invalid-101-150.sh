#!/bin/bash
cd /Users/sl/code/open-prose/plugin

correctly_rejected=0
incorrectly_accepted=0
incorrectly_accepted_files=""

for f in ../test-harness/invalid-programs/1[0-5]*.prose; do
  if [ ! -f "$f" ]; then continue; fi
  result=$(bun run validate "$f" 2>&1)
  if echo "$result" | grep -q "Valid program"; then
    incorrectly_accepted=$((incorrectly_accepted + 1))
    filename=$(basename "$f")
    incorrectly_accepted_files="$incorrectly_accepted_files$filename\n"
    echo "SHOULD FAIL: $filename"
  else
    correctly_rejected=$((correctly_rejected + 1))
  fi
done

echo ""
echo "========================"
echo "Invalid Tests 101-150:"
echo "Correctly rejected: $correctly_rejected"
echo "Incorrectly accepted: $incorrectly_accepted"
