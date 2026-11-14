/* ==========================================================
   render.js — Canvas 场景渲染器
   元素类型：bar / cell / circle / rect / text / edge / line / null
   场景坐标：逻辑坐标，(0,0) 为舞台中心，y 轴向下；渲染时自动适配缩放
   ========================================================== */
window.DS = window.DS || {};
DS.render = (function () {
  const MONO = '"Cascadia Code", Consolas, "Courier New", monospace';
  const SANS = '"PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif';

  const palette = {
    dark: {
      text: "#e8ecf8", dim: "#9aa6c4", faint: "#66739a",
      nodeFill: "rgba(91,140,255,0.18)", nodeStroke: "#5b8cff",
      cellFill: "rgba(91,140,255,0.14)",
      warn: "#fbbf24", ok: "#34d399", err: "#f87171"
    },
    light: {
      text: "#1d2740", dim: "#4c5b7d", faint: "#8895b3",
      nodeFill: "rgba(59,110,246,0.12)", nodeStroke: "#3b6ef6",
      cellFill: "rgba(59,110,246,0.10)",
      warn: "#d97706", ok: "#059669", err: "#dc2626"
    }
  };

  function themeName() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  /* ---------- 画布初始化（DPR + 自适应） ---------- */
  function setupCanvas(canvas) {
    if (canvas._dsSetup) return;
    canvas._dsSetup = true;
    const resize = () => {
      const holder = canvas.parentElement;
      if (!holder) return;
      const w = holder.clientWidth || 600;
      const h = holder.clientHeight || 400;
      const dpr = window.devicePixelRatio || 1;
      const changed = canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas._dpr = dpr;
      canvas._cssW = w;
      canvas._cssH = h;
      // 设置 width/height 会清空画布 → 尺寸真变了立即重绘当前步骤
      if (changed) {
        try { if (DS.rerenderCurrent) DS.rerenderCurrent(); } catch (e) { /* ignore */ }
      }
    };
    resize();
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(canvas.parentElement);
    } else {
      window.addEventListener("resize", resize);
    }
  }

  /* ---------- 测量元素（供边线定位） ---------- */
  function measure(elements, index) {
    const m = {};
    for (const e of elements) {
      if (e.t === "bar" || e.t === "cell" || e.t === "rect") {
        m[e.key] = { cx: e.x + e.w / 2, cy: e.y + e.h / 2, hw: e.w / 2, hh: e.h / 2, gap: 4 };
      } else if (e.t === "circle") {
        m[e.key] = { cx: e.x, cy: e.y, hw: e.r, hh: e.r, gap: 3 };
      } else if (e.t === "text") {
        m[e.key] = { cx: e.x, cy: e.y, hw: 2, hh: 6, gap: 2 };
      }
    }
    return m;
  }

  /** 求边线在源/目标形状边缘上的落点 */
  function edgeAnchor(m, dx, dy, fromTarget) {
    const { cx, cy, hw, hh, gap } = m;
    if (!hw) return { x: cx, y: cy };
    const adx = Math.abs(dx), ady = Math.abs(dy), len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    let off;
    if (adx < 1e-6) off = hh + gap;
    else if (ady < 1e-6) off = hw + gap;
    else off = Math.min(hw / Math.max(adx / len, 1e-6), hh / Math.max(ady / len, 1e-6)) + gap;
    return fromTarget
      ? { x: cx + ux * off, y: cy + uy * off }
      : { x: cx - ux * off, y: cy - uy * off };
  }

  function drawArrowHead(ctx, x, y, ang, color, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.52);
    ctx.lineTo(-size, size * 0.52);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /* ---------- 主绘制 ---------- */
  function draw(canvas, scene, opts) {
    opts = opts || {};
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext("2d");
    const pal = palette[themeName()];
    const W = canvas.width, H = canvas.height;
    const dpr = canvas._dpr || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas._cssW, canvas._cssH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!scene || !scene.elements || !scene.elements.length) {
      drawEmptyHint(ctx, canvas._cssW, canvas._cssH, pal);
      ctx.restore();
      return;
    }

    // 计算逻辑边界与缩放（场景自带 view 需消毒：任一字段非有限数则回退自动计算）
    let view = scene.view;
    if (!view || !isFinite(view.x0) || !isFinite(view.x1) || !isFinite(view.y0) || !isFinite(view.y1)) {
      view = computeView(scene.elements);
    }
    const pad = 34;
    let bw = view.x1 - view.x0, bh = view.y1 - view.y0;
    if (bw < 20) bw = 20;
    if (bh < 20) bh = 20;
    let scale = Math.min((canvas._cssW - pad * 2) / bw, (canvas._cssH - pad * 2) / bh);
    if (opts.scaleMul) scale *= opts.scaleMul;
    if (!isFinite(scale) || scale < 0.05) scale = 1;
    if (scale > 2.4) scale = 2.4;

    const cx = canvas._cssW / 2 - (view.x0 + view.x1) / 2 * scale;
    const cy = canvas._cssH / 2 - (view.y0 + view.y1) / 2 * scale;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * cx, dpr * cy);

    const index = measure(scene.elements);

    // 第一遍：边线
    for (const e of scene.elements) {
      if (e.t !== "edge" && e.t !== "line") continue;
      const from = e.from, to = e.to;
      if (!index[from] || !index[to]) continue;
      if (from === to) { drawSelfLoop(ctx, index[from], e, pal); continue; }
      drawEdge(ctx, index[from], index[to], e, pal);
    }

    // 第二遍：形状
    for (const e of scene.elements) drawShape(ctx, e, pal);

    // 第三遍：文字（独立 text 元素，压在最上层）
    for (const e of scene.elements) {
      if (e.t !== "text") continue;
      ctx.save();
      ctx.globalAlpha = e.a === undefined ? 1 : e.a;
      ctx.font = (e.bold ? "bold " : "") + (e.size || 14) + "px " + (e.mono ? MONO : SANS);
      ctx.fillStyle = e.color || pal.dim;
      ctx.textAlign = e.align || "center";
      ctx.textBaseline = e.baseline || "middle";
      if (e.rotate !== undefined) {
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotate);
        ctx.fillText(e.text, 0, 0);
      } else {
        ctx.fillText(e.text, e.x, e.y);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function computeView(elements) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const e of elements) {
      // 边线等元素没有自身坐标，跳过，避免 NaN 污染边界
      if (typeof e.x !== "number" || typeof e.y !== "number" || !isFinite(e.x) || !isFinite(e.y)) continue;
      let lx = e.x, rx = e.x, ty = e.y, by = e.y;
      if (e.t === "rect" || e.t === "cell" || e.t === "bar") { rx = e.x + (e.w || 0); by = e.y + (e.h || 0); }
      if (e.t === "circle") { const r = e.r || 21; lx = e.x - r; rx = e.x + r; ty = e.y - r; by = e.y + r; }
      x0 = Math.min(x0, lx); x1 = Math.max(x1, rx);
      y0 = Math.min(y0, ty); y1 = Math.max(y1, by);
    }
    if (x0 > x1) { x0 = -100; x1 = 100; }
    if (y0 > y1) { y0 = -50; y1 = 50; }
    // 最小视野：避免「只有一个元素」时被放到最大（视觉上炸成一整屏）
    const MIN_W = 360, MIN_H = 220;
    if (x1 - x0 < MIN_W) { const c = (x0 + x1) / 2; x0 = c - MIN_W / 2; x1 = c + MIN_W / 2; }
    if (y1 - y0 < MIN_H) { const c = (y0 + y1) / 2; y0 = c - MIN_H / 2; y1 = c + MIN_H / 2; }
    return { x0, y0, x1, y1 };
  }

  /** 自环边（from === to）单独绘制成节点右上角的小圆环，避免 dy=0 时画成退化线段 */
  function drawSelfLoop(ctx, m, e, pal) {
    const color = e.color || pal.nodeStroke;
    const r = (m.hw || 20) + 12;
    const cx = m.cx + r * 0.72, cy = m.cy - r * 0.72;
    ctx.save();
    if (e.a !== undefined) ctx.globalAlpha = e.a;
    ctx.strokeStyle = color;
    ctx.lineWidth = e.width || 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, Math.PI * 0.15, Math.PI * 2.1);
    ctx.stroke();
    if (e.text) {
      ctx.font = "11px " + MONO;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(e.text, cx, cy - 14);
    }
    ctx.restore();
  }

  function drawEmptyHint(ctx, w, h, pal) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = "center";
    ctx.fillStyle = pal.faint;
    ctx.font = "15px " + SANS;
    ctx.fillText("⏳ 点击「生成动画」或「运行」，这里就会出现动画", w / 2, h / 2 - 8);
    ctx.font = "13px " + SANS;
    ctx.fillText("支持暂停 / 单步 / 调速 / 拖动进度条回放", w / 2, h / 2 + 18);
    ctx.restore();
  }

  function drawEdge(ctx, frm, to, e, pal) {
    const color = e.color || (e.style === "dashed" ? pal.faint : pal.nodeStroke);
    ctx.save();
    if (e.a !== undefined) ctx.globalAlpha = e.a;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = e.width || 2;
    if (e.style === "dashed") ctx.setLineDash([6, 5]);
    if (e.style === "dotted") ctx.setLineDash([2, 4]);
    const dx = to.cx - frm.cx, dy = to.cy - frm.cy;
    const P0 = edgeAnchor(frm, dx, dy, true);
    const P1 = edgeAnchor(to, dx, dy, false);
    const dist = Math.hypot(P1.x - P0.x, P1.y - P0.y) || 1;
    const ang = Math.atan2(P1.y - P0.y, P1.x - P0.x);
    const S = (e.arrow === false ? 0 : Math.min(12, dist * 0.4));
    let ex = P1.x - Math.cos(ang) * S, ey = P1.y - Math.sin(ang) * S;

    ctx.beginPath();
    if (e.curve && Math.abs(e.curve) > 0.02) {
      const mx = (P0.x + ex) / 2, my = (P0.y + ey) / 2;
      const px = -Math.sin(ang), py = Math.cos(ang);
      const off = e.curve * dist * 0.4;
      ctx.moveTo(P0.x, P0.y);
      ctx.quadraticCurveTo(mx + px * off, my + py * off, ex, ey);
    } else {
      ctx.moveTo(P0.x, P0.y);
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (e.arrow !== false) drawArrowHead(ctx, P1.x, P1.y, ang, color, 9);
    if (e.text) {
      const mx = (P0.x + ex) / 2, my = (P0.y + ey) / 2;
      ctx.font = "12px " + MONO;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = color;
      ctx.fillText(e.text, mx, my - 4);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r || 6, w / 2, h / 2);
    if (r <= 0) { ctx.rect(x, y, w, h); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawShape(ctx, e, pal) {
    ctx.save();
    if (e.a !== undefined) ctx.globalAlpha = e.a;

    if (e.t === "circle") {
      const r = e.r || 21;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.fillStyle = e.fill || pal.nodeFill;
      ctx.fill();
      ctx.lineWidth = e.strokeWidth || (e.active ? 2.6 : 1.6);
      ctx.strokeStyle = e.stroke || (e.active ? pal.warn : pal.nodeStroke);
      ctx.stroke();
      if (e.text !== undefined && e.text !== null) {
        ctx.font = (e.bold ? "bold " : "") + (e.fontSize || 15) + "px " + MONO;
        ctx.fillStyle = e.active ? pal.warn : (e.textColor || pal.text);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(e.text).slice(0, 6), e.x, e.y);
      }
      let offY = -e.r - 5;
      if (e.sub !== undefined) {
        ctx.font = "12px " + MONO;
        ctx.fillStyle = e.subColor || pal.dim;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(String(e.sub), e.x, e.y + offY + 5);
        offY -= 14;
      }
      if (e.tag !== undefined) {
        ctx.font = "11px " + SANS;
        ctx.fillStyle = e.tagColor || pal.dim;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(String(e.tag), e.x, e.y + offY);
      }
    } else if (e.t === "rect") {
      ctx.beginPath();
      roundRect(ctx, e.x, e.y, e.w, e.h, e.radius || 8);
      ctx.fillStyle = e.fill || pal.nodeFill;
      ctx.fill();
      ctx.lineWidth = e.strokeWidth || (e.active ? 2.6 : 1.4);
      ctx.strokeStyle = e.stroke || (e.active ? pal.warn : pal.nodeStroke);
      ctx.stroke();
      if (e.text !== undefined && e.text !== null) {
        if (Array.isArray(e.text)) {
          ctx.font = "12px " + MONO;
          ctx.fillStyle = e.textColor || pal.text;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const n = e.text.length;
          for (let i = 0; i < n; i++) {
            const yy = e.y + e.h / 2 - (n - 1) * 8 + i * 16;
            ctx.fillText(String(e.text[i]).slice(0, 20), e.x + e.w / 2, yy);
          }
        } else {
          ctx.font = (e.bold ? "bold " : "") + (e.fontSize || 13) + "px " + MONO;
          const align = e.align || "center";
          ctx.textAlign = align;
          ctx.textBaseline = "middle";
          ctx.fillStyle = e.textColor || pal.text;
          const tx = align === "left" ? e.x + 8 : (align === "right" ? e.x + e.w - 8 : e.x + e.w / 2);
          ctx.fillText(String(e.text).slice(0, e.maxChars || 28), tx, e.y + e.h / 2);
        }
      }
    } else if (e.t === "cell") {
      ctx.beginPath();
      roundRect(ctx, e.x, e.y, e.w, e.h, e.radius === undefined ? 8 : e.radius);
      ctx.fillStyle = e.fill || pal.cellFill;
      ctx.fill();
      ctx.lineWidth = e.strokeWidth || (e.active ? 2.6 : 1.4);
      ctx.strokeStyle = e.stroke || (e.active ? pal.warn : pal.nodeStroke);
      ctx.stroke();
      ctx.font = "14px " + MONO;
      ctx.fillStyle = e.active ? pal.warn : (e.textColor || pal.text);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (e.text !== undefined) ctx.fillText(String(e.text).slice(0, 8), e.x + e.w / 2, e.y + e.h / 2 + 1);
      if (e.index !== undefined) {
        ctx.font = "11px " + MONO;
        ctx.fillStyle = pal.faint;
        ctx.textBaseline = "top";
        ctx.fillText(String(e.index), e.x + e.w / 2, e.y + e.h + 3);
      }
    } else if (e.t === "bar") {
      const fill = e.fill || pal.nodeStroke;
      const grad = ctx.createLinearGradient(e.x, 0, e.x + e.w, 0);
      grad.addColorStop(0, fill);
      grad.addColorStop(1, e.active ? pal.warn : colorMix(fill, pal.nodeStroke, 0.5));
      ctx.fillStyle = e.active ? pal.warn : grad;
      ctx.beginPath();
      if (e.w >= 10) {
        const r = Math.min(4, e.w / 2);
        roundRect(ctx, e.x, e.y, e.w, e.h, e.notextRadius === undefined ? r : e.notextRadius);
      } else {
        ctx.rect(e.x, e.y, e.w, e.h);
      }
      ctx.fill();
      if (e.text !== undefined) {
        ctx.font = "11px " + MONO;
        ctx.fillStyle = e.active ? pal.warn : (e.textColor || pal.dim);
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(String(e.text), e.x + e.w / 2, e.y - 4);
      }
      if (e.index !== undefined) {
        ctx.font = "10px " + MONO;
        ctx.fillStyle = pal.faint;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(String(e.index), e.x + e.w / 2, e.y + e.h + 3);
      }
    }
    ctx.restore();
  }

  /** 与自身颜色混合（用于渐变收尾色） */
  function colorMix(hexOrRgb, withRgb, t) {
    // 简化处理：返回 withRgb 即可，保持观感一致
    return withRgb;
  }

  /* ---------- 场景插值（引擎动画补间用） ---------- */
  function lerpScene(A, B, t) {
    if (!A || !A.elements) return B;
    const mapA = {};
    for (const e of A.elements) mapA[e.key] = e;
    const out = { elements: [], view: B.view || A.view };
    for (const e of B.elements || []) {
      const p = mapA[e.key];
      if (p && (e.t === p.t)) {
        const c = Object.assign({}, e);
        c.x = p.x + (e.x - p.x) * t;
        c.y = p.y + (e.y - p.y) * t;
        c.a = 1;
        out.elements.push(c);
      } else if (t >= 1) {
        out.elements.push(e);
      } else if (t >= 0.55) {
        const c = Object.assign({}, e);
        c.a = (t - 0.55) / 0.45;
        out.elements.push(c);
      }
    }
    if (!out.elements.length && t >= 1) out.elements = B.elements.slice();
    return out;
  }

  /* 深拷贝场景 */
  function cloneScene(s) {
    if (!s) return s;
    return { view: s.view ? Object.assign({}, s.view) : undefined, elements: s.elements.map(e => Object.assign({}, e)) };
  }

  return { setupCanvas, draw, drawScene: draw, lerpScene, cloneScene };
})();