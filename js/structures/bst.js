/* ==========================================================
   bst.js — 二叉搜索树 BST
   ========================================================== */
(function () {
  "use strict";

  /* ================= 局部小工具（与 binarytree.js 一致的风格） ================= */
  const STY = {
    normal: { fill: "rgba(91,140,255,0.16)", stroke: "#5b8cff" },
    active: { fill: "rgba(251,191,36,0.30)", stroke: "#fbbf24" },   // 黄：当前/比较中
    done:   { fill: "rgba(52,211,153,0.22)", stroke: "#34d399" },   // 绿：找到/顶替
    red:    { fill: "rgba(248,113,113,0.24)", stroke: "#f87171" },  // 红：待删除
    dim:    { fill: "rgba(100,120,160,0.07)", stroke: "#2c3a5e" }
  };
  const TXT = { active: undefined, done: "#34d399", red: "#f87171", dim: "#9aa6c4", normal: undefined };

  function mkNode(u, v) {
    return { key: "n" + u, u, v, left: null, right: null, parent: null, x: 0, y: 0 };
  }

  /** 中序 x 布局（root 层 0，y=d*100，垂直居中） */
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
    const off = (maxD * 100) / 2;
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

  function heightOf(n) {
    if (!n) return -1;
    return 1 + Math.max(heightOf(n.left), heightOf(n.right));
  }

  /** edgeKey： "e" + 父key + 子key */
  const edgeKey = (p, c) => "e" + p.key + c.key;

  /**
   * BST 场景。o: {cur, passed:[], green:[], red:[], dim:[], exclude:Set,
   *               hlEdges:Set(edgeKey), redEdges:Set(edgeKey)}
   */
  function bstScene(root, o) {
    o = o || {};
    const passed = new Set(o.passed || []);
    const green = new Set(o.green || []);
    const red = new Set(o.red || []);
    const dim = new Set(o.dim || []);
    const exclude = new Set(o.exclude || []);
    const hlEdges = new Set(o.hlEdges || []);
    const redEdges = new Set(o.redEdges || []);
    const nodes = collect(root).filter(n => !exclude.has(n));
    const elems = [];
    for (const n of nodes) {
      let s = "normal";
      if (red.has(n)) s = "red";
      else if (n === o.cur) s = "active";
      else if (green.has(n)) s = "done";
      else if (dim.has(n) || passed.has(n)) s = "dim";
      const st = STY[s];
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
      if (n.left && !exclude.has(n.left)) {
        const k = edgeKey(n, n.left);
        elems.push(redEdges.has(k)
          ? { t: "edge", key: k, from: n.key, to: n.left.key, color: "#f87171", style: "solid", arrow: false, width: 3 }
          : hlEdges.has(k)
            ? { t: "edge", key: k, from: n.key, to: n.left.key, color: "#fbbf24", style: "solid", arrow: false, width: 3 }
            : { t: "edge", key: k, from: n.key, to: n.left.key, color: "#5b8cff", style: "solid", arrow: false, width: 2 });
      }
      if (n.right && !exclude.has(n.right)) {
        const k = edgeKey(n, n.right);
        elems.push(redEdges.has(k)
          ? { t: "edge", key: k, from: n.key, to: n.right.key, color: "#f87171", style: "solid", arrow: false, width: 3 }
          : hlEdges.has(k)
            ? { t: "edge", key: k, from: n.key, to: n.right.key, color: "#fbbf24", style: "solid", arrow: false, width: 3 }
            : { t: "edge", key: k, from: n.key, to: n.right.key, color: "#a855f7", style: "dashed", arrow: false, width: 2 });
      }
    }
    return elems;
  }

  /** 一行小格（插入序列 / 中序输出） */
  function rowElems(vals, n, y, label, curIdx) {
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

  /** 稳定包围盒（含全部占位小格） */
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
    // 对称留白：保证场景在画布中居中（x 留 60 放插入序列小格，y 留 46 放标签）
    return { x0: x0 - 60, x1: x1 + 60, y0: y0 - 46, y1: y1 + 46 };
  }

  /** 按序列依次插入构造 BST（重复值跳过），返回 {root, n, accepted, skipped} */
  function buildBST(vals) {
    let u = 0, root = null;
    const accepted = [], skipped = [];
    for (const v0 of vals) {
      const v = v0;
      if (!root) {
        root = mkNode(u++, v);
        accepted.push(v);
        continue;
      }
      let cur = root;
      let dup = false;
      for (;;) {
        if (v === cur.v) { dup = true; break; }
        if (v < cur.v) {
          if (cur.left) { cur = cur.left; continue; }
          const nn = mkNode(u++, v);
          cur.left = nn; nn.parent = cur;
          accepted.push(v);
          break;
        } else {
          if (cur.right) { cur = cur.right; continue; }
          const nn = mkNode(u++, v);
          cur.right = nn; nn.parent = cur;
          accepted.push(v);
          break;
        }
      }
      if (dup) skipped.push(v);
    }
    return { root, n: accepted.length, accepted, skipped };
  }

  /* ================= 模块注册 ================= */
  DS.structures.register({
    id: "bst",
    name: "二叉搜索树 BST",
    emoji: "🌲",
    category: "树与堆",
    badge: "核心",
    tags: ["BST", "查找", "插入", "删除", "中序有序"],
    summary: "左小右大、中序即升序。查找/插入/删除都沿树高 O(h) 完成 —— 平衡时 O(log n)，链化时退化到 O(n)。",

    /* ================= 知识讲解 ================= */
    overview: `
<div class="md"><h3>📐 定义与性质</h3>
<p><b>二叉搜索树 BST</b> 是一棵满足<b>递归定义</b>的二叉树：对任意节点 x ——</p>
<ul>
<li>左子树<b>所有</b>节点的值都 <b>小于</b> x；</li>
<li>右子树<b>所有</b>节点的值都 <b>大于</b> x（一般约定相等值不重复插入）。</li>
</ul>
<p>注意是「<b>整个子树</b>都小/都大」，不是只比孩子。这条性质沿根一路下传，于是：</p>
<div class="callout warn">🌟 BST 的灵魂：<b>中序遍历 = 升序序列</b>。左 &lt; 根 &lt; 右 完全套进中序「左→根→右」的访问顺序里。反过来，「中序有序」也是检查一棵树是不是 BST 的最快办法。</div>
</div>
<div class="md"><h3>🔍 查找：每比较一次，砍掉一半</h3>
<p>从根开始与 <code>target</code> 比大小：相等 → 命中；小 → 走<b>左</b>孩子；大 → 走<b>右</b>孩子；走到 NULL 还没找到 → 不存在。</p>
<pre><code>Node *find(Node *root, int key){
    while(root != NULL){
        if(key == root-&gt;data)      return root;   // 命中
        else if(key &lt; root-&gt;data) root = root-&gt;left;
        else                       root = root-&gt;right;
    }
    return NULL;                                   // 走到空位：不存在
}</code></pre>
<p>每一轮比较都会<b>排除一整棵子树</b>，所以时间复杂度 = 比较次数 = <b>树高 O(h)</b>：平衡时 O(log n)，最坏（退化成链）O(n)。</p>
</div>
<div class="md"><h3>➕ 插入：查找失败的位置，就是新家的位置</h3>
<p>插入 = 一次「注定失败」的查找：沿比较路径往下走，直到某个孩子指针为 <b>NULL</b>，把新节点挂在那里 —— 因此新节点<b>永远是叶子</b>，绝不会插到树中间。</p>
<pre><code>Node *insert(Node *root, int v){
    if(root == NULL) return newNode(v);            // 空位 → 新节点
    if(v &lt; root-&gt;data) root-&gt;left  = insert(root-&gt;left,  v);
    else                root-&gt;right = insert(root-&gt;right, v);
    return root;                                   // 沿路返回，保持结构
}</code></pre>
<p>复杂度同样 O(h)。递归版 <code>root = insert(root, v)</code> 的模式非常优雅：空位返回新节点，非空位原样返回自己，指针链原封不动。</p>
</div>
<div class="md"><h3>➖ 删除：三种情况</h3>
<p>设要删的节点是 <code>x</code>（先按查找路径找到它）：</p>
<ul>
<li><b>情况 1 · 叶子</b>：左右孩子都是 NULL —— 直接把父指针置 NULL，摘掉即可。</li>
<li><b>情况 2 · 单孩子</b>：只有一个孩子 —— <b>用孩子顶替</b>：父节点指向 x 的指针改指到 x 的孩子。</li>
<li><b>情况 3 · 双孩子</b>：两个孩子都在 —— 不能直接拔。找 <b>中序后继</b>（右子树一路向左走到头的最小节点），把<b>后继的值复制</b>进 x，再删掉后继本身（后继最多一个右孩子，落入情况 1/2）。</li>
</ul>
<p>为什么是「中序后继」？删除后要保持中序有序，x 的位置必须由「比 x 大的最小值」接替 —— 那正是右子树的最左节点：它比右子树所有人都小，又比左子树所有人都大，接替后性质自动保持。</p>
<div class="callout err">⚠️ 易错：① 双孩子时<b>直接删</b>会导致一棵树断成三截 —— 必须用后继（或前驱）顶替后再删；② 删除时<b>别忘了更新父指针</b>。只把 x 置 NULL 不修改 parent-&gt;left/right，父节点就还指着已删除的节点（悬空指针）。</div>
<pre><code>删除 20(叶)          删除 40(单孩→35)     删除 50(双孩→后继 60)
    30    →   30        30      →   30         50      →   60
   /          /         / \\         / \\         / \\      / \\
  20             40   35   (20)      / \\     30   70   30   70
                                                20 40 60
</code></pre>
</div>
<div class="md"><h3>⚖️ 退化问题与 BST vs 二分查找</h3>
<p>往 BST 里<b>按有序顺序插入</b>会得到一根「链」：找到任何值都要 O(n)。最坏情况正是如此 —— O(h) 只有在树<b>平衡</b>（h ≈ log n）时才高效，AVL、红黑树就是用旋转维持平衡的改进版。</p>
<table>
<tr><th>操作</th><th>有序数组 + 二分</th><th>BST</th></tr>
<tr><td>查找</td><td>O(log n)</td><td>平均 O(log n) / 最坏 O(n)</td></tr>
<tr><td>插入</td><td>O(n)（要搬移数组）</td><td>O(h)，动态结构不搬动</td></tr>
<tr><td>删除</td><td>O(n)（要搬移数组）</td><td>O(h)</td></tr>
<tr><td>有序遍历</td><td>O(n)，天然有序</td><td>中序遍历 O(n)</td></tr>
</table>
<p>结论：<b>只查不增删</b> → 有序数组 + 二分更快更省；<b>频繁增删查</b> → BST（配平衡策略）是更好的动态集合。</p>
</div>`,

    complexity: [
      { op: "查找", 平均: "O(log n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "比较次数 = 树高 h；链化时 O(n)" },
      { op: "插入", 平均: "O(log n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "新节点永远是叶子" },
      { op: "删除", 平均: "O(log n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "双孩子需找中序后继；递归版 O(h) 栈空间" },
      { op: "中序遍历（输出升序）", 平均: "O(n)", 最坏: "O(n)", 空间: "O(h)", 稳定性: "—", 说明: "BST 的灵魂性质" },
      { op: "存储", 平均: "O(n)", 最坏: "O(n)", 空间: "O(n)", 稳定性: "—", 说明: "链式节点 + 指针" }
    ],

    /* ================= 动手演示 ================= */
    demos: [
      {
        id: "insert",
        name: "插入构造 BST",
        desc: "逐个插入序列值：从根开始比较（黄=当前比较节点，黄色边=走过的路径），落到空位插成叶子。结束后可用中序验证「升序」性质。",
        inputs: [
          { key: "nums", label: "插入序列", type: "text", def: "8,3,10,1,6,14,4,7,13", cls: "nums", desc: "按这个顺序逐个插入 BST；小格会跟踪每个值的状态。" },
          { key: "verify", label: "结束后中序验证", type: "select", options: [
            ["yes", "是：演示中序遍历 = 升序"],
            ["no", "否：插入完直接结束"]
          ], desc: "开开启后在动画结尾用中序遍历验证「BST 中序 = 升序」。" }
        ],
        what: "改插入序列就能造出各种形状的 BST：随机序列 → 矮胖平衡，有序序列 → 退化成链。",
        samples: [
          { label: "随机序列（较平衡）", values: { nums: "8,3,10,1,6,14,4,7,13", verify: "yes" } },
          { label: "完全有序（退化成链！）", values: { nums: "1,2,3,4,5,6,7", verify: "yes" } },
          { label: "先大后小交错", values: { nums: "50,30,70,20,40,60,80", verify: "yes" } },
          { label: "含重复值", values: { nums: "8,3,8,10,3,6", verify: "yes" } }
        ],
        tips: [
          "输入 1,2,3,4,5,6,7 生成：树变成一条链，树高 = 节点数——这就是 BST 最坏情况，也是 AVL 存在的理由。",
          "在序列里混入重复值，看它按「不重复插入」约定跳过。",
          "打开中序验证：无论树长什么样，中序输出永远是升序。"
        ],
        build(inp) {
          const raw = DS.parseNums(inp.nums, [8, 3, 10, 1, 6, 14, 4, 7, 13], 15);
          const doVerify = inp.verify !== "no";
          const limit = 60;
          const steps = [];
          let cmp = 0;

          // —— 预演：先建出最终树，确定最终布局与小条位置 ——
          const dry = buildBST(raw);
          const dryElems = bstScene(dry.root);
          const dryView = boundView(dryElems);
          const seqY = dryView.y1 - 16 - 15;         // 插入序列小条（树+20 下方）
          const verifyY = seqY + 42;

          // —— 真实演示：逐步插入 ——
          let root = null, u = 0;
          const seq = raw.slice();
          const seqStatus = new Array(raw.length).fill(0); // 0等待 1当前 2已插入 3跳过

          const seqRow = () => {
            const vals = seqStatus.map((s, i) => (s === 0 ? undefined : seq[i]));
            const elems = rowElems(vals, raw.length, seqY, "插入序列", -1);
            // 状态色复写
            for (let i = 0; i < raw.length; i++) {
              const c = elems.find(e => e.key === "插入序列c" + i);
              if (!c) continue;
              if (seqStatus[i] === 1) { c.fill = "rgba(251,191,36,0.30)"; c.stroke = "#fbbf24"; c.active = true; c.text = String(seq[i]); }
              else if (seqStatus[i] === 2) { c.fill = "rgba(52,211,153,0.18)"; c.stroke = "#2c3a5e"; c.text = String(seq[i]); }
              else if (seqStatus[i] === 3) { c.fill = "rgba(100,120,160,0.12)"; c.stroke = "#2c3a5e"; c.text = "✕" + seq[i]; }
              else { c.text = String(seq[i]); }
            }
            return elems;
          };

          const scene = o => {
            const elems = bstScene(root, o).concat(seqRow());
            return { elements: elems, view: boundView(elems) };
          };

          steps.push(DS.mkStep(
            {
              elements: [DS.stepLib.label(0, -10, "（空树 —— 还没有节点，第一个值将直接成为根）",
                { key: "emptyhint", size: 15, color: "#8f9cbf" })].concat(seqRow()),
              view: { x0: -280, x1: 280, y0: -60, y1: seqY + 40 }
            },
            "准备按序列 <b>" + raw.join(", ") + "</b> 依次插入 BST。规则：比当前节点小 → 走左；大 → 走右；走到<b>空位</b>就插进去（叶插入）。下排小格跟踪每个值的状态。",
            { stats: { 插入: "0/" + raw.length, 比较: 0, 节点: 0 } }));

          for (let si = 0; si < raw.length && steps.length < limit - 1; si++) {
            const v = raw[si];
            // —— 重复值：直接跳过并说明 ——
            if (root && (function (r) {
              let c = r;
              while (c) { if (c.v === v) return true; c = v < c.v ? c.left : c.right; }
              return false;
            })(root)) {
              seqStatus[si] = 3;
              steps.push(DS.mkStep(scene({}),
                "值 <b>" + v + "</b> 在树中已存在。经典 BST 约定<b>不重复插入</b>（小格里标 ✕ 跳过），可自行约定放到另一边。",
                { stats: { 插入: (u) + "/" + raw.length, 比较: cmp, 节点: u } }));
              continue;
            }
            seqStatus[si] = 1;
            if (!root) {
              root = mkNode(u++, v);
              seqStatus[si] = 2;
              layout(root); // 单节点布局
              steps.push(DS.mkStep(scene({ green: [root] }),
                "<b>空树</b>：第一个值 <b style='color:#34d399'>" + v + "</b> 直接成为<b>根节点</b>。",
                { stats: { 插入: u + "/" + raw.length, 比较: cmp, 节点: u } }));
              continue;
            }
            // —— 查找路径 ——
            let cur = root;
            const passed = [];
            let inserted = null;
            for (;;) {
              const hlEdges = new Set();
              for (let i = 0; i < passed.length - 1; i++) hlEdges.add(edgeKey(passed[i], passed[i + 1]));
              cmp++;
              if (v < cur.v) {
                if (cur.left) {
                  steps.push(DS.mkStep(scene({ cur, passed: passed.slice() }),
                    "插入 " + v + "：<b>" + v + " &lt; " + cur.v + "</b> → 走<b>左</b>子树（每比较一次排除一整棵子树）。",
                    { stats: { 插入: u + "/" + raw.length, 比较: cmp, 节点: u } }));
                  passed.push(cur); cur = cur.left;
                  continue;
                }
                const nn = mkNode(u++, v);
                cur.left = nn; nn.parent = cur;
                inserted = nn;
                break;
              } else {
                if (cur.right) {
                  steps.push(DS.mkStep(scene({ cur, passed: passed.slice() }),
                    "插入 " + v + "：<b>" + v + " &gt; " + cur.v + "</b> → 走<b>右</b>子树。",
                    { stats: { 插入: u + "/" + raw.length, 比较: cmp, 节点: u } }));
                  passed.push(cur); cur = cur.right;
                  continue;
                }
                const nn = mkNode(u++, v);
                cur.right = nn; nn.parent = cur;
                inserted = nn;
                break;
              }
            }
            layout(root);
            seqStatus[si] = 2;
            // 高亮路径边：从新节点一路到根
            const pathEdges = new Set();
            {
              let walk = inserted;
              while (walk.parent) { pathEdges.add(edgeKey(walk.parent, walk)); walk = walk.parent; }
            }
            steps.push(DS.mkStep(scene({ cur: inserted, passed: passed.slice(), hlEdges: pathEdges }),
              "孩子指针为空 → <b style='color:#fbbf24'>" + v + "</b> 落在这里成为<b>叶子</b>（插入 = 一次「注定失败」的查找）。黄色粗边即本次走过的比较路径。",
              { stats: { 插入: u + "/" + raw.length, 比较: cmp, 节点: u } }));
          }

          if (steps.length >= limit) {
            steps.length = limit - 1;
            steps.push(DS.mkStep(scene({}),
              "🏁 （演示步数已达 " + limit + " 步上限，动画在此截断。用更短或更平衡的小序列可看完整过程。）",
              { stats: { 插入: u + "/" + raw.length, 比较: cmp, 节点: u } }));
          }

          // —— 中序验证 ——
          if (doVerify && root && steps.length < limit - 1) {
            layout(root);
            const inOrder = [];
            (function rec(nd) { if (!nd) return; rec(nd.left); inOrder.push(nd); rec(nd.right); })(root);
            steps.push(DS.mkStep(scene({}),
              "🔎 <b>中序验证</b>：按「左 → 根 → 右」走一遍整棵树，把值依次写进第二排小格（黄 = 当前访问）。",
              { stats: { 插入: u + "/" + raw.length, 比较: cmp, 节点: u } }));
            for (let k = 0; k < inOrder.length; k++) {
              const vals2 = inOrder.slice(0, k + 1).map(x => x.v);
              const elems = bstScene(root, { cur: inOrder[k], passed: inOrder.slice(0, k) })
                .concat(seqRow())
                .concat(rowElems(vals2, inOrder.length, verifyY, "中序输出", k));
              steps.push(DS.mkStep({ elements: elems, view: boundView(elems) },
                "中序访问第 " + (k + 1) + " 个：<b style='color:#fbbf24'>" + inOrder[k].v + "</b>。规则：左 → 根 → 右。",
                { stats: { 插入: u + "/" + raw.length, 比较: cmp, 节点: u } }));
            }
            const sortedStr = inOrder.map(x => x.v).join(", ");
            const topElems = bstScene(root, { green: collect(root) })
              .concat(seqRow())
              .concat(rowElems(inOrder.map(x => x.v), inOrder.length, verifyY, "中序输出", -1));
            steps.push(DS.mkStep({ elements: topElems, view: boundView(topElems) },
              "🏁 中序结果：<b style='color:#34d399'>" + sortedStr + "</b> —— 恰好升序 ✓。这就是 BST 的灵魂性质：<b>中序 = 有序</b>。",
              { stats: { 插入: u + "/" + raw.length, 比较: cmp, 节点: u } }));
          }

          // 结束步
          if (steps.length < limit + 1 && steps[steps.length - 1].text.indexOf("中序结果") === -1 && steps[steps.length - 1].text.indexOf("已截断") === -1) {
            layout(root);
            steps.push(DS.mkStep(scene({}),
              "🏁 插入全部完成：共 <b>" + u + "</b> 个节点，树高 <b>" + (heightOf(root) + 1) + "</b> 层。查找/插入的时间都正比于树高 —— 序列越「平衡」树越矮越快；越有序越接近链。",
              { stats: { 插入: u + "/" + raw.length, 比较: cmp, 节点: u } }));
          }

          return { steps };
        }
      },
      {
        id: "delete",
        name: "删除三种情况（三连演示）",
        desc: "一棵 BST 连续演示三种删除：20（叶子→直接摘）、40（单孩子→孩子顶替）、50（双孩子→中序后继）。自动查找路径 + 每步文案解释。",
        inputs: [],
        build() {
          const vals = [50, 30, 70, 20, 40, 60, 80, 35];
          let u = 0;
          let root = null;
          const all = new Map();
          for (const v of vals) {
            if (!root) { root = mkNode(u++, v); all.set(root.key, root); continue; }
            let cur = root;
            for (;;) {
              if (v < cur.v) {
                if (cur.left) { cur = cur.left; continue; }
                const nn = mkNode(u++, v); cur.left = nn; nn.parent = cur; all.set(nn.key, nn); break;
              } else {
                if (cur.right) { cur = cur.right; continue; }
                const nn = mkNode(u++, v); cur.right = nn; nn.parent = cur; all.set(nn.key, nn); break;
              }
            }
          }
          layout(root);
          const steps = [];
          let cmp = 0;

          const scene = o => {
            const elems = bstScene(root, o);
            return { elements: elems, view: boundView(elems) };
          };

          /** 沿查找路径逐步走到 target 前的可视化（stepGen 给每步文案） */
          const walkPath = (target) => {
            const path = [];
            let cur = root;
            while (cur && cur.v !== target) {
              path.push(cur);
              const goLeft = target < cur.v;
              const hlEdges = new Set();
              for (let i = 0; i + 1 < path.length; i++) hlEdges.add(edgeKey(path[i], path[i + 1]));
              cmp++;
              steps.push(DS.mkStep(scene({ cur, passed: path.slice(0, path.length - 1), hlEdges }),
                "查找 " + target + "：<b>" + target + (goLeft ? " &lt; " : " &gt; ") + cur.v + "</b> → 走" + (goLeft ? "左" : "右") + "子树（黄=当前比较）。",
                { stats: st() }));
              cur = goLeft ? cur.left : cur.right;
            }
            return { targetNode: cur, path };
          };

          const curCase = { n: 1, name: "删除叶子" };
          const st = () => ({ 情形: curCase.n + "/3 · " + curCase.name, 比较: cmp });

          steps.push(DS.mkStep(scene({}),
            "这棵 BST 满足<b>左 &lt; 根 &lt; 右</b>。接下来<b>连续演示三种删除</b>：① 删除 <b>20</b>（叶子）② 删除 <b>40</b>（只有左孩子 35）③ 删除 <b>50</b>（根，两个孩子）。先确定各项的父/子关系，再动手。",
            { stats: { 情形: "总览", 比较: cmp } }));

          /* ========== 情形 1：叶子 20 ========== */
          curCase.n = 1; curCase.name = "删除叶子";
          {
            const { targetNode: x } = walkPath(20);
            const pnode = x.parent;
            steps.push(DS.mkStep(scene({ cur: x, red: [x], passed: [] }),
              "找到 <b style='color:#f87171'>20</b>。检查它的孩子：<b>left == NULL 且 right == NULL</b> —— 叶子（情况 1）。",
              { stats: st() }));
            steps.push(DS.mkStep(scene({ cur: x, red: [x], redEdges: new Set([edgeKey(pnode, x)]) }),
              "叶子删除最简单：把父节点 <b>30</b> 的左指针 <code>30.left</code> 置为 <b>NULL</b>（红线即将断开）—— 直接摘掉即可，没有任何孩子需要接盘。",
              { stats: st() }));
            if (pnode.left === x) pnode.left = null; else pnode.right = null;
            layout(root);
            steps.push(DS.mkStep(scene({}),
              "✔ 删除完成：20 从树中消失，其余结构<b>纹丝不动</b>。BST 性质不受影响（摘叶子不会破坏任何大小关系）。",
              { stats: st() }));
          }

          /* ========== 情形 2：单孩子 40 ========== */
          curCase.n = 2; curCase.name = "删除单孩子";
          {
            const { targetNode: x } = walkPath(40);
            const pnode = x.parent;
            const child = x.left || x.right;
            steps.push(DS.mkStep(scene({ cur: x, red: [x], done: [child], passed: [] }),
              "找到 <b style='color:#f87171'>40</b>。检查孩子：只有左孩子 <b style='color:#34d399'>35</b>（right == NULL）—— 单孩子（情况 2）。",
              { stats: st() }));
            steps.push(DS.mkStep(scene({ cur: x, red: [x], done: [child], redEdges: new Set([edgeKey(pnode, x)]), hlEdges: new Set([edgeKey(x, child)]) }),
              "策略：<b>用孩子顶替</b>。父节点 <b>30</b> 的指针从 40 改指到 <b>35</b>，40 被绕过、脱离树。",
              { stats: st() }));
            if (pnode.left === x) pnode.left = child; else pnode.right = child;
            child.parent = pnode;
            layout(root);
            steps.push(DS.mkStep(scene({ done: [child] }),
              "✔ 删除完成：<b style='color:#34d399'>35</b> 顶替了 40 的位置。检查大小关系：35 &lt; 50（根）且 35 &gt; 30（父）—— <b>BST 性质保持</b>。",
              { stats: st() }));
          }

          /* ========== 情形 3：双孩子 50（根） ========== */
          curCase.n = 3; curCase.name = "删除双孩子";
          {
            const x = root;
            cmp++;
            steps.push(DS.mkStep(scene({ cur: x, red: [x] }),
              "目标 <b style='color:#f87171'>50</b> 就在树根。它有<b>两个孩子</b>（30 与 70）—— 双孩子（情况 3），不能直接摘。",
              { stats: st() }));
            steps.push(DS.mkStep(scene({ cur: x, red: [x], hlEdges: new Set([edgeKey(x, x.right)]) }),
              "策略：找<b>中序后继</b> = 右子树一路向左走到头的最小节点。先向<b>右走一步</b>到 <b>70</b>。",
              { stats: st() }));
            let succ = x.right;
            let succPath = [x];
            while (succ.left) { succPath.push(succ); succ = succ.left; }
            const hlEdges2 = new Set();
            for (let i = 0; i + 1 < succPath.length; i++) hlEdges2.add(edgeKey(succPath[i], succPath[i + 1]));
            if (succPath.length > 1) {
              steps.push(DS.mkStep(scene({ cur: succPath[succPath.length - 1], red: [x], done: [succ], hlEdges: hlEdges2 }),
                "再<b>一路向左</b>：70 → 60。" + (succ.left ? "继续寻找更小的。" : "60 没有左孩子 —— <b style='color:#34d399'>60</b> 就是中序后继！"),
                { stats: st() }));
            }
            steps.push(DS.mkStep(scene({ red: [x], done: [succ] }),
              "后继 = 右子树的最小值 60：它比右子树所有人都小、比左子树所有人都大 —— 接替 50 后<b>大小关系自动成立</b>。",
              { stats: st() }));
            x.v = succ.v;
            steps.push(DS.mkStep(scene({ cur: x, done: [x, succ], passed: [] }),
              "第一步：把后继值 <b style='color:#34d399'>60</b> <b>复制</b>到被删节点（根节点的值从 50 变为 60），中序序列保证不变。",
              { stats: st() }));
            const sp = succ.parent;
            steps.push(DS.mkStep(scene({ red: [succ], redEdges: new Set([edgeKey(sp, succ)]) }),
              "第二步：删除后继原来的节点 <b style='color:#f87171'>60</b>。它<b>没有右孩子</b>，属于情况 1 → 直接摘；若它有右孩子，则由右孩子顶替（又化归成情况 2）。",
              { stats: st() }));
            if (sp.left === succ) sp.left = succ.right; else sp.right = succ.right;
            if (succ.right) succ.right.parent = sp;
            layout(root);
            steps.push(DS.mkStep(scene({ done: [root] }),
              "✔ 删除完成：<b style='color:#34d399'>" + root.v + "</b> 成为新根。左右子树整体没动 —— 这正是「值复制 + 删后继」优雅的地方：双孩子难题化归成了单孩子/叶子问题。",
              { stats: st() }));
          }

          steps.push(DS.mkStep(scene({}),
            "🏁 三种删除小结 —— ① <b>叶子</b>：直接摘；② <b>单孩子</b>：孩子顶替；③ <b>双孩子</b>：中序后继（右子树最左）的值复制过来，再删后继。三种情况复杂度都是 <b>O(h)</b>。",
            { stats: { 情形: "总结", 比较: cmp } }));

          return { steps };
        }
      }
    ],

    /* ================= C 代码示例 ================= */
    cPresets: [
      {
        id: "bst-insert",
        name: "递归插入 insert()",
        mode: "tree",
        code: `/* BST 递归插入：root = insert(root, v)
   先在比较路径上找到空位，
   新节点永远是叶子，再沿原路返回 */
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

Node *insert(Node *root, int v){
  if(root == NULL) return newNode(v);
  if(v < root->data) root->left = insert(root->left, v);
  else if(v > root->data) root->right = insert(root->right, v);
  return root;
}

int main(){
  Node *root = NULL;
  int vals[7] = {50, 30, 70, 20, 40, 60, 80};
  int i;
  for(i = 0; i < 7; i++) root = insert(root, vals[i]);
  printf("root=%d\\n", root->data);
  return 0;
}`,
        lineNotes: {
          4: "结构体 Node：data + 左右指针。",
          10: "newNode：malloc 分配并初始化节点。",
          11: "malloc(sizeof(Node))：申请一个 Node 大小的堆内存。",
          12: "写入数据字段。",
          13: "左指针置 NULL。",
          14: "右指针置 NULL，防止野指针。",
          18: "insert 入口：root 是当前子树，返回新的子树根。",
          19: "找到空位（递归基线）→ 返回新节点，挂上去。",
          20: "v 较小 → 插到左子树，返回值接回左指针。",
          21: "v 较大 → 插到右子树。相等则跳过不插。",
          22: "沿路返回：结构原封不动。",
          26: "root 初始为空树。",
          27: "待插入序列。",
          29: "核心模式：root = insert(root, v)，逐个数插入。",
          30: "输出根的值。"
        }
      },
      {
        id: "bst-search",
        name: "循环查找 search()（比较路径）",
        mode: "tree",
        code: `/* BST 查找：与根比大小决定走左走右
   每比较一次排除一整棵子树 */
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

Node *find(Node *root, int key){
  while(root != NULL){
    if(key == root->data) return root;
    if(key < root->data) root = root->left;
    else root = root->right;
  }
  return NULL;
}

int main(){
  Node *root = newNode(50);
  root->left = newNode(30);
  root->right = newNode(70);
  root->left->left = newNode(20);
  root->left->right = newNode(40);
  root->right->left = newNode(60);
  root->right->right = newNode(80);
  Node *hit = find(root, 60);
  if(hit != NULL) printf("找到 %d\\n", hit->data);
  else printf("未找到\\n");
  return 0;
}`,
        lineNotes: {
          4: "结构体 Node 定义。",
          10: "newNode：malloc 分配节点并初始化。",
          11: "malloc(sizeof(Node))：按 Node 大小申请内存。",
          17: "find：从 root 开始循环查找 key。",
          18: "root 走到 NULL 说明树里没有 key。",
          19: "相等 → 命中，直接返回节点指针。",
          20: "key 小 → 左侧子树里才有。",
          21: "key 大 → 右侧子树里才有。",
          23: "返回 NULL 表示未找到。",
          27: "手工搭好一棵 BST：50 为根。",
          28: "30 是 50 的左孩子；70 是右孩子。",
          29: "继续连第三层。",
          30: "20/40 挂在 30 左右。",
          32: "60 挂在 70 左。",
          33: "80 挂在 70 右。",
          34: "查找 60：50 → 70 → 60，比较 3 次！"
        }
      },
      {
        id: "bst-min",
        name: "查找最小值（一路向左）",
        mode: "tree",
        code: `/* 最小值 = 一路向左走到头
   BST 性质：最左节点就是全树最小值 */
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

Node *findMin(Node *root){
  while(root != NULL && root->left != NULL){
    root = root->left;
  }
  return root;
}

int main(){
  Node *root = newNode(50);
  root->left = newNode(30);
  root->right = newNode(70);
  root->left->left = newNode(20);
  root->left->right = newNode(40);
  root->right->left = newNode(60);
  Node *min = findMin(root);
  printf("最小值=%d\\n", min->data);
  return 0;
}`,
        lineNotes: {
          4: "结构体 Node 定义。",
          10: "newNode：malloc 分配节点并初始化。",
          17: "findMin：求最小值入口。",
          18: "两个条件：root 非空，且还有更小的在左边。",
          19: "一路向左走。",
          21: "root 走到最左节点（最小值）或 NULL（空树）。",
          24: "root = 50。",
          25: "30 左侧；70 右侧。",
          26: "第三层：20 挂在 30 左。",
          27: "40 挂在 30 右。",
          28: "60 挂在 70 左。",
          29: "findMin 一路向左：50 → 30 → 20。",
          30: "输出最小值 20。"
        }
      },
      {
        id: "bst-delete",
        name: "删除结点 · 三种情况（C）",
        mode: "tree",
        code: `/* BST 删除：分三种情况处理，删除后仍保持 BST 性质 */
typedef struct Node {
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
Node *insert(Node *t, int v){
  if(t == NULL) return newNode(v);
  if(v < t->data) t->left = insert(t->left, v);
  else if(v > t->data) t->right = insert(t->right, v);
  return t;
}
Node *findMin(Node *t){
  while(t->left != NULL) t = t->left;
  return t;
}
Node *del(Node *t, int v){
  if(t == NULL) return NULL;
  if(v < t->data){ t->left = del(t->left, v); }
  else if(v > t->data){ t->right = del(t->right, v); }
  else {
    if(t->left == NULL && t->right == NULL){ return NULL; }
    if(t->left == NULL) return t->right;
    if(t->right == NULL) return t->left;
    Node *s = findMin(t->right);
    t->data = s->data;
    t->right = del(t->right, s->data);
  }
  return t;
}
void inorder(Node *t){
  if(t == NULL) return;
  inorder(t->left);
  printf("%d ", t->data);
  inorder(t->right);
}
int main(){
  Node *root = NULL;
  int vals[7] = {50, 30, 70, 20, 40, 60, 80};
  int i;
  for(i = 0; i < 7; i++) root = insert(root, vals[i]);
  printf("原树中序: ");
  inorder(root);
  printf("\\n");
  root = del(root, 20);
  printf("删 20（叶子）: ");
  inorder(root);
  printf("\\n");
  root = del(root, 30);
  printf("删 30（一个孩子）: ");
  inorder(root);
  printf("\\n");
  root = del(root, 50);
  printf("删 50（两个孩子）: ");
  inorder(root);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          31: "递归找一个待删结点。",
          32: "比当前小 → 去左子树删。",
          33: "比当前大 → 去右子树删。",
          35: "情况①：叶子结点，直接摘掉（返回 NULL）。",
          36: "情况②a：只有右孩子，用右孩子顶替自己。",
          37: "情况②b：只有左孩子，用左孩子顶替自己。",
          39: "情况③：左右都有 → 找右子树最小值（中序后继）。",
          40: "用后继的值覆盖自己。",
          41: "再到右子树把那个后继删掉（它最多只有一个孩子）。",
          50: "建一棵 7 个结点的 BST。",
          55: "删叶子 20：最简单的情况①。",
          58: "删 30：它只有右孩子 40，属于情况②。",
          61: "删根 50：左右孩子都在，属于情况③。"
        }
      }
    ]
  });
})();