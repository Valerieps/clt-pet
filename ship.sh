#!/bin/bash
# usage: ship.sh branch "title" "body"
b=$1
git fetch -q origin
git checkout -q $b || exit 1
git rebase origin/main 2>&1 | tail -1
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then echo CONFLICT; git status --short | grep '^UU\|^AA'; exit 2; fi
npm run build 2>&1 | grep -i " error\|Tests " 
git push -q -f -u origin $b 2>&1 | tail -1
gh pr create --head $b --base main --title "$2" --body "$3" 2>&1 | tail -1
