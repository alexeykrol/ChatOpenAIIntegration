# Development Workflow & Sprint Processes

**Project:** ChatOpenAI Integration Assistant
**Purpose:** Standardized development workflows for consistency and quality
**Last Updated:** 2025-01-31

---

## 🎯 Development Philosophy

### Core Principles
1. **Documentation is code** - Keep docs in sync with implementation
2. **Incremental progress** - Small, focused changes over large refactors
3. **Test before commit** - Validate changes in development environment
4. **Sprint completion** - Finish what you start, document what you finish

### Goals
- Maintain living documentation that reflects current state
- Enable easy onboarding for new developers (human or AI)
- Create clear audit trail via git history
- Support rollback to any completed sprint

---

## 🔄 Sprint Structure

### Sprint Lifecycle
```
🎯 START SPRINT
│
├── 1. PLANNING
│   ├── Read relevant documentation (ARCHITECTURE.md, BACKLOG.md)
│   ├── Create TodoWrite task list
│   └── Identify dependencies and risks
│
├── 2. IMPLEMENTATION
│   ├── Follow existing patterns (see AGENTS.md)
│   ├── Write tests as you go
│   ├── Document decisions in comments
│   └── Update TodoWrite progress
│
├── 3. TESTING
│   ├── Manual testing in dev environment
│   ├── Run automated tests (when available)
│   ├── Verify edge cases
│   └── Check performance impact
│
├── 4. EXPERIMENTATION & ITERATION
│   ├── Try alternative approaches if needed
│   ├── Rollback if approach doesn't work
│   ├── Refine solution based on testing
│   └── Final implementation
│
└── 5. COMPLETION (MANDATORY)
    ├── Update BACKLOG.md (status change)
    ├── Update ARCHITECTURE.md (if architectural changes)
    ├── Update AGENTS.md (if new patterns/rules)
    ├── Update README.md (if user-facing changes)
    ├── Update DATABASE_CHANGELOG.md (if schema changes)
    ├── Verify all TodoWrite tasks marked complete
    └── Create sprint completion commit

🎉 END SPRINT
```

---

## 📋 Sprint Completion Checklist

### 🚨 CRITICAL: Never end a sprint without completing ALL items below

#### Documentation Updates
- [ ] **BACKLOG.md** - Mark features complete, update status
- [ ] **ARCHITECTURE.md** - Document architectural changes (if any)
- [ ] **AGENTS.md** - Add new patterns, rules, or common issues (if any)
- [ ] **README.md** - Update version, user-facing changes (if any)
- [ ] **DATABASE_CHANGELOG.md** - Document schema changes (if any)

#### Code Quality
- [ ] All TodoWrite tasks marked as `completed`
- [ ] No console errors in development
- [ ] TypeScript compilation successful
- [ ] Code follows project patterns (see AGENTS.md)
- [ ] Commented complex logic

#### Git Commit
- [ ] Meaningful commit message (see template below)
- [ ] All relevant files staged
- [ ] Commit includes co-authorship if AI-assisted
- [ ] Branch up to date with base branch

---

## 📝 Git Commit Templates

### Sprint Completion Commit
```bash
git add .
git commit -m "$(cat <<'EOF'
Sprint: [Brief feature description]

- Implemented: [main functionality added]
- Updated: [documentation files changed]
- Fixed: [bugs resolved, if any]
- Docs: updated project documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Example:**
```
Sprint: Documentation restructuring for AI agents

- Implemented: AGENTS.md, ARCHITECTURE.md, BACKLOG.md, WORKFLOW.md
- Updated: README.md with improved Quick Start
- Docs: Separated concerns and improved discoverability

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Bug Fix Commit
```bash
git commit -m "$(cat <<'EOF'
Fix: [Brief description of bug]

- Root cause: [what caused the bug]
- Solution: [how it was fixed]
- Tested: [how fix was validated]

Fixes #[issue-number] (if applicable)

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Feature Commit (Mid-Sprint)
```bash
git commit -m "$(cat <<'EOF'
feat: [brief feature description]

- Added: [new functionality]
- Modified: [changed files/components]

Work in progress for Sprint: [sprint name]
EOF
)"
```

---

## 🏗️ Sprint Patterns by Type

### Database Change Sprint
```
1. Planning
   └── Read DATABASE_CHANGELOG.md for current schema

2. Create Migration
   ├── Write SQL in supabase/migrations/XXX_name.sql
   └── Create apply script in supabase/scripts/

3. Test Migration
   └── node supabase/scripts/apply-XXX.mjs

4. Update Types
   └── Update Database interface in src/lib/supabase.ts

5. Implement Feature
   └── Use new schema in application code

6. Documentation (MANDATORY)
   ├── DATABASE_CHANGELOG.md - add migration entry
   ├── BACKLOG.md - update feature status
   └── ARCHITECTURE.md - update if schema impacts architecture

