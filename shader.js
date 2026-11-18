window.HachiwareShader = (() => {
  const INK = -1;
  const PAPER = 0;
  const FUR = 1;
  const HAIR = 2;
  const BLUSH = 3;
  const WOOD = 4;
  const LEAF = 5;

  // 0..14 為草叢細字元 (c, e, a, d, o)，15+ 為厚實角色字元 (#, $, %, &, 8, B, Q, 0, O)
  const RAMP = " .,:;ceadoaeocd#$%&8BQ0O0OQ";

  const LOOK = {
    [FUR]:   { col: [238, 240, 244], floor: 0.15, puffy: true },
    [HAIR]:  { col: [114, 178, 244], floor: 0.18, puffy: true },
    [BLUSH]: { col: [238, 146, 177], floor: 0.12, puffy: true },
    [WOOD]:  { col: [204, 134, 72],  floor: 0.16, puffy: true },
    [LEAF]:  { col: [122, 176, 98],  floor: 0.10, puffy: false },
  };

  function classifyPixel(r, g, b) {
    const lum = (r + g + b) / 3;
    const maxc = r > g ? (r > b ? r : b) : (g > b ? g : b);
    const minc = r < g ? (r < b ? r : b) : (g < b ? g : b);
    const chroma = maxc - minc;

    if (lum < 100 || (lum < 140 && chroma < 35)) return INK;
    if (g - r > 8 && g - b > 8) return LEAF;
    if (r - g > 22 && r > 190 && b > g - 6) return BLUSH;
    if (r - b > 35 && r > g + 8 && lum < 215) return WOOD;
    if (b - r > 25 && b > 110) return HAIR;
    if (lum > 222 && chroma <= 3) return FUR;
    return PAPER;
  }

  // 填補封閉空洞（如實心區域內的小噪點），保留邊界外圍的黑色
  function fillInteriorHoles(solid, rows, cols) {
    const out = new Uint8Array(solid);
    const visited = new Uint8Array(rows * cols);
    const queue = new Int32Array(rows * cols);
    let head = 0;
    let tail = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          const i = r * cols + c;
          if (!solid[i] && !visited[i]) {
            visited[i] = 1;
            queue[tail++] = i;
          }
        }
      }
    }

    while (head < tail) {
      const idx = queue[head++];
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const neighbors = [
        r > 0 ? idx - cols : -1,
        r < rows - 1 ? idx + cols : -1,
        c > 0 ? idx - 1 : -1,
        c < cols - 1 ? idx + 1 : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && !solid[n] && !visited[n]) {
          visited[n] = 1;
          queue[tail++] = n;
        }
      }
    }

    for (let i = 0; i < rows * cols; i++) {
      if (!solid[i] && !visited[i]) {
        out[i] = 1;
      }
    }
    return out;
  }

  // 8 鄰域膨脹距離場（puff height）
  function computeDepth(solid, rows, cols, steps) {
    let edge = new Uint8Array(rows * cols);
    for (let i = 0; i < edge.length; i++) edge[i] = solid[i] ? 0 : 1;

    const d = new Float32Array(rows * cols);
    const nextEdge = new Uint8Array(rows * cols);

    for (let k = 0; k < steps; k++) {
      nextEdge.set(edge);
      for (let r = 0; r < rows; r++) {
        const rowOff = r * cols;
        for (let c = 0; c < cols; c++) {
          const i = rowOff + c;
          if (edge[i]) continue;
          // 檢查 8 鄰域是否有 edge
          let touched = false;
          for (let dr = -1; dr <= 1 && !touched; dr++) {
            const nr = r + dr;
            if (nr < 0 || nr >= rows) {
              touched = true;
              break;
            }
            const nRow = nr * cols;
            for (let dc = -1; dc <= 1; dc++) {
              const nc = c + dc;
              if (nc < 0 || nc >= cols || edge[nRow + nc]) {
                touched = true;
                break;
              }
            }
          }
          if (touched) nextEdge[i] = 1;
        }
      }
      edge.set(nextEdge);
      for (let i = 0; i < d.length; i++) {
        if (!edge[i]) d[i] += 1;
      }
    }

    const inv = steps > 0 ? 1 / steps : 1;
    for (let i = 0; i < d.length; i++) d[i] *= inv;
    return d;
  }

  // 假 3D 法線打光
  function computeShade(puff, rows, cols, lightAngleDeg) {
    const rad = (lightAngleDeg * Math.PI) / 180;
    const lx0 = Math.cos(rad) * 0.72;
    const ly0 = Math.sin(rad) * 0.72;
    const lz0 = 0.70;
    const lLen = Math.hypot(lx0, ly0, lz0);
    const lx = lx0 / lLen;
    const ly = ly0 / lLen;
    const lz = lz0 / lLen;

    const h = new Float32Array(rows * cols);
    for (let i = 0; i < h.length; i++) {
      h[i] = Math.sqrt(Math.max(0, Math.min(1, puff[i]))) * 6;
    }

    const out = new Float32Array(rows * cols);
    for (let r = 0; r < rows; r++) {
      const r0 = Math.max(0, r - 1);
      const r1 = Math.min(rows - 1, r + 1);
      for (let c = 0; c < cols; c++) {
        const c0 = Math.max(0, c - 1);
        const c1 = Math.min(cols - 1, c + 1);
        const gx = (h[r * cols + c1] - h[r * cols + c0]) / (c1 === c0 ? 1 : c1 - c0);
        const gy = (h[r1 * cols + c] - h[r0 * cols + c]) / (r1 === r0 ? 1 : r1 - r0);
        const nx = -gx;
        const ny = -gy;
        const nz = 1;
        const nLen = Math.hypot(nx, ny, nz);
        const lit = Math.max(0, Math.min(1, (nx * lx + ny * ly + nz * lz) / nLen));
        const puffVal = Math.max(0, Math.min(1, puff[r * cols + c]));
        out[r * cols + c] = Math.max(0, Math.min(1, 0.55 + 0.25 * lit + 0.25 * puffVal));
      }
    }
    return out;
  }

  class AsciiRenderer {
    constructor() {
      this.mem = null;
      this.lastCols = 0;
      this.lastRows = 0;
    }

    resetMemory() {
      this.mem = null;
    }

    render(sourceCtx, srcW, srcH, targetCanvas, opts) {
      const {
        cols = 96,
        steps = 6,
        ease = 0.25,
        lightAngle = -40,
        trueColor = false,
      } = opts;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const dispW = targetCanvas.clientWidth || 440;
      const dispH = targetCanvas.clientHeight || 302;
      if (targetCanvas.width !== Math.round(dispW * dpr) || targetCanvas.height !== Math.round(dispH * dpr)) {
        targetCanvas.width = Math.round(dispW * dpr);
        targetCanvas.height = Math.round(dispH * dpr);
      }

      const ctx = targetCanvas.getContext("2d");
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#020304";
      ctx.fillRect(0, 0, dispW, dispH);

      // 依顯示比例推算字元網格大小（等寬字寬高比約 0.56）
      const cellW = dispW / cols;
      const cellH = cellW / 0.56;
      const rows = Math.max(12, Math.floor(dispH / cellH));
      const padX = (dispW - cols * cellW) * 0.5;
      const padY = (dispH - rows * cellH) * 0.5;

      if (cols !== this.lastCols || rows !== this.lastRows) {
        this.mem = null;
        this.lastCols = cols;
        this.lastRows = rows;
      }

      const img = sourceCtx.getImageData(0, 0, srcW, srcH).data;
      const total = rows * cols;
      const SUB = 3;
      const STILL = 6.0;
      const MARGIN = 0.18;

      const cellRGB = new Float32Array(total * 3);
      const ink = new Float32Array(total);
      const major = new Int8Array(total);
      const cellMajorLum = new Float32Array(total);
      const countsArr = new Int16Array(total * 6);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          let sr = 0, sg = 0, sb = 0, inkCnt = 0;
          const cnt = [0, 0, 0, 0, 0, 0];
          const lumSum = [0, 0, 0, 0, 0, 0];

          for (let sy = 0; sy < SUB; sy++) {
            const py = Math.min(srcH - 1, Math.floor(((r + (sy + 0.5) / SUB) / rows) * srcH));
            for (let sx = 0; sx < SUB; sx++) {
              const px = Math.min(srcW - 1, Math.floor(((c + (sx + 0.5) / SUB) / cols) * srcW));
              const pOff = (py * srcW + px) * 4;
              const pr = img[pOff];
              const pg = img[pOff + 1];
              const pb = img[pOff + 2];
              sr += pr;
              sg += pg;
              sb += pb;
              const cls = classifyPixel(pr, pg, pb);
              if (cls === INK) inkCnt++;
              else {
                cnt[cls]++;
                lumSum[cls] += (pr + pg + pb) / 3;
              }
            }
          }

          const samples = SUB * SUB;
          cellRGB[i * 3] = sr / samples;
          cellRGB[i * 3 + 1] = sg / samples;
          cellRGB[i * 3 + 2] = sb / samples;
          ink[i] = inkCnt / samples;

          let bestCls = 0;
          let bestCnt = -1;
          for (let k = 0; k < 6; k++) {
            countsArr[i * 6 + k] = cnt[k];
            if (cnt[k] > bestCnt) {
              bestCnt = cnt[k];
              bestCls = k;
            }
          }
          major[i] = bestCls;
          cellMajorLum[i] = bestCnt > 0 ? lumSum[bestCls] / bestCnt : 180;
        }
      }

      const prev = this.mem;
      const movedRaw = new Uint8Array(total);
      for (let i = 0; i < total; i++) {
        if (!prev) {
          movedRaw[i] = 1;
        } else {
          const dr = Math.abs(cellRGB[i * 3] - prev.cellRGB[i * 3]);
          const dg = Math.abs(cellRGB[i * 3 + 1] - prev.cellRGB[i * 3 + 1]);
          const db = Math.abs(cellRGB[i * 3 + 2] - prev.cellRGB[i * 3 + 2]);
          movedRaw[i] = Math.max(dr, dg, db) > STILL ? 1 : 0;
        }
      }

      // 1 格膨脹保護動態邊界
      const moved = new Uint8Array(total);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          let m = movedRaw[i];
          if (!m) {
            for (let dr = -1; dr <= 1 && !m; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && movedRaw[nr * cols + nc]) {
                  m = 1;
                  break;
                }
              }
            }
          }
          moved[i] = m;
        }
      }

      if (prev) {
        for (let i = 0; i < total; i++) {
          const e = moved[i] ? 1.0 : ease;
          ink[i] = prev.ink[i] + e * (ink[i] - prev.ink[i]);
          if (!moved[i]) {
            const pm = prev.major[i];
            const held = countsArr[i * 6 + pm];
            let best = 0;
            for (let k = 0; k < 6; k++) {
              if (countsArr[i * 6 + k] > best) best = countsArr[i * 6 + k];
            }
            if (held >= 0.6 * best) {
              major[i] = pm;
            }
          }
        }
      }

      // 3x3 鄰域 ink 平均值 (ndimage.uniform_filter(ink, 3))
      const near = new Float32Array(total);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let sum = 0;
          for (let dr = -1; dr <= 1; dr++) {
            const nr = Math.max(0, Math.min(rows - 1, r + dr));
            for (let dc = -1; dc <= 1; dc++) {
              const nc = Math.max(0, Math.min(cols - 1, c + dc));
              sum += ink[nr * cols + nc];
            }
          }
          near[r * cols + c] = sum / 9;
        }
      }

      const hole = new Uint8Array(total);
      const solid = new Uint8Array(total);
      for (let i = 0; i < total; i++) {
        if (trueColor) {
          const lum = (cellRGB[i * 3] + cellRGB[i * 3 + 1] + cellRGB[i * 3 + 2]) / 3;
          hole[i] = lum < 24 ? 1 : 0;
          solid[i] = hole[i] ? 0 : 1;
        } else {
          const lift = prev ? (prev.hole[i] ? -MARGIN : MARGIN) : 0;
          const isHole = ink[i] > 0.5 + lift || (ink[i] > 0.25 + lift && near[i] < 0.35);
          hole[i] = isHole ? 1 : 0;
          solid[i] = !isHole && major[i] !== PAPER ? 1 : 0;
        }
      }

      const filled = fillInteriorHoles(solid, rows, cols);
      const puff = computeDepth(filled, rows, cols, steps);
      const bright = computeShade(puff, rows, cols, lightAngle);

      const level = new Float32Array(total);
      const sameArr = new Uint8Array(total);
      for (let i = 0; i < total; i++) {
        if (trueColor) {
          const lum = (cellRGB[i * 3] + cellRGB[i * 3 + 1] + cellRGB[i * 3 + 2]) / (3 * 255);
          level[i] = Math.max(0.15, Math.min(1, 0.35 * lum + 0.65 * bright[i]));
        } else {
          const spec = LOOK[major[i]];
          if (spec) {
            let b = spec.puffy ? bright[i] : 0.75;
            if (major[i] === LEAF) {
              b = Math.max(0.25, Math.min(1.0, (cellMajorLum[i] - 120) / 110));
            }
            level[i] = spec.floor + (1 - spec.floor) * b;
          }
        }
        const same = prev && !moved[i] && major[i] === prev.major[i] && solid[i] && prev.solid[i] ? 1 : 0;
        sameArr[i] = same;
        if (same) {
          level[i] = prev.level[i] + ease * (level[i] - prev.level[i]);
        }
      }

      const idxArr = new Int16Array(total);
      const rampLen = RAMP.length;
      for (let i = 0; i < total; i++) {
        let idx = 1 + Math.min(Math.floor(level[i] * rampLen), rampLen - 1);
        if (sameArr[i]) {
          const centre = (prev.idx[i] - 0.5) / rampLen;
          if (Math.abs(level[i] - centre) < 1.3 / rampLen) {
            idx = prev.idx[i];
          }
        }
        if (!trueColor && major[i] === LEAF) {
          idx = Math.min(idx, 14);
        }
        idxArr[i] = idx;
      }

      this.mem = {
        cellRGB,
        ink,
        major,
        hole,
        solid,
        level,
        idx: idxArr,
      };

      const fontSize = Math.max(8, cellH * 0.94);
      ctx.font = `700 ${fontSize.toFixed(1)}px "JetBrains Mono", "Cascadia Code", Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let activeChars = 0;

      if (trueColor) {
        for (let r = 0; r < rows; r++) {
          const cy = padY + (r + 0.5) * cellH;
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (!solid[i]) continue;
            const ch = RAMP[Math.max(0, Math.min(rampLen - 1, idxArr[i]))];
            if (ch === " ") continue;
            const boost = 0.85 + 0.25 * level[i];
            const rr = Math.min(255, Math.round(cellRGB[i * 3] * boost));
            const gg = Math.min(255, Math.round(cellRGB[i * 3 + 1] * boost));
            const bb = Math.min(255, Math.round(cellRGB[i * 3 + 2] * boost));
            ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
            ctx.fillText(ch, padX + (c + 0.5) * cellW, cy);
            activeChars++;
          }
        }
      } else {
        // 依色彩分桶繪製以大幅減少 fillStyle 切換次數
        for (const clsKey of [LEAF, WOOD, HAIR, BLUSH, FUR]) {
          const col = LOOK[clsKey].col;
          for (let r = 0; r < rows; r++) {
            const cy = padY + (r + 0.5) * cellH;
            for (let c = 0; c < cols; c++) {
              const i = r * cols + c;
              if (!solid[i] || major[i] !== clsKey) continue;
              const ch = RAMP[Math.max(0, Math.min(rampLen - 1, idxArr[i]))];
              if (ch === " ") continue;
              const tint = 0.90 + 0.30 * level[i];
              const rr = Math.min(255, Math.round(col[0] * tint));
              const gg = Math.min(255, Math.round(col[1] * tint));
              const bb = Math.min(255, Math.round(col[2] * tint));
              ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
              ctx.fillText(ch, padX + (c + 0.5) * cellW, cy);
              activeChars++;
            }
          }
        }
      }

      ctx.restore();
      return { rows, cols, activeChars };
    }
  }

  return {
    AsciiRenderer,
  };
})();
