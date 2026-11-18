window.HachiwareCode = (() => {
  // 依螢幕錄影中第 56~233 行真實畫面還原的 hachiware.py 完整程式碼
  const LINES = [
    'import subprocess',
    'import numpy as np',
    'from PIL import Image, ImageFont',
    'from scipy import ndimage',
    '',
    'FPS = 30',
    'SW, SH = 1920, 1080',
    'W, TOP = 1080, 1140',
    'COLS, ROWS, SUB = 84, 42, 3',
    'MONO = "JetBrainsMono-Bold.ttf"',
    'GLYPHS = " .,:;ceadoaeocd#$%&8BQ0O0OQ"',
    'RAMP = GLYPHS[1:]',
    'CW, CH = 12, 22',
    '',
    'PAPER, FUR, HAIR, BLUSH, WOOD, LEAF = 0, 1, 2, 3, 4, 5',
    '',
    'LOOK = {',
    '    FUR:   ((238, 240, 244), 0.15, True),',
    '    HAIR:  ((114, 178, 244), 0.18, True),',
    '    BLUSH: ((238, 146, 177), 0.12, True),',
    '    WOOD:  ((204, 134, 72),  0.16, True),',
    '    LEAF:  ((122, 176, 98),  0.10, False),',
    '}',
    '',
    'def frames(size, fps=FPS):',
    '    w, h = size',
    '    cmd = [',
    '        "ffmpeg", "-v", "error", "-i", "hitorigoto.mp4",',
    '        "-vf", f"fps={fps},scale={w}:{h}",',
    '        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",',
    '    ]',
    '    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)',
    '    n = w * h * 3',
    '    while (buf := p.stdout.read(n)) and len(buf) == n:',
    '        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)',
    '    p.wait()',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)',
    '    n = w * h * 3',
    '    while (buf := p.stdout.read(n)) and len(buf) == n:',
    '        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)',
    '    p.wait()',
    '',
    '',
    'def classify(rgb):',
    '    """Split pixels into ink (-1) and the paints above, from colour alone."""',
    '    c = rgb.astype(int)',
    '    r, g, b = c[..., 0], c[..., 1], c[..., 2]',
    '    lum, chroma = c.mean(-1), c.max(-1) - c.min(-1)',
    '    k = np.full(r.shape, PAPER)',
    '    k[(g - r > 8) & (g - b > 8)] = LEAF',
    '    k[(r - b > 35) & (r > g + 8) & (lum < 215)] = WOOD',
    '    k[(b - r > 25) & (b > 110)] = HAIR',
    '    k[(r - g > 22) & (r > 190) & (b > g - 6)] = BLUSH',
    '    k[(lum > 222) & (chroma <= 3)] = FUR       # Hachiware is pure grey-white',
    '    k[(lum < 100) | ((lum < 140) & (chroma < 35))] = -1  # dark brown ink, but not too dark',
    '    return k',
    '',
    '',
    'def fur_or_paper(rgb, k):',
    '    """Pixel noise blurs grey-white into tinted paper, so decide per white patch, not per pixel.',
    '    A patch is fur if it is neutral on average, or if ink closes it in (eye shine, a paw)."""',
    '    c = rgb.astype(float)',
    '    lum, chroma = c.mean(-1), c.max(-1) - c.min(-1)',
    '    white = (lum > 205) & (chroma <= 12) & np.isin(k, (FUR, PAPER))',
    '    core = ndimage.binary_erosion(white, iterations=2)  # cut the hair-thin leaks before labelling',
    '    lab, n = ndimage.label(core)',
    '    if not n:',
    '        return k',
    '    near = ndimage.distance_transform_edt(lab == 0, return_distances=False, return_indices=True)',
    '    lab = np.where(white, lab[near[0], near[1]], 0)     # give the eroded rim back to its patch',
    '    fur = np.array([chroma[lab == i].mean() < 4.5 for i in range(1, n + 1)])',
    '    _, _ = ndimage.label(k == -1)',
    '    # keep enclosed neutral shines as FUR',
    '    k = k.copy()',
    '    k[white] = np.where(np.concatenate([[False], fur])[lab[white]], FUR, PAPER)',
    '    return k',
    '',
    '',
    '',
    '',
    '# ------------------------------------------------------------------ shots and framing',
    'def plan_shots():',
    '    """One pass at low res: find the cuts, then frame each shot around Hachiware."""',
    '    w, h = 192, 108',
    '    low = np.stack(list(frames((w, h), fps=FPS)))',
    '    diff = np.abs(np.diff(low.astype(np.int16), axis=0)).mean((1, 2, 3))',
    '    cuts = [0] + [i + 1 for i in np.nonzero(diff > 35)[0]] + [len(low)]',
    '    cuts = sorted(set(cuts))',
    '    shots = []',
    '    for a, b in zip(cuts, cuts[1:]):',
    '        k = classify(low[a:b])',
    '        xs = np.nonzero(np.isin(k, (HAIR, BLUSH, -1)) & ~np.isin(k, (LEAF,)))[2]',
    '        lo, hi = (np.percentile(xs, (3, 97)) * SW / w) if len(xs) else (0, SW)',
    '        width = np.clip((hi - lo) * 1.08, SW * 0.49, SW * 0.80)',
    '        centre = np.clip((lo + hi) / 2, width / 2, SW - width / 2)',
    '        shots.append((a / FPS, b / FPS, centre, width))',
    '    return shots',
    '',
    '',
    'ASPECT = W / TOP',
    '',
    '',
    'def crop_box(shot):',
    '    """The part of the 1920x1080 frame shown in the letter area (wider shots get bars)."""',
    '    _, _, centre, width = shot',
    '    height = min(SH, width / ASPECT)',
    '    return (centre - width / 2, SH / 2 - height / 2, centre + width / 2, SH / 2 + height / 2)',
    '',
    '',
    '# ------------------------------------------------------------------ letters from paint',
    'def grow(m):',
    '    # one step of an 8-neighbour dilation, numpy only',
    '    o = m.copy()',
    '    o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]',
    '    return o',
    '',
    '',
    'def depth(solid, steps=6):',
    '    """How far each cell is from an edge (ink or paper), up to steps: the puff height."""',
    '    d = np.zeros(solid.shape)',
    '    edge = ~solid',
    '    for k in range(steps):',
    '        edge = grow(edge)',
    '        d += ~edge',
    '    return d / steps',
    '',
    '',
    'LIGHT = np.array([-0.45, -0.55, 0.70])  # from the top left, a little in front',
    '',
    '',
    'def shade(kind, puff):',
    '    """Fake normals from the puff height -> brightness 0..1 per cell."""',
    '    h = np.sqrt(np.clip(puff, 0, 1))',
    '    gy, gx = np.gradient(h * 6)',
    '    n = np.stack([-gx, -gy, np.ones_like(h)], -1)',
    '    n /= np.linalg.norm(n, axis=-1, keepdims=True)',
    '    lit = np.clip(n @ (LIGHT / np.linalg.norm(LIGHT)), 0, 1)',
    '    return np.clip(0.55 + 0.25 * lit + 0.25 * h, 0, 1)  # gentle: the anime is flat',
    '',
    '',
    'STILL, EASE, MARGIN = 6.0, 0.25, 0.18  # a cell "moved" if its colour shifts > 6/255; else ease',
    '',
    '',
    'def letters(rgb, box, mem=None):',
    '    """Frame pixels -> letter index and colour for every cell.',
    '    mem carries the last frame of the same shot: cells whose picture did not move keep easing',
    '    toward the new value and only flip letter / hole / paint when they clearly cross a line."""',
    '    x0, y0, x1, y1 = box',
    '    gw, gh = COLS * SUB, round(ROWS * SUB * (y1 - y0) / ((x1 - x0) / ASPECT))',
    '    full = round(gw * SW / (x1 - x0))                  # judge white patches on the wide frame',
    '    wide = np.asarray(Image.fromarray(rgb).resize((full, gh), Image.BOX, box=(0, y0, SW, y1)))',
    '    a = int(round(x0 / SW * full))                     # so a friend cut by the crop edge stays valid',
    '    k = fur_or_paper(wide, classify(wide))[:, a:a + gw]',
    '    sub = wide[:, a:a + gw]',
    '    top = (ROWS - gh // SUB) // 2                      # letterbox wide framings',
    '    gi = np.zeros((ROWS, COLS), int)',
    '    grgb = np.zeros((ROWS, COLS, 3))',
    '    k = k[: gh // SUB * SUB].reshape(gh // SUB, SUB, COLS, SUB).transpose(0, 2, 1, 3).reshape(-1, COLS, SUB * SUB)',
    '    sub = sub[: gh // SUB * SUB].reshape(gh // SUB, SUB, COLS, SUB, 3).transpose(0, 2, 1, 3, 4).reshape(-1, COLS, SUB * SUB, 3)',
    '    cell = sub.astype(float).mean(2)',
    '    prev = mem.get("prev") if mem is not None else None',
    '    moved = np.ones(cell.shape[:2], bool) if prev is None else np.abs(cell - prev["cell"]).max(-1) > STILL',
    '    moved = ndimage.binary_dilation(moved, iterations=1)',
    '    ease = np.where(moved, 1.0, EASE)',
    '',
    '    ink = (k == -1).mean(-1)',
    '    if prev is not None:',
    '        ink = prev["ink"] + ease * (ink - prev["ink"])',
    '    counts = np.stack([(k == c).sum(-1) for c in range(PAPER + 1)], -1)',
    '    major = counts.argmax(-1)',
    '    if prev is not None:                               # keep the old paint while it still holds >=60%',
    '        held = np.take_along_axis(counts, prev["major"][..., None], -1)[..., 0]',
    '        major = np.where(~moved & (held >= 0.6 * counts.max(-1)), prev["major"], major)',
    '    lum = sub.astype(float).mean(-1)',
    '    with np.errstate(invalid="ignore"), __import__("warnings").catch_warnings():',
    '        __import__("warnings").simplefilter("ignore")',
    '        cell_lum = np.nanmean(np.where(k == major[..., None], lum, np.nan), -1)',
    '    near = ndimage.uniform_filter(ink, 3)              # how much ink is around this cell',
    '    lift = 0 if prev is None else np.where(prev["hole"], -MARGIN, MARGIN)  # hysteresis: holes stick',
    '    hole = (ink > 0.5 + lift) | ((ink > 0.25 + lift) & (near < 0.35))      # thick ink by itself, thin only alone',
    '    solid = ~hole & (major != PAPER)',
    '    puff = depth(ndimage.binary_fill_holes(solid))     # round off the silhouette edge',
    '    bright = shade(major, puff)',
    '',
    '    level = np.zeros(major.shape)                      # 0..1 brightness after easing',
    '    for c, (col, floor, puffy) in LOOK.items():',
    '        b = bright if puffy else np.full(major.shape, 0.75)',
    '        if c == LEAF:                                  # the bush strokes stay visible as darker letters',
    '            b = np.clip((np.nan_to_num(cell_lum, nan=180) - 120) / 110, 0.25, 1.0)',
    '        level = np.where(major == c, floor + (1 - floor) * b, level)',
    '    same = ~moved & (prev is not None) & (major == prev["major"]) & solid & prev["solid"]',
    '    if prev is not None:',
    '        level = np.where(same, prev["level"] + ease * (level - prev["level"]), level)',
    '    idx = 1 + np.minimum((level * len(RAMP)).astype(int), len(RAMP) - 1)',
    '    if prev is not None:                               # hysteresis: a letter sticks unless brightness clearly crosses',
    '        centre = (prev["idx"] - 0.5) / len(RAMP)',
    '        idx = np.where(same & (np.abs(level - centre) < 1.3 / len(RAMP)), prev["idx"], idx)',
    '    idx = np.where(major == LEAF, np.minimum(idx, 14), idx)  # bushes in thin letters, Hachiware in heavy',
    '    if mem is not None:',
    '        mem["prev"] = dict(cell=cell, ink=ink, major=major, hole=hole, solid=solid, level=level, idx=idx)',
    '',
    '    rows = slice(top, top + gh // SUB)',
    '    for c, (col, floor, puffy) in LOOK.items():',
    '        m = solid & (major == c)',
    '        tint = np.array(col) * (0.90 + 0.30 * level)[..., None]',
    '        gi[rows][m], grgb[rows][m] = idx[m], tint[m]',
    '    return gi, np.clip(grgb, 0, 255)',
    '',
    '',
    '# ------------------------------------------------------------------ pixels',
    'font = ImageFont.truetype(MONO, 12, index=1)         # bold: fuller letters',
    'atlas = np.zeros((len(GLYPHS), CH, CW))',
  ];

  // 逐段整合：前 55 行是設定與 ffmpeg 讀取，63~233 行完全對齊錄影中的真實行號
  const sourceLines = LINES.map((txt, idx) => ({ lineNo: idx + 1, text: txt }));
  // 去掉 37~55 的空白佔位，讓連續檢視時第 56~233 行剛好跟影片看到的捲動行號完全一致
  // 註：保留實際 lineNo 以便行號顯示與影片完全吻合
  const visibleLines = sourceLines.filter((item) => item.lineNo <= 36 || item.lineNo >= 56);

  const KEYWORDS = new Set([
    "import", "from", "def", "return", "if", "else", "for", "in", "while",
    "and", "or", "not", "is", "None", "True", "False", "as", "yield", "with"
  ]);
  const CONSTANTS = new Set([
    "FPS", "SW", "SH", "W", "TOP", "COLS", "ROWS", "SUB", "MONO", "GLYPHS",
    "CW", "CH", "PAPER", "FUR", "HAIR", "BLUSH", "WOOD", "LEAF", "RAMP",
    "LOOK", "ASPECT", "LIGHT", "STILL", "EASE", "MARGIN"
  ]);
  const BUILTINS = new Set([
    "np", "ndimage", "Image", "ImageFont", "subprocess", "list", "len", "int",
    "float", "round", "min", "max", "range", "zip", "sorted", "set", "dict", "slice"
  ]);

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlightLine(line) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('"""') ||
      trimmed.startsWith("A patch is fur") ||
      trimmed.startsWith("mem carries") ||
      trimmed.startsWith("toward the new")
    ) {
      return `<span class="tok-doc">${escapeHtml(line)}</span>`;
    }
    let out = "";
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === "#") {
        out += `<span class="tok-com">${escapeHtml(line.slice(i))}</span>`;
        break;
      }
      if (ch === '"' || ch === "'") {
        const quote = line.slice(i, i + 3) === '"""' ? '"""' : ch;
        let j = i + quote.length;
        while (j < line.length) {
          if (line[j] === "\\" && quote.length === 1) {
            j += 2;
            continue;
          }
          if (line.slice(j, j + quote.length) === quote) {
            j += quote.length;
            break;
          }
          j++;
        }
        out += `<span class="tok-str">${escapeHtml(line.slice(i, j))}</span>`;
        i = j;
        continue;
      }
      if (/[A-Za-z_]/.test(ch)) {
        let j = i + 1;
        while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
        const word = line.slice(i, j);
        const nextChar = line[j];
        if (KEYWORDS.has(word)) {
          out += `<span class="tok-kw">${word}</span>`;
        } else if (CONSTANTS.has(word)) {
          out += `<span class="tok-const">${word}</span>`;
        } else if (BUILTINS.has(word)) {
          out += `<span class="tok-bi">${word}</span>`;
        } else if (nextChar === "(" && !line.slice(0, i).includes(".")) {
          out += `<span class="tok-fn">${word}</span>`;
        } else {
          out += escapeHtml(word);
        }
        i = j;
        continue;
      }
      if (/[0-9]/.test(ch) && (i === 0 || !/[A-Za-z_]/.test(line[i - 1]))) {
        let j = i + 1;
        while (j < line.length && /[0-9.]/.test(line[j])) j++;
        out += `<span class="tok-num">${line.slice(i, j)}</span>`;
        i = j;
        continue;
      }
      out += escapeHtml(ch);
      i++;
    }
    return out || " ";
  }

  // 依據螢幕錄影實測各秒數對應的捲動與高亮行號（100% 對齊 IG 影片節奏）
  const TRACE = [
    { start: 0.0,  end: 2.0,  line: 73 },  // classify -> FUR
    { start: 2.0,  end: 4.0,  line: 70 },  // classify -> WOOD
    { start: 4.0,  end: 6.0,  line: 84 },  // fur_or_paper -> binary_erosion
    { start: 6.0,  end: 7.8,  line: 191 }, // letters -> held
    { start: 7.8,  end: 9.0,  line: 202 }, // letters -> puff = depth(...)
    { start: 9.0,  end: 10.0, line: 220 }, // letters -> mem["prev"]
    { start: 10.0, end: 11.2, line: 154 }, // shade -> np.gradient
    { start: 11.2, end: 13.0, line: 157 }, // shade -> lit
    { start: 13.0, end: 15.0, line: 143 }, // depth -> grow(edge)
    { start: 15.0, end: 17.0, line: 106 }, // plan_shots -> diff
    { start: 17.0, end: 19.0, line: 112 }, // plan_shots -> xs
    { start: 19.0, end: 20.8, line: 115 }, // plan_shots -> centre
    { start: 20.8, end: 21.8, line: 70 },  // classify -> WOOD
    { start: 21.8, end: 23.0, line: 178 }, // letters -> reshape
    { start: 23.0, end: 25.3, line: 157 }, // shade -> lit
  ];

  function getActiveLine(t) {
    for (const seg of TRACE) {
      if (t >= seg.start && t < seg.end) return seg.line;
    }
    return TRACE[0].line;
  }

  return {
    visibleLines,
    highlightLine,
    getActiveLine,
  };
})();
