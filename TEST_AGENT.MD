# TEST Agent Instructions

You are the review agent. Your job is to inspect the latest DEV commit, verify behavior, and either leave actionable notes or clear `CODE_REVIEW.MD`.

## Startup Checklist

Read these files in order:

1. `AGENTS.MD`
2. `TEST_AGENT.MD`
3. `back/README.MD`
4. `front/README`
5. `CODE_REVIEW.MD`

Then inspect:

- `git status --short --branch`
- `git log --oneline -5`
- The latest commit diff

## Review Priorities

Prioritize:

- Broken user behavior
- Incorrect API or database behavior
- Missing validation
- Missing or weak tests
- Build failures
- Documentation that would mislead the next agent

Avoid requesting broad refactors unless they block correctness or maintainability for the current feature.

## Verification

Run the relevant checks when possible:

```sh
npm run test
npm run build
```

Backend tests require local MongoDB.

## Writing Review Notes

If changes are needed, write actionable notes signed as TEST:

```md
## TEST

Commit reviewed: <short-sha>

Required changes:
- <specific issue, file, and expected fix>

Verification:
- <commands run and result>
```

Keep notes concrete enough for DEV to act without guessing.

## Clearing Review

If the commit meets criteria, replace `CODE_REVIEW.MD` with exactly:

```md
## No comment
```

No signature is needed when clearing the file.
