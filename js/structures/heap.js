/* ==========================================================
   heap.js — 堆与优先队列
   ========================================================== */
(function () {
  "use strict";

  /* ================= 局部小工具 ================= */
  const STY = {
    normal: { fill: "rgba(91,140,255,0.16)", stroke: "#5b8cff" },
    active: { fill: "rgba(251,191,36,0.30)", stroke: "#fbbf24" },   // 黄：父节点
    child:  { fill: "rgba(91,140,255,0.30)", stroke: "#5b8cff" },   // 蓝：孩子
    done:   { fill: "rgba(52,211,153,0.22)", stroke: "#34d399" },   // 绿：已就位
    gray:   { fill: "rgba(100,120,160,0.06)", stroke: "#2c3a5e" }   // 灰：脱离堆
  };
  const TXT = { active: undefined, child: undefined, done: "#34d399", gray: "#66739a", normal: undefined };

  /**
   * 完全二叉树数组布局：第 i 个元素（0 起）
   * 层 d = floor(log2(i+1))，层内序号 k = i-(2^d-1)，
   * x = (k-(2^d-1)/2)*88，y = d*96（整体垂直居中）
   */
  function heapPositions(n) {
    const P = [];
    let maxD = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.floor(Math.log2(i + 1));
      const k = i - (Math.pow(2, d) - 1);
      const x = (k - (Math.pow(2, d) - 1) / 2) * 88;
      const y = d * 96;
      maxD = Math.max(maxD, d);
      P.push({ x, y, d });
    }
    const off = (maxD * 96) / 2;
    for (const p of P) p.y -= off;
    return { P, maxD };
  }

  /**
   * 堆 → 场景元素。hl: Map(下标→状态)；heapSize: 参与堆的下标数。
   * 下标 ≥ heapSize 的节点画成灰色虚线圆（已脱离堆），值落到下方已排序区。
   */
  function heapScene(a, heapSize, hl, sortedY) {
    hl = hl || new Map();
    const { P } = heapPositions(a.length);
    const elems = [];
    for (let i = 0; i < a.length; i++) {
      const inHeap = i < heapSize;
      const s = inHeap ? (hl.get(i) || "normal") : "gray";
      const st = STY[s];
      elems.push({
        t: "circle", key: "h" + i, x: P[i].x, y: P[i].y, r: 21,
        text: inHeap ? String(a[i]) : "·",
        sub: "i" + i,
        fill: st.fill, stroke: st.stroke,
        active: s === "active" || s === "child",
        textColor: TXT[s],
        strokeWidth: s === "normal" || s === "gray" ? undefined : 2.6,
        fontSize: 15
      });
      if (i > 0) {
        const pi = Math.floor((i - 1) / 2);
        const hot = hl.has(i) && hl.has(pi);
        elems.push({
          t: "edge", key: "e" + pi + "-" + i, from: "h" + pi, to: "h" + i,
          color: hot ? "#fbbf24" : (inHeap ? "#5b8cff" : "#2c3a5e"),
          style: inHeap ? "solid" : "dashed",
          arrow: false,
          width: hot ? 3 : 2
        });
      }
    }
    // 已排序区小条（每个下标固定占一格 → 视图稳定）
    if (sortedY !== undefined && sortedY !== null) {
      const n = a.length;
      const cw = 40, gap = 6;
      const total = n * (cw + gap);
      const x0 = -total / 2;
      elems.push(DS.stepLib.label(x0 - 26, sortedY, "已排序区（升序）",
        { key: "sortedlb", align: "right", size: 13, color: "#61d3a7", bold: true, mono: true }));
      for (let i = 0; i < n; i++) {
        const cx = x0 + i * (cw + gap);
        const sorted = i >= heapSize;
        elems.push({
          t: "cell", key: "s" + i, x: cx - cw / 2, y: sortedY - 15, w: cw - 6, h: 30,
          text: sorted ? String(a[i]) : "·",
          fill: sorted ? "rgba(52,211,153,0.18)" : "rgba(100,120,160,0.08)",
          stroke: sorted ? "#2c3a5e" : "#2c3a5e",
          active: false, radius: 6
        });
      }
    }
    return elems;
  }

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

  /* ================= 模块注册 ================= */
  DS.structures.register({
    id: "heap",
    name: "堆与优先队列",
    emoji: "⛰️",
    category: "树与堆",
    badge: "高频",
    tags: ["堆", "堆排序", "优先队列", "上浮", "下沉"],
    summary: "「完全二叉树 + 堆序」装在数组里。取最值 O(1)、插入删除 O(log n)、建堆 O(n) —— TopK、优先队列、堆排序全都靠它。",

    /* ================= 知识讲解 ================= */
    overview: `
<div class="md"><h3>📐 定义与数组存储</h3>
<p><b>堆</b> = <b>完全二叉树</b>（所有层从左到右填满，只有最后一层右侧可以缺）+ <b>堆序性质</b>：</p>
<ul>
<li><b>大顶堆</b>：每个节点的值 <b>≥</b> 它的孩子（根 = 最大值）；</li>
<li><b>小顶堆</b>：每个节点的值 <b>≤</b> 它的孩子（根 = 最小值）。</li>
</ul>
<p>兄弟之间<b>没有</b>大小约定 —— 堆只保证「上层比下层大（小）」，这正是它比全排序宽松、比全不管严格的地方。</p>
<p>完全二叉树可以用<b>数组</b>存（下标从 0 起）：</p>
<pre><code>a[i] 的左孩子 = a[2i+1]    右孩子 = a[2i+2]    父节点 = a[(i-1)/2]</code></pre>
<p>不需要指针，父子一步算到。判断是不是完全二叉树：按层序编号，中间没有空位。</p>
<div class="callout err">⚠️ 易错：① <b>下标从 0 还是 1 起</b>？0 起用 2i+1/2i+2，1 起用 2i/2i+1 —— 公式混用数组必乱；② 大/小顶堆<b>方向搞反</b>：大顶堆的「大」在顶上，siftDown 时换<b>更大的孩子</b>上来；小顶堆相反。</div>
</div>
<div class="md"><h3>🔁 两个核心操作：上浮与下沉</h3>
<p>堆可以变化，但变化后必须重新满足堆序。修复手段只有两招：</p>
<ul>
<li><b>上浮 siftUp</b>（插入用）：新元素放在<b>末尾</b>，与父节点比较，不满足堆序就交换，一路向上，最多走树高步 → <b>O(log n)</b>。</li>
<li><b>下沉 siftDown</b>（删除堆顶用）：删掉堆顶后，把<b>最后一个元素搬到堆顶</b>，与两个孩子中更「极值」的那个比较交换，一路向下 → <b>O(log n)</b>。</li>
</ul>
<pre><code>插入 x： a.push(x); siftUp(len-1);
删堆顶： a[0] = a.pop(); siftDown(0);</code></pre>
<p>一次比较/交换消除一层违规，树高只有 log n，所以堆的插入、删除都是 <b>O(log n)</b> —— 这比有序数组（搬移 O(n)）快得多。</p>
</div>
<div class="md"><h3>🏗️ 建堆：O(n log n) 还是 O(n)？</h3>
<p><b>路线 A · 逐个插入</b>：n 个数依次 push + siftUp，总代价 n × O(log n) = <b>O(n log n)</b>。</p>
<p><b>路线 B · 自底向上 siftDown</b>（Floyd）：直接拿乱序数组当完全二叉树，<b>从最后一个非叶节点（下标 ⌊n/2⌋−1）向前</b>，对每个节点做一次 siftDown。直觉：</p>
<p>下层节点多、但下沉距离短（倒数第一层 n/2 个节点下沉 0 步；倒数第二层 n/4 个下沉 1 步……）。总代价 ≈ 0·n/2 + 1·n/4 + 2·n/8 + … = n·∑k/2<sup>k</sup> = <b>O(n)</b>。</p>
<div class="callout">💡 对比记忆：siftUp 建堆慢在「每一层都在往上爬、越爬越高」；siftDown 建堆快在「绝大多数节点贴地不动，只有高层少数节点下潜」。工程上几乎都用路线 B。</div>
</div>
<div class="md"><h3>🚀 应用</h3>
<ul>
<li><b>堆排序</b>：建大顶堆 → 反复「堆顶(最大值) 与末尾交换 → 堆规模 −1 → 对新堆顶 siftDown」。原地完成、升序输出，<b>O(n log n)</b>、<b>不稳定</b>（相同值的相对顺序会变）。</li>
<li><b>优先队列</b>：插入任意元素、弹出最高（低）优先级元素 —— 堆就是它的标准实现。Dijkstra 最短路、任务调度全靠它。</li>
<li><b>TopK 问题</b>：求 n 个数里最大（小）的 K 个 → 维护一个大小为 K 的<b>小顶堆</b>（更大的进来就把堆顶挤出去），总代价 <b>O(n log K)</b>，空间 O(K)。K 很小 ≈ O(n)。</li>
</ul>
</div>`,

    complexity: [
      { op: "取堆顶（最大/最小值）", 平均: "O(1)", 最坏: "O(1)", 空间: "O(1)", 稳定性: "—", 说明: "堆顶就是 a[0]" },
      { op: "插入（push + 上浮）", 平均: "O(log n)", 最坏: "O(log n)", 空间: "O(1)", 稳定性: "—", 说明: "上浮最多走树高步" },
      { op: "删除堆顶（pop + 下沉）", 平均: "O(log n)", 最坏: "O(log n)", 空间: "O(1)", 稳定性: "—", 说明: "末位补顶后下沉" },
      { op: "建堆（自底向上 siftDown）", 平均: "O(n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "级数求和出 O(n)" },
      { op: "堆排序", 平均: "O(n log n)", 最坏: "O(n log n)", 空间: "O(1)", 稳定性: "不稳定", 说明: "原地排序；交换会打乱相等元素的相对次序" }
    ],

    /* ================= 动手演示 ================= */
    demos: [
      {
        id: "build",
        name: "建堆（自底向上 siftDown）",
        desc: "把乱序数组看成完全二叉树（圆上小字 = 数组下标），从最后一个非叶节点往前逐个下沉：比较父与孩子，不满足堆序就交换，直到全树满足堆序。",
        inputs: [
          { key: "nums", label: "数组", type: "text", def: "4,10,3,5,1,7,9,2,8,6", cls: "nums", desc: "任意数字序列，动画把它自底向上建成堆。" },
          { key: "type", label: "堆类型", type: "select", options: [
            ["max", "大顶堆（父 ≥ 子，堆顶 = 最大值）"],
            ["min", "小顶堆（父 ≤ 子，堆顶 = 最小值）"]
          ], desc: "大顶堆用于升序堆排；找最小的 k 个数常用小顶堆。" }
        ],
        what: "改数组与堆类型：看 siftDown 如何把最大值/最小值沉到正确位置。",
        samples: [
          { label: "十个数建大顶堆", values: { nums: "4,10,3,5,1,7,9,2,8,6", type: "max" } },
          { label: "同数据建小顶堆", values: { nums: "4,10,3,5,1,7,9,2,8,6", type: "min" } },
          { label: "已有序数组", values: { nums: "1,2,3,4,5,6,7,8", type: "max" } },
          { label: "逆序数组", values: { nums: "9,8,7,6,5,4,3,2,1", type: "max" } }
        ],
        tips: [
          "同组数据分别建大顶堆、小顶堆，观察比较方向相反。",
          "对比「已有序」与「逆序」：两者建堆的比较/交换次数差不多——建堆总是 O(n)。",
          "注意动画从最后一个非叶结点开始下沉，这就是 O(n) 建堆的关键。"
        ],
        build(inp) {
          const isMax = inp.type !== "min";
          const a = DS.parseNums(inp.nums, [4, 10, 3, 5, 1, 7, 9, 2, 8, 6], 15);
          const n = a.length;
          const CMP = { max: "≥", min: "≤" }[isMax ? "max" : "min"];
          const TYNAME = isMax ? "大顶堆" : "小顶堆";
          const steps = [];
          let cmp = 0, swp = 0;

          const scene = (hl, phase) => {
            const elems = heapScene(a, n, hl, null);
            return { elements: elems, view: boundView(elems), phase };
          };
          const push = (hl, text, extra, phase) =>
            steps.push(DS.mkStep(scene(hl, phase), text, extra));

          push(new Map(), "把数组看成<b>完全二叉树</b>：a[i] 的左孩子 a[2i+1]、右孩子 a[2i+2]，父子连线即数组的下标关系（圆上小字 = 下标）。目标：建<b>" + TYNAME + "</b>（每对父子都满足 父 " + CMP + " 子）。",
            { stats: { 堆: TYNAME, 比较: 0, 交换: 0 } }, "准备");

          // 从最后一个非叶节点开始逐个 siftDown
          const lastNonLeaf = Math.floor(n / 2) - 1;
          for (let i = lastNonLeaf; i >= 0; i--) {
            const phase = "siftDown(" + i + ")";
            push(new Map([[i, "done"]]),
              "处理 <b>siftDown(" + i + ")</b>：让以 a[" + i + "]=" + a[i] + " 为根的子树满足堆序。为什么从 ⌊n/2⌋−1=" + lastNonLeaf + " 开始？—— 下标 ≥ n/2 的节点<b>全是叶子</b>，本身就满足堆序。",
              { stats: { 堆: TYNAME, 比较: cmp, 交换: swp, 处理: phase } }, phase);
            let p = i;
            for (;;) {
              const l = 2 * p + 1, r = 2 * p + 2;
              if (l >= n) {
                push(new Map([[p, "done"]]),
                  "a[" + p + "]=" + a[p] + " 是<b>叶子</b>（没有孩子），无需下沉 —— 该子树已满足堆序。",
                  { stats: { 堆: TYNAME, 比较: cmp, 交换: swp, 处理: phase } }, phase);
                break;
              }
              let c = l;
              if (r < n) {
                cmp++;
                const pickRight = isMax ? a[r] > a[l] : a[r] < a[l];
                c = pickRight ? r : l;
                push(new Map([[p, "active"], [l, "child"], [r, "child"]]),
                  "比较两个孩子：a[" + l + "]=" + a[l] + " 与 a[" + r + "]=" + a[r] + "，" +
                  (isMax ? "取较大者" : "取较小者") + " c = " + c + "（后续只和它比）。",
                  { stats: { 堆: TYNAME, 比较: cmp, 交换: swp, 处理: phase } }, phase);
              }
              cmp++;
              const ok = isMax ? a[p] >= a[c] : a[p] <= a[c];
              if (ok) {
                push(new Map([[p, "done"], [c, "child"]]),
                  "比较父与孩子：a[" + p + "]=" + a[p] + " " + CMP + " a[" + c + "]=" + a[c] + " —— <b>已满足堆序</b>，这一路下沉结束。",
                  { stats: { 堆: TYNAME, 比较: cmp, 交换: swp, 处理: phase } }, phase);
                break;
              }
              const vp = a[p], vc = a[c];
              swp++;
              push(new Map([[p, "active"], [c, "child"]]),
                "比较父与孩子：a[" + p + "]=" + a[p] + " " + (isMax ? "<" : ">") + " a[" + c + "]=" + a[c] + " —— <b>违背堆序</b>，交换两者：" + vp + " ↔ " + vc + "。",
                { stats: { 堆: TYNAME, 比较: cmp, 交换: swp, 处理: phase } }, phase);
              a[p] = vc; a[c] = vp;
              p = c;
            }
          }

          push(new Map([[0, "done"]]),
            "🏁 <b>建堆完成</b>：堆顶 = a[0] = <b style='color:#34d399'>" + a[0] + "</b> —— 全数组的" + (isMax ? "最大值" : "最小值") + "。每对父子的堆序都成立，共比较 " + cmp + " 次、交换 " + swp + " 次。",
            { stats: { 堆: TYNAME, 比较: cmp, 交换: swp, 堆顶: a[0] } }, "完成");

          return { steps };
        }
      },
      {
        id: "sorting",
        name: "堆排序",
        desc: "第一步建大顶堆；第二步反复「堆顶(最大值)与末尾交换 → 末尾脱离堆进入已排序区 → 新堆顶 siftDown」。全程在原数组上完成，升序输出。",
        inputs: [
          { key: "nums", label: "数组", type: "text", def: "4,10,3,5,1,7,9,2,8,6", cls: "nums" }
        ],
        build(inp) {
          const a = DS.parseNums(inp.nums, [4, 10, 3, 5, 1, 7, 9, 2, 8, 6], 15);
          const n = a.length;
          const { P, maxD } = heapPositions(n);
          const sortedY = (maxD * 96) / 2 + 21 + 44;
          const steps = [];
          let cmp = 0, swp = 0, heapSize = n;

          const scene = (hl, phase) => {
            const elems = heapScene(a, heapSize, hl, sortedY);
            return { elements: elems, view: boundView(elems), phase };
          };
          const push = (hl, text, extra, phase) =>
            steps.push(DS.mkStep(scene(hl, phase), text, extra));

          /* —— 阶段 1：建大顶堆 —— */
          push(new Map(),
            "数组按<b>完全二叉树</b>摆放（圆上小字 = 下标），下排是<b>已排序区</b>。第一步：自底向上<b>建大顶堆</b>。",
            { stats: { 阶段: "① 建堆", 比较: 0, 交换: 0 } }, "① 建堆");
          for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            let p = i;
            const phase = "siftDown(" + i + ")";
            for (;;) {
              const l = 2 * p + 1, r = 2 * p + 2;
              if (l >= heapSize) break;
              let c = l;
              if (r < heapSize) {
                cmp++;
                if (a[r] > a[l]) c = r;
                push(new Map([[p, "active"], [l, "child"], [r, "child"]]),
                  "siftDown(" + i + ")：比较孩子 a[" + l + "]=" + a[l] + " 与 a[" + r + "]=" + a[r] + "，较大者 c=" + c + "。",
                  { stats: { 阶段: "① 建堆", 比较: cmp, 交换: swp } }, phase);
              }
              cmp++;
              if (a[p] >= a[c]) {
                push(new Map([[p, "done"], [c, "child"]]),
                  "siftDown(" + i + ")：父 a[" + p + "]=" + a[p] + " ≥ 孩子 a[" + c + "]=" + a[c] + "，满足堆序。",
                  { stats: { 阶段: "① 建堆", 比较: cmp, 交换: swp } }, phase);
                break;
              }
              const vp = a[p], vc = a[c];
              swp++;
              push(new Map([[p, "active"], [c, "child"]]),
                "siftDown(" + i + ")：父 a[" + p + "]=" + a[p] + " < 孩子 a[" + c + "]=" + a[c] + "，<b>交换 " + vp + " ↔ " + vc + "</b>，继续向下检查。",
                { stats: { 阶段: "① 建堆", 比较: cmp, 交换: swp } }, phase);
              a[p] = vc; a[c] = vp;
              p = c;
            }
          }
          push(new Map([[0, "done"]]),
            "✔ 建堆完成：堆顶 a[0]=" + a[0] + " 是<b>全数组最大值</b>。",
            { stats: { 阶段: "① 建堆", 比较: cmp, 交换: swp } }, "① 建堆");

          /* —— 阶段 2：交换 + 收缩 + 下沉 —— */
          for (let end = n - 1; end > 0; end--) {
            const phase = "第 " + (n - end) + " 轮";
            const vtop = a[0], vend = a[end];
            swp++;
            push(new Map([[0, "active"], [end, "child"]]),
              "堆顶 a[0]=" + vtop + " 是剩余堆里的<b>最大值</b>，与堆末（下标 end=" + end + "）的 a[end]=" + vend + " <b>交换</b>：" + vtop + " ↔ " + vend + "。",
              { stats: { 阶段: "② 交换收缩", 比较: cmp, 交换: swp, 轮次: n - end } }, phase);
            a[0] = vend; a[end] = vtop;
            heapSize = end;
            push(new Map(),
              "a[" + end + "]=" + vtop + " <b>脱离堆</b>（变灰），进入下方<b>已排序区</b>的固定位置 —— 它已经是最终升序位置的正确值。堆规模变为 " + heapSize + "。",
              { stats: { 阶段: "② 交换收缩", 比较: cmp, 交换: swp, 轮次: n - end } }, phase);
            // 新堆顶 siftDown
            let p = 0;
            for (;;) {
              const l = 2 * p + 1, r = 2 * p + 2;
              if (l >= heapSize) break;
              let c = l;
              if (r < heapSize) {
                cmp++;
                if (a[r] > a[l]) c = r;
                push(new Map([[p, "active"], [l, "child"], [r, "child"]]),
                  "新堆顶下沉：比较孩子 a[" + l + "]=" + a[l] + " 与 a[" + r + "]=" + a[r] + "，较大者 c=" + c + "。",
                  { stats: { 阶段: "② 交换收缩", 比较: cmp, 交换: swp, 轮次: n - end } }, phase);
              }
              cmp++;
              if (a[p] >= a[c]) {
                push(new Map([[p, "done"], [c, "child"]]),
                  "新堆顶 a[" + p + "]=" + a[p] + " ≥ 孩子 a[" + c + "]=" + a[c] + "，下沉结束 —— 堆序恢复，堆顶又变回当前堆的最大值。",
                  { stats: { 阶段: "② 交换收缩", 比较: cmp, 交换: swp, 轮次: n - end } }, phase);
                break;
              }
              const vp = a[p], vc = a[c];
              swp++;
              push(new Map([[p, "active"], [c, "child"]]),
                "新堆顶 a[" + p + "]=" + a[p] + " < 孩子 a[" + c + "]=" + a[c] + "，<b>交换 " + vp + " ↔ " + vc + "</b>，新堆顶继续下沉。",
                { stats: { 阶段: "② 交换收缩", 比较: cmp, 交换: swp, 轮次: n - end } }, phase);
              a[p] = vc; a[c] = vp;
              p = c;
            }
          }

          // 最终：只剩已排序区
          {
            const n2 = a.length;
            const cw = 46, gap = 8;
            const x0 = -(n2 * (cw + gap)) / 2;
            const y = 0;
            const elems = [DS.stepLib.label(x0 - 30, y, "最终数组（升序）",
              { key: "finallb", align: "right", size: 14, color: "#61d3a7", bold: true, mono: true })];
            for (let i = 0; i < n2; i++) {
              const cx = x0 + i * (cw + gap);
              elems.push({
                t: "cell", key: "f" + i, x: cx - cw / 2, y: y - 17, w: cw - 8, h: 34,
                text: String(a[i]), index: String(i),
                fill: "rgba(52,211,153,0.20)", stroke: "#2c3a5e", radius: 7
              });
            }
            elems.push(DS.stepLib.label(0, 36, "共比较 " + cmp + " 次、交换 " + swp + " 次 —— O(n log n) 原地排序",
              { key: "finalsub", size: 13, color: "#8f9cbf" }));
            steps.push(DS.mkStep({ elements: elems, view: boundView(elems) },
              "🏁 <b>堆排序完成</b>：堆只剩最后一个元素（必然最小），所有值依次落在升序位置上：<b style='color:#34d399'>" + a.join(", ") + "</b>。原地 O(1) 额外空间；交换会打乱相等元素的相对次序，所以<b>不稳定</b>。",
              { stats: { 阶段: "完成", 比较: cmp, 交换: swp } }, "完成"));
          }

          return { steps };
        }
      }
    ],

    /* ================= C 代码示例 ================= */
    cPresets: [
      {
        id: "heap-heapify",
        name: "siftDown 自底向上建堆",
        mode: "array",
        code: `/* 自底向上建堆（Floyd 法）
   对每个非叶节点做一次 siftDown，
   总代价 O(n) —— 越下层节点越多、下沉越短 */
void siftDown(int a[], int n, int i){
  int largest = i;
  int l = 2 * i + 1;
  int r = 2 * i + 2;
  if(l < n && a[l] > a[largest]) largest = l;
  if(r < n && a[r] > a[largest]) largest = r;
  if(largest != i){
    int t = a[i];
    a[i] = a[largest];
    a[largest] = t;
    siftDown(a, n, largest);
  }
}

int main(){
  int a[9] = {4, 10, 3, 5, 1, 7, 9, 2, 8};
  int i;
  for(i = 4; i >= 0; i--) siftDown(a, 9, i);
  printf("堆顶=%d\\n", a[0]);
  printf("堆: ");
  for(i = 0; i < 9; i++) printf("%d ", a[i]);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          3: "siftDown：让以 i 为根的子树满足大顶堆。a[] 是数组、n 是堆大小。",
          4: "largest 暂时记下「最大的节点」，先假设是自己。",
          5: "左孩子下标：2i+1（0 起）。",
          6: "右孩子下标：2i+2。",
          7: "左孩子存在且更大 → largest 改为左孩子。",
          8: "右孩子存在且更大 → largest 改为右孩子。",
          9: "largest ≠ i 说明堆序被破坏，需要交换并继续下沉。",
          10: "三步交换：t 暂存 a[i]。",
          12: "a[largest] 接收旧值。",
          13: "递归下沉到 largest，直到满足堆序。",
          18: "待建堆的乱序数组。",
          20: "从最后一个非叶节点 4（=⌊9/2⌋−1）开始逐个 siftDown —— O(n) 建堆。",
          21: "建堆完成后堆顶 a[0] 即最大值。",
          23: "输出建堆后的数组，验证每一对父子都满足堆序。"
        }
      },
      {
        id: "heap-sort",
        name: "堆排序 heapSort（原地升序）",
        mode: "array",
        code: `/* 堆排序：建大顶堆 → 堆顶与末尾交换 →
   堆收缩 → 新堆顶 siftDown，重复到空 */
void siftDown(int a[], int n, int i){
  int largest = i;
  int l = 2 * i + 1;
  int r = 2 * i + 2;
  if(l < n && a[l] > a[largest]) largest = l;
  if(r < n && a[r] > a[largest]) largest = r;
  if(largest != i){
    int t = a[i];
    a[i] = a[largest];
    a[largest] = t;
    siftDown(a, n, largest);
  }
}

void heapSort(int a[], int n){
  int i;
  for(i = n / 2 - 1; i >= 0; i--) siftDown(a, n, i);
  for(i = n - 1; i > 0; i--){
    int t = a[0];
    a[0] = a[i];
    a[i] = t;
    siftDown(a, i, 0);
  }
}

int main(){
  int a[8] = {29, 10, 14, 37, 13, 45, 5, 21};
  int i;
  heapSort(a, 8);
  for(i = 0; i < 8; i++) printf("%d ", a[i]);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          3: "siftDown：维护大顶堆的核心操作。",
          4: "largest 先记自己，再与孩子比较。",
          5: "左孩子 = 2i+1。",
          6: "右孩子 = 2i+2。",
          7: "左孩子更大 → 记下左孩子。",
          8: "右孩子更大 → 记下右孩子。",
          9: "若最大者不是自己，交换并继续下沉。",
          11: "a[i] ← a[largest]。",
          12: "a[largest] ← t。",
          17: "heapSort 入口：a[] 原数组，n 元素个数。",
          19: "第一步：自底向上建大顶堆，O(n)。",
          20: "第二步：从末尾向前收缩。",
          21: "堆顶（当前最大值）暂存。",
          22: "堆顶接收末尾值。",
          23: "末尾接收最大值 —— 最大值归位到升序位置。",
          24: "堆规模变成 i，对新堆顶 siftDown 恢复堆序。",
          29: "待排序数组。",
          31: "heapSort 原地完成排序。",
          32: "输出升序结果。"
        }
      }
    ]
  });
})();