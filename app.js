(async () => {
  const DATA = window.HACHIWARE_ASCII_DATA;
  const R = window.AsciiRenderer;
  const canvas = document.getElementById("asciiCanvas");
  const audio = document.getElementById("bgmAudio");
  if (!DATA) return;

  audio.src = encodeURI("./【ちいかわ】ひとりごつ.mp4");
  audio.loop = true;
  audio.autoplay = true;

  // ---- decode frames: [glyph plane][colour plane], optionally delta-coded per frame
  const { fps, frames, rows, cols, dur, ramp, palette } = DATA;
  const cellAspect = DATA.cellAspect || 0.56;
  const frameSize = rows * cols;
  const raw = await R.inflateBase64(DATA.dataB64);
  const glyphs = raw.subarray(0, frames * frameSize);
  const colors = raw.subarray(frames * frameSize);
  if (DATA.delta) {
    R.undelta(glyphs, frameSize);
    R.undelta(colors, frameSize);
  }
  const atlas = R.makeAtlas(ramp, palette);
  const ctx = canvas.getContext("2d");

  // ---- playback clock: follow the audio when it plays, otherwise run continuously
  const q = parseFloat(new URLSearchParams(location.search).get("t") || "0");
  let clock = Number.isFinite(q) ? q % dur : 0;
  let lastDrawn = -1;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      lastDrawn = -1;
    }
  }

  function draw() {
    resize();
    const f = Math.min(frames - 1, Math.floor(clock * fps));
    if (f !== lastDrawn) {
      R.drawFrame(ctx, atlas, glyphs, colors, f * frameSize, rows, cols, cellAspect);
      lastDrawn = f;
    }
  }

  const audioLive = () => !audio.paused && audio.readyState >= 2;

  function ensurePlay() {
    if (!audio.paused) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = clock % audio.duration;
    }
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
  }

  let lastTs = 0;
  function tick(ts) {
    const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    if (audioLive()) clock = audio.currentTime % dur;
    else clock = (clock + dt) % dur;
    draw();
    requestAnimationFrame(tick);
  }

  for (const evt of ["pointerdown", "keydown", "touchstart", "wheel"]) {
    window.addEventListener(evt, ensurePlay, { passive: true });
  }
  audio.addEventListener("ended", () => {
    clock = 0;
    ensurePlay();
  });
  window.addEventListener("resize", () => { lastDrawn = -1; });

  draw();
  ensurePlay();
  requestAnimationFrame(tick);
})();
