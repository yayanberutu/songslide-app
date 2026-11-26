---
name: pr-reviewer
description: Use this skill whenever the user asks to review a pull request in the songslide repo — by PR URL/number ("review PR #51", "cek PR ini sebelum merge") or implicitly for the PR on the current branch ("review this", "is this ready to merge" while on a feature branch). This skill produces a real verdict (APPROVED or CHANGES_REQUESTED) posted as a native GitHub PR review, not just comments in chat. Do NOT use this for implementing a feature or addressing feedback (that's develop-feature) or for scoping a new feature (that's project-brainstorming).
---

# PR Reviewer

Review a PR's diff against correctness, quality, security, and the acceptance criteria of whatever issue it claims to close — then post that verdict where it actually belongs: as a native GitHub PR review, so it's structured, visible, and machine-readable by the rest of this workflow (`develop-feature` reads it back when addressing feedback).

## Why a native GitHub review, not a plain comment

A plain `gh pr comment` is just text — there's no APPROVED/CHANGES_REQUESTED state attached to it, so nothing downstream can tell at a glance whether the PR is blocked. A native review (`gh pr review`) carries that state in GitHub's own data model, and inline review comments anchor specific findings to the exact line they're about, which is both clearer for the human and exactly what `develop-feature` queries (`gh pr view --json reviews,comments`) when it comes back to fix things. Keep findings in the review, not scattered across regular comments.

## Step 1: gather context

```bash
gh pr view <number> --json title,body,number,url,headRefName,baseRefName
gh pr diff <number>
```

If no number was given, resolve the PR for the current branch: `gh pr view --json number` (fails clearly if there isn't one — don't guess).

If the PR body references an issue ("Closes #N", "Fixes #N"), fetch it too — `gh issue view <N>` — and use its acceptance criteria as part of what you're checking the diff against. A PR can be clean code and still miss what was actually asked for.

## Step 2: review the diff

Read the actual diff, not just the PR description. Look for:

- **Correctness** — logic errors, off-by-one, unhandled edge cases, race conditions, broken error handling.
- **Security** — injection (SQL, command, path traversal), secrets committed, missing auth checks, unsafe deserialization — this is a multi-service repo (Java/Spring backend, Go backend, Next.js frontend, Node export-service, Python OCR service) so apply the right lens for the language you're reading.
- **Acceptance criteria match** — if there's a linked issue, does the diff actually satisfy each checkbox? Flag anything that's silently out of scope or missing.
- **Quality** — is this reasonable for the codebase's existing conventions? Don't invent new conventions to complain about; check how similar code already looks nearby before flagging a style issue.

Pull up surrounding code with Read/Grep when the diff alone doesn't give enough context to judge whether something is actually safe (e.g. is this input already validated upstream?). Don't flag things you haven't actually checked.

Severity matters: a typo in a comment is not the same as a SQL injection. Don't pad the review with nitpicks to look thorough — every item you request changes for should be something you'd genuinely block a merge on, or worth noting as optional ("nit:") without blocking.

## Step 3: decide and post

**If nothing significant is wrong** — approve:

```bash
gh pr review <number> --approve --body "<summary of what you checked and why it looks good>"
```

**If there's something that should be fixed before merge** — request changes, with inline comments for anything tied to a specific line:

```bash
gh pr review <number> --request-changes --body "<summary of the overall verdict and why>"
```

For inline comments on specific lines, submit them as part of one review via the API rather than one-at-a-time, so they land as a single cohesive review instead of a flood of notifications:

```bash
gh api repos/{owner}/{repo}/pulls/<number>/reviews -X POST -f event=REQUEST_CHANGES -f body="<overall summary>" -f "comments[][path]=<file>" -f "comments[][line]=<line>" -f "comments[][body]=<specific finding>"
```

(Adjust per the actual number of findings — build the JSON payload with multiple `comments` entries rather than calling this once per finding.) Get `commit_id` for anchored comments from `gh pr view <number> --json headRefOid` if the API call needs it explicitly.

Each inline comment should name the concrete problem and, where it's not obvious, what a fix would look like — a reviewer comment that just says "this is wrong" without saying why isn't useful to whoever picks it up next.

## Step 4: report back

Tell the user the verdict plainly: **APPROVED** or **NEED_CHANGES**, with the key reasons. If it's NEED_CHANGES, say so and point them at the next step: running `develop-feature` with this same PR as input will pull these review comments back and address them one by one.
