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

## Secrets

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` live only in GitHub Actions
repository secrets. They are never committed, never printed in logs, and the
token is scoped to Cloudflare Pages on this account alone. If you ever see a
credential in this repository or in a workflow log, report it immediately using
the link above and it will be rotated the same day.
