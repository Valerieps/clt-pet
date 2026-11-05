#!/bin/bash
n=$1
sleep 5
timeout 300 gh pr checks $n --watch 2>&1 | tail -1
gh pr merge $n --squash --delete-branch 2>&1 | tail -1
gh pr view $n --json state -q .state
