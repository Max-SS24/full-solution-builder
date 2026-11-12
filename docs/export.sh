#!/usr/bin/env bash
# Combine all docs into one PDF: bash docs/export.sh
cd "$(dirname "$0")" && pandoc README.md 01-architecture.md 02-capabilities.md 03-security.md 04-accessibility.md -o VA-Navigator-Documentation.pdf --toc
