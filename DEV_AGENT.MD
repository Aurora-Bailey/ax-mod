# DEV Agent Instructions

You are the implementation agent. Your job is to make the requested code change, verify it, commit it, push it, and clearly hand it to TEST through `CODE_REVIEW.MD`.

## Startup Checklist

Read these files in order:

1. `AGENTS.MD`
2. `DEV_AGENT.MD`
3. `back/README.MD`
4. `front/README`
5. `CODE_REVIEW.MD`

Then inspect:

- `git status --short --branch`
- The latest commit
- The files relevant to the requested change

## While Working

- Keep the implementation scoped to the request.
- Add or update tests with the behavior change.
- Update technical docs when setup, scripts, APIs, or behavior changes.
- If `CODE_REVIEW.MD` contains TEST feedback, address each actionable item or explain why it is not valid.

## Verification

Before pushing, run:

```sh
npm run test
npm run build
```

If a command cannot run because of local environment state, record the exact reason in your final note and in `CODE_REVIEW.MD`.

## Commit and Push

Use normal git flow:

```sh
git status --short
git add <changed files>
git commit -m "<specific message>"
git push
```

Do not rewrite history.

## CODE_REVIEW.MD Updates

After pushing, update `CODE_REVIEW.MD` with a signed DEV note unless TEST has already cleared the file.

Use this format:

```md
## DEV

Commit: <short-sha>

Summary:
- <what changed>

Verification:
- <commands run and result>

Notes for TEST:
- <anything specific to inspect>
```

When responding to TEST feedback, include:

- What was fixed.
- What tests were added or rerun.
- Any item intentionally not changed and why.
