# Changelog

All notable changes to Morse Easy.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Installable, and works fully offline.** Service worker plus web manifest.
  Install from Settings, or Share → Add to Home Screen on iOS. Also exempts the
  app from Safari's seven-day storage eviction, which was silently costing
  people their streaks.
- **Light theme** with a three-state switch: follow the device, light, or dark.
- Mobile layout rebuilt: tabs moved to a fixed bottom bar, tap targets raised to
  44px, safe-area insets, dialogs as bottom sheets.

### Changed

- **Fonts are self-hosted.** The page now makes zero third-party requests and
  the Content-Security-Policy names no external host.
- Content-Security-Policy with a sha256 hash per inlined block — no
  `unsafe-inline`, no `unsafe-eval`.

### Fixed

- The footer slid under the fixed tab bar on phones.
- Settings dialog buttons were pushed off screen on iOS — `vh` ignores Safari's
  toolbars, so the dialog is capped with `dvh` and only its body scrolls.
- On Words and Callsigns the Start button sat below a 36-key pad, off screen.
- `--top-h` was written by JavaScript but never declared in CSS, so the sticky
  offset was invalid on first paint.

## [1.0.0] - 2026-09-11

First public release, live at [morseasy.com](https://morseasy.com).

### Added

- **Three-step lessons.** Every character is met before it is ever tested:
  *Meet the sound*, *Tell them apart*, then *Copy groups of five*.
- **Koch method** progression through all 40 characters, two at a time, 90% to
  unlock the next one.
- **ARRL Farnsworth timing** with independent character and overall speed, so
  characters always sound the way they will on the air.
- **Hear any character** strip on every lesson, so looking a sound up is always
  cheaper than guessing.
- **Speed presets** - Crawl, Slow, Steady, Normal, Fast - with the fine sliders
  kept under the gear.
- **Tap or type** everywhere. On-screen keypads mean no mobile keyboard covering
  the screen.
- **Letters** chart with patterns, spoken rhythms and mnemonics, tap to hear.
- **Words** drill: Q-codes, abbreviations, prosigns, numbers and plain English.
- **Callsigns** drill with real US formats and DX prefixes, sent twice.
- **QSO** simulator: answering a CQ, calling CQ, a POTA/contest exchange, and
  one where everything goes wrong.
- **Sending** practice with a straight key or an iambic keyer, a live decoder
  and a dah:dit ratio meter.
- **Reference** sheet: prosigns, 20 Q-codes, ~60 abbreviations, RST tables, a
  first contact word for word, and where to find slow CW on the air.
- Your callsign, name, QTH and rig flow through the QSO scripts and drills.
- Day-streak counter and per-character weak-spot tracking.
- Progress saved in the browser. No account, no server, no tracking.

### Notes

- Works offline once loaded. The whole app is one HTML file.
- Single dark theme, on purpose - it is an instrument panel.

[Unreleased]: https://github.com/vandernunes/morseasy/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/vandernunes/morseasy/releases/tag/v1.0.0
