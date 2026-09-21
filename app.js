'use strict';
let player = null;
let updates = 0;
const $ = id => document.getElementById(id);
const observed = new WeakSet();
const captionTracks = () => Array.from(player?.textTracks() || []).filter(t => ['captions', 'subtitles'].includes(t.kind));
function refresh() {
  $('tracks').replaceChildren(new Option('Off', '-1'));
  captionTracks().forEach((track, i) => {
    $('tracks').add(new Option(track.label || track.id || `Track ${i + 1}`, String(i)));
    if (track.mode === 'showing') $('tracks').value = String(i);
    if (!observed.has(track)) {
      observed.add(track);
      track.addEventListener('cuechange', () => { updates++; });
    }
  });
}
function diagnostics() {
  $('diagnostics').textContent = JSON.stringify({
    build: '1.0.0', videojs: videojs.VERSION,
    playbackSeconds: player ? Math.round(player.currentTime()) : 0,
    cueUpdates: updates,
    tracks: captionTracks().map(t => ({id:t.id, label:t.label, language:t.language, mode:t.mode, cues:t.cues?.length || 0}))
  }, null, 2);
}
$('load').addEventListener('submit', event => {
  event.preventDefault();
  let url;
  try {
    url = new URL($('url').value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  } catch (error) { $('status').textContent = 'Enter a valid HTTP or HTTPS playlist URL.'; return; }
  if (player) player.dispose();
  player = null; updates = 0;
  const video = document.createElement('video');
  video.className = 'video-js vjs-default-skin'; video.setAttribute('playsinline', '');
  $('host').replaceChildren(video);
  player = videojs(video, {controls:true, fluid:true, preload:'auto', cea708UseStreamStyles:$('stream-style').checked,
    html5:{nativeAudioTracks:false, nativeVideoTracks:false, nativeTextTracks:false, vhs:{overrideNative:true}}});
  window.p16Player = player;
  const instance = player;
  instance.on('error', () => { $('status').textContent = `Playback error: ${instance.error()?.message || 'Unknown error'}`; });
  instance.on('playing', () => { $('status').textContent = 'Playing — select a caption track below or in the CC menu.'; });
  instance.textTracks().addEventListener('addtrack', refresh);
  instance.textTracks().addEventListener('change', refresh);
  $('status').textContent = 'Loading…';
  instance.src({src:url.href, type:'application/x-mpegURL'});
  instance.play()?.catch(() => { if (player === instance && !instance.error()) $('status').textContent = 'Press Play to start playback.'; });
  refresh(); diagnostics();
});
$('tracks').addEventListener('change', () => {
  const index = Number($('tracks').value);
  captionTracks().forEach((track, i) => {track.mode = i === index ? 'showing' : 'disabled';});
});
$('stop').addEventListener('click', () => {
  if (player) player.dispose();
  player = null; window.p16Player = null;
  $('host').replaceChildren(); refresh();
  $('status').textContent = 'Stopped'; diagnostics();
});
$('stream-style').addEventListener('change', () => {
  if (!player) return;
  player.options_.cea708UseStreamStyles = $('stream-style').checked;
  player.textTrackDisplay.updateDisplay();
});
setInterval(diagnostics, 1000);
diagnostics();
