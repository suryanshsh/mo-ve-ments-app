---
name: deploy-via-github-pr
description: 'Use when: deploying local changes to Vercel by creating, pushing, opening, and merging a GitHub pull request; includes validation, PR automation, merge, and production endpoint verification.'
argument-hint: 'Describe the local fix and production URL or health endpoint to verify'
---

# Deploy Via GitHub PR

Use this skill when local changes need to reach a Vercel deployment through the repository's GitHub PR workflow.

## Procedure

1. Inspect repository state.
   - Run `git status --short --branch` and `git remote -v`.
   - Confirm changed files are related to the requested fix.
   - Do not revert or overwrite unrelated user changes.

2. Validate locally.
   - Run the repo's relevant diagnostics, tests, and production build before committing.
   - For this repo, default to `npm run build` for deployment changes.
   - Run `npm run test:ai` when server, AI, tRPC, or generation behavior changed.
   - Treat warnings separately from failures.

3. Create a deploy branch.
   - Prefer a descriptive name such as `fix/vercel-trpc-json-500`.
   - Stage only intended files.
   - Commit with a concise message that describes the deploy fix.

4. Push the branch.
   - Run `git push -u origin <branch>`.
   - If push fails due authentication, do not ask for secrets in chat; ask the user to authenticate directly in their terminal or browser.

5. Open the pull request.
   - Prefer `gh pr create` when GitHub CLI is installed and authenticated.
   - If `gh` is unavailable, use GitHub REST API only when `GH_TOKEN` or `GITHUB_TOKEN` is present.
   - If neither path is available, open the GitHub compare URL in the browser and continue only after the user signs in directly.
   - PR body should include summary, validation commands, and deployment verification plan.

6. Merge the pull request.
   - If the user requested automatic merge, merge without an extra confirmation once GitHub allows it.
   - Prefer squash merge unless repository conventions require another merge strategy.
   - Delete the remote branch after merge when the tool supports it.

7. Verify production.
   - Check Vercel or GitHub deployment status when available.
   - Verify the production URL or health endpoint after deployment.
   - For tRPC transport fixes in this repo, verify `/api/trpc/auth.health?batch=1&input=%7B%7D` returns `content-type: application/json`.

8. Report outcome.
   - Include branch, commit, PR URL, merge status, validations run, and production verification.
   - If blocked by missing credentials or tools, state exactly what completed and the minimum direct-auth step needed.
