// Shared ASCII renderer: used by the player (app.js) and the builder (tools/build.html).
// A frame is two byte planes of rows*cols: glyph index (0 = blank) and palette index.
window.AsciiRenderer = (() => {
  const ATLAS_CW = 24;
  const ATLAS_CH = 40;

  // Pre-render every glyph x palette colour once; playback then only does drawImage blits.
  function makeAtlas(ramp, palette) {
    const atlas = document.createElement("canvas");
    atlas.width = ramp.length * ATLAS_CW;
    atlas.height = palette.length * ATLAS_CH;
    const ctx = atlas.getContext("2d");
    ctx.font = `700 34px "JetBrains Mono", "Cascadia Mono", "Cascadia Code", Consolas, "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let p = 0; p < palette.length; p++) {
      const cy = p * ATLAS_CH + ATLAS_CH * 0.54;
      for (let g = 1; g < ramp.length; g++) {
        const ch = ramp[g];
        if (!ch || ch === " ") continue;
        const x = g * ATLAS_CW + ATLAS_CW * 0.5;
        // soft glow under the letter, then the crisp letter on top
        ctx.shadowColor = palette[p];
        ctx.shadowBlur = 6;
        ctx.fillStyle = palette[p];
        ctx.globalAlpha = 0.55;
        ctx.fillText(ch, x, cy);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.fillText(ch, x, cy);
      }
    }
    return atlas;
  }

  // Draw one frame centred in the canvas, keeping the cell aspect.
  function drawFrame(ctx, atlas, glyphs, colors, offset, rows, cols, cellAspect) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const cellW = Math.min(W / cols, (H / rows) * cellAspect);
    const cellH = cellW / cellAspect;
    const padX = (W - cols * cellW) * 0.5;
    const padY = (H - rows * cellH) * 0.5;
    for (let r = 0; r < rows; r++) {
      const dy = padY + r * cellH;
      const base = offset + r * cols;
      for (let c = 0; c < cols; c++) {
        const g = glyphs[base + c];
        if (g === 0) continue;
        ctx.drawImage(
          atlas,
          g * ATLAS_CW, colors[base + c] * ATLAS_CH, ATLAS_CW, ATLAS_CH,
          padX + c * cellW, dy, cellW, cellH
        );
      }
    }
  }

  // Undo the builder's frame-delta coding in place: byte[i] += byte[i - frameSize] (mod 256).
  function undelta(plane, frameSize) {
    for (let i = frameSize; i < plane.length; i++) {
      plane[i] = (plane[i] + plane[i - frameSize]) & 255;
    }
  }

  async function inflateBase64(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  return { makeAtlas, drawFrame, undelta, inflateBase64 };
})();
