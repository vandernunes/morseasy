# Contributing to Morse Easy

Thanks for being here. This project exists to get people on the air with CW, and
corrections from operators who actually work the mode are worth as much as code.

Maintainer: **Vander Nunes — N5EDB**

## Ways to help that do not need any code

- **Fix the on-air content.** A wrong Q-code meaning, an abbreviation nobody
  really sends, a QSO script that reads like a textbook instead of like 40 m on
  a Tuesday night. Open an issue and say what you hear on the air.
- **Report what confused you.** If a screen made you guess instead of learn,
  that is a bug, and it is the most valuable bug report this project can get.
- **Tell us what a beginner needs next.** Missing drills, missing prosigns.

## Getting set up

No npm, no bundler, no dependencies. Python 3.8+ and a browser.

```bash
git clone https://github.com/vandernunes/morseasy.git
cd morseasy
python3 scripts/build.py                      # src/ + public/ -> dist/
python3 -m http.server 8000 --directory dist  # open http://localhost:8000
```

Edit files in `src/`, re-run `build.py`, reload. That is the whole loop.

Node is optional. If it is installed, `check.py` also parses every module.

## Before you push

```bash
python3 scripts/check.py
```

16 checks, about a second. CI runs the same script, so a green run here is a
green run there. Never push red.

Then test it by hand in a browser, with the sound on. This is an audio app; a
passing check script proves nothing about whether the code sounds right.
At minimum walk one lesson through all three steps.

**If you changed layout, check it at phone size.** Most people learn on a
phone, and a desktop browser will not show you what is wrong. There is an
optional tool for this:

```bash
npm i -D playwright && npx playwright install chromium
python3 scripts/build.py
python3 -m http.server 8899 --directory dist &
node scripts/preview.js http://127.0.0.1:8899/ learn,words,calls,qso,send
```

It writes a screenshot per tab and prints horizontal overflow, header height,
where content starts, and every tap target under 44px. It is not in CI because
the app itself has no dependencies and we are keeping it that way.

## Who can change what

Anyone can contribute. Nobody can merge but the maintainer.

- **You do not need access to contribute.** Fork the repo, push to your fork,
  open a pull request. That is the normal path and it is open to everyone.
- **`main` is protected.** Nobody pushes to it directly — not contributors, not
  collaborators, not the maintainer. Every change arrives as a pull request.
- **Every pull request needs maintainer review and approval before it can be
  merged.** Checks passing is necessary, not sufficient. Someone reads it.
- **Workflows on a first-time contributor's pull request need manual approval**
  before they run.
- **Fork pull requests never receive repository secrets.** The deploy workflow
  only runs on a push to `main`, which only happens after a merge.

That is the whole point: things ship to morseasy.com automatically, so what
gets merged is the gate, and a person controls it.

## Branches

Trunk-based. `main` is always deployable — every merge to it ships to
morseasy.com within about a minute.

Branch off `main`, keep it short-lived, open a PR, squash merge.

```
feat/qso-contest-exchange
fix/ios-audio-unlock
docs/architecture-load-order
chore/bump-wrangler
```

`<type>/<short-kebab-description>`, using the same types as commits below.
Never commit directly to `main`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/). This keeps the log
readable and lets the changelog write itself.

```
<type>(<scope>): <subject>

<body — why, not what. wrap at 72.>
```

**Types**

| Type | Use it for |
|---|---|
| `feat` | New behaviour a user can notice |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace — no behaviour change |
| `refactor` | Restructuring with no behaviour change |
| `perf` | Makes something faster or lighter |
| `test` | Adding or fixing checks |
| `build` | The build script, the output shape |
| `ci` | GitHub Actions, deploy pipeline |
| `chore` | Everything else — config, housekeeping |

**Scopes**: `learn`, `drills`, `qso`, `send`, `letters`, `reference`, `audio`,
`content`, `state`, `ui`, `settings`, `build`, `ci`, `docs`

**Subject line**

- Imperative mood: `add`, not `added` or `adds`
- Lower case, no full stop
- Under 72 characters
- Say what changes for the *user*, not which function you edited

```
feat(learn): teach each character before testing it
fix(audio): unlock the oscillator on first touch in iOS Safari
docs(readme): add the learning-path diagram
content(qso): make the POTA exchange match real park pileups
```

Bad:

```
update stuff
fixed bug
WIP
feat: changed handleKeyDown in learn.js to call pickAnswer
```

**Body** — explain *why*. The diff already shows what. If it closes an issue,
end with `Closes #12`.

## Pull requests

1. One logical change per PR. Split unrelated work.
2. Fill in the template — especially **how you tested it with sound on**.
3. `python3 scripts/check.py` passes.
4. Squash merge. The PR title becomes the commit, so it follows the convention
   above too.

## Code style

There is no linter, and the rules are short:

- **Two spaces** to indent. No tabs. LF endings. See `.editorconfig`.
- **No dependencies.** No frameworks, no npm packages, no CDN scripts other than
  the Google Fonts stylesheet. If a feature needs a library, it probably does
  not belong here.
- **No tracking.** No analytics, no beacons, no third-party requests. The page
  must keep working with the network off.
- **Plain modules.** `src/js/*.js` are classic scripts sharing one global scope,
  loaded in the order listed in `src/index.html`. That means **top-level names
  must be unique across every file** — `check.py` enforces it. Add new files to
  `index.html` and keep `app.js` last.
- **Style through the CSS custom properties** in `:root`. Do not hard-code a
  colour that already has a token.
- **Write copy from the operator's side of the screen.** Name things the way a
  ham would say them on the air.

## Writing the teaching content

The pedagogy is the product. Two rules override everything:

1. **Never test a sound the app has not taught first.**
2. **Never make guessing the fastest path forward.**

If a change would make someone guess, it is wrong even if it is more fun.
See [docs/LEARNING-PATH.md](docs/LEARNING-PATH.md) for the reasoning.

## Reporting a security issue

See [SECURITY.md](SECURITY.md). Do not open a public issue.

## Conduct

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Short version: this is a hobby that
runs on people being patient with beginners. Act like the operator who slows
down for someone's first contact.

73 de N5EDB