7. Sprint Completion Commit
```

### New Feature Sprint
```
1. Planning
   ├── Read ARCHITECTURE.md (understand patterns)
   ├── Read BACKLOG.md (check current status)
   └── Create TodoWrite plan

2. Implementation
   ├── Follow existing patterns from AGENTS.md
   ├── Create/modify components
   └── Update store/services as needed

3. Testing
   ├── Manual testing in browser
   └── Check console for errors

4. Documentation (MANDATORY)
   ├── BACKLOG.md - mark feature complete
   ├── ARCHITECTURE.md - add component documentation
   ├── AGENTS.md - add patterns/rules if discovered
   └── README.md - update if user-facing

5. Sprint Completion Commit
```

### Bug Fix Sprint
```
1. Diagnosis
   ├── Reproduce bug
   ├── Check AGENTS.md "Common Issues"
   └── Identify root cause

2. Fix Implementation
   └── Follow existing patterns

3. Testing
   ├── Verify fix resolves issue
   └── Check for regressions

4. Documentation (MANDATORY)
   ├── AGENTS.md - add to "Common Issues" if applicable
   ├── README.md - update version (patch)
   └── BACKLOG.md - update if was tracked item

5. Sprint Completion Commit
```

### Refactoring Sprint
```
1. Planning
   ├── Identify scope (files/components affected)
   └── Plan backward compatibility strategy

2. Implementation
   ├── Refactor incrementally
   └── Run tests after each change

3. Validation
   ├── Verify no behavior changes
   └── Check performance impact

4. Documentation (MANDATORY)
   ├── ARCHITECTURE.md - update if patterns changed
   ├── AGENTS.md - update if refactor creates new patterns
   └── Code comments for complex changes

5. Sprint Completion Commit
```

---

## 🌿 Git Workflow

### Branch Strategy
```
main (or master)
  └── feature/[feature-name]  # For new features
  └── bugfix/[bug-name]       # For bug fixes
  └── refactor/[scope]        # For refactoring
  └── docs/[doc-update]       # For documentation only
```

### Branch Naming Conventions
- `feature/file-upload` - New features
- `bugfix/polling-duplication` - Bug fixes
- `refactor/state-management` - Code refactoring
- `docs/architecture-split` - Documentation updates

### Commit Flow
```bash
# 1. Create branch for sprint
git checkout -b feature/new-feature

# 2. Make changes, commit frequently during sprint
git add [files]
git commit -m "wip: progress on feature"

# 3. Sprint completion - final commit with template
git add .
git commit -m "[use sprint completion template]"

# 4. Push to remote (if applicable)
git push origin feature/new-feature

# 5. Create PR if team workflow requires
gh pr create --title "Sprint: New Feature" --body "..."
```

### Commit Frequency
- **During sprint:** Commit frequently (WIP commits OK)
- **Sprint completion:** Final commit with comprehensive message
- **Bug fixes:** Single commit with fix description
- **Documentation only:** Can batch multiple doc updates

---

## 🚀 Pull Request Process

### When to Create PR
- Team-based development (multiple developers)
- Major features requiring review
- Changes to critical infrastructure
- Before deploying to production

### PR Template
```markdown
## Summary
[1-3 sentence description of changes]

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation
- [ ] Database schema change

## Changes Made
- [Bullet list of specific changes]

## Testing Performed
- [ ] Manual testing in dev
- [ ] Automated tests pass
- [ ] No console errors
- [ ] Edge cases validated

## Documentation Updated
- [ ] BACKLOG.md
- [ ] ARCHITECTURE.md (if applicable)
- [ ] AGENTS.md (if applicable)
- [ ] README.md (if applicable)
- [ ] DATABASE_CHANGELOG.md (if applicable)

## Related Issues
Closes #[issue-number]

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### PR Creation Command
```bash
gh pr create --title "Sprint: [Feature Name]" --body "$(cat <<'EOF'
## Summary
[Description]

## Test Plan
- [Testing checklist]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 🔍 Code Review Guidelines

### What to Look For
- [ ] Follows patterns documented in AGENTS.md
- [ ] TypeScript types properly defined (no `any` without justification)
- [ ] Database changes have migration scripts
- [ ] Documentation updated appropriately
- [ ] No hardcoded secrets or API keys
- [ ] Error handling implemented
- [ ] Console logs removed (or debug-only)

### Review Checklist for AI Agents
When reviewing code as an AI agent:
1. Check AGENTS.md for rule violations
2. Verify documentation completeness
3. Look for common issues from AGENTS.md
4. Validate TypeScript types
5. Check for security issues (API keys, SQL injection)
6. Verify git commit message quality

---

## 🧪 Testing Workflow

### Manual Testing Checklist
- [ ] Feature works in happy path
- [ ] Error states handled gracefully
- [ ] Edge cases tested
- [ ] UI responsive across screen sizes
- [ ] No console errors or warnings
- [ ] Database changes applied successfully

### Automated Testing (Future)
```bash
# Unit tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build validation
npm run build
```

---

## 📦 Release Process

### Version Numbering
- **Patch (1.5.1):** Bug fixes only, no new features
- **Minor (1.6.0):** New features, backward compatible
- **Major (2.0.0):** Breaking changes, major architectural updates

### Release Checklist
- [ ] All sprint completion checklists done
- [ ] Version updated in README.md
- [ ] BACKLOG.md reflects current status
- [ ] Git tag created: `git tag v1.6.0`
- [ ] Changelog generated (if maintained)
- [ ] Deployment tested in staging
- [ ] Backup created before production deploy

### Release Commit
```bash
git commit -m "Release v1.6.0

