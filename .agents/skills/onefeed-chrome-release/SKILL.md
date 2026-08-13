---
name: onefeed-chrome-release
description: Publish the next OneFeed patch release to the Chrome Web Store by default, including version synchronization, verification, packaging, release commit, dev-to-master pull request merge, and publishing-workflow monitoring. Use when explicitly invoking this skill with no arguments, releasing OneFeed, requesting a patch/minor/major Chrome release, checking release readiness, or asking to merge a release into master.
---

# Release OneFeed to Chrome

Operate only on the repository that contains this skill. Resolve the repository root with Git, then verify `package.json` has `name: onefeed` and `origin` points to `yoonzm/OneFeed`.

## Runtime requirement

- This release workflow supports Node.js 20 or newer. Node.js 22 is preferred but is not required.
- Do not treat an `engines` warning caused solely by running Node.js 20 as a release blocker. The verification commands below must still complete successfully.

## Choose the mode

- Treat an explicit `$onefeed-chrome-release` invocation with no additional instruction as authorization to publish the next patch version.
- Treat explicit `发布`, `release`, or `publish` requests as release mode. Default to patch; use minor, major, or an exact version only when specified.
- Treat explicit `检查`, `状态`, `预检`, `dry run`, `怎么发布`, or explanatory questions as audit mode. Perform no edits, commits, pushes, merges, tags, workflow dispatches, or store submissions.
- Announce whenever this skill causes a version edit, push, pull-request merge, workflow dispatch, or pause.

## Audit release readiness

1. Read the repository `AGENTS.md` and obey it.
2. Inspect `git status --short`, current branch, remotes, `git log origin/master..dev`, and ahead/behind state. Fetch remote refs before making release decisions.
3. Verify the release infrastructure exists:
   - `.github/workflows/publish-chrome.yml`
   - `scripts/publish-chrome.mjs`
   - `docs/Privacy_Policy.md`
   - `store_assets/store_listing_zh-CN.md`
   - required store PNG assets
4. Compare the versions in `package.json`, the root package in `package-lock.json`, generated Manifest if present, privacy policy, and store listing. Do not trust an existing `.output` ZIP as current.
5. Check that the privacy-policy URL in the store listing is publicly accessible without authentication. A private URL returning `404` is a release blocker.
6. Treat a dirty worktree as a blocker unless every change is clearly part of the release requested by the user. Never include unrelated user changes in a release commit.
7. Report blockers with exact files or settings. In audit mode, stop here.

## Prepare the release

1. Work from `dev`. If it is clean and behind `origin/dev`, update it using a fast-forward-only pull. Never reset, rebase shared history, or force-push.
2. Treat every committed change in `origin/master..dev` as part of the release scope and summarize it before publishing.
3. Increment the version without creating a tag. Use patch by default:

   ```powershell
   npm version patch --no-git-tag-version
   ```

   Substitute `minor`, `major`, or an exact version only when requested. This must update both `package.json` and `package-lock.json`.
4. Update explicit old-version references in `docs/Privacy_Policy.md` and `store_assets/store_listing_zh-CN.md`. Correct store claims or test instructions made stale by the commits being released. Do not invent functionality.
5. Confirm the new version is a valid Chrome version and is strictly greater than the previous local version. The publishing script separately compares it with submitted and published store versions.

## Verify and package

Run, in order:

```powershell
npm ci
npm run lint
npm run compile
npm test
npm run build
npm run zip
git diff --check
```

Before `npm run zip`, remove only old generated `.output/*-chrome.zip` files after resolving and verifying that `.output` is inside the OneFeed repository. Do not delete source files or broad directories.

Verify all of the following:

- `.output/chrome-mv3/manifest.json` has the new version.
- Exactly one new `.output/onefeed-<version>-chrome.zip` exists.
- The ZIP root contains `manifest.json`.
- The worktree diff contains only the version and release-metadata changes made for this release.

Stop before commit if any command fails. Fix only failures within release scope and rerun the affected checks plus the full final verification.

## Commit and promote through GitHub

1. Commit only the reviewed release changes using `release: prepare v<version>`.
2. Push `dev` to `origin` without force.
3. Create or reuse a pull request from `dev` to `master`. Prefer an authenticated GitHub connector or `gh`; otherwise use an existing signed-in browser session. Do not install tools, authenticate accounts, or expose credentials automatically.
4. Wait for required checks. Merge through the pull request only after they pass. Never push directly to `master` or bypass branch protection.
5. Do not create a version tag unless explicitly requested; the `package.json` change on `master` already triggers the publishing workflow.
6. If no authenticated PR mechanism is available, stop after pushing `dev` and give the user the compare URL. Do not claim the release is complete.

## Monitor store submission

After the merge, locate and monitor `.github/workflows/publish-chrome.yml` for the merge commit until it reaches a terminal state.

- Success means the workflow built the same version and reported a submission, an intentional defer because another version is pending review, or a justified skip because the version is already uploaded.
- Failure means the release is incomplete. Report the failing step and relevant log excerpt; do not rerun blindly or create another version.
- If GitHub Environment configuration is missing, report the required variables: `CWS_PUBLISHER_ID`, `CWS_EXTENSION_ID`, `GCP_WIF_PROVIDER`, and `GCP_SERVICE_ACCOUNT`.
- Never cancel an existing review, change store visibility, bypass API warnings, or handle long-lived credentials unless explicitly requested.
- For a first-ever listing with no Extension ID, stop after preparing the package and direct the user to create the item manually in the Chrome Web Store dashboard.

## Report the outcome

Return:

- released version and release commit;
- pull request and merge commit, when available;
- verification results;
- generated ZIP path;
- publishing workflow URL and terminal state;
- whether the store submission was created, deferred, skipped, or blocked.

Do not describe a pushed branch or successful build as a completed store submission.
