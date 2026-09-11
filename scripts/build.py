#!/usr/bin/env python3
"""Build the deployable site.

Morse Easy ships as ONE self-contained HTML file on purpose: it must work from a
phone with no signal, from a USB stick at a club meeting, and from a file:// URL.
So the build inlines every local stylesheet and script into dist/index.html and
copies public/ verbatim alongside it.

    python3 scripts/build.py

No npm, no bundler, no network. Python 3.8+ and nothing else.

Vander Nunes - N5EDB
"""
from __future__ import annotations

import base64
import hashlib
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
PUBLIC = ROOT / "public"
DIST = ROOT / "dist"

# Everything the page is allowed to reach. The app makes no network calls of its
# own, so connect-src is locked shut; the only third party is the Google Fonts
# stylesheet and the font files it pulls.
CSP_TEMPLATE = (
    "default-src 'none'; "
    "script-src {script_hashes}; "
    "style-src {style_hashes} https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; "
    "img-src 'self' data:; "
    "connect-src 'none'; "
    "form-action 'none'; "
    "frame-ancestors 'none'; "
    "base-uri 'none'; "
    "object-src 'none'; "
    "manifest-src 'none'; "
    "upgrade-insecure-requests"
)


def csp_hash(body: str) -> str:
    """CSP hashes cover the exact bytes between the tags, so hash what we write."""
    digest = hashlib.sha256(body.encode("utf-8")).digest()
    return "'sha256-" + base64.b64encode(digest).decode("ascii") + "'"


LOCAL_CSS = re.compile(r'[ \t]*<link rel="stylesheet" href="(?!https?:)([^"]+)"[^>]*>\n?')
LOCAL_JS = re.compile(r'[ \t]*<script src="(?!https?:)([^"]+)"></script>\n?')


def read(path: pathlib.Path) -> str:
    if not path.is_file():
        sys.exit(f"build: missing {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def guard(text: str, kind: str, origin: str) -> str:
    """Inlining is textual, so refuse anything that would close the tag early."""
    needle = "</style" if kind == "css" else "</script"
    if needle in text.lower():
        sys.exit(f"build: {origin} contains a literal {needle}> and cannot be inlined")
    return text


def build() -> int:
    page = read(SRC / "index.html")

    css_files: list[str] = []
    js_files: list[str] = []
    script_hashes: list[str] = []
    style_hashes: list[str] = []

    def inline_css(match: re.Match) -> str:
        rel = match.group(1)
        css_files.append(rel)
        body = guard(read(SRC / rel), "css", rel)
        inner = f"\n/* {rel} */\n{body.strip()}\n"
        style_hashes.append(csp_hash(inner))
        return f"<style>{inner}</style>\n"

    def inline_js(match: re.Match) -> str:
        rel = match.group(1)
        js_files.append(rel)
        body = guard(read(SRC / rel), "js", rel)
        inner = f"\n{body.strip()}\n"
        script_hashes.append(csp_hash(inner))
        return f"<script>{inner}</script>\n"

    page = LOCAL_CSS.sub(inline_css, page)
    page = LOCAL_JS.sub(inline_js, page)

    if not css_files:
        sys.exit("build: no local stylesheet was inlined - check src/index.html")
    if not js_files:
        sys.exit("build: no local script was inlined - check src/index.html")

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    (DIST / "index.html").write_text(page, encoding="utf-8")

    for item in sorted(PUBLIC.iterdir()):
        if item.name.startswith("."):
            continue
        if item.is_dir():
            shutil.copytree(item, DIST / item.name)
        else:
            shutil.copy2(item, DIST / item.name)

    # The Content-Security-Policy carries a hash per inlined block, so it has to
    # be generated from the same strings that were just written into the page.
    csp = CSP_TEMPLATE.format(
        script_hashes=" ".join(script_hashes),
        style_hashes=" ".join(style_hashes),
    )
    headers = DIST / "_headers"
    headers.write_text(
        headers.read_text(encoding="utf-8").replace("#CSP_PLACEHOLDER", csp),
        encoding="utf-8",
    )

    size = (DIST / "index.html").stat().st_size
    print(f"morse easy - built dist/index.html  {size:,} bytes")
    print(f"  inlined {len(css_files)} stylesheet(s), {len(js_files)} script(s)")
    for name in js_files:
        print(f"    {name}")
    copied = sorted(p.name for p in DIST.iterdir() if p.name != "index.html")
    print(f"  copied from public/: {', '.join(copied) or '(nothing)'}")
    print(f"  CSP: {len(script_hashes)} script hash(es), {len(style_hashes)} style hash(es), "
          f"no 'unsafe-inline'")
    return 0


if __name__ == "__main__":
    raise SystemExit(build())
