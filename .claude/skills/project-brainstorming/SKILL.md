---
name: project-brainstorming
description: Use this skill whenever the user wants to discuss, brainstorm, scope, or flesh out a new feature or change for the songslide monorepo before any code gets written — even if they just say "I have an idea for..." or "what if we added..." or describe a problem without naming a solution yet. Also trigger when the user explicitly asks to turn a discussion into a GitHub issue, or says things like "buat issue untuk...", "mau diskusi fitur baru", "brainstorm dulu", or "catat ini jadi issue". Do NOT use this for well-specified work that's ready to implement (that's develop-feature) or for reviewing existing PRs (that's pr-reviewer).
---

# Project Brainstorming

Turn a rough idea into a well-scoped GitHub issue, through conversation — not a form.

## Why this exists

A feature idea that goes straight to `gh issue create` usually comes out vague: no acceptance criteria, no edge cases considered, no sense of what it touches in the existing codebase. That vagueness gets inherited by whoever implements it (often the `develop-feature` skill), which then has to guess. Spending a few turns discussing the idea first is what makes the resulting issue actually actionable.

## How to run the discussion

Don't rush to the output. Work through these naturally, in conversation, adapting to what the user already knows:

1. **Problem first.** What's broken, missing, or painful right now? If the user opens with a solution ("add a button that does X"), ask what problem that solves — sometimes the real problem has a simpler fix.
2. **Scope.** What's in and explicitly out for this round? Songslide is a monorepo (`frontend`, `backend` (Java/Spring), `backend-go`, `export-service`, `ocr-service`) — figure out which service(s) this touches before assuming.
3. **Ground it in the real codebase.** Before finalizing scope, look around — read relevant files, check how similar features were built, search for existing patterns. This catches false assumptions early ("there's already a notation parser for this in `frontend/src/lib/notation-parser.ts`") and makes the issue's technical notes genuinely useful instead of guesswork. Use Grep/Glob/Read directly, or Explore for anything broader than a couple of lookups.
4. **Acceptance criteria.** Push for concrete, testable statements — "user can X and sees Y" — not vague goals. If the user is unsure, propose a few and let them edit.
5. **Edge cases and risks.** Surface at least the obvious ones (empty states, concurrent edits, migration of existing data, mobile/responsive, auth) and ask which actually matter here.

Keep this conversational. Ask one or two questions at a time rather than firing a questionnaire. If the user already has a tight, clear spec, don't manufacture extra back-and-forth — confirm understanding and move on.

## Before creating the issue

Summarize the scoped feature back to the user in a few lines and get an explicit go-ahead ("should I create the issue?" / confirm the title). Creating a GitHub issue is a visible, shared action — don't do it on a hunch that the discussion is "probably done." If the user says to just create it without further discussion, respect that.

## Creating the issue

Use `gh issue create` (the repo is already configured via `origin`, no need for `--repo`). Structure the body like this:

```markdown
## Problem / Context
<what's broken or missing, and why it matters>

## Proposed Solution
<the approach agreed on in discussion>

## Acceptance Criteria
- [ ] <concrete, testable criterion>
- [ ] <...>

## Technical Notes
<only if relevant: affected services/files, existing patterns to follow, known constraints>
```

Omit "Technical Notes" entirely if the discussion didn't surface anything concrete — don't pad it.

Pick a short, descriptive title (not a restatement of the whole problem paragraph). If the repo has labels that fit (check with `gh label list` if unsure), apply them with `--label`.

After creation, `gh issue create` prints the issue URL — hand that back to the user directly along with a one-line summary. That URL is also exactly what gets passed into the `develop-feature` skill to start implementation.
