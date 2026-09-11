#!/usr/bin/env python3
"""Check the source and the built page before anything ships.

    python3 scripts/check.py

Runs the build first, then asserts the things that have actually broken this
project before. Every failure prints what is wrong and how to fix it. No npm.

Vander Nunes - N5EDB
"""
from __future__ import annotations

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

    print()
    if failures:
        print(f"{len(failures)} of {checks} checks failed")
        return 1
    print(f"all {checks} checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
