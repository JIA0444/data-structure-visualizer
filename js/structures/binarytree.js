/* ==========================================================
   binarytree.js — 二叉树与四种遍历
   ========================================================== */
(function () {
  "use strict";

  /* ================= 局部小工具 ================= */
  // 节点状态样式（与全站配色一致）
  const STY = {
    normal: { fill: "rgba(91,140,255,0.16)", stroke: "#5b8cff" },
    active: { fill: "rgba(251,191,36,0.30)", stroke: "#fbbf24" },   // 黄：当前节点
    done:   { fill: "rgba(52,211,153,0.22)", stroke: "#34d399" },   // 绿：已访问
    dim:    { fill: "rgba(100,120,160,0.07)", stroke: "#2c3a5e" }
  };
  const TXT = { active: undefined, done: "#34d399", dim: "#9aa6c4", normal: undefined };

  /** 树节点：key = 创建序号（"n"+u），删除不复用 */
  function mkNode(u, v) {
    return { key: "n" + u, u, v, left: null, right: null, x: 0, y: 0 };
  }

  /**
   * 中序 x 布局（与 codeviz.treeScene 一致）：
   * x = (中序序号 - (总数-1)/2) * 72，y = 深度 * 100（root 层 0，垂直居中）
   */
  function layout(root) {
    const xs = new Map(), ds = new Map();
    let c = 0;
    (function visit(n, d) {
      if (!n) return;
      visit(n.left, d + 1);
      xs.set(n, c++); ds.set(n, d);
      visit(n.right, d + 1);
    })(root, 0);
    const total = Math.max(1, c);
    let maxD = 0;
    for (const [n, d] of ds) {
      n.x = (xs.get(n) - (total - 1) / 2) * 72;
      n.y = d * 100;
      if (d > maxD) maxD = d;
    }
    const off = (maxD * 100) / 2; // 垂直居中偏移
    for (const n of xs.keys()) n.y -= off;
    return maxD;
  }

  function collect(root, out) {
    out = out || [];
    if (!root) return out;
    out.push(root);
    collect(root.left, out);
    collect(root.right, out);
    return out;
  }

  /** 树 → 场景元素（圆 + 边）。statusOf(n)→"normal/active/done/dim"，edgeOf 可自定义边样式 */
  function treeElems(root, statusOf, edgeOf) {
    const nodes = collect(root);
    const elems = [];
    for (const n of nodes) {
      const s = (statusOf && statusOf(n)) || "normal";
      const st = STY[s] || STY.normal;
      elems.push({
        t: "circle", key: n.key, x: n.x, y: n.y, r: 21,
        text: String(n.v),
        fill: st.fill, stroke: st.stroke,
        active: s === "active",
        textColor: TXT[s],
        strokeWidth: s === "normal" ? undefined : 2.6,
        fontSize: 15
      });
    }
    for (const n of nodes) {
      if (n.left) {
        elems.push(edgeOf ? edgeOf(n, n.left, "left") : {
          t: "edge", key: "e" + n.key + n.left.key, from: n.key, to: n.left.key,
          color: "#5b8cff", style: "solid", arrow: false, width: 2
        });
      }
      if (n.right) {
        elems.push(edgeOf ? edgeOf(n, n.right, "right") : {
          t: "edge", key: "e" + n.key + n.right.key, from: n.key, to: n.right.key,
          color: "#a855f7", style: "dashed", arrow: false, width: 2
        });
      }
    }
    return elems;
  }

  /** 输出序列小条：n 个小格从左到右逐个点亮 */
  function stripElems(vals, n, y, label, curIdx) {
    const elems = [];
    const cw = 36, gap = 7;
    const total = n * (cw + gap);
    const x0 = -total / 2;
    elems.push(DS.stepLib.label(x0 - 26, y, label,
      { key: label + "lb", align: "right", size: 13, color: "#61d3a7", bold: true, mono: true }));
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * (cw + gap);
      const v = vals[i];
      const isCur = i === curIdx;
      elems.push({
        t: "cell", key: label + "c" + i, x: cx - cw / 2, y: y - 15, w: cw - 6, h: 30,
        text: v === undefined || v === null ? "·" : String(v),
        fill: isCur ? "rgba(251,191,36,0.30)"
          : (v !== undefined && v !== null ? "rgba(52,211,153,0.18)" : "rgba(100,120,160,0.08)"),
        stroke: isCur ? "#fbbf24" : "#2c3a5e",
        active: isCur, radius: 6
      });
    }
    return elems;
  }

  /** 层序遍历的队列小横条 */
  function queueElems(q, maxLen, y, label) {
    const elems = [];
    const cw = 36, gap = 7;
    const total = maxLen * (cw + gap);
    const x0 = -total / 2;
    elems.push(DS.stepLib.label(x0 - 26, y, label,
      { key: label + "lb", align: "right", size: 13, color: "#8f9cbf", bold: true, mono: true }));
    for (let i = 0; i < maxLen; i++) {
      const cx = x0 + i * (cw + gap);
      const v = q[i];
      elems.push({
        t: "cell", key: label + "c" + i, x: cx - cw / 2, y: y - 15, w: cw - 6, h: 30,
        text: v === undefined ? "" : String(v.v),
        fill: v !== undefined ? "rgba(91,140,255,0.22)" : "rgba(100,120,160,0.05)",
        stroke: v !== undefined ? "#5b8cff" : "#2c3a5e",
        radius: 6
      });
    }
    return elems;
  }

  /** 由全部元素计算稳定包围盒（小条格子永远占位 → 视图不跳动） */
  function boundView(elems) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const e of elems) {
      if (!e || typeof e.x !== "number" || !isFinite(e.x) || typeof e.y !== "number" || !isFinite(e.y)) continue;
      let lx = e.x, rx = e.x, ty = e.y, by = e.y;
      if (e.t === "rect" || e.t === "cell") { rx = e.x + e.w; by = e.y + e.h; }
      if (e.t === "circle") { const r = e.r || 21; lx = e.x - r; rx = e.x + r; ty = e.y - r; by = e.y + r; }
      x0 = Math.min(x0, lx); x1 = Math.max(x1, rx);
      y0 = Math.min(y0, ty); y1 = Math.max(y1, by);
    }
    if (x0 > x1) { x0 = -100; x1 = 100; y0 = -50; y1 = 50; }
    return { x0: x0 - 60, x1: x1 + 60, y0: y0 - 46, y1: y1 + 46 };
  }

  /** 按层序（下标 2i+1 / 2i+2）从序列构建完全二叉树 */
  function buildLevelTree(vals) {
    const nodes = vals.map((v, i) => mkNode(i, v));
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      if (2 * i + 1 < n) nodes[i].left = nodes[2 * i + 1];
      if (2 * i + 2 < n) nodes[i].right = nodes[2 * i + 2];
    }
    return nodes[0] || null;
  }

  /* ================= 模块注册 ================= */
  DS.structures.register({
    id: "binarytree",
    name: "二叉树与遍历",
    emoji: "🌳",
    category: "树与堆",
    badge: "核心",
    tags: ["先序", "中序", "后序", "层序", "递归"],
    summary: "每个节点最多两个孩子。四种遍历（先/中/后/层序）是把树「线性化」的基本功，也是解决树问题的万能入口。",

    /* ================= 知识讲解 ================= */
    overview: `
<div class="md"><h3>🌱 树的术语与二叉树的定义</h3>
<p><b>树</b>是由 n 个节点组成的<b>分层</b>结构：最上面是<b>根（root）</b>，没有孩子的节点叫<b>叶（leaf）</b>；节点 A 指向节点 B，则 A 是 B 的<b>父</b>、B 是 A 的<b>子</b>。常用量：</p>
<table>
<tr><th>术语</th><th>含义</th></tr>
<tr><td>节点深度 depth</td><td>从根到该节点的边数（根深度 = 0）</td></tr>
<tr><td>节点高度 height</td><td>从该节点到最远叶子的边数（叶高度 = 0）</td></tr>
<tr><td>树的高度</td><td>根的高度，也是最大深度</td></tr>
<tr><td>节点的度</td><td>孩子的个数（二叉树 ≤ 2）</td></tr>
</table>
<p><b>二叉树</b>：每个节点<b>最多两个孩子</b>，且孩子区分<b>左/右</b>（左右互换就是另一棵树）。三个重要性质：</p>
<ul>
<li>第 i 层（根为第 0 层）<b>最多 2<sup>i</sup></b> 个节点，恰有 2<sup>i</sup> 个时为<b>满二叉树</b>；</li>
<li>n 个节点的二叉树高度范围：<b>⌊log₂ n⌋ ~ n−1</b>（完全二叉树最矮，退化成链时最高）；</li>
<li><b>边数 = 节点数 − 1</b>（除根外每个节点恰好被一条边指入）。</li>
</ul>
<div class="callout">💡 为什么树这么值钱：高度为 h 的二叉树最多有 2<sup>h+1</sup>−1 个节点。反过来，n 个节点「抱成一团」时高度只有 log n —— 沿着边找东西最多走 h 步，这正是后面 BST、堆一切 O(log n) 的来源。</div>
</div>
<div class="md"><h3>📦 存储：链式与顺序</h3>
<p><b>① 链式存储</b>（最常用）—— 每个节点一个结构体，保存数据 + 左右指针：</p>
<pre><code>struct Node{
    int data;           /* 数据 */
    struct Node *left;  /* 左孩子 */
    struct Node *right; /* 右孩子 */
};</code></pre>
<p><b>② 顺序存储</b>（适合<b>完全二叉树</b>，如堆）—— 按层序把节点塞进数组：<br>下标 i 的节点，左孩子 <code>2i+1</code>、右孩子 <code>2i+2</code>、父节点 <code>(i−1)/2</code>。<br>优点是省掉指针、父子一步算到；缺点是非完全二叉树会造成大量数组空位。</p>
<table>
<tr><th></th><th>链式</th><th>顺序（数组）</th></tr>
<tr><td>找孩子</td><td>顺着指针</td><td>下标公式 O(1)</td></tr>
<tr><td>形状</td><td>任意</td><td>适合完全二叉树</td></tr>
<tr><td>空位浪费</td><td>无</td><td>稀疏树浪费大</td></tr>
</table>
</div>
<div class="md"><h3>🔄 四种遍历：把树「拍平」成一串</h3>
<p>三个词根的位置决定三种<b>深度优先</b>遍历——「先/中/后」说的是<b>根</b>被访问的时机：</p>
<pre><code>            1
          /   \\
         2     3
        / \\   /
       4   5 6</code></pre>
<table>
<tr><th>遍历</th><th>规则</th><th>对本树的结果</th></tr>
<tr><td><b>先序</b> pre</td><td>根 → 左 → 右</td><td>1, 2, 4, 5, 3, 6</td></tr>
<tr><td><b>中序</b> in</td><td>左 → 根 → 右</td><td>4, 2, 5, 1, 6, 3</td></tr>
<tr><td><b>后序</b> post</td><td>左 → 右 → 根</td><td>4, 5, 2, 6, 3, 1</td></tr>
<tr><td><b>层序</b> level</td><td>逐层从左到右</td><td>1, 2, 3, 4, 5, 6</td></tr>
</table>
<p>手算口诀：跟着<b>递归调用</b>念 —— 进函数就打印是<b>先序</b>；从左子树回来再打印是<b>中序</b>；左右都回来才打印是<b>后序</b>。</p>
<div class="callout warn">🌟 中序的特殊地位：对<b>二叉搜索树 BST</b>，中序遍历结果<b>恰好是升序</b>（左 &lt; 根 &lt; 右 的定义直接推出）。「中序 = 有序」是判断一棵树是不是 BST 的快捷办法。</div>
</div>
<div class="md"><h3>🧩 递归、调用栈与还原</h3>
<ul>
<li><b>递归调用栈</b>：遍历的递归版每一层调用对应一个栈帧；栈深 = 当前节点的深度，最坏 O(h)。递归函数的<b>基线（base case）</b>必写 <code>if(root == NULL) return;</code> —— 它负责在空子树处「刹车」，也是递归能停下来的保证。</li>
<li><b>层序 = BFS</b>：层序不能靠递归的自然顺序，要用<b>队列</b>：根入队 → 循环「出队访问，左右孩子入队」。队列最大长度可达最宽一层的节点数 w，所以空间 O(w)。</li>
<li><b>由两个遍历还原树</b>：<b>先序 + 中序</b>（或后序 + 中序）可以唯一还原一棵二叉树 —— 先序第一个元素是根，去中序里一劈两半：左边是左子树、右边是右子树，然后递归。光有先序 + 后序不够，因为无法区分左右。</li>
</ul>
<div class="callout err">⚠️ 易错点：① 先/中/后序写反 —— 顺序描述的是<b>根</b>的位置，不是往返路径；② 忘了递归基线 <code>if(root==NULL) return;</code>，空指针一层层传下去必然崩；③ 中序不是「左下→根→右下」，而是每棵<b>子树</b>都完整执行这个规则。</div>
</div>`,

    complexity: [
      { op: "深度优先遍历 ×3（先/中/后）", 平均: "O(n)", 最坏: "O(n)", 空间: "O(h)", 稳定性: "—", 说明: "递归调用栈深 = 树高；链状树 O(n)" },
      { op: "层序遍历（BFS）", 平均: "O(n)", 最坏: "O(n)", 空间: "O(w)", 稳定性: "—", 说明: "w = 最宽层节点数（满树末层 ≈ n/2）" },
      { op: "按先序+中序还原树", 平均: "O(n)", 最坏: "O(n)", 空间: "O(h)", 稳定性: "—", 说明: "可用哈希表把查找根位置优化到 O(1)" }
    ],

    /* ================= 动手演示 ================= */
    demos: [
      {
        id: "traverse",
        name: "四种遍历",
        desc: "按层序把序列建成完全二叉树，再选择先序/中序/后序/层序，看访问顺序如何一步步累积到输出序列。黄=当前访问，绿=已访问。",
        inputs: [
          { key: "nums", label: "节点序列（按层序建树）", type: "text", def: "5,3,8,1,4,7,9", cls: "nums", desc: "数组按层序构建完全二叉树（第 i 个的左右孩子是 2i+1、2i+2）。" },
          { key: "mode", label: "遍历方式", type: "select", options: [
            ["pre", "先序遍历（根 → 左 → 右）"],
            ["in", "中序遍历（左 → 根 → 右）"],
            ["post", "后序遍历（左 → 右 → 根）"],
            ["level", "层序遍历（BFS / 逐层从左到右）"]
          ], desc: "四种遍历，同一棵树看四种不同的访问顺序。" }
        ],
        what: "自由改节点序列与遍历方式：先/中/后/层序的访问顺序差异一目了然。",
        samples: [
          { label: "完满树 + 中序", values: { nums: "5,3,8,1,4,7,9", mode: "in" } },
          { label: "先序", values: { nums: "5,3,8,1,4,7,9", mode: "pre" } },
          { label: "后序", values: { nums: "5,3,8,1,4,7,9", mode: "post" } },
          { label: "层序（队列）", values: { nums: "5,3,8,1,4,7,9", mode: "level" } }
        ],
        tips: [
          "对比先序与中序的前两个访问节点：先序总是先访问根；中序总是先扎到最左。",
          "层序遍历就是 BFS——它需要一个队列。",
          "只输入 4 个节点（如 1,2,3,4），层序建树会出现「缺右孩子」的形状。"
        ],
        build(inp) {
          const MODES = ["pre", "in", "post", "level"];
          const mode = MODES.indexOf(inp.mode) === -1 ? "pre" : inp.mode;
          const raw = DS.parseNums(inp.nums, [5, 3, 8, 1, 4, 7, 9], 15);
          const n = raw.length;
          const root = buildLevelTree(raw);
          const maxD = layout(root);
          const steps = [];

          const NAME = { pre: "先序", in: "中序", post: "后序", level: "层序" }[mode];
          const RULE = {
            pre: "根 → 左 → 右", in: "左 → 根 → 右",
            post: "左 → 右 → 根", level: "逐层从左到右（FIFO 队列）"
          }[mode];

          // 预演遍历顺序
          const order = [];
          if (mode === "level") {
            const q = [root];
            while (q.length) {
              const t = q.shift();
              order.push(t);
              if (t.left) q.push(t.left);
              if (t.right) q.push(t.right);
            }
          } else {
            (function rec(nd) {
              if (!nd) return;
              if (mode === "pre") order.push(nd);
              rec(nd.left);
              if (mode === "in") order.push(nd);
              rec(nd.right);
              if (mode === "post") order.push(nd);
            })(root);
          }

          // 层序：每个访问步之后队列的状态
          let maxQLen = 1;
          const qStates = [];
          if (mode === "level") {
            const q = [root];
            for (const cur of order) {
              q.shift();
              if (cur.left) q.push(cur.left);
              if (cur.right) q.push(cur.right);
              qStates.push(q.slice());
              maxQLen = Math.max(maxQLen, q.length);
            }
          }

          const stripY = (maxD * 100) / 2 + 21 + 48;
          const queueY = stripY + 48;
          const visits = new Array(n).fill(undefined);

          const scene = (curNode, curIdx, qArr) => {
            const visitedSet = new Set(order.slice(0, curIdx));
            let elems = treeElems(root, nd => {
              if (nd === curNode) return "active";
              if (visitedSet.has(nd)) return "done";
              return "normal";
            });
            elems = elems.concat(stripElems(visits, n, stripY, "输出序列", curIdx));
            if (mode === "level") elems = elems.concat(queueElems(qArr || [], maxQLen, queueY, "队列（队头→队尾）"));
            return { elements: elems, view: boundView(elems) };
          };

          const ruleWord = { pre: "先根、再左、后右", in: "先左、再根、后右", post: "先左、再右、后根" }[mode];

          steps.push(DS.mkStep(scene(null, -1, mode === "level" ? [root] : null),
            "序列 <b>" + raw.join(", ") + "</b> 按<b>层序</b>建成了一棵完全二叉树。本次演示「<b>" + NAME + "遍历</b>」：规则 = <b>" + RULE + "</b>。下方小条会逐步累积输出序列。" + (mode === "level" ? " 层序额外展示 BFS 队列的变化。" : ""),
            { stats: { 遍历: NAME, 已访问: 0, 总节点: n } }));

          for (let k = 0; k < order.length; k++) {
            const cur = order[k];
            visits[k] = cur.v;
            let txt;
            if (mode === "pre") {
              txt = "第 " + (k + 1) + " 步 —— 访问 <b>" + cur.v + "</b>（规则：" + ruleWord + "）：它当前所在<b>子树的根</b>，先输出它，再去左、右子树。";
            } else if (mode === "in") {
              txt = "第 " + (k + 1) + " 步 —— 访问 <b>" + cur.v + "</b>（规则：" + ruleWord + "）：它的<b>左子树已全部输出完</b>，此刻轮到根，之后再进右子树。";
            } else if (mode === "post") {
              txt = "第 " + (k + 1) + " 步 —— 访问 <b>" + cur.v + "</b>（规则：" + ruleWord + "）：它的<b>左右子树都已输出完</b>，最后才输出根。";
            } else {
              const qAfter = qStates[k];
              const kids = [cur.left, cur.right].filter(Boolean);
              txt = "第 " + (k + 1) + " 步 —— <b>出队并访问 " + cur.v + "</b>（规则：" + RULE + "）。" +
                (kids.length ? "孩子 " + kids.map(x => x.v).join("、") + " 依次入队 → 队列变为 " + (qAfter.length ? qAfter.map(x => x.v).join(", ") : "空") + "。" : "没有孩子 → 无新入队。");
            }
            steps.push(DS.mkStep(scene(cur, k, mode === "level" ? qStates[k] : null), txt,
              { stats: { 遍历: NAME, 已访问: k + 1, 总节点: n } }));
          }

          const outStr = order.map(x => x.v).join(" → ");
          const sorted = order.map(x => x.v).every((v, i, a) => i === 0 || a[i - 1] <= v);
          steps.push(DS.mkStep(scene(null, n, mode === "level" ? [] : null),
            "🏁 <b>" + NAME + "遍历完成</b>：<b style='color:#34d399'>" + outStr + "</b>。" +
            (mode === "in" && sorted ? "注意：这组数据按层序恰好构造成了一棵 BST —— 中序结果正是<b>升序</b>（「中序 = 有序」是 BST 的灵魂性质）。" : ""),
            { stats: { 遍历: NAME, 已访问: n, 总节点: n } }));

          return { steps };
        }
      },
      {
        id: "recurstack",
        name: "递归的调用栈",
        desc: "显微镜下的遍历：每次函数调用都压入一个栈帧、返回时弹出。观察「进函数→钻左子树→回溯→出函数」与调用栈的同步变化（节点数较多时自动截断以保证步数）。",
        inputs: [
          { key: "nums", label: "节点序列（按层序建树）", type: "text", def: "5,3,8,1,4,7,9", cls: "nums" },
          { key: "mode", label: "遍历方式", type: "select", options: [
            ["pre", "先序遍历（进函数即访问）"],
            ["in", "中序遍历（从左子树回溯后访问）"],
            ["post", "后序遍历（左右完成后访问）"]
          ] }
        ],
        build(inp) {
          const MODES = ["pre", "in", "post"];
          const mode = MODES.indexOf(inp.mode) === -1 ? "pre" : inp.mode;
          // 步数预算：进出各一步 + 空指针基线步。先序（进即访问）可容纳更多节点
          const capNum = mode === "pre" ? 15 : 11;
          const raw = DS.parseNums(inp.nums, [5, 3, 8, 1, 4, 7, 9], capNum);
          const n = raw.length;
          const root = buildLevelTree(raw);
          const maxD = layout(root);
          const steps = [];
          const fname = { pre: "pre", in: "in", post: "post" }[mode];
          const CN = { pre: "先序", in: "中序", post: "后序" }[mode];

          // 模拟递归过程，产生事件流
          const events = [];
          (function rec(nd) {
            if (mode === "pre") events.push({ t: "visit", n: nd });   // 先序：进函数就打印
            events.push({ t: "enter", n: nd });
            if (nd.left) rec(nd.left); else events.push({ t: "null", p: nd, side: "左" });
            if (mode === "in") events.push({ t: "visit", n: nd });    // 中序：左子树回来才打印
            if (nd.right) rec(nd.right); else events.push({ t: "null", p: nd, side: "右" });
            if (mode === "post") events.push({ t: "visit", n: nd });  // 后序：左右都回来才打印
            events.push({ t: "exit", n: nd });
          })(root);

          const stripY = (maxD * 100) / 2 + 21 + 48;
          const hintY = stripY + 40;
          const stack = ["main"];      // 调用栈（底 → 顶）
          const visited = [];          // 已打印的节点
          let maxDepth = 1;

          const frameName = nd => fname + "(" + nd.v + ")";
          const stackHTML = () =>
            '<span class="stat"><b>' + stack.length + '</b> 栈深度 · 调用栈（顶 → 底）</span>' +
            stack.slice().reverse().map(f => '<span class="stat"><b>' + f + '</b></span>').join("");

          const scene = (curNode, extra, curIdx) => {
            const visitedSet = new Set(visited);
            let elems = treeElems(root, nd => {
              if (nd === curNode) return "active";
              if (visitedSet.has(nd)) return "done";
              return "normal";
            });
            elems = elems.concat(stripElems(visited.map(x => x.v), n, stripY, "输出序列", curIdx === undefined ? -1 : curIdx));
            if (extra) elems = elems.concat(extra);
            return { elements: elems, view: boundView(elems) };
          };

          steps.push(DS.mkStep(scene(null),
            "「<b>" + CN + "遍历</b>」的递归版本。每次调用 <b>" + fname + "(节点)</b> 都会<b>压入一个栈帧</b>，返回时弹出。基线（base case）：<code>if(root == NULL) return;</code>。上方小条是输出序列，上方面板显示调用栈。",
            { stats: { 访问: 0, 总节点: n }, statsHTML: stackHTML() }));

          for (const ev of events) {
            if (ev.t === "enter") {
              stack.push(frameName(ev.n));
              maxDepth = Math.max(maxDepth, stack.length);
              if (mode === "pre") {
                visited.push(ev.n);
                steps.push(DS.mkStep(scene(ev.n, null, visited.length - 1),
                  "调用 <b>" + frameName(ev.n) + "</b>：栈帧<b>入栈</b>（黄=本帧所在节点）。先序的「根」在<b>进函数这一刻</b>访问 —— 打印 <b style='color:#34d399'>" + ev.n.v + "</b>，写进输出序列。",
                  { stats: { 访问: visited.length, 总节点: n }, statsHTML: stackHTML() }));
              } else {
                steps.push(DS.mkStep(scene(ev.n),
                  "调用 <b>" + frameName(ev.n) + "</b>：栈帧<b>入栈</b>（黄=本帧所在节点）。" + CN + "遍历：<b>先别打印</b>，把" + (mode === "in" ? "左子树" : "左右子树") + "全部走完再说。",
                  { stats: { 访问: visited.length, 总节点: n }, statsHTML: stackHTML() }));
              }
            } else if (ev.t === "visit") {
              visited.push(ev.n);
              steps.push(DS.mkStep(scene(ev.n, null, visited.length - 1),
                (mode === "in"
                  ? "回溯到 <b>" + frameName(ev.n) + "</b>：左子树已全部处理完 —— 现在访问<div style='display:inline'>「</div>根<div style='display:inline'>」</div>，打印 <b style='color:#34d399'>" + ev.n.v + "</b>（<b>左 → 根 → 右</b>中的根）。节点变绿。"
                  : "回溯到 <b>" + frameName(ev.n) + "</b>：左右子树都已处理完 —— 最后访问<div style='display:inline'>「</div>根<div style='display:inline'>」</div>，打印 <b style='color:#34d399'>" + ev.n.v + "</b>（<b>左 → 右 → 根</b>中的根）。节点变绿。"),
                { stats: { 访问: visited.length, 总节点: n }, statsHTML: stackHTML() }));
            } else if (ev.t === "null") {
              steps.push(DS.mkStep(scene(null, [
                DS.stepLib.label(0, hintY, "if (" + fname + "NODE == NULL) return;   ← 递归基线（base case）",
                  { key: "nullhint", size: 14, color: "#f87171", bold: true, mono: true })
              ]),
                "递归基线：<b>" + frameName(ev.p) + "</b> 的" + ev.side + "孩子是 <b>NULL</b> —— <code>if(root == NULL) return;</code> 成立，<b>不入栈、不打印，立刻返回</b>。这就是递归能停下来的刹车。",
                { stats: { 访问: visited.length, 总节点: n }, statsHTML: stackHTML() }));
            } else { // exit
              stack.pop();
              steps.push(DS.mkStep(scene(null),
                "返回：<b>" + frameName(ev.n) + "</b> 执行完毕，栈帧<b>出栈</b>，控制权交还调用者" + (stack.length > 1 ? " <b>" + stack[stack.length - 1] + "</b>" : "（上方只有 main 了）") + "。该节点彻底处理完（绿）。",
                { stats: { 访问: visited.length, 总节点: n }, statsHTML: stackHTML() }));
            }
          }

          steps.push(DS.mkStep(scene(null),
            "🏁 递归结束：调用栈只剩 <b>main</b>，输出序列 = <b style='color:#34d399'>" + visited.map(x => x.v).join(" → ") + "</b>。最深时栈有 <b>" + maxDepth + "</b> 个栈帧（树高 +1）—— 这就是遍历空间复杂度 O(h) 的直观含义。",
            { stats: { 访问: visited.length, 总节点: n, 最深栈: maxDepth + " 帧" }, statsHTML: stackHTML() }));

          return { steps };
        }
      }
    ],

    /* ================= C 代码示例 ================= */
    cPresets: [
      {
        id: "bt-pre",
        name: "构建小树 + 先序遍历",
        mode: "tree",
        code: `/* 构建一棵小树并先序遍历
   先序 = 根 → 左子树 → 右子树：
   进函数那一刻就访问根 */
typedef struct Node{
  int data;
  struct Node *left;
  struct Node *right;
} Node;

Node *newNode(int v){
  Node *p = malloc(sizeof(Node));
  p->data = v;
  p->left = NULL;
  p->right = NULL;
  return p;
}

void preorder(Node *p){
  if(p == NULL) return;
  printf("%d ", p->data);
  preorder(p->left);
  preorder(p->right);
}

int main(){
  Node *root = newNode(1);
  root->left = newNode(2);
  root->right = newNode(3);
  root->right->left = newNode(4);
  root->left->right = newNode(5);
  printf("先序: ");
  preorder(root);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          4: "定义结构体 Node：data + 左右两个指针字段。",
          10: "newNode：malloc 申请一个节点，三个字段都初始化。",
          11: "malloc(sizeof(Node))：按 Node 的大小分配堆内存。",
          12: "p->data = v：通过指针访问结构体字段。",
          13: "左右指针先置 NULL，防止野指针。",
          18: "先序遍历函数：参数是当前子树根指针。",
          19: "递归基线！空树直接 return，递归在这里刹车。",
          20: "先序：先访问（打印）根。",
          21: "再递归遍历左子树。",
          22: "最后递归遍历右子树。",
          26: "根节点 1。",
          27: "1 的左孩子 2。",
          28: "1 的右孩子 3。",
          29: "3 的左孩子 4。",
          30: "2 的右孩子 5。",
          31: "先序输出：1 2 5 3 4。"
        }
      },
      {
        id: "bt-in",
        name: "中序遍历（BST 升序输出）",
        mode: "tree",
        code: `/* 中序遍历：左 → 根 → 右
   观察「回溯到根才打印」与调用栈变化；
   这棵树是 BST，中序输出即升序 */
typedef struct Node{
  int data;
  struct Node *left;
  struct Node *right;
} Node;

Node *newNode(int v){
  Node *p = malloc(sizeof(Node));
  p->data = v;
  p->left = NULL;
  p->right = NULL;
  return p;
}

void inorder(Node *p){
  if(p == NULL) return;
  inorder(p->left);
  printf("%d ", p->data);
  inorder(p->right);
}

int main(){
  Node *root = newNode(6);
  root->left = newNode(3);
  root->left->right = newNode(5);
  root->left->left = newNode(2);
  root->right = newNode(9);
  root->right->left = newNode(7);
  printf("中序: ");
  inorder(root);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          4: "定义结构体 Node。",
          10: "newNode：malloc 分配节点并初始化。",
          11: "malloc(sizeof(Node)) 申请一个 Node 大小的内存。",
          13: "左右指针置 NULL。",
          18: "中序遍历函数。",
          19: "递归基线：空树直接返回。",
          20: "先整棵左子树递归完。",
          21: "左子树处理完才打印根 ——「左→根→右」的根。",
          22: "最后处理右子树。",
          26: "根节点 6。",
          27: "6 的左孩子 3。",
          28: "3 的右孩子 5。",
          29: "3 的左孩子 2。",
          30: "6 的右孩子 9。",
          31: "9 的左孩子 7。",
          33: "中序输出：2 3 5 6 7 9 —— BST 必升序！"
        }
      },
      {
        id: "bt-post",
        name: "后序遍历（递归 · C）",
        mode: "tree",
        code: `/* 后序遍历：左 -> 右 -> 根（最后才访问根） */
struct Node {
  int data;
  struct Node* left;
  struct Node* right;
};
struct Node* mk(int v){
  struct Node* p = malloc(sizeof(struct Node));
  p->data = v;
  p->left = NULL;
  p->right = NULL;
  return p;
}
void postorder(struct Node* t){
  if(t == NULL) return;
  postorder(t->left);
  postorder(t->right);
  printf("%d ", t->data);
}
int main(){
  struct Node* root = mk(1);
  root->left = mk(2);
  root->right = mk(3);
  root->left->left = mk(4);
  root->left->right = mk(5);
  postorder(root);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          7: "mk 创建节点（左右先置空）。",
          15: "先递归左子树。",
          16: "再递归右子树。",
          17: "最后才打印自己——「左右根」。",
          24: "把 4、5 挂到 2 下面，构成三层树。",
          25: "后序输出：4 5 2 3 1（根在最后）。"
        }
      },
      {
        id: "bt-level",
        name: "层序遍历（队列 · C）",
        mode: "tree",
        code: `/* 层序遍历：用数组当队列，一层一层往外扩 */
struct Node {
  int data;
  struct Node* left;
  struct Node* right;
};
struct Node* mk(int v){
  struct Node* p = malloc(sizeof(struct Node));
  p->data = v;
  p->left = NULL;
  p->right = NULL;
  return p;
}
int main(){
  struct Node* root = mk(1);
  root->left = mk(2);
  root->right = mk(3);
  root->left->left = mk(4);
  root->right->right = mk(5);
  struct Node* q[16];
  int head = 0;
  int tail = 0;
  q[tail] = root;
  tail++;
  while(head < tail){
    struct Node* cur = q[head];
    head++;
    printf("%d ", cur->data);
    if(cur->left != NULL){
      q[tail] = cur->left;
      tail++;
    }
    if(cur->right != NULL){
      q[tail] = cur->right;
      tail++;
    }
  }
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          20: "q 是存「待访问节点指针」的数组队列，head/tail 为队头队尾。",
          23: "根节点先入队。",
          25: "队非空就继续。",
          26: "出队一个节点。",
          28: "访问它（打印）。",
          29: "有左孩子就入队。",
          33: "有右孩子就入队——先左后右保证同层从左到右。",
          38: "层序输出：1 2 3 4 5。"
        }
      },
      {
        id: "bt-build",
        name: "先序序列建树 + 遍历（C）",
        mode: "tree",
        code: `/* 用「先序 + 空标记 0」的序列重建二叉树，再中序验证 */
struct Node {
  int data;
  struct Node* left;
  struct Node* right;
};
struct Node* build(int seq[], int* pos){
  int v = seq[*pos];
  *pos = *pos + 1;
  if(v == 0) return NULL;
  struct Node* t = malloc(sizeof(struct Node));
  t->data = v;
  t->left = build(seq, pos);
  t->right = build(seq, pos);
  return t;
}
void inorder(struct Node* t){
  if(t == NULL) return;
  inorder(t->left);
  printf("%d ", t->data);
  inorder(t->right);
}
int main(){
  int seq[9] = {5, 3, 1, 0, 0, 0, 4, 0, 0};
  int pos = 0;
  struct Node* root = build(seq, &pos);
  inorder(root);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          8: "pos 是「当前读到序列第几个」的下标指针，用 *pos 读写。",
          9: "读当前值，然后位置 +1。",
          10: "读到 0 表示空子树，直接返回 NULL。",
          14: "先建左子树。",
          15: "再建右子树——顺序固定就是「先序建树」。",
          27: "序列里 0 是空位占位符。",
          29: "&pos 传地址，递归中所有层共用同一个 pos。",
          30: "建完中序输出验证结构。"
        }
      }
    ]
  });
})();