/* ==========================================================
   helpers.js — 全局命名空间、DOM 工具、数组工具、注册表
   ========================================================== */
window.DS = window.DS || {};
DS.VERSION = "1.0.0";

DS.$ = (sel, root) => (root || document).querySelector(sel);
DS.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

DS.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

DS.deepClone = obj => JSON.parse(JSON.stringify(obj));

DS.swap = (a, i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; };

DS.escapeHtml = s => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** 确定性随机数（mulberry32），保证同一种子结果可复现 */
DS.rng = function (seed) {
  let a = seed >>> 0 || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

DS.randInt = function (lo, hi, rand) {
  rand = rand || Math.random;
  return lo + Math.floor(rand() * (hi - lo + 1));
};

/** 解析 "3,1,4,1,5" 形式的输入 */
DS.parseNums = function (str, def, cap) {
  const parts = String(str || "").split(/[,，\s]+/).filter(s => s !== "");
  const out = [];
  for (const p of parts) {
    const n = Number(p);
    if (!isFinite(n)) continue;
    out.push(Math.round(n));
  }
  if (!out.length) return def.slice();
  cap = cap === undefined ? 60 : cap;
  if (out.length > cap) out.length = cap;
  for (let i = 0; i < out.length; i++) if (!isFinite(out[i])) out[i] = 0;
  return out;
};

DS.parseStr = (str, def) => (str === undefined || str === null || str === "") ? def : String(str);

/** 生成测试数组 */
DS.genArray = function (n, min, max, mode, seed) {
  n = DS.clamp(Math.round(n) || 10, 2, 60);
  min = min === undefined ? 1 : min;
  max = max === undefined ? 99 : max;
  if (max <= min) max = min + 1;
  const rand = DS.rng(seed || Math.floor(Math.random() * 1e9));
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(DS.randInt(min, max, rand));
  if (mode === "sorted") arr.sort((a, b) => a - b);
  else if (mode === "reversed") arr.sort((a, b) => b - a);
  else if (mode === "almost") {
    arr.sort((a, b) => a - b);
    const k = Math.max(1, Math.floor(n / 6));
    for (let i = 0; i < k; i++) {
      const a = DS.randInt(0, n - 1, rand), b = DS.randInt(0, n - 1, rand);
      DS.swap(arr, a, b);
    }
  } else if (mode === "dupes") {
    for (let i = 0; i < n; i++) if (rand() < 0.35) arr[i] = arr[DS.randInt(0, n - 1, rand)];
  }
  return arr;
};

/** Toast 提示 */
let _toastTimer = null;
DS.toast = function (msg, ms) {
  const el = DS.$("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), ms || 2400);
};

/** 主题切换（持久化到 localStorage） */
DS.applyTheme = function (theme) {
  if (!theme) theme = localStorage.getItem("dsviz-theme") || "dark";
  document.documentElement.setAttribute("data-theme", theme);
  const btn = DS.$("#themeBtn");
  if (btn) btn.textContent = theme === "dark" ? "🌙" : "☀️";
  try { localStorage.setItem("dsviz-theme", theme); } catch (e) { /* ignore */ }
  DS.toast(theme === "dark" ? "已切换深色主题" : "已切换浅色主题");
};

DS.toggleTheme = function () {
  const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  DS.applyTheme(cur === "dark" ? "light" : "dark");
  // 主题变化后重绘两个画布
  DS.rerenderCurrent();
};

/** 供主题切换时重绘当前画面（由 app.js 注入） */
DS._rerenderFn = null;
DS.rerenderCurrent = function () { if (DS._rerenderFn) DS._rerenderFn(); };

/* ================= 章节注册表 ================= */
DS.structures = {
  list: [],          // 按注册顺序
  byId: {},
  register(mod) {
    if (!mod || !mod.id) return;
    DS.structures.list.push(mod);
    DS.structures.byId[mod.id] = mod;
  }
};

/* ============ 步骤构建小工具（各结构模块共用） ============ */
DS.stepLib = (function () {
  /** 数组→条形元素组。hl: {索引: 颜色} */
  function bars(arr, hl, extra) {
    extra = extra || {};
    const n = arr.length;
    const maxW = 860, maxH = 300;
    const gap = n > 28 ? 2 : 6;
    const bw = DS.clamp(Math.floor(maxW / n) - gap, 4, 60);
    const totalW = n * (bw + gap);
    const startX = -totalW / 2;
    const maxV = Math.max(1, ...arr.map(x => Math.abs(x)));
    const elems = [];
    for (let i = 0; i < n; i++) {
      const v = arr[i];
      let h = (Math.abs(v) / maxV) * maxH;
      if (h < 4) h = 4;
      const x = startX + i * (bw + gap);
      const y = -h / 2;
      let fill = extra.baseColor || "#4f83e8";
      if (hl && hl[i] !== undefined) fill = hl[i];
      elems.push({
        t: "bar", key: "b" + i, x, y, w: bw, h, fill,
        text: n <= 26 ? String(v) : undefined,
        index: String(i),
        active: !!(hl && hl[i] !== undefined)
      });
    }
    return {
      elements: elems,
      view: { x0: startX - 20, x1: startX + totalW + 20, y0: -maxH - 22, y1: 40 }
    };
  }

  /** 数组→单元格元素组（带索引符） */
  function cells(arr, hl, extra) {
    extra = extra || {};
    const n = arr.length;
    const cw = n > 24 ? 36 : 48, ch = n > 24 ? 36 : 48;
    const startX = -(n * cw) / 2;
    const elems = [];
    for (let i = 0; i < n; i++) {
      let fill = extra.baseColor || "rgba(91,140,255,0.16)";
      if (hl && hl[i] !== undefined) fill = hl[i];
      elems.push({
        t: "cell", key: "c" + i, x: startX + i * cw, y: -ch / 2, w: cw - 4, h: ch - 4,
        text: String(arr[i]), index: String(i), fill, textColor: i === (extra.markedIndex) ? extra.markedColor : undefined,
        active: !!(hl && hl[i] !== undefined), radius: 8
      });
    }
    return {
      elements: elems,
      view: { x0: startX - 16, x1: startX + n * cw + 16, y0: -ch - 26, y1: 46 }
    };
  }

  /** 指针名标签（absolute 位置） */
  function label(x, y, text, opts) {
    opts = opts || {};
    return Object.assign({
      t: "text", key: opts.key || ("lb" + Math.random()), x, y, text,
      align: "center", size: opts.size || 14, color: opts.color || "#8f9cbf", bold: opts.bold
    }, opts);
  }

  /** 箭头边线 */
  function edge(fromKey, toKey, opts) {
    opts = opts || {};
    return Object.assign({
      t: "edge", key: opts.key || ("e" + Math.random()), from: fromKey, to: toKey,
      color: opts.color || "#5b8cff", style: opts.style || "solid",
      text: opts.text, curve: opts.curve || 0, arrow: opts.arrow !== false, width: opts.width || 2
    }, opts);
  }

  return { bars, cells, label, edge };
})();

/* 每步结构统一工厂：结构模块用它生成 step */
DS.mkStep = function (scene, text, extra) {
  const s = Object.assign({ scene: scene }, extra || {});
  s.text = text || "";
  return s;
};