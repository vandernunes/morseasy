#!/usr/bin/env python3
"""Check the source and the built page before anything ships.

    python3 scripts/check.py

Runs the build first, then asserts the things that have actually broken this
project before. Every failure prints what is wrong and how to fix it. No npm.

Vander Nunes - N5EDB
"""
from __future__ import annotations

import base64
import hashlib
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

failures: list[str] = []
checks = 0


def ok(label: str, condition: bool, fix: str = "") -> None:
    global checks
    checks += 1
    if condition:
        print(f"  pass  {label}")
    else:
        print(f"  FAIL  {label}" + (f"\n        {fix}" if fix else ""))
        failures.append(label)


def main() -> int:
    sys.path.insert(0, str(ROOT / "scripts"))
    import build  # noqa: E402

    build.build()
    print()

    page = (SRC / "index.html").read_text(encoding="utf-8")
    built = (DIST / "index.html").read_text(encoding="utf-8")

    print("source")
    ok("index.html declares a doctype", page.lstrip().lower().startswith("<!doctype html>"))
    ok("exactly one <title>", page.count("<title>") == 1)
    ok("has a meta description", 'name="description"' in page)
    ok("names the author", 'name="author"' in page)

    referenced = set(re.findall(r'<script src="js/([^"]+)"></script>', page))
    on_disk = {p.name for p in (SRC / "js").glob("*.js")}
    ok(
        "every js file is loaded by index.html",
        referenced == on_disk,
        f"loaded but missing: {sorted(referenced - on_disk)} | "
        f"on disk but never loaded: {sorted(on_disk - referenced)}",
    )
    ok("app.js is loaded last", page.rfind('src="js/app.js"') > max(
        [page.rfind(f'src="js/{n}"') for n in on_disk if n != "app.js"] or [-1]),
       "app.js boots the page, so every other module must already be defined")

    css = (SRC / "css" / "styles.css").read_text(encoding="utf-8")
    ok(
        "[hidden] beats the flex layouts",
        "[hidden]{display:none!important}" in css.replace(" ", ""),
        "panes use the hidden attribute but .pane sets display:flex - without the "
        "override every tab renders at once",
    )

    print("\nmodules")
    names = sorted(on_disk)
    decls: dict[str, list[str]] = {}
    for name in names:
        text = (SRC / "js" / name).read_text(encoding="utf-8")
        for kind, ident in re.findall(
            r"^(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)", text, re.M
        ):
            decls.setdefault(ident, []).append(name)
    clashes = {k: v for k, v in decls.items() if len(v) > 1}
    ok(
        "no duplicate top-level declarations",
        not clashes,
        "classic scripts share one global scope, so a name declared twice with "
        f"const/let throws at load: {clashes}",
    )

    node = shutil.which("node")
    if node:
        bad = [
            n for n in names
            if subprocess.run([node, "--check", str(SRC / "js" / n)],
                              capture_output=True).returncode != 0
        ]
        ok("every module parses", not bad, f"syntax errors in: {bad}")
        combined = DIST / "_combined.js"
        combined.write_text(
            "\n".join((SRC / "js" / n).read_text(encoding="utf-8")
                      for n in re.findall(r'<script src="js/([^"]+)"></script>', page)),
            encoding="utf-8",
        )
        res = subprocess.run([node, "--check", str(combined)], capture_output=True, text=True)
        ok("modules parse together in load order", res.returncode == 0, res.stderr.strip())
        combined.unlink()
    else:
        print("  skip  node not installed - module parse check skipped")

    print("\nbuilt page")
    ok("no local stylesheet left unlinked", 'rel="stylesheet" href="css/' not in built,
       "run scripts/build.py - inlining did not happen")
    ok("no local script left unlinked", '<script src="js/' not in built,
       "run scripts/build.py - inlining did not happen")
    ok("closes the document", built.rstrip().endswith("</html>"))
    ok("the whole app is one file", (DIST / "index.html").stat().st_size > 80_000)
    ok("three-step lesson flow present", "PICK_TARGET" in built and "STEPS" in built)
    ok("no hard-coded personal callsign default", 'call:"N5EDB"' not in built,
       "the default state must stay blank so the page works for any operator")

    print("\ncontent security policy")
    headers = (DIST / "_headers").read_text(encoding="utf-8")
    csp_lines = [l for l in headers.splitlines() if "Content-Security-Policy" in l]
    ok("a CSP header is emitted", bool(csp_lines), "build.py should fill #CSP_PLACEHOLDER")
    csp = csp_lines[0] if csp_lines else ""
    ok("placeholder was substituted", "#CSP_PLACEHOLDER" not in headers)

    def sha(body: str) -> str:
        d = hashlib.sha256(body.encode("utf-8")).digest()
        return "'sha256-" + base64.b64encode(d).decode("ascii") + "'"

    # Reparse the built page the way a browser does, rather than trusting the
    # strings build.py hashed. A mismatch here means a blank site in production.
    blocks = re.findall(r"<script>(.*?)</script>", built, re.S)
    blocks += re.findall(r"<style>(.*?)</style>", built, re.S)
    computed = {sha(b) for b in blocks}
    declared = set(re.findall(r"'sha256-[A-Za-z0-9+/=]+'", csp))
    ok(
        "every inline block is hashed in the CSP",
        computed <= declared,
        f"not covered: {sorted(computed - declared)} - the browser would refuse to run them",
    )
    ok(
        "no stale hashes left in the CSP",
        declared <= computed,
        f"stale: {sorted(declared - computed)}",
    )
    ok("CSP has no 'unsafe-inline'", "unsafe-inline" not in csp)
    ok("CSP has no 'unsafe-eval'", "unsafe-eval" not in csp)
    ok("CSP default-src is 'none'", "default-src 'none'" in csp)
    ok("CSP forbids framing", "frame-ancestors 'none'" in csp)

    print("\ntheme")

    def tokens_in(block: str) -> set:
        return set(re.findall(r"(--[a-z0-9-]+)\s*:", block))

    root = css[css.index(":root{"): css.index("}", css.index(":root{"))]
    media = re.search(
        r"@media \(prefers-color-scheme:light\)\{(.*?)\n\}\n", css, re.S
    )
    attr = re.search(r':root\[data-theme="light"\]\{(.*?)\n\}', css, re.S)
    ok("both light blocks exist", bool(media and attr),
       "a viewer has three states: system (no stamp), light, dark - system needs "
       "the media query, an explicit choice needs the attribute selector")

    if media and attr:
        m_tok, a_tok = tokens_in(media.group(1)), tokens_in(attr.group(1))
        ok("the two light blocks define the same tokens", m_tok == a_tok,
           f"only in media: {sorted(m_tok - a_tok)} | only in [data-theme]: "
           f"{sorted(a_tok - m_tok)} - they must stay in step or the toggle and "
           "the OS setting disagree")
        root_tok = tokens_in(root)
        ok("every light token has a dark default", m_tok <= root_tok,
           f"missing from :root: {sorted(m_tok - root_tok)} - a token defined only "
           "inside a theme block is undefined in the other theme")

    used = set(re.findall(r"var\((--[a-z0-9-]+)", css))
    declared = tokens_in(root) | (tokens_in(media.group(1)) if media else set())
    ok("no colour references an undefined token", used <= declared,
       f"undefined: {sorted(used - declared)}")

    def _lum(h):
        h = h.lstrip("#")
        ch = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        ch = [(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4) for v in ch]
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]

    def contrast(a, b):
        la, lb = _lum(a), _lum(b)
        hi, lo = max(la, lb), min(la, lb)
        return (hi + 0.05) / (lo + 0.05)

    def val(block, name):
        m = re.search(rf"{name}\s*:\s*(#[0-9A-Fa-f]{{6}})", block)
        return m.group(1) if m else None

    for label, block in (("dark", root), ("light", attr.group(1) if attr else "")):
        ground = val(block, "--ground")
        for tok, need in (("--ink", 4.5), ("--ink-2", 4.5), ("--dim", 4.5),
                          ("--amber-ink", 4.5)):
            colour = val(block, tok)
            if not (ground and colour):
                continue
            r = contrast(colour, ground)
            ok(f"{label}: {tok} reads on --ground ({r:.2f}:1)", r >= need,
               f"{colour} on {ground} is {r:.2f}:1, below the {need}:1 body text needs")

    print("\nmobile layout")
    # A 320px phone minus the 14px gutters leaves 292px of content. Anything
    # that demands more than that pushes the page sideways, and a horizontally
    # scrolling body is the single most common way a layout breaks on a phone.
    NARROW = 292
    offenders = []
    for prop, pattern in (("minmax", r"minmax\((\d+)px"), ("min-width", r"min-width: *(\d+)px")):
        for m in re.finditer(pattern, css):
            val = int(m.group(1))
            if val > NARROW:
                line = css[: m.start()].count("\n") + 1
                offenders.append(f"{prop} {val}px at styles.css:{line}")
    ok(
        f"nothing demands more than {NARROW}px of width",
        not offenders,
        "these overflow a 320px phone and make the body scroll sideways: "
        + "; ".join(offenders),
    )
    ok(
        "tabs become a bottom bar on phones",
        "position:fixed;top:auto;bottom:0" in css.replace(" ", ""),
    )
    ok(
        "safe-area insets are respected",
        css.count("env(safe-area-inset") >= 4,
        "notched phones need padding from env(safe-area-inset-*) or content "
        "slides under the home indicator",
    )
    ok(
        "short tab labels exist for the narrow bar",
        page.count("lab-short") == 7 and ".lab-short" in css,
    )
    ok(
        "text inputs are at least 16px",
        "font-size:16px" in css.replace(" ", "") or "font-size: 16px" in css,
        "iOS zooms the whole page when you focus an input under 16px",
    )

    print("\nescaping")
    ui = (SRC / "js" / "ui.js").read_text(encoding="utf-8")
    ok("esc() escapes quotes as well as angle brackets",
       '&quot;' in ui and '&#39;' in ui,
       "templates interpolate into data-* attributes; unescaped quotes break out")
    ok("station fields are sanitised at the input boundary",
       "cleanField" in (SRC / "js" / "settings.js").read_text(encoding="utf-8"))
    ok("no inline style attributes",
       'style="' not in page and not any(
           'style="' in (SRC / "js" / f.name).read_text(encoding="utf-8")
           for f in (SRC / "js").glob("*.js")),
       "an inline style attribute would need style-src 'unsafe-inline'")

    print()
    if failures:
        print(f"{len(failures)} of {checks} checks failed")
        return 1
    print(f"all {checks} checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
