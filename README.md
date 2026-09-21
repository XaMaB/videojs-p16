# Video.js P16 Player

**A working Video.js community build with CEA-708 P16 Cyrillic support.**

Includes a ready-to-use browser player, HLS URL input, caption-track selection,
transmitted caption colors/opacity, and corrected incremental two-line updates.
No backend, account, API key, encoder or subscription is required.

Community build **1.0.0**, based on **Video.js 8.24.0** and its bundled VHS/mux.js.
This is an independent modified distribution, not an official Video.js release.

## Clone and play

```sh
git clone https://github.com/XaMaB/videojs-p16.git
cd videojs-p16
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://localhost:8000**, enter your HLS playlist URL, and select
**Load stream**. Choose the discovered caption track in the dropdown or CC menu.
Start with Chrome/Chromium; native HLS implementations can behave differently.

Keep **Use transmitted CC colors / opacity** checked to honor the stream.
Uncheck it to use Video.js caption color preferences instead.

All player assets are local. The page contains no sample stream URL, analytics
or service configuration. The playlist and segments must be reachable from your
browser with appropriate CORS headers. An HTTPS page requires HTTPS media.
Do not open the page directly as a `file://` URL.

## Embed in an existing site

Copy `dist/` to your web server:

```html
<link rel="stylesheet" href="dist/video-js.min.css">
<video id="player" class="video-js" controls playsinline></video>
<script src="dist/video.js"></script>
<script>
  const player = videojs('player', {
    fluid: true,
    cea708UseStreamStyles: true,
    html5: {
      nativeAudioTracks: false,
      nativeVideoTracks: false,
      nativeTextTracks: false,
      vhs: { overrideNative: true }
    }
  });
  // Provide your own playlist URL here.
  player.src({src: 'https://your-media-host.example/live/playlist.m3u8',
              type: 'application/x-mpegURL'});
</script>
```

## What is verified

- Cyrillic via P16 using mux.js's existing Unicode fallback; mixed Latin text.
- P16 boundary handling and existing explicit legacy-encoding behavior.
- Relative window anchors and left/right/center alignment.
- Transmitted text/background/window colors and opacity.
- Same-row incremental appends and in-place corrections without spurious rolls.
- Real H.264 HLS playback with CEA-708 SERVICE1 in Chromium, caption updates,
  stream reload and stop.
- Standalone regression tests, including 1,000 repeated cursor contexts.

## Compatibility scope

P16 is **not** a guarantee of Unicode support on every CEA-708 receiver. This
build fixes the Unicode fallback already used by mux.js, while preserving its
explicit `captionServices` encodings. It does not translate or transcribe audio.

Presentation/cursor extensions target relative, horizontal left-to-right
windows. Absolute positions, RTL/vertical writing, mixed styles within one
window, full cell-grid sizing, font-size commands, animation and border/edge
effects are not fully implemented. Flash opacity falls back to solid. Receiver
rendering need not be pixel-identical. This is not a HEVC-browser certification
or a long-duration soak-test claim.

## Tests and provenance

Node.js 18 or newer, no npm dependencies needed:

```sh
npm test
```

See [PATCHES.md](PATCHES.md) for implementation details and upstream references.
`patches/videojs-8.24.0.patch` reproduces the shipped JS from the official
Video.js 8.24.0 release. Original license notices remain intact.

## License

Apache-2.0. See [LICENSE](LICENSE), [UPSTREAM_LICENSE](UPSTREAM_LICENSE) and
[NOTICE](NOTICE). Video.js is a registered trademark of Brightcove Inc.; this
community build is not endorsed by the upstream project.
