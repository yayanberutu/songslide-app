---
name: develop-feature
description: Use this skill whenever the user asks to implement, build, or work on a GitHub issue for the songslide repo (by issue URL or number — e.g. "implement issue #42", "kerjain issue ini: <url>", "develop fitur dari issue 37"), OR asks to address/fix review feedback on an existing PR (by PR URL or number — e.g. "address the review comments on PR #50", "fix PR #50 based on the review", "lanjutin PR ini sesuai feedback reviewer"). This skill handles the full loop end-to-end: branch, implement, test, commit, push, and open or update the PR. Do NOT use this for discussing or scoping a feature that doesn't have an issue yet (that's project-brainstorming) or for producing a review verdict on a PR (that's pr-reviewer).
---

# Develop Feature

Take a GitHub issue from spec to open PR, or take reviewer feedback on an existing PR from "changes requested" to "ready to re-review." Same skill, two entry points, because both are "turn a GitHub-tracked unit of work into committed code."

## Step 0: figure out what you were handed

The user gives you either an issue or a PR — number, URL, or just "this issue"/"this PR" from context. A bare number is ambiguous, so resolve it:

```bash
gh issue view <number> 2>/dev/null && echo "ISSUE" || gh pr view <number> 2>/dev/null && echo "PR"
```

If both exist with that number (they share the numbering sequence in GitHub, so this is possible) or neither resolves, ask the user to disambiguate rather than guessing. If the user gave a full URL, the `/issues/` vs `/pull/` in the path already tells you — no need to probe.

Once you know which one, jump to the matching path below.

## Path A — Input is an issue

**1. Read the issue.** `gh issue view <number> --json title,body,number,labels`. Make sure you actually understand the acceptance criteria before writing code — if the issue is vague or you're about to make a judgment call that changes scope, say so to the user before proceeding rather than silently picking an interpretation.

**2. Branch from main.** Match the repo's existing convention — mostly `feature/issue-<number>-<short-slug>` or `feature/<short-slug>` for feature work, `fix/<short-slug>` for bugfixes (check `git log --merges --oneline -20` if unsure, conventions drift over time). Branch from up-to-date `main`:

```bash
git checkout main && git pull && git checkout -b feature/issue-<number>-<slug>
```

**3. Implement.** Follow the acceptance criteria. Read [references/service-commands.md](references/service-commands.md) to know which service(s) you're likely touching and what "done" looks like for them — but the real signal for scope is the issue's "Technical Notes" section plus whatever you find by reading the actual code, not a guess from the title.

**4. Tests — use judgment, not a blanket rule.** Add or update unit tests when the change has non-trivial logic worth locking in (parsing, calculations, state transitions, bug fixes that need a regression test). Skip new tests for things like pure styling tweaks, config changes, or trivial wiring — forcing a test onto those just adds noise. If you're unsure, err toward adding one; a missing test is cheaper to add later than a flaky one is to rip out.

**5. Verify.** Run the lint/typecheck/test commands for whichever service(s) you touched — see [references/service-commands.md](references/service-commands.md). Fix failures before moving on; don't commit code you haven't verified runs.

**6. Commit and push.**

```bash
git add <files>   # specific paths, not -A — review what's staged
git commit -m "<clear, imperative message>"
git push -u origin feature/issue-<number>-<slug>
```

**7. Open the PR**, referencing the issue so it auto-closes on merge:

```bash
gh pr create --title "<title>" --body "Closes #<number>

## Summary
<what changed and why>

## Testing
<what you ran to verify>"
```

**8. Hand the PR URL back to the user.** `gh pr create` prints it — surface it directly, don't make them scroll for it.

## Path B — Input is a PR (addressing review feedback)

This is the other half of the loop with `pr-reviewer`: that skill posts a native GitHub review (`APPROVED` / `CHANGES_REQUESTED`) with inline comments. This path consumes that.

**1. Checkout the PR's branch.**

```bash
gh pr checkout <number>
```

**2. Pull the unresolved feedback.** Get the review state and the actual comments:

```bash
gh pr view <number> --json reviews,comments
gh api repos/{owner}/{repo}/pulls/<number>/comments
```

Focus on reviews with `state: CHANGES_REQUESTED` and their associated inline comments. If a comment thread looks already resolved (follow-up commits address it, or GitHub shows it resolved), don't redo it — skim before you start fixing so you're not duplicating work you or a previous run already did.

**3. Address each point.** Go through the feedback one item at a time rather than trying to batch-rewrite — it's easier to verify each fix actually answers the specific comment, and easier to explain later what changed for what reason.

**4. Verify again.** Same as step 5 in Path A — run the relevant service's lint/test commands ([references/service-commands.md](references/service-commands.md)) before pushing.

**5. Commit and push to the *same* branch.**

```bash
git add <files>
git commit -m "<what was fixed, referencing the feedback>"
git push
```

Don't force-push unless you specifically rewrote history for a reason (e.g. squashing) and understand that it can disrupt the reviewer's existing comment threads — a plain `git push` is almost always right here since you're adding commits, not rewriting.

**6. Report back.** Tell the user, point by point, which feedback items got addressed and how. Mention that the PR is ready for another review pass — the natural next step is re-running `pr-reviewer` on the same PR.

## A note on judgment calls

Both paths will occasionally hit a spec that's ambiguous or feedback that's genuinely debatable (a reviewer suggestion you think is wrong, or an issue criterion that conflicts with something else in the codebase). Don't silently resolve these by picking whichever is easiest to implement — flag the tension to the user and let them make the call. Implementation speed matters less than not quietly drifting from what was actually asked for.
