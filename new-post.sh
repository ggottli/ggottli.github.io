#!/bin/bash
# Create a new blog post.
#
# Usage:   ./new-post.sh "My Post Title"
#
# Then write the post in markdown, and publish with:
#   git add _posts && git commit -m "New post" && git push
# GitHub Pages rebuilds the site automatically (takes a minute or two).

set -e

if [ -z "$1" ]; then
    echo 'Usage: ./new-post.sh "My Post Title"'
    exit 1
fi

TITLE="$1"
DATE=$(date +%Y-%m-%d)
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
FILE="_posts/${DATE}-${SLUG}.md"

if [ -e "$FILE" ]; then
    echo "$FILE already exists"
    exit 1
fi

cat > "$FILE" <<EOF
---
layout: post
title: "$TITLE"
---

EOF

echo "Created $FILE — write your post, then commit and push."
${EDITOR:-open -t} "$FILE"