- New features: [list]
- Bug fixes: [list]
- Breaking changes: [list if major]

See BACKLOG.md for full details
"
git tag v1.6.0
git push origin main --tags
```

---

## 🛠️ Common Workflows

### Daily Development Session
```bash
# 1. Start session
git pull origin main
npm install  # If dependencies updated

# 2. Start dev server
npm run dev

# 3. Work on tasks
# ... make changes ...

# 4. End session
git add .
git commit -m "wip: [what was done]"
git push origin [branch-name]
```

### Sprint Start
1. Read BACKLOG.md to identify next priority
2. Read relevant sections of ARCHITECTURE.md and AGENTS.md
3. Create feature branch
4. Create TodoWrite plan
5. Begin implementation

### Sprint End
1. Complete all TodoWrite tasks
2. Manual testing
3. Documentation updates (all applicable files)
4. Sprint completion commit
5. Push to remote (if applicable)
6. Create PR (if team workflow)

---

## 📚 Documentation Maintenance

### When to Update Each File

#### BACKLOG.md
- **When:** Feature status changes (started, completed, cancelled)
- **Frequency:** Every sprint completion
- **Owner:** Any developer/agent completing a sprint

#### ARCHITECTURE.md
- **When:** New architectural patterns, components, or decisions
- **Frequency:** Major features or refactoring sprints
- **Owner:** Developer/agent making architectural changes

#### AGENTS.md
- **When:** New patterns discovered, rules established, or common issues found
- **Frequency:** Any sprint where new knowledge gained
- **Owner:** Any developer/agent who discovers new patterns

#### README.md
- **When:** User-facing changes, version updates, installation changes
- **Frequency:** Each minor/major version release
- **Owner:** Developer/agent completing user-facing features

#### DATABASE_CHANGELOG.md
- **When:** Any database schema change
- **Frequency:** Each database migration
- **Owner:** Developer/agent creating migration

### Documentation Review Cadence
- **After each sprint:** Verify all updates made
- **Monthly:** Review for consistency across files
- **Before release:** Comprehensive documentation audit

---

## 🎯 Best Practices

### DO
- ✅ Commit early and often during development
- ✅ Use descriptive branch names
- ✅ Update documentation as you code, not after
- ✅ Test before committing
- ✅ Use TodoWrite to track progress
- ✅ Follow existing patterns from AGENTS.md
- ✅ Complete sprint checklists before moving on

### DON'T
- ❌ Skip documentation updates
- ❌ Commit broken code to main
- ❌ Make unrelated changes in same commit
- ❌ Use vague commit messages ("fix bug", "update code")
- ❌ Leave WIP code without comments
- ❌ Push directly to main without review (if team policy)
- ❌ Forget to update BACKLOG.md status

---

## 🆘 Troubleshooting Workflow Issues

### Issue: Documentation out of sync
**Solution:** Run documentation audit sprint
1. Compare code to ARCHITECTURE.md
2. Verify BACKLOG.md status matches reality
3. Update all discrepancies
4. Create "docs: synchronize documentation" commit

### Issue: Unclear what to work on next
**Solution:** Consult prioritization hierarchy
1. Check BACKLOG.md "In Progress" section
2. Then "High Priority" features
3. Then "Technical Debt" if no features
4. Discuss with team if still unclear

### Issue: Git conflicts
**Solution:** Standard git conflict resolution
```bash
git pull origin main
# Resolve conflicts in editor
git add [resolved-files]
git commit -m "Merge main, resolve conflicts"
```

### Issue: Lost sprint progress
**Solution:** Use git history
```bash
# View commit history
git log --oneline

# Restore to specific commit
git checkout [commit-hash]

# Create recovery branch
git checkout -b recovery/lost-work
```

---

*This workflow ensures consistency, quality, and maintainability across all development activities*
*Last updated: 2025-01-31*
