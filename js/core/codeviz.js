/* ==========================================================
   codeviz.js — 把解释器 trace 转成可视化步骤
   自动识别视图：链表 / 树 / 数组 / 内存
   ========================================================== */
window.DS = window.DS || {};
DS.codeviz = (function () {
  const R = 24;           // 节点半径
  const LIST_DX = 100;    // 链表节点间距
  const TREE_DX = 72;     // 树节点横向间距
  const TREE_DY = 100;    // 树层级间距

  const PTR_RE = /^0x[0-9A-F]+$/;

  function objAddrOf(ptrLabel) {
    if (typeof ptrLabel !== "string" || !PTR_RE.test(ptrLabel)) return null;
    return parseInt(ptrLabel.slice(2), 16);
  }

  /** 从快照得到变量指针表：变量名(小写匹配) → 地址 */
  function varPtrs(vars) {
    const out = [];
    for (const v of vars) {
      const a = objAddrOf(v.v);
      if (a !== null) out.push({ name: v.name, addr: a });
    }
    return out;
  }

  /* ---------- 链表视图 ---------- */
  function listScene(snap) {
    const objs = new Map(snap.heap.map(o => [o.addr, o]));
    const vps = varPtrs(snap.vars);
    const pointed = new Set();
    for (const o of snap.heap) {
      const nx = o.fields.next;
      const a = objAddrOf(nx);
      if (a !== null) pointed.add(a);
    }
    const elems = [];
    const chains = [];     // [{nodes:[addr]}]
    const visited = new Set();

    // 真正的链头 = 没有任何 next 指向它的节点。
    // 这样「新结点 p->next 指向旧链」时不会被拆成两条互不相连的链。
    const heads = [];
    for (const o of snap.heap) if (!pointed.has(o.addr)) heads.push(o.addr);
    if (!heads.length) {
      // 全部成环（循环链表）：用变量指针或最小地址作为起点
      if (vps.length && objs.has(vps[0].addr)) heads.push(vps[0].addr);
      else if (snap.heap.length) heads.push(snap.heap[0].addr);
    }
    for (const h of heads) {
      if (visited.has(h)) continue;
      const nodes = [];
      let cur = h, guard = 0;
      while (cur !== null && objs.has(cur) && !visited.has(cur) && guard < 200) {
        visited.add(cur);
        nodes.push(cur);
        cur = objAddrOf(objs.get(cur).fields.next);
        guard++;
      }
      if (nodes.length) chains.push({ nodes });
    }
    // 兜底：环上的剩余节点（如中途断开的子环）
    for (const o of snap.heap) {
      if (visited.has(o.addr)) continue;
      const nodes = [];
      let cur = o.addr, guard = 0;
      while (cur !== null && objs.has(cur) && !visited.has(cur) && guard < 200) {
        visited.add(cur);
        nodes.push(cur);
        cur = objAddrOf(objs.get(cur).fields.next);
        guard++;
      }
      if (nodes.length) chains.push({ nodes });
    }

    // 变量指针标签：节点地址 → 变量名列表（head / p / cur ...）
    const labels = new Map();
    for (const vp of vps) {
      if (!objs.has(vp.addr)) continue;
      if (!labels.has(vp.addr)) labels.set(vp.addr, []);
      labels.get(vp.addr).push(vp.name);
    }

    const rows = chains.length || 1;
    chains.forEach((ch, ri) => {
      const y = (ri - (rows - 1) / 2) * 150;
      const xs = [];
      ch.nodes.forEach((addr, i) => {
        const o = objs.get(addr);
        const x = (i - (ch.nodes.length - 1) / 2) * LIST_DX;
        xs.push(x);
        elems.push({
          t: "circle", key: "obj" + o.addr, x, y, r: R,
          text: fmtField(o.fields.data), sub: "0x" + o.addr.toString(16).toUpperCase() + " · " + o.type,
          fontSize: 15
        });
        // 指向该节点的变量名，标在节点上方
        const nm = labels.get(addr);
        if (nm && nm.length) {
          elems.push({ t: "text", key: "lbl" + o.addr, x, y: y - R - 30, text: "▲ " + nm.join(","), size: 13, color: "#61d3a7", bold: true, mono: true });
        }
      });
      // next 边
      for (let i = 0; i < ch.nodes.length - 1; i++) {
        elems.push({
          t: "edge", key: "nx" + ch.nodes[i] + "-" + ch.nodes[i + 1],
          from: "obj" + ch.nodes[i], to: "obj" + ch.nodes[i + 1],
          color: "#5b8cff", text: "next", width: 2
        });
      }
      // 尾巴：确实指向 NULL 才画 ∅（指向已画节点说明是环/回指，不画）
      const lastAddr = ch.nodes[ch.nodes.length - 1];
      if (objAddrOf(objs.get(lastAddr).fields.next) === null) {
        const lx = xs[xs.length - 1] + R + 34;
        elems.push({ t: "circle", key: "null" + ri, x: lx, y, r: 11, text: "∅", fontSize: 12, stroke: "#66739a", fill: "rgba(102,115,154,0.08)" });
        elems.push({ t: "edge", key: "nxnull" + ri, from: "obj" + lastAddr, to: "null" + ri, color: "#66739a", style: "dashed" });
      }
    });
    return { elements: elems };
  }

  /* ---------- 树视图 ---------- */
  function treeScene(snap) {
    const objs = new Map(snap.heap.map(o => [o.addr, o]));
    const vps = varPtrs(snap.vars);
    const pointed = new Set();
    for (const o of snap.heap) {
      for (const f of ["left", "right"]) {
        const a = objAddrOf(o.fields[f]);
        if (a !== null) pointed.add(a);
      }
    }
    if (!objs.size) return { elements: [] };

    // 只画一棵「主树」：优先名为 root 的变量；否则选子树最大的未被指向节点
    const countSub = (addr, seen) => {
      if (!addr || !objs.has(addr) || seen.has(addr)) return 0;
      seen.add(addr);
      const o = objs.get(addr);
      return 1 + countSub(objAddrOf(o.fields.left), seen) + countSub(objAddrOf(o.fields.right), seen);
    };
    let rootAddr = null;
    const byRootName = vps.find(v => /^root$/i.test(v.name));
    if (byRootName && objs.has(byRootName.addr)) rootAddr = byRootName.addr;
    if (rootAddr === null) {
      let best = null, bestN = -1;
      for (const o of snap.heap) {
        if (pointed.has(o.addr)) continue;
        const n = countSub(o.addr, new Set());
        if (n > bestN) { bestN = n; best = o.addr; }
      }
      if (best === null) {
        // 全是环/互相指向：退化为选中节点最多的那个
        for (const o of snap.heap) {
          const n = countSub(o.addr, new Set());
          if (n > bestN) { bestN = n; best = o.addr; }
        }
      }
      rootAddr = best !== null ? best : snap.heap[0].addr;
    }

    const elems = [];
    const pos = new Map();
    const cols = new Map(), maxD = { v: 0 };
    let counter = 0;
    const inorder = (addr, d, seen) => {
      if (!addr || !objs.has(addr) || seen.has(addr)) return;
      seen.add(addr);
      const o = objs.get(addr);
      inorder(objAddrOf(o.fields.left), d + 1, seen);
      cols.set(addr, { idx: counter++, d });
      maxD.v = Math.max(maxD.v, d);
      inorder(objAddrOf(o.fields.right), d + 1, seen);
    };
    inorder(rootAddr, 0, new Set());
    if (!cols.size) return { elements };

    const rowY = 0;
    for (const [addr, c] of cols) {
      const o = objs.get(addr);
      const x = (c.idx - (cols.size - 1) / 2) * TREE_DX;
      const y = rowY - maxD.v * TREE_DY / 2 + c.d * TREE_DY;
      pos.set(addr, { x, y });
      elems.push({
        t: "circle", key: "obj" + o.addr, x, y, r: R,
        text: fmtField(o.fields.data), sub: "0x" + o.addr.toString(16).toUpperCase() + " · " + o.type,
        fontSize: 15
      });
    }
    // 左右孩子连线
    for (const [addr] of cols) {
      const o = objs.get(addr);
      for (const child of ["left", "right"]) {
        const ca = objAddrOf(o.fields[child]);
        if (ca === null || !pos.has(ca)) continue;
        elems.push({
          t: "edge", key: "e" + addr + child, from: "obj" + addr, to: "obj" + ca,
          color: child === "left" ? "#5b8cff" : "#a855f7",
          style: child === "left" ? "solid" : "dashed",
          text: child, width: 2
        });
      }
    }
    // 变量指针标签（root / p / cur ...）标在各自节点上方
    const labels = new Map();
    for (const vp of vps) {
      if (!pos.has(vp.addr)) continue;
      if (!labels.has(vp.addr)) labels.set(vp.addr, []);
      labels.get(vp.addr).push(vp.name);
    }
    for (const [addr, names] of labels) {
      const p = pos.get(addr);
      elems.push({ t: "text", key: "lbl" + addr, x: p.x, y: p.y - R - 30, text: "▲ " + names.join(","), size: 13, color: "#61d3a7", bold: true, mono: true });
    }
    return { elements: elems };
  }

  function rowYoff(ri, total, maxD) {
    return (ri - (total - 1) / 2) * (maxD * TREE_DY + 120);
  }

  /* ---------- 数组视图 ---------- */
  /** 解析变量字符串为数值行：[1,2,3] → {dim:1, rows:[[1,2,3]]}
      [[1,2,3] [4,5,6]] → {dim:2, rows:[[1,2,3],[4,5,6]]}  */
  function parseArrayVar(s) {
    // 二维：外层 [ 内层多个 [..] 用空格分隔，中间夹 ]（即 [[a,b] [c,d]]）
    const d2 = /^\[(\[[^\]]*\](?:\s+\[[^\]]*\])*)\]$/.exec(s);
    if (d2) {
      const rows = d2[1].match(/\[[^\]]*\]/g).map(seg =>
        seg.slice(1, -1).split(",").filter(x => x.trim() !== "").map(Number));
      return { dim: 2, rows };
    }
    // 一维
    const d1 = /^\[(.*)\]$/.exec(s);
    if (d1) {
      const items = d1[1].replace(/…/g, "").split(",").filter(x => x.trim() !== "").map(Number);
      return { dim: 1, rows: [items] };
    }
    return null;
  }

  function arrayScene(snap, prevVars) {
    const elems = [];
    const rows = [];
    for (const v of snap.vars) {
      const parsed = parseArrayVar(v.v);
      if (!parsed) continue;
      if (parsed.dim === 1) {
        const items = parsed.rows[0];
        if (!items.length || items.length > 64) continue;
        rows.push({ name: v.name, items });
      } else {
        // 二维：每个子行作为独立数组行渲染，行名加下标
        const R = parsed.rows;
        if (!R.length || R.length > 6) continue;
        R.forEach((r, ri) => {
          const items = r.map(x => isNaN(x) ? 0 : x);
          if (items.length > 24) items.length = 24;
          rows.push({ name: v.name + "[" + ri + "]", items });
        });
      }
    }
    if (!rows.length) return { elements: elems };
    const cw = rows.some(r => r.items.length > 24) ? 38 : 48;
    rows.forEach((row, ri) => {
      const y = (ri - (rows.length - 1) / 2) * (cw + 30);
      const startX = -(row.items.length * cw) / 2;
      elems.push({ t: "text", key: "an" + ri, x: startX - 42, y: y, text: row.name, size: 14, color: "#8f9cbf", bold: true, mono: true, align: "right" });
      let prev = null;
      if (prevVars) {
        const pv = prevVars.get(row.name);
        if (pv !== undefined && pv !== null) {
          const pp = parseArrayVar(pv);
          if (pp) prev = pp.dim === 1 ? pp.rows[0] : (pp.rows[ri] || null);
        }
      }
      row.items.forEach((val, i) => {
        const changed = prev && prev[i] !== val;
        elems.push({
          t: "cell", key: row.name + "c" + i, x: startX + i * cw, y: y - (cw - 4) / 2, w: cw - 4, h: cw - 4,
          text: String(val), index: String(i),
          fill: changed ? "rgba(251,191,36,0.22)" : undefined,
          stroke: changed ? "#fbbf24" : undefined,
          active: changed
        });
      });
    });
    return { elements: elems };
  }

  /* ---------- 内存视图（含变量栈帧，pythontutor 风格） ---------- */
  function memoryScene(snap, prevVars) {
    const elems = [];
    const objs = snap.heap || [];

    // —— 1. 变量栈帧（左列）：显示当前作用域所有变量，标量/指针/数组都可见 ——
    const scalars = [];   // 标量变量（int/char/指针/字符串）
    const arrays = [];    // 数组变量（单独走格子渲染）
    for (const v of (snap.vars || [])) {
      if (/^\[/.test(v.v)) arrays.push(v);
      else scalars.push(v);
    }
    const FRAME_W = 190, ROW_H = 30, FRAME_X = -320;
    if (scalars.length) {
      const frameH = scalars.length * ROW_H + 34;
      const frameY = -frameH / 2;
      // 帧容器
      elems.push({
        t: "rect", key: "__frame", x: FRAME_X - 8, y: frameY - 8, w: FRAME_W + 16, h: frameH + 16,
        fill: "rgba(91,140,255,0.05)", stroke: "#2c3a5e", radius: 10
      });
      elems.push({ t: "text", key: "__frameTitle", x: FRAME_X + 4, y: frameY - 0 - ROW_H + 7, text: "🖥️ 变量", size: 12, color: "#8f9cbf", bold: true, align: "left" });
      scalars.forEach((v, i) => {
        const pv = prevVars ? prevVars.get(v.name) : undefined;
        const changed = pv !== undefined && pv !== v.v;
        const y = frameY + i * ROW_H + (ROW_H - 18) / 2;
        elems.push({
          t: "rect", key: "__v" + v.name, x: FRAME_X, y: y - 8, w: FRAME_W, h: 24,
          fill: changed ? "rgba(251,191,36,0.18)" : "rgba(91,140,255,0.06)",
          stroke: changed ? "#fbbf24" : "#2c3a5e", radius: 6,
          text: (v.name + " = " + v.v).slice(0, 36), fontSize: 12, align: "left", maxChars: 36
        });
      });
    }

    // —— 2. 堆对象（右上）：malloc 出来的结构体 ——
    const GW = 178, GH = 78, GX = GW + 26, GY = GH + 46, perRow = 3;
    const rowsY = Math.ceil(objs.length / perRow);
    const heapX0 = scalars.length ? 60 : 0;   // 有变量帧时堆对象右移
    objs.forEach((o, i) => {
      const c = i % perRow, rr = Math.floor(i / perRow);
      const x = heapX0 + (c - (Math.min(perRow, objs.length) - 1) / 2) * GX;
      const y = (rr - (rowsY - 1) / 2) * GY;
      const lines = [];
      for (const k in o.fields) {
        const fv = o.fields[k];
        const show = fv === null ? "NULL" : (PTR_RE.test(String(fv)) ? "→" + fv : String(fv));
        lines.push(k + ": " + show);
      }
      elems.push({
        t: "rect", key: "obj" + o.addr, x: x - GW / 2, y: y - GH / 2, w: GW, h: GH,
        text: lines.length ? lines : ["(空)"], radius: 10
      });
      elems.push({ t: "text", key: "ob" + o.addr, x, y: y - GH / 2 - 12, text: o.type + " @ 0x" + o.addr.toString(16).toUpperCase(), size: 12, color: "#61d3a7", mono: true });
    });
    // 指针边
    const idx = new Map(objs.map(o => [o.addr, o]));
    for (const o of objs) {
      for (const k in o.fields) {
        const a = objAddrOf(o.fields[k]);
        if (a !== null && idx.has(a)) {
          elems.push({ t: "edge", key: "me" + o.addr + k, from: "obj" + o.addr, to: "obj" + a, color: "#a855f7", text: k, curve: 0.35, arrow: true });
        }
      }
    }

    // —— 3. 数组变量（底部）：小格 + 下标 ——
    let ar = 0;
    for (const v of arrays) {
      const m = /^\[(.*)\]$/.exec(v.v);
      if (!m) continue;
      const items = m[1].replace(/…/g, "").split(",").filter(s => s.trim() !== "").map(s => Number(s.trim()));
      if (!items.length || items.length > 24) continue;
      const cw = 44;
      const y = (rowsY - 1) / 2 * GY + GH / 2 + 70 + ar * 96;
      const startX = -(items.length * cw) / 2;
      elems.push({ t: "text", key: "mna" + ar, x: startX - 42, y, text: v.name + "[]", size: 14, color: "#8f9cbf", bold: true, mono: true, align: "right" });
      items.forEach((val, i) => {
        elems.push({ t: "cell", key: "m" + v.name + "c" + i, x: startX + i * cw, y: y - (cw - 4) / 2, w: cw - 4, h: cw - 4, text: String(val), index: String(i) });
      });
      ar++;
    }
    return { elements: elems };
  }

  function fmtField(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  /* ---------- 视图选择 ---------- */
  function detectMode(snaps) {
    let hasHeaps = false;
    for (const s of snaps) {
      if (s.heap && s.heap.length) hasHeaps = true;
      for (const o of (s.heap || [])) {
        if (o.fields && "next" in o.fields) return "list";
        if (o.fields && ("left" in o.fields || "right" in o.fields)) return "tree";
      }
    }
    // 没有堆对象（未 malloc）但有数组变量 → 用直观的数组视图
    if (!hasHeaps) {
      for (const s of snaps) {
        for (const v of (s.vars || [])) {
          if (/^\[/.test(v.v)) return "array";
        }
      }
      // 纯标量变量（无数组、无堆）→ 也用二维布局更清晰：仍有数组视图兜底会空，用 memory 显示变量
    }
    return "memory";
  }

  /* ---------- 主构建 ---------- */
  /**
   * opts: { lineNotes: {行号: "说明"}, mode: 'auto'|'list'|'tree'|'array'|'memory' }
   * result.ok=true → 完整执行步骤；result.ok=false 但带 partial trace →
   * 生成“执行到出错前的步骤 + 一个红色错误步”。
   */
  function build(source, result, opts) {
    opts = opts || {};
    if (!result.ok && !result.trace) return result;
    const lines = source.split("\n");
    const trace = result.trace || [];
    const mode0 = opts.mode === "auto" || !opts.mode ? detectMode(trace) : opts.mode;
    const steps = [];
    const prevVars = new Map();
    const stdoutAll = result.stdout || [];

    const sceneFor = (snap) => {
      if (mode0 === "list") return listScene(snap);
      if (mode0 === "tree") return treeScene(snap);
      if (mode0 === "array") return arrayScene(snap, prevVars);
      return memoryScene(snap, prevVars);
    };

    for (let i = 0; i < trace.length; i++) {
      const t = trace[i];
      const scene = sceneFor(t);
      const note = (opts.lineNotes && opts.lineNotes[t.line]) || "";
      const snippet = (lines[t.line - 1] || "").trim();
      const diff = [];
      for (const v of t.vars) {
        const pv = prevVars.get(v.name);
        diff.push({ name: v.name, v: v.v, changed: pv !== undefined && pv !== v.v });
        prevVars.set(v.name, v.v);
      }
      const changed = diff.filter(d => d.changed);
      let text = note;
      if (!text) {
        if (changed.length) {
          text = "执行 <code>" + snippet.slice(0, 46) + "</code> → " +
            changed.map(c => c.name + " = " + c.v).join("，");
        } else if (/while|for/.test(snippet)) {
          text = "判断循环条件 <code>" + snippet.slice(0, 46) + "</code>";
        } else {
          text = "执行 <code>" + snippet.slice(0, 46) + "</code>";
        }
      }
      const st = {
        line: t.line,
        text,
        scene,
        vars: diff,
        output: stdoutAll.slice(0, t.stdout),
        stack: t.stack,
        mode: mode0
      };
      if (opts.lineNotes && opts.lineNotes[t.line]) st.note = true;
      steps.push(st);
    }

    // 结束步 / 错误步：保留「最终状态」的变量与输出，避免最后一屏空荡
    const lastSnap = trace.length ? trace[trace.length - 1] : null;
    const lastScene = lastSnap ? sceneFor(lastSnap) : { elements: [] };
    let finalVars = [];
    if (lastSnap && lastSnap.vars && lastSnap.vars.length) {
      finalVars = lastSnap.vars.map(v => ({ name: v.name, v: v.v, changed: false }));
    } else {
      // main 返回后作用域销毁：回溯最近一帧仍有变量的快照
      for (let k = trace.length - 2; k >= 0; k--) {
        const vs = (trace[k] && trace[k].vars) || [];
        if (vs.length) { finalVars = vs.map(v => ({ name: v.name, v: v.v, changed: false })); break; }
      }
    }
    const outText = (stdoutAll || []).join("");
    const outBrief = outText.length > 160 ? outText.slice(0, 160) + "…" : outText;
    if (!result.ok) {
      steps.push({
        line: result.error.line || null,
        text: "❌ <b style='color:#f87171'>程序运行到第 " + result.error.line + " 行出错了</b>：<code style='color:#f87171'>" +
          DS.escapeHtml(result.error.message) + "</code><br>上方就是出错前程序的全部执行过程——从头回放，结合变量变化就能定位崩溃原因。",
        scene: lastScene,
        vars: finalVars,
        output: stdoutAll.slice(),
        stack: [],
        end: true,
        isError: true,
        mode: mode0
      });
    } else {
      steps.push({
        line: null,
        text: "🏁 <b>程序执行完毕</b>（共 " + trace.length + " 个快照）" +
          (outBrief ? "<br><span class='end-out'>输出：</span><code class='end-out-code'>" + DS.escapeHtml(outBrief) + "</code>" : "") +
          (finalVars.length ? "<br><span class='end-note'>最终变量状态已保留在上方面板（可继续用 ← 回看每一步）</span>" : ""),
        scene: lastScene,
        vars: finalVars,
        output: stdoutAll.slice(),
        stack: [],
        end: true,
        mode: mode0
      });
    }

    return { ok: true, steps, stdout: stdoutAll, mode: mode0, detectInfo: mode0 };
  }

  /** 高亮 C 源码（编辑器用，简易 tokenizer） */
  function highlight(src) {
    const KW = new Set([
      "int", "char", "void", "struct", "typedef", "if", "else", "while", "for",
      "return", "break", "continue", "sizeof"
    ]);
    const TYPES = new Set(["int", "char", "void", "struct"]);
    const srcLines = src.split("\n");
    return srcLines.map(line => {
      let s = DS.escapeHtml(line);
      // 字符串
      s = s.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="tk-str">$1</span>');
      // 行注释
      s = s.replace(/\/\/.*$/, m => '<span class="tk-cm">' + m + "</span>");
      // 控制关键字
      s = s.replace(/\b(if|else|while|for|return|break|continue)\b/g, '<span class="tk-kw">$1</span>');
      // 类型
      s = s.replace(/\b(int|char|void|struct|typedef|sizeof)\b/g, '<span class="tk-type">$1</span>');
      // 数字
      s = s.replace(/\b(\d+)\b/g, '<span class="tk-num">$1</span>');
      // 函数名（标识符后跟括号）
      s = s.replace(/\b([A-Za-z_]\w*)\s*(?=\()/g, '<span class="tk-fn">$1</span>');
      return s;
    }).join("\n");
  }

  return { build, highlight, detectMode };
})();