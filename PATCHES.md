# Patch provenance — community build 1.0.0

Base release: https://github.com/videojs/video.js/releases/tag/v8.24.0

Original asset: `video-js-8.24.0.zip`

SHA-256: `404c26aed86ed957141748391f6ebd65120ec2ff0980b16a3048a368e018e311`

The readable distribution bundle contains the changes below. The CSS is the
unchanged upstream distribution. No separate minified JS is shipped, to avoid
accidentally loading an unpatched decoder.

## P16 decoding

Consumes two-byte operands atomically within packet/service boundaries,
handles a zero high byte without a leading NUL, and preserves configured
TextDecoder behavior. Independent upstream contribution:
https://github.com/videojs/mux.js/pull/457

The P16-only mux.js test run passed 342 tests, skipped 4, failed 0.

## CEA-708 presentation

Per-window `cea708Windows` snapshots retain relative anchors, colors and opacity
across the mux.js/VHS worker boundary. VHS maps relative geometry to VTTCue
properties. Video.js applies transmitted colors, with explicit
`cea708UseStreamStyles` preference to distinguish stream styles from its
otherwise opaque-black defaults. Snapshot data is copied, not shared with
mutable decoder windows. Legacy text and CEA-608 fallback remain available.

## Relative-window cursor

SPL addresses row/column rather than introducing a fake newline. Appends,
overwrites and backspace operate on bounded cells; actual CR still moves or
scrolls. Visible state is flushed before SPL-driven mutation; hidden-bank
preparation does not publish it. Clear/reset removes cursor state. Legacy
plain-text payload omits coordinate padding, while presentation snapshots
retain the positioned rows.

Decoder changes with the additional cursor regression passed 343 upstream
Node tests, skipped 4, failed 0 (Node 18.19.1). The separately shipped tests
exercise the exact modified bundle. Presentation and cursor extensions have
not been merged upstream and are not included in the P16-only PR.

No media timestamps, video content or server-side pipelines are modified by
this repository. It only decodes and displays the supplied browser media.
