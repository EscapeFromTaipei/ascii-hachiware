window.HachiwareScenes = (() => {
  const COL = {
    PAPER: "#faf6e8",
    INK:   "#241812",
    FUR:   "#ffffff",
    HAIR:  "#529cf2",
    BLUSH: "#f59eb8",
    WOOD:  "#c67c3a",
    WOOD_LIGHT: "#d68d46",
    LEAF:  "#6ca654",
  };

  const SHOTS = [
    { id: 1, start: 0.0,  end: 6.0,  letters: 8, label: "彈吉他開場",   hud: "shot 01/25 · ひとりごつ" },
    { id: 2, start: 6.0,  end: 10.0, letters: 6, label: "側臉特寫",     hud: "shot 02/25 · ひとりごつ" },
    { id: 3, start: 10.0, end: 13.0, letters: 5, label: "吉伊草叢伴唱", hud: "shot 03/25 · ひとりごつ" },
    { id: 4, start: 13.0, end: 15.0, letters: 5, label: "近景甜笑",     hud: "shot 04/25 · ひとりごつ" },
    { id: 5, start: 15.0, end: 20.8, letters: 5, label: "草叢吉他獨奏", hud: "shot 05/25 · ひとりごつ" },
    { id: 6, start: 20.8, end: 21.8, letters: 5, label: "正面定格",     hud: "shot 06/25 · ひとりごつ" },
    { id: 7, start: 21.8, end: 23.0, letters: 5, label: "閃亮雙眼特寫", hud: "shot 07/25 · ひとりごつ" },
    { id: 8, start: 23.0, end: 26.0, letters: 6, label: "歡樂尾奏",     hud: "shot 08/25 · ひとりごつ" },
  ];

  function getShotAt(t) {
    const wrapped = ((t % 25.22) + 25.22) % 25.22;
    for (const s of SHOTS) {
      if (wrapped >= s.start && wrapped < s.end) return s;
    }
    return SHOTS[0];
  }

  function strokeFill(ctx, fillStyle, lineWidth = 4.5) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
    if (lineWidth > 0) {
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = COL.INK;
      ctx.stroke();
    }
  }

  function drawBushes(ctx, w, h, sway, mode = "both") {
    const drawCluster = (cx, cy, r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.65, cy + r * 0.25, r * 0.72, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.65, cy + r * 0.25, r * 0.72, 0, Math.PI * 2);
      strokeFill(ctx, COL.LEAF, 4.5);

      // 葉叢內側陰影與亮面層次（讓 LEAF 字元密度呈 a/c/d/e 變化）
      ctx.beginPath();
      ctx.arc(cx - r * 0.2, cy - r * 0.15, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = "#80bc66";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + r * 0.3, cy + r * 0.28, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "#568a40";
      ctx.fill();
    };

    if (mode === "ground" || mode === "both") {
      ctx.fillStyle = COL.LEAF;
      ctx.fillRect(0, h * 0.84, w, h * 0.2);
      // 加入柔和草紋變化讓 LEAF 亮度自然分散在 c/e/a/d/o 字元
      for (let gx = -20; gx < w + 20; gx += 26) {
        ctx.beginPath();
        ctx.ellipse(gx + sway * 2, h * 0.90, 16, 7, 0.15, 0, Math.PI * 2);
        ctx.fillStyle = gx % 52 === 0 ? "#82be68" : "#5a9044";
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(0, h * 0.84);
      ctx.lineTo(w, h * 0.84);
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = COL.INK;
      ctx.stroke();
    }
    if (mode === "left-corner") {
      drawCluster(22 + sway * 3, h * 0.90, 44);
    }
    if (mode === "both") {
      drawCluster(26 + sway * 3, h * 0.68, 48);
      drawCluster(70 + sway * 2, h * 0.80, 42);
      drawCluster(w - 22 - sway * 3, h * 0.66, 50);
      drawCluster(w - 68 - sway * 2, h * 0.79, 40);
    }
    if (mode === "meadow") {
      drawCluster(w * 0.42 + sway * 2, h * 0.72, 62);
      drawCluster(w * 0.56 - sway * 2, h * 0.52, 54);
      drawCluster(30 + sway * 2, h * 0.76, 52);
    }
  }

  function drawGuitar(ctx, cx, cy, scale, strumPhase) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.rotate(-0.16);

    // 吉他琴頸
    ctx.beginPath();
    ctx.roundRect(38, -15, 76, 18, 5);
    strokeFill(ctx, COL.WOOD, 5);

    // 琴頭
    ctx.beginPath();
    ctx.roundRect(108, -20, 24, 28, 6);
    strokeFill(ctx, COL.WOOD, 5);

    // 吉他上下圓弧琴身
    ctx.beginPath();
    ctx.ellipse(-28, 6, 46, 40, 0, 0, Math.PI * 2);
    strokeFill(ctx, COL.WOOD, 5.5);

    ctx.beginPath();
    ctx.ellipse(18, 0, 36, 32, 0, 0, Math.PI * 2);
    strokeFill(ctx, COL.WOOD_LIGHT, 5.5);

    // 融合琴身內部
    ctx.beginPath();
    ctx.ellipse(-26, 6, 42, 36, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL.WOOD;
    ctx.fill();

    // 音孔（墨色空洞）
    ctx.beginPath();
    ctx.arc(8, 1, 14, 0, Math.PI * 2);
    ctx.fillStyle = COL.INK;
    ctx.fill();

    // 琴橋
    ctx.beginPath();
    ctx.roundRect(-42, -5, 10, 24, 3);
    ctx.fillStyle = COL.INK;
    ctx.fill();

    // 琴弦（細線）
    ctx.strokeStyle = COL.INK;
    ctx.lineWidth = 2;
    for (let s = -4; s <= 4; s += 4) {
      ctx.beginPath();
      ctx.moveTo(-32, 1 + s);
      ctx.lineTo(106, -6 + s * 0.6);
      ctx.stroke();
    }

    // 小八右手撥弦爪子
    const handY = -6 + Math.sin(strumPhase) * 14;
    ctx.beginPath();
    ctx.ellipse(2, handY, 13, 10, -0.3, 0, Math.PI * 2);
    strokeFill(ctx, COL.FUR, 5);

    // 小八左手按弦爪子
    ctx.beginPath();
    ctx.ellipse(66, -12, 12, 10, 0.2, 0, Math.PI * 2);
    strokeFill(ctx, COL.FUR, 5);

    ctx.restore();
  }

  function drawHachiware(ctx, cfg) {
    const {
      cx,
      cy,
      scale = 1,
      tilt = 0,
      mouthOpen = 0.4,
      blink = false,
      happyEyes = false,
      withBody = true,
      withGuitar = false,
      strumPhase = 0,
      lookX = 0,
    } = cfg;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.rotate(tilt);

    if (withBody) {
      // 身體與小腳
      ctx.beginPath();
      ctx.roundRect(-42, 40, 84, 78, 34);
      strokeFill(ctx, COL.FUR, 4.5);

      // 左手
      if (!withGuitar) {
        ctx.beginPath();
        ctx.ellipse(-46, 62, 14, 24, 0.35, 0, Math.PI * 2);
        strokeFill(ctx, COL.FUR, 4.5);
        ctx.beginPath();
        ctx.ellipse(46, 62, 14, 24, -0.35, 0, Math.PI * 2);
        strokeFill(ctx, COL.FUR, 4.5);
      }

      // 兩隻腳
      ctx.beginPath();
      ctx.ellipse(-22, 118, 15, 11, 0, 0, Math.PI * 2);
      strokeFill(ctx, COL.FUR, 4.5);
      ctx.beginPath();
      ctx.ellipse(22, 118, 15, 11, 0, 0, Math.PI * 2);
      strokeFill(ctx, COL.FUR, 4.5);
    }

    // 耳朵底色（藍色）
    ctx.beginPath();
    ctx.moveTo(-64, -36);
    ctx.quadraticCurveTo(-68, -94, -46, -98);
    ctx.quadraticCurveTo(-24, -92, -16, -58);
    ctx.closePath();
    strokeFill(ctx, COL.HAIR, 4.5);

    ctx.beginPath();
    ctx.moveTo(64, -36);
    ctx.quadraticCurveTo(68, -94, 46, -98);
    ctx.quadraticCurveTo(24, -92, 16, -58);
    ctx.closePath();
    strokeFill(ctx, COL.HAIR, 4.5);

    // 圓潤蓬鬆頭部（白毛底）
    ctx.beginPath();
    ctx.ellipse(0, -6, 76, 64, 0, 0, Math.PI * 2);
    strokeFill(ctx, COL.FUR, 4.5);

    // 招牌八字藍色瀏海（利用頭型裁切保持服貼）
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -6, 73, 61, 0, 0, Math.PI * 2);
    ctx.clip();

    // 左瀏海
    ctx.beginPath();
    ctx.moveTo(-82, -74);
    ctx.lineTo(0 + lookX * 5, -74);
    ctx.quadraticCurveTo(-8 + lookX * 5, -42, -78, -28);
    ctx.closePath();
    strokeFill(ctx, COL.HAIR, 4);

    // 右瀏海
    ctx.beginPath();
    ctx.moveTo(82, -74);
    ctx.lineTo(0 + lookX * 5, -74);
    ctx.quadraticCurveTo(8 + lookX * 5, -42, 78, -28);
    ctx.closePath();
    strokeFill(ctx, COL.HAIR, 4);
    ctx.restore();

    // 重描頭部輪廓線讓瀏海邊界乾淨
    ctx.beginPath();
    ctx.ellipse(0, -6, 76, 64, 0, 0, Math.PI * 2);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = COL.INK;
    ctx.stroke();

    // 腮紅（粉紅色圓形橢圓）
    ctx.beginPath();
    ctx.ellipse(-42 + lookX * 6, 14, 15, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL.BLUSH;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(42 + lookX * 6, 14, 15, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL.BLUSH;
    ctx.fill();

    // 眼睛
    const eyeY = -2;
    const eyeSpan = 29;
    for (const side of [-1, 1]) {
      const ex = side * eyeSpan + lookX * 7;
      if (happyEyes) {
        ctx.beginPath();
        ctx.arc(ex, eyeY + 4, 11, Math.PI * 1.1, Math.PI * 1.9);
        ctx.lineWidth = 6;
        ctx.strokeStyle = COL.INK;
        ctx.stroke();
      } else if (blink) {
        ctx.beginPath();
        ctx.moveTo(ex - 10, eyeY);
        ctx.lineTo(ex + 10, eyeY);
        ctx.lineWidth = 6;
        ctx.strokeStyle = COL.INK;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, 12.5, 13.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = COL.INK;
        ctx.fill();

        // 大亮點與小亮點（純白 FUR）
        ctx.beginPath();
        ctx.arc(ex - 3.5, eyeY - 4, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = COL.FUR;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ex + 3.5, eyeY + 4, 2.3, 0, Math.PI * 2);
        ctx.fillStyle = COL.FUR;
        ctx.fill();
      }
    }

    // 小貓嘴型 + 唱歌張嘴
    const mx = lookX * 7;
    const my = 15;
    if (mouthOpen > 0.25) {
      ctx.beginPath();
      ctx.ellipse(mx, my + 10, 11, 6 + mouthOpen * 8, 0, 0, Math.PI * 2);
      strokeFill(ctx, COL.BLUSH, 5);
    }

    // 上嘴唇 :3 兩段圓弧
    ctx.beginPath();
    ctx.arc(mx - 6, my, 6.5, 0.15, Math.PI - 0.1);
    ctx.lineWidth = 5;
    ctx.strokeStyle = COL.INK;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(mx + 6, my, 6.5, 0.1, Math.PI - 0.15);
    ctx.lineWidth = 5;
    ctx.strokeStyle = COL.INK;
    ctx.stroke();

    // 吉他（若有）
    if (withGuitar) {
      drawGuitar(ctx, 2, 74, 0.92, strumPhase);
    }

    ctx.restore();
  }

  function drawChiikawa(ctx, cx, cy, scale, bob) {
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.scale(scale, scale);

    // 小白熊圓耳朵
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 42, -52, 16, 0, Math.PI * 2);
      strokeFill(ctx, COL.FUR, 5.5);
    }

    // 圓圓臉
    ctx.beginPath();
    ctx.ellipse(0, -4, 62, 54, 0, 0, Math.PI * 2);
    strokeFill(ctx, COL.FUR, 5.5);

    // 粉紅臉頰
    ctx.beginPath();
    ctx.ellipse(-34, 10, 12, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL.BLUSH;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(34, 10, 12, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL.BLUSH;
    ctx.fill();

    // 可愛豆豆眼
    for (const side of [-1, 1]) {
      const ex = side * 22;
      ctx.beginPath();
      ctx.arc(ex, -4, 9.5, 0, Math.PI * 2);
      ctx.fillStyle = COL.INK;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex - 2.5, -6.5, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = COL.FUR;
      ctx.fill();
    }

    // 嘴巴
    ctx.beginPath();
    ctx.arc(-5, 11, 5.5, 0.2, Math.PI - 0.1);
    ctx.arc(5, 11, 5.5, 0.1, Math.PI - 0.2);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = COL.INK;
    ctx.stroke();

    ctx.restore();
  }

  function renderFrame(ctx, w, h, t) {
    const time = ((t % 25.22) + 25.22) % 25.22;
    const shot = getShotAt(time);
    const beat = time * 2.4;
    const bob = Math.abs(Math.sin(beat * Math.PI)) * -6;
    const sway = Math.sin(time * 1.6);
    const strumPhase = time * 11.5;
    const mouthOpen = 0.2 + 0.55 * Math.max(0, Math.sin(time * 5.2 + 0.6));
    const blink = (time % 3.4) > 3.24;

    ctx.fillStyle = COL.PAPER;
    ctx.fillRect(0, 0, w, h);

    switch (shot.id) {
      case 1: {
        // 彈吉他開場
        drawBushes(ctx, w, h, sway, "ground");
        drawHachiware(ctx, {
          cx: w * 0.48,
          cy: h * 0.48 + bob * 0.8,
          scale: 1.24,
          tilt: Math.sin(time * 2.2) * 0.04,
          mouthOpen,
          blink,
          withBody: true,
          withGuitar: true,
          strumPhase,
        });
        break;
      }
      case 2: {
        // 側臉大頭特寫（對齊 frame_00 / frame_02）
        drawBushes(ctx, w, h, sway, "left-corner");
        drawHachiware(ctx, {
          cx: w * 0.54,
          cy: h * 0.58 + bob * 0.5,
          scale: 2.05,
          tilt: -0.06 + Math.sin(time * 1.8) * 0.03,
          mouthOpen: 0.4 + 0.4 * Math.sin(time * 6),
          blink,
          withBody: false,
          lookX: -0.35,
        });
        break;
      }
      case 3: {
        // 吉伊卡哇 + 小八雙人草叢伴唱（對齊 frame_04）
        drawChiikawa(ctx, w * 0.22, h * 0.56, 1.15, bob * 0.9);
        drawBushes(ctx, w, h, sway, "meadow");
        drawHachiware(ctx, {
          cx: w * 0.72,
          cy: h * 0.54 + bob * 0.7,
          scale: 1.18,
          tilt: -0.04,
          mouthOpen,
          blink,
          withBody: true,
          lookX: -0.45,
        });
        break;
      }
      case 4: {
        // 近景甜笑特寫（對齊 frame_06 / frame_07）
        drawBushes(ctx, w, h, sway, "both");
        drawHachiware(ctx, {
          cx: w * 0.48,
          cy: h * 0.54 + bob * 0.4,
          scale: 1.75,
          tilt: 0.05,
          mouthOpen: 0.35 + 0.5 * Math.abs(Math.sin(time * 4.5)),
          happyEyes: true,
          withBody: false,
        });
        break;
      }
      case 5: {
        // 雙側草叢 + 小八吉他獨奏（對齊 frame_08 / frame_10 / frame_13）
        drawBushes(ctx, w, h, sway, "both");
        drawHachiware(ctx, {
          cx: w * 0.5,
          cy: h * 0.48 + bob,
          scale: 1.20,
          tilt: Math.sin(time * 2.5) * 0.05,
          mouthOpen,
          blink,
          withBody: true,
          withGuitar: true,
          strumPhase,
        });
        break;
      }
      case 6: {
        // 正面定格大頭（對齊 frame_14）
        drawHachiware(ctx, {
          cx: w * 0.5,
          cy: h * 0.56 + bob * 0.3,
          scale: 1.62,
          tilt: 0,
          mouthOpen: 0.2,
          blink,
          withBody: false,
        });
        break;
      }
      case 7: {
        // 閃亮大眼極近特寫（對齊 frame_15 / frame_16）
        drawHachiware(ctx, {
          cx: w * 0.5,
          cy: h * 0.58 + Math.sin(time * 4) * 2,
          scale: 2.35,
          tilt: Math.sin(time * 1.4) * 0.025,
          mouthOpen: 0.5 + 0.45 * Math.sin(time * 5.6),
          blink: false,
          withBody: false,
        });
        break;
      }
      case 8:
      default: {
        // 雙眼大特寫結尾（對齊 frame_16 / frame_17）
        drawHachiware(ctx, {
          cx: w * 0.5,
          cy: h * 0.57 + Math.sin(time * 4.5) * 2.5,
          scale: 2.45,
          tilt: Math.sin(time * 1.6) * 0.03,
          mouthOpen: 0.55 + 0.35 * Math.sin(time * 6.5),
          blink: false,
          withBody: false,
        });
        break;
      }
    }

    return shot;
  }

  return {
    SHOTS,
    getShotAt,
    renderFrame,
  };
})();
