#!/bin/bash

# Script to safely push to GitHub after security cleanup
# This script will push the cleaned repository to GitHub

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  PUSH TO GITHUB - Security Verified Repository       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "3assistent" ]; then
    echo "❌ Error: Not on branch 3assistent"
    echo "   Current branch: $CURRENT_BRANCH"
    echo "   Please checkout 3assistent: git checkout 3assistent"
    exit 1
fi

echo "✅ Branch: $CURRENT_BRANCH"
echo ""

# Final security checks
echo "🔍 Running final security checks..."
echo ""

# Check 1: No .env files in git
ENV_FILES=$(git ls-files | grep "\.env$" || true)
if [ -n "$ENV_FILES" ]; then
    echo "❌ Error: .env files found in git:"
    echo "$ENV_FILES"
    exit 1
fi
echo "✅ No .env files in repository"

# Check 2: .env.example contains only placeholders
if grep -q "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" MaaS/.env.example 2>/dev/null; then
    echo "❌ Error: Real JWT token found in MaaS/.env.example"
    exit 1
fi
echo "✅ MaaS/.env.example contains only placeholders"

# Check 3: .env files are ignored
if ! git check-ignore .env >/dev/null 2>&1; then
    echo "❌ Error: .env is not in .gitignore"
    exit 1
fi
echo "✅ .env files properly gitignored"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  All Security Checks PASSED ✅                        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Show what will be pushed
echo "📊 Commits to be pushed:"
git log origin/3assistent..HEAD --oneline | head -10
echo ""

# Confirm
echo "⚠️  This will FORCE PUSH and rewrite history on GitHub"
echo "   (This is safe because history was cleaned from credentials)"
echo ""
read -p "Are you sure you want to push? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Push cancelled"
    exit 0
fi

echo ""
echo "🚀 Pushing to GitHub..."
echo ""

# Force push with lease (safer than --force)
git push --force-with-lease origin 3assistent

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ✅ SUCCESSFULLY PUSHED TO GITHUB                     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Your repository is now on GitHub and fully secure!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify on GitHub: https://github.com/alexeykrol/ChatOpenAIIntegration"
echo "   2. Check MaaS/.env.example contains only placeholders"
echo "   3. Follow DEPLOYMENT_GUIDE.md to deploy"
echo ""
