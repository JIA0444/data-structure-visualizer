/* ==========================================================
   graph.js — 图：BFS/DFS/Dijkstra/拓扑排序/Prim
   ========================================================== */
(function () {
  const CY = "#fbbf24", CG = "#34d399", CR = "#f87171", CP = "#a855f7", CB = "#5b8cff", CC = "#22d3ee";
  const FY = "rgba(251,191,36,0.32)", FG = "rgba(52,211,153,0.30)", FR = "rgba(248,113,113,0.28)", FV = "rgba(168,85,247,0.35)";

  /* 示例图：8 结点无向图（教材经典） */
  const G8 = {
    names: ["A", "B", "C", "D", "E", "F", "G", "H"],
    adj: [[1, 2], [0, 3, 4], [0, 5, 6], [1, 7], [1, 7], [2, 7], [2, 7], [3, 4, 5]]
  };
  /* Dijkstra 示例：6 结点带权无向图 */
  const GW = {
    names: ["A", "B", "C", "D", "E", "F"],
    edges: [
      [0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5], [2, 3, 8],
      [2, 4, 10], [3, 4, 2], [3, 5, 6], [4, 5, 3]
    ]
  };
  /* DAG：拓扑排序示例（课程依赖） */
  const GDAG = {
    names: ["0", "1", "2", "3", "4", "5"],
    edges: [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [3, 5], [4, 5]]
  };
  /* Prim：最小生成树示例 */
  const GP = GW;

  function posXY(i, n, r) {
    r = r || 165;
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  }

  /**
   * graphScene(nodes 数, adjEdges:[u,v,w?,dir?], visual 状态)
   * state: {cur(高亮黄), green Set(完成), gray Set(访问过待处理), purple Set,
   *          edgeHl Map("u-v" -> 颜色或'match'), dists 数组/null, doneDists Set,
   *          arrowTexts(额外文本元素) }
   */
  function graphScene(n, names, edges, st) {
    st = st || {};
    const elems = [];
    const pos = [];
    for (let i = 0; i < n; i++) pos.push(posXY(i, n));
    const green = st.green || new Set();
    const gray = st.gray || new Set();
    const purple = st.purple || new Set();
    const cur = st.cur;
    const dists = st.dists || null;

    // 边
    for (const e of edges) {
      const [u, v, w, dir] = e;
      const key0 = u + "-" + v, key1 = v + "-" + u;
      const hlKey = st.edgeHl && (st.edgeHl[key0] || st.edgeHl[key1]);
      let color = CB, width = 1.6, style = "solid";
      let txt = w !== undefined ? String(w) : undefined;
      if (hlKey === "mst") { color = CG; width = 3.4; }
      else if (hlKey === "cand") { color = CY; width = 2.4; style = "dashed"; }
      else if (hlKey === "walk") { color = CY; width = 3.2; }
      else if (hlKey === "dim") { color = "rgba(104,122,166,0.35)"; width = 1.2; txt = undefined; }
      const same = pos[u].y === pos[v].y;
      elems.push({
        t: "edge", key: "e" + u + "_" + v, from: "v" + u, to: "v" + v,
        color, width, style,
        text: txt,
        curve: dir ? 0.18 : (same ? 0.28 : 0),
        arrow: !!dir
      });
    }
    // 结点
    for (let i = 0; i < n; i++) {
      const p = pos[i];
      let fill, stroke, active = false, strokeW = 1.8;
      if (green.has(i)) { fill = FG; stroke = CG; }
      else if (gray.has(i)) { fill = "rgba(102,115,154,0.14)"; stroke = "#66739a"; strokeW = 1.4; }
      else if (purple.has(i)) { fill = FV; stroke = CP; }
      else if (cur === i) { fill = FY; stroke = CY; active = true; strokeW = 2.8; }
      let sub = undefined;
      if (dists && dists[i] !== undefined && dists[i] !== Infinity) {
        sub = "dist=" + dists[i] + (st.doneDists && st.doneDists.has(i) ? " ✓" : "");
      } else if (st.inDeg && st.inDeg[i] !== undefined) {
        sub = "入度=" + st.inDeg[i];
      }
      elems.push({
        t: "circle", key: "v" + i, x: p.x, y: p.y, r: 25,
        text: names[i], sub, fontSize: 16,
        fill, stroke, active, strokeWidth: strokeW
      });
    }
    if (st.extra) elems.push(...st.extra);
    return { elements: elems };
  }

  DS.structures.register({
    id: "graph",
    name: "图与图算法",
    emoji: "🕸️",
    category: "图与匹配",
    badge: "进阶",
    tags: ["邻接表", "BFS", "DFS", "Dijkstra", "拓扑排序", "最小生成树"],
    summary: "BFS/DFS 遍历、Dijkstra 最短路、拓扑排序、Prim 最小生成树——最实用的图算法，动画全安排。",

    overview: `
<div class="md"><h3>🕸️ 图的基本概念</h3>
<ul>
<li><b>顶点 V / 边 E</b>：G = (V, E)；<b>有向 / 无向</b>、<b>带权 / 无权</b>、<b>连通 / 强连通</b>。</li>
<li><b>度 / 入度 / 出度</b>：与顶点相连的边数。</li>
<li><b>存储方式</b>：邻接矩阵（O(V²) 空间、查边 O(1)）与邻接表（O(V+E) 空间，稀疏图首选）。</li>
<li><b>路径 / 简单路径 / 环 / 连通分量 / 生成树</b>：生成树 = 包含全部顶点的极小连通子图（|V|−1 条边）。</li>
</ul>
<pre><code>// 邻接表
typedef struct Edge { int to; int w; struct Edge* next; } Edge;
Edge* head[V];            // 每个顶点一条链</code></pre>
</div>
<div class="md"><h3>🚶 BFS 与 DFS</h3>
<table>
<tr><th>遍历</th><th>数据结构</th><th>特性</th><th>经典应用</th></tr>
<tr><td>BFS 广度优先</td><td>队列</td><td>按层扩散，<b>无权最短路</b></td><td>最短路径、社交网络分层</td></tr>
<tr><td>DFS 深度优先</td><td>栈 / 递归</td><td>一条路走到黑再回溯</td><td>连通性、拓扑排序、找环</td></tr>
</table>
<p>两者时间都是 <b>O(V+E)</b>。BFS 用「三色标记」：白=未发现、灰=已入队未处理完、黑=处理完；DFS 记录发现/完成时间戳。</p>
</div>
<div class="md"><h3>📍 Dijkstra 单源最短路</h3>
<p>每一轮：从未确定距离的顶点中挑 <b>dist 最小</b>者「确定之」，并<b>松弛</b>它的全部出边：<br><code>if (dist[u] + w &lt; dist[v]) dist[v] = dist[u] + w;</code></p>
<div class="callout warn">⚠️ Dijkstra 要求<b>边权非负</b>！存在负边要用 Bellman-Ford（O(VE)），负环问题就无最短路径定义。</div>
<p>朴素实现 O(V²)；<b>堆 + 邻接表</b>优化：O((V+E) log V)。</p>
</div>
<div class="md"><h3>🧭 拓扑排序（DAG）</h3>
<p>把<b>有向无环图</b>排成线性序：每条边 u→v 都满足 u 在 v 前面。Kahn 算法：反复选择<b>入度为 0</b>的顶点输出并删除其出边；另一种是 DFS 完成时间逆序。应用：课程先修关系、编译依赖、任务调度。</p>
</div>
<div class="md"><h3>🌉 最小生成树 MST</h3>
<p>连通无向图中，边权和最小且连通所有顶点的树。<b>Prim</b>：从一点出发，每次把「已选集合」连出的<b>最小边</b>拉进集合；<b>Kruskal</b>：全局边按权排序，不构成环就贪心加入（并查集判环）。二者都是贪心，时间 O(E log V)。应用：修路最小成本、网络布线。</p>
</div>`,

    complexity: [
      { op: "BFS / DFS", 平均: "O(V+E)", 最坏: "O(V+E)", 空间: "O(V)", 稳定性: "—", 说明: "V 顶点 E 边" },
      { op: "Dijkstra（朴素）", 平均: "O(V²)", 最坏: "O(V²)", 空间: "O(V)", 稳定性: "—", 说明: "边权必须非负" },
      { op: "Dijkstra（堆优化）", 平均: "O((V+E)logV)", 最坏: "O((V+E)logV)", 空间: "O(V+E)", 稳定性: "—", 说明: "" },
      { op: "拓扑排序", 平均: "O(V+E)", 最坏: "O(V+E)", 空间: "O(V)", 稳定性: "—", 说明: "仅 DAG" },
      { op: "Prim / Kruskal", 平均: "O(E log V)", 最坏: "O(E log V)", 空间: "O(V+E)", 稳定性: "—", 说明: "" },
      { op: "Floyd 多源最短路", 平均: "O(V³)", 最坏: "O(V³)", 空间: "O(V²)", 稳定性: "—", 说明: "动态规划" }
    ],

    demos: [
      {
        id: "traverse",
        name: "BFS / DFS 遍历",
        desc: "黄=当前处理，灰=已访问/已入队，绿=处理完成。BFS 看「层层波纹」，DFS 看「一条路走到黑」。",
        what: "换起点、切 BFS/DFS：同一张图两种走法，访问顺序完全不同。",
        inputs: [
          { key: "algo", label: "算法", type: "select", def: "bfs", options: [["bfs", "BFS 广度优先"], ["dfs", "DFS 深度优先"]], desc: "BFS 用队列按层扩散；DFS 用栈一路深入。" },
          { key: "start", label: "起点", type: "select", def: "0", options: G8.names.map((nm, i) => [String(i), "顶点 " + nm]), desc: "从哪个顶点开始遍历。" }
        ],
        samples: [
          { label: "BFS 从 A 出发", values: { algo: "bfs", start: "0" } },
          { label: "DFS 从 A 出发", values: { algo: "dfs", start: "0" } },
          { label: "BFS 从 E 出发", values: { algo: "bfs", start: "4" } }
        ],
        tips: [
          "同一个起点 A 分别跑 BFS 和 DFS，对比访问顺序列表，体会「队列」与「栈」的差别。",
          "从边缘顶点 E(4) 出发，观察遍历是如何逐渐覆盖全图的。",
          "注意 BFS 访问顺序就是「离起点的距离」由近到远——它能直接给出无权最短路。"
        ],
        build(inp) {
          const isBFS = inp.algo !== "dfs";
          const start = DS.clamp(parseInt(inp.start) || 0, 0, 7);
          const steps = [];
          const vis = new Set(), green = new Set();
          const consult = [];
          // 规范化无向边集
          const es = [];
          const seenE = new Set();
          for (let u = 0; u < 8; u++) for (const v of G8.adj[u]) {
            const k = u < v ? u + "-" + v : v + "-" + u;
            if (!seenE.has(k)) { seenE.add(k); es.push([u, v]); }
          }
          vis.add(start);
          consult.push(start);
          steps.push(DS.mkStep(graphScene(8, G8.names, es, { cur: start, gray: vis }), (isBFS ? "BFS" : "DFS") + " 从顶点 " + G8.names[start] + " 出发：先访问起点并放入" + (isBFS ? "队列" : "栈") + "。", { stats: { 已完成: 0, 容器中: vis.size } }));
          while (consult.length) {
            const u = isBFS ? consult.shift() : consult.pop();
            if (green.has(u)) continue;
            green.add(u);
            vis.delete(u);
            steps.push(DS.mkStep(graphScene(8, G8.names, es, { cur: u, green, gray: vis }), "处理顶点 " + G8.names[u] + "（黄）→ 标记完成。", { stats: { 已完成: green.size, 容器中: vis.size } }));
            const order = G8.adj[u].slice();
            if (!isBFS) order.reverse();
            for (const v of order) {
              if (!green.has(v) && !consult.includes(v) && !vis.has(v)) {
                vis.add(v);
                consult.push(v);
                steps.push(DS.mkStep(graphScene(8, G8.names, es, { cur: u, green, gray: vis, edgeHl: { [u < v ? u + "-" + v : v + "-" + u]: "walk" } }), "发现新顶点 " + G8.names[v] + "（灰），沿边 " + G8.names[u] + "-" + G8.names[v] + " 压入" + (isBFS ? "队列" : "栈") + "。", { stats: { 已完成: green.size, 容器中: vis.size } }));
              }
            }
          }
          steps.push(DS.mkStep(graphScene(8, G8.names, es, { green }), "🏁 遍历完成！所有 " + green.size + " 个顶点都访问过：" + (isBFS ? "按层扩散" : "深度优先") + "。", { stats: { 已完成: green.size } }));
          return { steps };
        }
      },
      {
        id: "dijkstra",
        name: "Dijkstra 最短路",
        desc: "每轮挑 dist 最小且未确定的顶点（绿✓），松弛它所有出边（黄高亮）。结点下方实时显示 dist。",
        what: "换起点看 dist 表格如何重算：从 A 出发与从 F 出发最短路树完全不同。",
        inputs: [
          { key: "start", label: "起点", type: "select", def: "0", options: GW.names.map((nm, i) => [String(i), "顶点 " + nm]), desc: "单源最短路：计算从这个顶点到所有点的最短距离。" }
        ],
        samples: [
          { label: "从 A 出发", values: { start: "0" } },
          { label: "从 C 出发", values: { start: "2" } },
          { label: "从 F 出发", values: { start: "5" } }
        ],
        tips: [
          "盯住顶点 D：A→D 有两条路（A-B-D = 9、A-C-D = 10），看松弛后 dist 取更小值 9。",
          "换起点 C 重跑：完全不同的确定顺序与 dist 表。",
          "思考：为什么 Dijkstra 要求边权非负？看讲解页的说明。"
        ],
        build(inp) {
          const s = DS.clamp(parseInt(inp.start) || 0, 0, 5);
          const n = 6;
          const dist = new Array(n).fill(Infinity);
          dist[s] = 0;
          const done = new Set();
          const steps = [];
          const es = GW.edges.map(e => [e[0], e[1], e[2]]);
          steps.push(DS.mkStep(graphScene(n, GW.names, es, { dists: dist, doneDists: done, cur: s }), "初始化：dist[起点 " + GW.names[s] + "] = 0，其余 = ∞。", { stats: { 已确定: 0 } }));
          for (let round = 0; round < n; round++) {
            let u = -1;
            for (let i = 0; i < n; i++) if (!done.has(i) && (u === -1 || dist[i] < dist[u])) u = i;
            if (u === -1 || dist[u] === Infinity) break;
            steps.push(DS.mkStep(graphScene(n, GW.names, es, { dists: dist.slice(), doneDists: done, cur: u }), "第 " + (round + 1) + " 轮：未确定顶点中 dist 最小的是 " + GW.names[u] + "（dist = " + dist[u] + "）→ <b>确定之</b>（绿✓）。", { stats: { 已确定: done.size + 1 } }));
            done.add(u);
            // 找邻居边
            for (const e of GW.edges) {
              let v = -1;
              if (e[0] === u) v = e[1];
              else if (e[1] === u) v = e[0];
              if (v !== -1 && !done.has(v)) {
                const nd = dist[u] + e[2];
                const upd = nd < dist[v];
                if (upd) dist[v] = nd;
                steps.push(DS.mkStep(graphScene(n, GW.names, es, {
                  dists: dist.slice(), doneDists: done, cur: v,
                  edgeHl: { [u + "-" + v]: "cand", [v + "-" + u]: "cand" }
                }), "松弛边 " + GW.names[u] + "-" + GW.names[v] + "（权 " + e[2] + "）：dist[" + v + "] = min(" + (dist[v] - (upd ? 0 : 0)) + ", " + dist[u] + "+" + e[2] + ")" + (upd ? " → <b>更新为 " + nd + "</b>" : "（不更新）") + "。", { stats: { 已确定: done.size } }));
              }
            }
          }
          steps.push(DS.mkStep(graphScene(n, GW.names, es, { dists: dist, doneDists: done }), "🏁 全部顶点确定！从 " + GW.names[s] + " 出发到各点的最短距离：" + GW.names.map((nm, i) => nm + "=" + (dist[i] === Infinity ? "∞" : dist[i])).join("，"), { stats: { 已确定: done.size } }));
          return { steps };
        }
      },
      {
        id: "topo",
        name: "拓扑排序（Kahn）",
        desc: "反复找「入度为 0」的顶点输出并删除，若图有环则无法得到合法序。",
        inputs: [
          { key: "keep", label: "说明", type: "select", def: "0", options: [["0", "演示标准 DAG"], ["1", "演示添加一条反向边（成环）"]] }
        ],
        build(inp) {
          const n = 6;
          const edges = GDAG.edges.map(e => [e[0], e[1]]);
          const steps = [];
          let deg = new Array(n).fill(0);
          for (const [u, v] of edges) deg[v]++;
          steps.push(DS.mkStep(graphScene(n, GDAG.names, edges, { inDeg: deg }), "Kahn 算法：统计每个顶点的<b>入度</b>（结点下方蓝字），不断输出入度为 0 的顶点并删边。", { stats: { 已输出: 0 } }));
          const q = [];
          const out = [];
          const removed = new Set();
          for (let i = 0; i < n; i++) if (deg[i] === 0) q.push(i);
          while (q.length) {
            const u = q.shift();
            if (removed.has(u)) continue;
            removed.add(u);
            out.push(GDAG.names[u]);
            steps.push(DS.mkStep(graphScene(n, GDAG.names, edges, { inDeg: deg, green: removed, cur: u }), "入度为 0 的顶点 " + GDAG.names[u] + " 出队并<b>输出</b>（绿）。当前输出序：" + out.join(" → "), { stats: { 已输出: out.length } }));
            for (const e of edges) {
              if (e[0] === u && !removed.has(e[1])) {
                deg[e[1]]--;
                steps.push(DS.mkStep(graphScene(n, GDAG.names, edges, { inDeg: deg, green: removed, cur: e[1], edgeHl: { [e[0] + "-" + e[1]]: "dim" } }), "删除出边 " + GDAG.names[u] + "→" + GDAG.names[e[1]] + "：其入度 " + (deg[e[1]] + 1) + " → " + deg[e[1]] + (deg[e[1]] === 0 ? "（成为新候选！）" : "") + "。", { stats: { 已输出: out.length } }));
                if (deg[e[1]] === 0) q.push(e[1]);
              }
            }
          }
          if (out.length < n) {
            steps.push(DS.mkStep(graphScene(n, GDAG.names, edges, { green: removed }), "🏁 还有 " + (n - out.length) + " 个顶点无法输出 → <b style='color:#f87171'>图中存在环</b>，不存在拓扑序！", { stats: { 已输出: out.length, 结论: "有环" } }));
          } else {
            steps.push(DS.mkStep(graphScene(n, GDAG.names, edges, { green: removed }), "🏁 拓扑序：" + out.join(" → ") + "。", { stats: { 已输出: out.length, 结论: "DAG ✓" } }));
          }
          return { steps };
        }
      },
      {
        id: "prim",
        name: "Prim 最小生成树",
        desc: "从起点出发，每次把「已选树」连出的最小权边拉进来（绿=已选入树，黄虚线=候选边）。",
        inputs: [
          { key: "start", label: "起点", type: "select", def: "0", options: GP.names.map((nm, i) => [String(i), "顶点 " + nm]) }
        ],
        build(inp) {
          const s = DS.clamp(parseInt(inp.start) || 0, 0, 5);
          const n = 6;
          const es = GP.edges.map(e => [e[0], e[1], e[2]]);
          const steps = [];
          const inTree = new Set([s]);
          const mstEdges = new Map();
          let total = 0;
          steps.push(DS.mkStep(graphScene(n, GP.names, es, { green: inTree, cur: s }), "Prim：从 " + GP.names[s] + " 出发，慢慢把整张图长成一棵<b>总权最小</b>的树。", { stats: { 树中顶点: 1, 总权: 0 } }));
          for (let round = 0; round < n - 1; round++) {
            let best = null;
            for (const e of es) {
              const a = inTree.has(e[0]), b = inTree.has(e[1]);
              if (a === b) continue; // 只在"树与非树"之间找
              if (best === null || e[2] < best[2]) best = e;
            }
            steps.push(DS.mkStep(graphScene(n, GP.names, es, {
              green: inTree,
              edgeHl: Object.fromEntries(es.map(e => [e[0] + "-" + e[1], mstEdges.has(e[0] + "-" + e[1]) ? "mst" : "dim"]))
            }), "扫描所有「树 ↔ 非树」的边，找出最小权者（黄虚线标出候选）。", { stats: { 树中顶点: inTree.size, 总权: total } }));
            const [u, v, w] = best;
            inTree.add(u); inTree.add(v);
            mstEdges.set(u + "-" + v, w);
            mstEdges.set(v + "-" + u, w);
            total += w;
            steps.push(DS.mkStep(graphScene(n, GP.names, es, {
              green: inTree, cur: (inTree.has(u) ? v : u),
              edgeHl: Object.fromEntries(es.map(e => [e[0] + "-" + e[1], mstEdges.has(e[0] + "-" + e[1]) ? "mst" : "dim"]))
            }), "选中最短边 " + GP.names[u] + "-" + GP.names[v] + "（权 " + w + "）加入生成树（绿边）。", { stats: { 树中顶点: inTree.size, 总权: total } }));
          }
          steps.push(DS.mkStep(graphScene(n, GP.names, es, {
            green: inTree,
            edgeHl: Object.fromEntries(es.map(e => [e[0] + "-" + e[1], mstEdges.has(e[0] + "-" + e[1]) ? "mst" : "dim"]))
          }), "🏁 最小生成树完成！共 " + (n - 1) + " 条边，总权 = " + total + "。", { stats: { 树中顶点: n, 总权: total } }));
          return { steps };
        }
      }
    ],

    cPresets: [
      {
        id: "floyd",
        name: "Floyd 多源最短路（C）",
        mode: "array",
        code: `/* Floyd：动态规划求解任意两点最短路
   一维数组 dist[i*n+j] 存 i 到 j 的距离 */
int main(){
  int n = 4;
  int INF = 99;
  int d[16];
  int i, j, k;
  for(i = 0; i < 16; i++) d[i] = INF;
  for(i = 0; i < 4; i++) d[i * 4 + i] = 0;
  d[0 * 4 + 1] = 2; d[1 * 4 + 2] = 3; d[2 * 4 + 3] = 1;
  d[0 * 4 + 3] = 9; d[0 * 4 + 2] = 6;
  for(k = 0; k < n; k++){
    for(i = 0; i < n; i++){
      for(j = 0; j < n; j++){
        if(d[i * 4 + k] + d[k * 4 + j] < d[i * 4 + j]){
          d[i * 4 + j] = d[i * 4 + k] + d[k * 4 + j];
        }
      }
    }
  }
  printf("0->3 = %d\\n", d[0 * 4 + 3]);
  return 0;
}`,
        lineNotes: {
          7: "INF 用一个足够大的数代替无穷大。",
          8: "对角线（自己到自己）距离为 0。",
          9: "初始化已知边权。",
          11: "中转点 k：允许经过 0..k 号顶点。",
          13: "核心 DP：经过 k 是否更短？是则更新。",
          19: "输出 0 到 3 的最短路，应为 6（0→1→2→3）。"
        }
      },
      {
        id: "mat-bfs",
        name: "邻接矩阵 · BFS 广度优先（C）",
        mode: "array",
        code: `/* 邻接矩阵 + 数组队列：BFS 一层层向外扩散 */
int main(){
  int n = 5;
  int g[5][5] = {
    {0, 1, 1, 0, 0},
    {1, 0, 1, 1, 0},
    {1, 1, 0, 0, 1},
    {0, 1, 0, 0, 1},
    {0, 0, 1, 1, 0}
  };
  int vis[5] = {0, 0, 0, 0, 0};
  int q[5];
  int head = 0;
  int tail = 0;
  q[tail] = 0;
  tail++;
  vis[0] = 1;
  while(head < tail){
    int u = q[head];
    head++;
    printf("访问 %d\\n", u);
    int v;
    for(v = 0; v < n; v++){
      if(g[u][v] == 1 && vis[v] == 0){
        vis[v] = 1;
        q[tail] = v;
        tail++;
      }
    }
  }
  return 0;
}`,
        lineNotes: {
          3: "n 是顶点数，g 是邻接矩阵（1 表示有边）。",
          11: "vis 标记已入队/已访问，防止重复。",
          12: "q 当队列用，head 出队、tail 入队。",
          15: "起点 0 先入队并立刻标记访问。",
          18: "队列非空就继续。",
          19: "出队一个顶点。",
          21: "访问它。",
          24: "扫描它的所有邻居。",
          25: "没访问过的邻居：标记并入队（这样每个点最多入队一次）。"
        }
      },
      {
        id: "mat-dfs",
        name: "邻接矩阵 · DFS 深度优先（C，栈模拟）",
        mode: "array",
        code: `/* 邻接矩阵 + 数组栈：DFS 用栈模拟「一条路走到黑」 */
int main(){
  int n = 5;
  int g[5][5] = {
    {0, 1, 1, 0, 0},
    {1, 0, 1, 1, 0},
    {1, 1, 0, 0, 1},
    {0, 1, 0, 0, 1},
    {0, 0, 1, 1, 0}
  };
  int vis[5] = {0, 0, 0, 0, 0};
  int st[5];
  int top = 0;
  st[top] = 0;
  top++;
  while(top > 0){
    top--;
    int u = st[top];
    if(vis[u] == 1) continue;
    vis[u] = 1;
    printf("访问 %d\\n", u);
    int v;
    for(v = n - 1; v >= 0; v--){
      if(g[u][v] == 1 && vis[v] == 0){
        st[top] = v;
        top++;
      }
    }
  }
  return 0;
}`,
        lineNotes: {
          12: "st 当栈用，top 是栈顶指针（指向下一个空位）。",
          15: "起点 0 压栈。",
          17: "栈非空就继续。",
          18: "弹出一个顶点。",
          20: "已访问过就跳过（可能被重复压栈）。",
          21: "标记访问。",
          25: "邻居从大到小压栈——这样出栈时是 0、1、2…的自然顺序。",
          26: "未访问的邻居全部压栈。"
        }
      }
    ]
  });
})();