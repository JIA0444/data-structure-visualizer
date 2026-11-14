/* ==========================================================
   linkedlist.js — 链表
   ========================================================== */
(function () {
  const CY = "#fbbf24", CG = "#34d399", CR = "#f87171", CB = "#5b8cff", CP = "#a855f7";
  const FY = "rgba(251,191,36,0.32)", FG = "rgba(52,211,153,0.30)", FR = "rgba(248,113,113,0.28)";
  let seq0 = 0;

  /** 链表场景状态：nodes=[{key,v,addr}], hi=Set(key), cur=key|null */
  function listScene(nodes, hi, cur, opts) {
    opts = opts || {};
    const elems = [];
    const n = nodes.length;
    const dx = Math.min(118, 940 / Math.max(1, n));
    nodes.forEach((nd, i) => {
      const x = (i - (n - 1) / 2) * dx;
      const active = hi.has(nd.key);
      const isCur = cur === nd.key;
      elems.push({
        t: "circle", key: nd.key, x, y: 0, r: 26,
        text: String(nd.v), sub: "0x" + nd.addr.toString(16).toUpperCase(),
        fill: active ? (opts.foundF ? FG : FY) : (isCur ? FV : undefined),
        stroke: active ? (opts.foundF ? CG : CY) : (isCur ? CP : undefined),
        active: active || isCur,
        strokeWidth: 1.8,
        fontSize: 16
      });
      if (i < n - 1) {
        elems.push({
          t: "edge", key: "x" + nd.key, from: nd.key, to: nodes[i + 1].key,
          color: opts.hiEdge && opts.hiEdge === i ? CY : CB, text: "next", width: 2
        });
      }
    });
    // NULL 尾
    const tailX = (n === 0 ? 0 : (n - 1) / 2 * dx + 38);
    elems.push({ t: "circle", key: "null", x: tailX, y: 0, r: 11, fontSize: 12, text: "∅", stroke: "#66739a", fill: "rgba(102,115,154,0.08)" });
    if (n > 0) {
      elems.push({ t: "edge", key: "xn", from: nodes[n - 1].key, to: "null", color: "#66739a", style: "dashed" });
    }
    elems.push({
      t: "text", key: "head", x: (0 - (n - 1) / 2) * dx, y: -70,
      text: opts.headLabel || "▲ head", size: 14, color: CG, bold: true, mono: true
    });
    if (opts.extra) elems.push(...opts.extra);
    return { elements: elems };
  }

  function FVX() { return "rgba(168,85,247,0.35)"; }
  const FV = FVX();

  DS.structures.register({
    id: "linkedlist",
    name: "链表",
    emoji: "⛓️",
    category: "线性结构",
    badge: "核心",
    tags: ["单链表", "双向链表", "头插法", "尾插法", "指针"],
    summary: "用 next 指针串起来的动态结构：插入删除 O(1)，但访问要走链。理解指针断链重连的每一步。",

    overview: `
<div class="md"><h3>⛓️ 什么是链表</h3>
<p>链表把元素存放在<b>独立的结点</b>里，每个结点除了数据还有<b>指向下一个结点的指针 next</b>，结点不必在内存中连续。头指针 head 指向第一个结点，最后一个结点的 next 指向 NULL。</p>
<pre><code>struct Node {
    int data;           // 数据域
    struct Node* next;  // 指针域：指向下一个结点
};</code></pre>
<table>
<tr><th></th><th>数组</th><th>链表</th></tr>
<tr><td>空间</td><td>连续，需预分配</td><td>分散，按需 malloc</td></tr>
<tr><td>按位访问</td><td>O(1)</td><td>O(n)（从头走）</td></tr>
<tr><td>插入/删除</td><td>O(n) 搬移</td><td>O(1) 改指针（结点已知时）</td></tr>
</table>
</div>
<div class="md"><h3>🧷 插入与删除的指针顺序（重点）</h3>
<p><b>头插</b>：新结点 p 的 next 指向原 head，再把 head 指向 p。</p>
<pre><code>p->next = head;   // 先接后
head = p;         // 后改头</code></pre>
<div class="callout err">⚠️ 经典易错：如果先写 <code>head = p</code> 再写 <code>p->next = head</code>，链表就断了——"<b>先挂新链，再断旧链</b>"，画图操作最保险。</div>
<p><b>删除结点</b>（有前驱 prev）：<code>prev->next = q->next</code> 然后 <code>free(q)</code>。若 free 后再解引用 q 就是<b>悬垂指针</b>，属未定义行为。</p>
</div>
<div class="md"><h3>🔁 更多形态</h3>
<ul>
<li><b>双向链表</b>：多了 prev 指针，任意结点删除 O(1)，可双向遍历，常用于 LRU 缓存。</li>
<li><b>循环链表</b>：尾指向头，无 NULL，适合约瑟夫环这类"转圈"问题。</li>
<li><b>带头结点</b>：在真正数据前加一个哑结点，统一了头插与其他位置插入的处理。</li>
</ul>
<div class="callout">💡 面试高频：反转链表（三指针）、找中间结点（快慢指针）、判环（快慢指针 / Floyd）、合并两个有序链表。</div>
</div>`,

    complexity: [
      { op: "按值查找", 平均: "O(n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "从头扫描" },
      { op: "按下标访问", 平均: "O(n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "无随机访问" },
      { op: "头插 / 头删", 平均: "O(1)", 最坏: "O(1)", 空间: "O(1)", 稳定性: "—", 说明: "只改 head" },
      { op: "尾插（无尾指针）", 平均: "O(n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "需遍历到尾" },
      { op: "尾插（有尾指针）", 平均: "O(1)", 最坏: "O(1)", 空间: "O(1)", 稳定性: "—", 说明: "" },
      { op: "给定结点后插入/删除", 平均: "O(1)", 最坏: "O(1)", 空间: "O(1)", 稳定性: "—", 说明: "改指针即可" }
    ],

    demos: [
      {
        id: "ops",
        name: "基本操作演示",
        desc: "输入命令脚本：ins v=尾插、head v=头插、insat i v=插到下标 i、find v=查找、del v=删除首值为 v、rev=反转、clear=清空。用 ; 分隔。",
        what: "这是链表的「操作台」：左边写一串命令，右边动画逐步执行每条命令。可以自由增删命令，体会指针断链重连的每一步。",
        inputs: [
          { key: "ops", label: "命令序列", type: "text", def: "ins 3; ins 1; ins 4; head 9; find 1; del 1; rev", cls: "ops",
            desc: "命令与命令之间用分号 ; 隔开，空格分隔参数（如 ins 3 表示尾插数字 3）。",
            opsBank: ["ins 5; ins 2; ins 8; find 8; del 2", "head 1; head 2; head 3; del 2", "ins 7; ins 1; ins 4; insat 1 99; rev", "head 9; head 8; clear; ins 1; ins 2"] }
        ],
        samples: [
          { label: "尾插+查找+删除", values: { ops: "ins 3; ins 1; ins 4; head 9; find 1; del 1; rev" } },
          { label: "纯头插（倒序）", values: { ops: "head 1; head 2; head 3; head 4; find 3" } },
          { label: "中间插入", values: { ops: "ins 7; ins 1; ins 4; insat 2 99; del 4" } },
          { label: "全部删除到空", values: { ops: "ins 11; ins 22; ins 33; del 11; del 22; del 33" } }
        ],
        tips: [
          "把命令改成 <b>head 1; head 2; head 3</b> 再生成：头插会让最后一个插入的排在最前（倒序）。",
          "对空链表执行 <b>del 5</b> 或 <b>rev</b>，看程序怎么优雅地处理边界。",
          "试试 <b>insat 0 100</b> 与 <b>insat 3 100</b>，比较「插到第一个」和「插到最后一个」的指针变化。"
        ],
        build(inp) {
          const steps = [];
          let nodes = [];
          let seq = 0;
          const mk = v => ({ key: "n" + (seq++), v, addr: 0x1000 + seq * 8, k: seq });
          const sc = (hi, cur, extra) => listScene(nodes, hi || new Set(), cur, extra);
          const cmds = String(inp.ops || "").split(";").map(s => s.trim()).filter(Boolean);
          steps.push(DS.mkStep(sc(), "初始：空链表，head 指向 NULL。", { stats: { 长度: 0 } }));
          const findIdx = (key) => nodes.findIndex(n => n.key === key);
          const curPtr = (extra) => {
            const i = extra.ptrIdx;
            return i === null || i === undefined || i < 0 ? null : (nodes[i] ? nodes[i].key : null);
          };
          for (const raw of cmds) {
            const parts = raw.split(/\s+/);
            const cmd = parts[0].toLowerCase();
            if (cmd === "ins" || cmd === "add" || cmd === "push_back") {
              const v = parseInt(parts[1]);
              if (isNaN(v)) continue;
              const nd = mk(v);
              const oldLen = nodes.length;
              nodes.push(nd);
              steps.push(DS.mkStep(sc(new Set([nd.key])), "尾插 " + v + "：新结点 " + nd.key + "（黄），目前还没连上 next。", { stats: { 长度: oldLen + 1 } }));
              const i = findIdx(nd.key);
              if (i > 0) {
                steps.push(DS.mkStep(sc(new Set([nodes[i - 1].key, nd.key]), nd.key), "让前一个结点的 next 指向新结点，链尾更新。", { stats: { 长度: nodes.length } }));
              }
              steps.push(DS.mkStep(sc(new Set([nd.key]), nd.key), "新结点成为新链尾，next 指向 NULL。", { stats: { 长度: nodes.length } }));
            } else if (cmd === "head" || cmd === "push_front") {
              const v = parseInt(parts[1]);
              if (isNaN(v)) continue;
              const nd = mk(v);
              steps.push(DS.mkStep(sc(new Set([nd.key])), "头插 " + v + "：新结点 next 先指向原头结点。", { stats: { 长度: nodes.length } }));
              nodes.unshift(nd);
              steps.push(DS.mkStep(sc(new Set([nd.key]), nd.key), "head 指针改为指向新结点——它成为新的链头。", { stats: { 长度: nodes.length } }));
            } else if (cmd === "insat") {
              const idx = DS.clamp(parseInt(parts[1]) || 0, 0, nodes.length);
              const v = parseInt(parts[2]);
              if (isNaN(v)) continue;
              const nd = mk(v);
              nodes.splice(idx, 0, nd);
              steps.push(DS.mkStep(sc(new Set([nd.key])), "在位置 " + idx + " 插入 " + v + "。", { stats: { 长度: nodes.length } }));
              const i = findIdx(nd.key);
              if (i > 0) steps.push(DS.mkStep(sc(new Set([nodes[i - 1].key, nd.key]), nd.key), "前驱结点 next 改指向新结点。", { stats: { 长度: nodes.length } }));
              if (i + 1 < nodes.length) steps.push(DS.mkStep(sc(new Set([nd.key, nodes[i + 1].key])), "新结点 next 指向原位置结点，插入完成。", { stats: { 长度: nodes.length } }));
            } else if (cmd === "find") {
              const v = parseInt(parts[1]);
              let found = null;
              for (let i = 0; i < nodes.length; i++) {
                steps.push(DS.mkStep(sc(new Set([nodes[i].key]), nodes[i].key), "查找 " + v + "：比较 cur->data = " + nodes[i].v + (v === nodes[i].v ? " ✓" : "") + "。", { stats: { 长度: nodes.length, 比较: i + 1 } }));
                if (nodes[i].v === v) { found = i; break; }
              }
              if (found !== null) {
                steps.push(DS.mkStep(sc(new Set([nodes[found].key]), nodes[found].key, { foundF: true }), "找到！结点 " + nodes[found].v + " 是链上第 " + (found + 1) + " 个结点（绿）。", { stats: { 长度: nodes.length } }));
              } else {
                steps.push(DS.mkStep(sc(), "遍历到 NULL 都没找到 " + v + "。", { stats: { 长度: nodes.length } }));
              }
            } else if (cmd === "del") {
              const v = parseInt(parts[1]);
              let i = nodes.findIndex(n => n.v === v);
              if (i === -1) {
                steps.push(DS.mkStep(sc(), "没有值为 " + v + " 的结点，无需删除。", { stats: { 长度: nodes.length } }));
                continue;
              }
              // walk
              for (let k = 0; k <= i; k++) {
                steps.push(DS.mkStep(sc(new Set([nodes[k].key]), nodes[k].key), "移动 cur 寻找值 " + v + " 的结点（当前在 " + nodes[k].v + "）。", { stats: { 长度: nodes.length } }));
              }
              const doomed = nodes[i];
              steps.push(DS.mkStep(sc(new Set([doomed.key]), doomed.key, { delF: true }), "锁定要删除的结点 " + v + "（红）。", { stats: { 长度: nodes.length } }));
              if (i > 0) {
                const prevN = nodes[i - 1];
                steps.push(DS.mkStep(sc(new Set([prevN.key, doomed.key])), "前驱 " + prevN.v + " 的 next <b>跨过</b>目标结点，直指它的后继。", { stats: { 长度: nodes.length } }));
              }
              nodes.splice(i, 1);
              steps.push(DS.mkStep(sc(), "free 掉被摘除的结点 —— 链表长度减少。", { stats: { 长度: nodes.length, 操作: "free" } }));
            } else if (cmd === "rev" || cmd === "reverse") {
              if (nodes.length <= 1) {
                steps.push(DS.mkStep(sc(), "长度 ≤ 1，无需反转。", { stats: { 长度: nodes.length } }));
                continue;
              }
              steps.push(DS.mkStep(sc(), "反转链表：三指针 prev ← cur ← next 依次后移，逐个断链重连。", { stats: { 长度: nodes.length } }));
              let prevK = null;
              const order = nodes.slice();
              for (let i = 0; i < order.length; i++) {
                const curK = order[i].key;
                const nextK = i + 1 < order.length ? order[i + 1].key : null;
                const hi = new Set();
                if (prevK) hi.add(prevK);
                hi.add(curK);
                if (nextK) hi.add(nextK);
                steps.push(DS.mkStep(listScene(nodes, hi, curK, {
                  headLabel: "prev" + (prevK ? "→" + nodes[findIdx(prevK)].v : ""),
                  extra: [
                    { t: "text", key: "pv", x: 0, y: -96, text: "cur->next = prev，指针翻转到前一个结点", size: 13, color: CY, bold: true }
                  ]
                }), "第 " + (i + 1) + " 步：把 cur（" + order[i].v + "）的 next 指向前一个结点。", { stats: { 已反转: i } }));
              }
              nodes.reverse();
              steps.push(DS.mkStep(sc(new Set([nodes[0].key]), nodes[0].key, { headLabel: "head（新）" }), "🏁 反转完成！head 指向原链尾。", { stats: { 长度: nodes.length } }));
            } else if (cmd === "clear") {
              nodes = [];
              steps.push(DS.mkStep(sc(), "clear：逐个 free 全部结点，head 回归 NULL。", { stats: { 长度: 0 } }));
            } else {
              steps.push(DS.mkStep(sc(), "未知命令 " + raw + "（支持 ins/head/insat/find/del/rev/clear）。", { stats: { 长度: nodes.length } }));
            }
          }
          return { steps };
        }
      },
      {
        id: "circle",
        name: "循环链表 · 约瑟夫环",
        desc: "n 个人围成一圈，报数到 k 的人出列，直到只剩一人——循环链表删结点版。",
        what: "改人数 n 和报数间隔 k，就能复现经典约瑟夫环问题的任何规模。",
        inputs: [
          { key: "n", label: "人数 n", type: "number", def: 8, min: 3, max: 12, desc: "链环上有多少个结点（多少个人）。" },
          { key: "k", label: "报数间隔 k", type: "number", def: 3, min: 2, max: 9, desc: "报数报到 k 的人出列（k=3 就是 1、2、3，数到 3 出列）。" }
        ],
        samples: [
          { label: "经典 8 人报 3", values: { n: 8, k: 3 } },
          { label: "5 人报 2", values: { n: 5, k: 2 } },
          { label: "12 人报 5", values: { n: 12, k: 5 } }
        ],
        tips: [
          "把 k 改成 2 再跑一次，观察「每一轮都删掉一半感觉」的节奏。",
          "n=3、k=2：理论上 1 号会幸存吗？先猜再看动画验证。"
        ],
        build(inp) {
          const n = DS.clamp(parseInt(inp.n) || 8, 3, 12);
          const k = DS.clamp(parseInt(inp.k) || 3, 2, 9);
          const steps = [];
          const people = [];
          for (let i = 0; i < n; i++) people.push({ key: "p" + i, v: i + 1, alive: true });

          // 位置固定（按原始编号分布），出局者留在原位灰显 → 动画不跳动
          const RX = 252, RY = 152;
          const posOf = i => {
            const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
            return { x: Math.cos(ang) * RX, y: Math.sin(ang) * RY };
          };
          // 固定视野：不论剩几个人画面比例都不变（含标题/标签留白）
          const VIEW = { x0: -RX - 76, y0: -RY - 62, x1: RX + 76, y1: RY + 56 };

          const scene = (cur, bubble, justOut, winner) => {
            const elems = [];
            const live = people.filter(p => p.alive);
            // 存活者之间的连环（细直线，不标 next 文字，保持画面干净）
            if (live.length > 1) {
              for (let x = 0; x < live.length; x++) {
                const a = live[x], b = live[(x + 1) % live.length];
                // 只剩 2 人时两条边会完全重叠，用相反弧度分开
                const two = live.length === 2;
                elems.push({
                  t: "edge", key: "ring" + a.key + "_" + b.key, from: a.key, to: b.key,
                  color: "rgba(91,140,255,0.45)", width: 1.6, arrow: false,
                  curve: two ? (x === 0 ? 0.18 : -0.18) : 0
                });
              }
            }
            people.forEach((p, i) => {
              const pos = posOf(i);
              const out = !p.alive;
              const isWin = p.key === winner;
              const isCur = p.key === cur;
              const isJust = p.key === justOut;
              elems.push({
                t: "circle", key: p.key, x: pos.x, y: pos.y, r: 27,
                text: String(p.v), fontSize: 17,
                fill: isWin ? "rgba(52,211,153,0.30)" : (out ? "rgba(102,115,154,0.08)" : (isCur ? FY : (isJust ? FR : undefined))),
                stroke: isWin ? CG : (out ? "#39405a" : (isCur ? CY : (isJust ? CR : undefined))),
                textColor: isWin ? CG : (out ? "#5b6480" : undefined),
                strokeWidth: (isWin || isCur) ? 3.2 : (isJust ? 2.8 : 1.8),
                active: isWin || isCur || isJust,
                sub: isWin ? "✓ 幸存" : (out ? "✕ 出局" : undefined),
                subColor: isWin ? CG : CR
              });
              if (isCur && bubble !== undefined && !isWin) {
                elems.push({ t: "text", key: "bubble", x: pos.x, y: pos.y - 50, text: "报 " + bubble, size: 13, color: CY, bold: true, mono: true });
              }
            });
            return { elements: elems, view: VIEW };
          };

          steps.push(DS.mkStep(scene(null), "n = " + n + " 个人围成一圈（循环链表），从 1 号开始报数：报到 <b>" + k + "</b> 的人出局。", { stats: { 剩余: n, 轮次: 0 } }));

          let live = people.filter(p => p.alive);
          let pos = 0;        // 本轮报「1」的人在 live 中的下标
          let round = 0;
          while (live.length > 1) {
            round++;
            for (let c = 1; c <= k; c++) {
              const who = live[(pos + c - 1) % live.length];
              if (c < k) {
                steps.push(DS.mkStep(scene(who.key, c), "第 " + round + " 轮：" + who.v + " 号报 <b>" + c + "</b>，下一位接着报 " + (c + 1) + "。", { stats: { 剩余: live.length, 轮次: round, 报数: c } }));
              } else {
                const dIdx = (pos + c - 1) % live.length;
                const doomed = live[dIdx];
                doomed.alive = false;
                live = people.filter(p => p.alive);
                if (live.length === 1) {
                  steps.push(DS.mkStep(scene(null, undefined, doomed.key), "第 " + round + " 轮：" + doomed.v + " 号报到 <b>" + k + "</b>，<b style='color:#f87171'>出局</b>——其前后结点重新相连。", { stats: { 剩余: 1, 轮次: round } }));
                  steps.push(DS.mkStep(scene(null, undefined, undefined, live[0].key), "🏁 只剩 " + live[0].v + " 号 —— <b style='color:#34d399'>最后幸存者</b>！", { stats: { 剩余: 1, 幸存者: live[0].v } }));
                  break;
                }
                pos = dIdx % live.length;
                steps.push(DS.mkStep(scene(null, undefined, doomed.key), "第 " + round + " 轮：" + doomed.v + " 号报到 <b>" + k + "，出局</b>！（前后结点重连，下一位 " + live[pos].v + " 号重新从 1 报数）", { stats: { 剩余: live.length, 轮次: round } }));
              }
            }
          }
          return { steps };
        }
      },
      {
        id: "reverse",
        name: "反转链表（三指针）",
        desc: "prev / cur / next 三人组配合，把每条 next 指针翻转过来。",
        what: "输入任意数值序列构造链表，看三指针如何一一翻链。",
        inputs: [
          { key: "arr", label: "初始链表值", type: "text", def: "1,2,3,4,5", cls: "nums", desc: "按输入顺序构成链表（1 是链头），动画展示整链反转过程。" }
        ],
        samples: [
          { label: "五个元素", values: { arr: "1,2,3,4,5" } },
          { label: "三个元素", values: { arr: "7,8,9" } },
          { label: "两个元素（最短非平凡）", values: { arr: "42,7" } }
        ],
        tips: [
          "只输入 2 个数字（如 42,7）：这是最少元素的反转，观察 prev/cur/next 的最简配合。",
          "想清楚一个细节：反转最后一步后，原链尾的 next 指向谁？再对照动画确认。"
        ],
        build(inp) {
          const vals = DS.parseNums(inp.arr, [1, 2, 3, 4, 5], 10);
          const steps = [];
          seq0 = 0;
          const nodes = vals.map(v => ({ key: "n" + (seq0++), v, addr: 0x1000 + (seq0 + 1) * 8 }));
          let hi = new Set();
          steps.push(DS.mkStep(listScene(nodes, hi), "初始链表：1 → 2 → 3 → … → NULL。", { stats: { 长度: nodes.length } }));
          let prev = null, cur = 0;
          while (cur !== null) {
            const next = cur + 1 < nodes.length ? cur + 1 : null;
            hi = new Set();
            if (prev !== null) hi.add(nodes[prev].key);
            hi.add(nodes[cur].key);
            if (next !== null) hi.add(nodes[next].key);
            const labels = [];
            if (next !== null) labels.push({ t: "text", key: "lb", x: 0, y: -96, text: "cur=" + nodes[cur].v + "  next=" + nodes[next].v + "  prev=" + (prev === null ? "NULL" : nodes[prev].v), size: 13, color: CY, bold: true });
            steps.push(DS.mkStep(listScene(nodes, hi, nodes[cur].key, { extra: labels }), "翻转 " + nodes[cur].v + " 的 next：指向前驱 " + (prev === null ? "NULL" : nodes[prev].v) + "。", { stats: { 已处理: cur } }));
            prev = cur;
            cur = next;
          }
          nodes.reverse();
          hi = new Set();
          steps.push(DS.mkStep(listScene(nodes, hi, null, { headLabel: "head → " + nodes[0].v }), "🏁 反转完成，head 指向原链尾 " + nodes[0].v + "。", { stats: { 长度: nodes.length } }));
          return { steps };
        }
      }
    ],

    cPresets: [
      {
        id: "build",
        name: "头插法建表 + 遍历（C）",
        mode: "list",
        code: `/* 头插法：新结点插到链头 */
struct Node {
  int data;
  struct Node* next;
};
int main(){
  struct Node* head = NULL;
  int i;
  for(i = 1; i <= 4; i++){
    struct Node* p = malloc(sizeof(struct Node));
    p->data = i * 10;
    p->next = head;
    head = p;
  }
  struct Node* cur = head;
  while(cur != NULL){
    printf("%d ", cur->data);
    cur = cur->next;
  }
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          5: "头指针 head 初始为 NULL（空表）。",
          7: "循环创建 4 个结点。",
          8: "malloc 分配结点内存。",
          10: "新结点 next 先指向原头（先挂链）。",
          11: "head 改指向新结点（后改头）。",
          13: "遍历用游标 cur。",
          14: "走到 NULL 停止。"
        }
      },
      {
        id: "tail",
        name: "尾插函数（typedef）（C）",
        mode: "list",
        code: `/* 尾插：typedef 定义类型 + 辅助函数 */
typedef struct Node {
  int data;
  struct Node* next;
} Node;
Node* tail(Node* head, int v){
  Node* p = malloc(sizeof(Node));
  p->data = v;
  p->next = NULL;
  if(head == NULL) return p;
  Node* cur = head;
  while(cur->next != NULL) cur = cur->next;
  cur->next = p;
  return head;
}
int main(){
  Node* head = NULL;
  head = tail(head, 3);
  head = tail(head, 1);
  head = tail(head, 4);
  Node* cur = head;
  while(cur != NULL){
    printf("%d ", cur->data);
    cur = cur->next;
  }
  return 0;
}`,
        lineNotes: {
          4: "typedef 让 Node 代替 struct Node。",
          7: "malloc(sizeof(Node)) 分配新结点。",
          9: "新结点 next = NULL。",
          10: "空表直接返回新结点。",
          12: "否则走到当前链尾。",
          13: "链尾 next 挂上新结点。"
        }
      },
      {
        id: "sorted",
        name: "有序插入（保持递增）（C）",
        mode: "list",
        code: `/* 有序插入：找到第一个大于 v 的位置前插入 */
struct Node {
  int data;
  struct Node* next;
};
int main(){
  struct Node* head = NULL;
  int vals[5] = {8, 3, 6, 1, 9};
  int i;
  for(i = 0; i < 5; i++){
    struct Node* p = malloc(sizeof(struct Node));
    p->data = vals[i];
    if(head == NULL || head->data >= p->data){
      p->next = head;
      head = p;
    } else {
      struct Node* cur = head;
      while(cur->next != NULL && cur->next->data < p->data){
        cur = cur->next;
      }
      p->next = cur->next;
      cur->next = p;
    }
  }
  struct Node* c2 = head;
  while(c2 != NULL){
    printf("%d ", c2->data);
    c2 = c2->next;
  }
  return 0;
}`,
        lineNotes: {
          11: "p->next = head; head = p 头插（比头还小的情况）。",
          14: "cur 停到「插入点前驱」。",
          17: "把 p 插到 cur 之后（断链重连两步）。"
        }
      },
      {
        id: "head-dummy",
        name: "头插法 · 带头结点（C）",
        mode: "list",
        code: `/* 头插法（带头结点）：dummy 不存数据，dummy->next 才是第一个元素 */
struct Node {
  int data;
  struct Node* next;
};
int main(){
  struct Node* dummy = malloc(sizeof(struct Node));
  dummy->data = 0;
  dummy->next = NULL;
  int i;
  for(i = 1; i <= 4; i++){
    struct Node* p = malloc(sizeof(struct Node));
    p->data = i * 10;
    p->next = dummy->next;
    dummy->next = p;
  }
  struct Node* cur = dummy->next;
  while(cur != NULL){
    printf("%d ", cur->data);
    cur = cur->next;
  }
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          7: "创建头结点 dummy（哨兵），本身不保存有效数据。",
          8: "dummy->next = NULL 表示空表（比 head=NULL 少一次特判）。",
          14: "新结点指向原第一个数据结点。",
          15: "dummy->next 改指新结点——头插的核心两步。",
          17: "遍历从 dummy->next 开始（跳过哨兵）。"
        }
      },
      {
        id: "tail-dummy",
        name: "尾插法 · 带头结点 + 尾指针（C）",
        mode: "list",
        code: `/* 尾插法（带头结点 + tail 尾指针）：顺序建表 O(1) 追加 */
struct Node {
  int data;
  struct Node* next;
};
int main(){
  struct Node* dummy = malloc(sizeof(struct Node));
  dummy->next = NULL;
  struct Node* tail = dummy;
  int i;
  for(i = 1; i <= 4; i++){
    struct Node* p = malloc(sizeof(struct Node));
    p->data = i * 10;
    p->next = NULL;
    tail->next = p;
    tail = p;
  }
  struct Node* cur = dummy->next;
  while(cur != NULL){
    printf("%d ", cur->data);
    cur = cur->next;
  }
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          9: "tail 始终指向最后一个结点（初始指向 dummy）。",
          14: "新结点 next 置 NULL（将来成为新尾巴）。",
          15: "旧尾巴接到新结点上。",
          16: "tail 后移——这样每次追加都是 O(1)，不用从头找尾。"
        }
      },
      {
        id: "delete-plain",
        name: "按值删除 · 不带头结点（C）",
        mode: "list",
        code: `/* 删除值为 30 的结点（不带头结点）：删头结点要特殊处理 */
struct Node {
  int data;
  struct Node* next;
};
int main(){
  struct Node* head = NULL;
  struct Node* tail = NULL;
  int i;
  for(i = 1; i <= 4; i++){
    struct Node* p = malloc(sizeof(struct Node));
    p->data = i * 10;
    p->next = NULL;
    if(head == NULL){ head = p; tail = p; }
    else { tail->next = p; tail = p; }
  }
  struct Node* pre = NULL;
  struct Node* cur = head;
  while(cur != NULL){
    if(cur->data == 30) break;
    pre = cur;
    cur = cur->next;
  }
  if(cur != NULL){
    if(pre == NULL) head = cur->next;
    else pre->next = cur->next;
    free(cur);
  }
  cur = head;
  while(cur != NULL){
    printf("%d ", cur->data);
    cur = cur->next;
  }
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          13: "第一个结点：head 和 tail 都要指过去。",
          17: "pre 是前驱（删除需要它来断链）。",
          22: "找到目标就跳出。",
          23: "pre 跟着 cur 走——错位前进。",
          27: "若 pre==NULL 说明删的是头结点，必须改 head。",
          28: "否则让前驱绕过 cur。",
          29: "释放被删结点，避免内存泄漏。"
        }
      },
      {
        id: "delete-dummy",
        name: "按值删除 · 带头结点（C）",
        mode: "list",
        code: `/* 删除值为 30 的结点（带头结点）：不用特判头结点，代码更短 */
struct Node {
  int data;
  struct Node* next;
};
int main(){
  struct Node* dummy = malloc(sizeof(struct Node));
  dummy->next = NULL;
  struct Node* tail = dummy;
  int i;
  for(i = 1; i <= 4; i++){
    struct Node* p = malloc(sizeof(struct Node));
    p->data = i * 10;
    p->next = NULL;
    tail->next = p;
    tail = p;
  }
  struct Node* pre = dummy;
  while(pre->next != NULL && pre->next->data != 30){
    pre = pre->next;
  }
  if(pre->next != NULL){
    struct Node* del = pre->next;
    pre->next = del->next;
    free(del);
  }
  struct Node* cur = dummy->next;
  while(cur != NULL){
    printf("%d ", cur->data);
    cur = cur->next;
  }
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          17: "pre 从 dummy 出发——哨兵保证了「第一个数据结点也有前驱」。",
          18: "停在要删结点的前驱上（不需要单独判断删头）。",
          22: "del 是要删除的结点。",
          23: "前驱绕过 del（一行搞定，无需 if/else）。",
          24: "释放内存。"
        }
      }
    ]
  });
})();