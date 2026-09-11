# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue.

Use GitHub's private reporting:
**[Report a vulnerability](https://github.com/vandernunes/morseasy/security/advisories/new)**

Expect an acknowledgement within 72 hours.

## Scope

Morse Easy is a static page. There is no backend, no database, no accounts, no
cookies and no third-party requests beyond the Google Fonts stylesheet. All
state lives in the visitor's own `localStorage` and never leaves their browser.

That leaves a small but real surface, and reports on any of it are welcome:

- Cross-site scripting through stored settings — callsign, name, QTH and rig are
  user input that gets rendered back into the page
- Anything in the build pipeline that could inject content into `dist/index.html`
- Exposure of secrets in the repository or in GitHub Actions logs
- Cloudflare Pages or DNS misconfiguration affecting morseasy.com

## Out of scope

- Missing security headers that do not apply to a static page with no auth
- Automated scanner output with no demonstrated impact
- Anything requiring physical access to the visitor's unlocked device

## Secrets and CI

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` live only in GitHub Actions
repository secrets. They are never committed and never printed in logs.

This is a public repository, so the protections around them are worth stating:

- **Fork pull requests cannot reach them.** GitHub does not pass secrets to
  workflows triggered by `pull_request` from a fork. The deploy workflow does
  not run on `pull_request` at all — only on a push to `main`.
- **`main` is protected**, so a push to it only happens through a reviewed and
  approved pull request. There is no path from an unreviewed change to a
  credential.
- **`check.yml` uses no secrets.** It is the only workflow a fork can trigger.
- **Least privilege.** Both workflows declare `permissions: contents: read`, and
  checkout runs with `persist-credentials: false` so the job token is not left
  in the git config for later steps to use.
- **Third-party actions are pinned to commit SHAs**, not tags. A tag can be
  repointed by whoever owns the action; a SHA cannot. Dependabot proposes
  upgrades weekly and each one goes through review.
- **The Cloudflare token is scoped to Pages edit on one account.** It cannot
  touch DNS, Workers, R2, or any other zone, and it is not an account-wide key.

If you ever see a credential in this repository or in a workflow log, report it
immediately using the link above and it will be rotated the same day.
