/* ==========================================================
   hashtable.js — 哈希表：链地址法 / 开放定址 / 负载因子
   ========================================================== */
(function () {
  DS.structures.register({
    id: "hashtable",
    name: "哈希表",
    emoji: "🗂️",
    category: "查找与排序",
    badge: "高频考点",
    tags: ["散列", "hash函数", "链地址法", "开放定址", "负载因子"],
    summary: "哈希把键压缩成桶号，配合链表或探测解决冲突，让插入、查找、删除以平均 O(1) 完成——最实用的「空间换时间」。",

    /* ================= 知识讲解 ================= */
    overview: `
<div class="md">
<h3>🗝️ 哈希思想：把大空间压缩成小空间</h3>
<p>哈希表（散列表）想干一件事：让<b>插入 / 查找 / 删除都接近 O(1)</b>。它的两个对手——顺序查找 O(n)，二分查找 O(log n) 却又要求有序、插入删除偏慢。</p>
<p><b>直接寻址表</b>：若键全部落在 [0, K) 内，开一个 K 格数组，让 <code>a[key] = 值</code>，读写天然 O(1)。但当键是学号、身份证号、字符串时，K 大得无法接受（10 位学号就要 10¹⁰ 个格子）。</p>
<p><b>哈希函数</b>把任意键「压缩」成小下标：</p>
<pre><code>h(key) = key % m;        /* m 个桶，桶号 0..m-1 */
bucket[h(key)] = key;</code></pre>
<p>本质是<b>空间换时间</b>：牺牲 O(m + n) 的空间，换取近乎 O(1) 的操作速度。</p>
<div class="callout">🐦 <b>鸽巢原理</b>：只要键的数量超过桶数 m，必然有两个不同键落到同一个桶——<b>冲突（collision）无法完全避免</b>。所以哈希表 = 「设计好 h 减少冲突」 + 「设计好办法解决冲突」。</div>
</div>
<div class="md">
<h3>📐 哈希函数设计的三条军规</h3>
<ul>
<li><b>确定性</b>：同一个 key 每次必须算出同一个桶号，否则元素自己都找不回来。</li>
<li><b>均匀性</b>：把 key 尽量均匀地撒进 m 个桶，避免个别桶挤成重灾区。</li>
<li><b>快速</b>：哈希是每一步都要用的操作，必须 O(1) 算完。</li>
</ul>
<h4>常用方法</h4>
<ol>
<li><b>除留余数法（最常用）</b>：<code>h(key) = key % m</code>。m 一般取<b>不接近 2 的幂的素数</b>——若 m = 2^k，结果只由 key 的<b>低 k 位</b>决定，高位信息全被丢弃，分布会严重依赖低位模式。</li>
<li><b>乘法散列（了解）</b>：<code>h(key) = ⌊m · (key·A mod 1)⌋</code>，A 常取黄金分割比倒数 0.618…（Knuth 建议），它对 m 的选择不敏感。</li>
<li><b>字符串键</b>：先把字符序列折成一个整数（如每位乘 131 累加），再取模。</li>
</ol>
<div class="callout">💡 均匀是目标而不是必然：要针对<b>具体数据分布</b>选 m（这也是标准库常把容量取素数的原因）。</div>
</div>
<div class="md">
<h3>⚔️ 冲突的两种解法</h3>
<h4>① 链地址法（拉链法 / 分离链接法）</h4>
<p>每个桶挂一条链表，同桶元素按插入顺序排成一串：</p>
<pre><code>typedef struct Node{
    int key;
    struct Node *next;
} Node;
Node *bucket[m];        /* m 个桶，每个桶一条链 */</code></pre>
<p>冲突无害：查到桶后沿链走即可，装载因子 α 允许超过 1。</p>
<h4>② 开放定址法（闭散列）</h4>
<p>所有元素直接住在表里，冲突时按<b>探测序列</b> h(key,0), h(key,1), … 找下一个位置：<code>h(key,i) = (h(key) + f(i)) % m</code>。</p>
<table>
<tr><th>探测方式</th><th>f(i)</th><th>优缺点</th></tr>
<tr><td>线性探测</td><td>i</td><td>简单、缓存友好；有「一次聚集」缺陷</td></tr>
<tr><td>二次探测</td><td>i²</td><td>缓解聚集；但同桶号的探测序列仍相同（二次聚集）</td></tr>
<tr><td>双散列</td><td>i · h₂(key)</td><td>探测序列随 key 变化，理论最优；实现最复杂</td></tr>
</table>
<div class="callout warn">⚠️ <b>一次聚集（primary clustering）</b>：线性探测下，一旦出现一段连续占用区，后续元素落到该区附近的概率就更大——占用区越长「吸力」越强，探测链越来越长。</div>
</div>
<div class="md">
<h3>📈 装载因子 α = n / m</h3>
<p>α 是哈希表的<b>拥挤程度</b>，所有性能都围着它转：</p>
<table>
<tr><th>评价指标</th><th>链地址法</th><th>开放定址法</th></tr>
<tr><td>成功查找平均</td><td>≈ 1 + α/2 次比较</td><td>≈ ½(1 + 1/(1-α)) 次探测</td></tr>
<tr><td>失败查找平均</td><td>≈ α 次比较</td><td>≈ ½(1 + 1/(1-α)²) 次探测</td></tr>
<tr><td>工程阈值</td><td>α &gt; 1 仍可用</td><td>α 必须小于 1</td></tr>
</table>
<p>工程上 α 超过 <b>0.75 ~ 0.8</b> 就<b>扩容并 rehash</b>：容量翻倍（常取新素数），把每个元素按新容量重新散列搬移——一次 O(n)，但均摊到每次插入仍接近 O(1)。反之，所有键都撞进一个桶时，任何哈希表都退化为 O(n)：<b>最坏 O(n)，平均 O(1)</b>。</p>
<div class="callout">📉 直觉：α 越小越空、O(1) 越稳，但浪费空间；α 越大越挤、链越长探测越多。0.75~0.8 是两者的平衡点。</div>
</div>
<div class="md">
<h3>🧨 易错点：删除</h3>
<h4>链地址法的删除：摘链找前驱</h4>
<pre><code>Node *prev = NULL, *cur = bucket[b];
while(cur != NULL &amp;&amp; cur-&gt;key != key){
    prev = cur;
    cur = cur-&gt;next;
}
if(cur != NULL){
    if(prev == NULL) bucket[b] = cur-&gt;next;  /* 删头结点 */
    else prev-&gt;next = cur-&gt;next;             /* 摘中间结点 */
    free(cur);
}</code></pre>
<h4>开放定址的删除：墓碑（tombstone）</h4>
<p>不能直接把格子清空！否则查找的探测链会在这里<b>断裂</b>。例：25、32 都哈希到 4，25 占 4、32 被挤到 5；删掉 25 后把 4 清空，以后查 32 时看到 4 是空位，就会误判「32 不存在」。</p>
<p>正确做法：打<b>墓碑标记</b>（如用 -2 表示「曾有人、已被删」）。<b>查找</b>遇到墓碑继续探测；<b>插入</b>可复用墓碑位置；墓碑积多了做一次 rehash。</p>
<div class="callout err">⚠️ 面试高频：开放定址「删了就清空」是最隐蔽的 bug——查找提前终止、元素凭空「消失」。口诀：<b>删了留碑，插了填碑，碑多 rehash</b>。</div>
</div>`,

    complexity: [
      { op: "插入（链地址法）", 平均: "O(1)", 最坏: "O(n)", 空间: "O(n)", 稳定性: "—", 说明: "平均 O(1+α)，挂到桶链尾" },
      { op: "插入（开放定址）", 平均: "O(1)", 最坏: "O(n)", 空间: "O(n)", 稳定性: "—", 说明: "探测长度随 α 增大而增大" },
      { op: "查找", 平均: "O(1)", 最坏: "O(n)", 空间: "O(n)", 稳定性: "—", 说明: "全部冲突时退化为 O(n)" },
      { op: "删除", 平均: "O(1)", 最坏: "O(n)", 空间: "O(n)", 稳定性: "—", 说明: "开放定址需要墓碑标记" },
      { op: "扩容 rehash", 平均: "O(n)", 最坏: "O(n)", 空间: "O(n)", 稳定性: "—", 说明: "一次搬移全部元素" }
    ],

    /* ================= 动手演示 ================= */
    demos: [
      {
        id: "chaining",
        name: "链地址法（拉链）",
        desc: "每个桶挂一条链表：先算 h(x)=x%m 找到桶，再把结点挂到链尾。冲突的元素在同一条链上共存；最后演示沿链查找。",
        inputs: [
          { key: "m", label: "哈希表容量 m", type: "number", def: 7, min: 5, max: 11, desc: "桶的个数：h(x) = x % m，m 越小冲突越密集。" },
          { key: "data", label: "依次插入的数据", type: "text", def: "12,5,19,7,33,21,2,15", cls: "nums", desc: "逐个插入这些数，冲突的元素会被挂到同一桶的链上。" }
        ],
        what: "改容量 m 与数据：m 大冲突少，m 小链条长——直观看到负载因子的影响。",
        samples: [
          { label: "容量 7 常规冲突", values: { m: 7, data: "12,5,19,7,33,21,2,15" } },
          { label: "容量 5（更挤）", values: { m: 5, data: "12,5,19,7,33,21,2,15" } },
          { label: "容量 11（宽松）", values: { m: 11, data: "12,5,19,7,33,21,2,15" } },
          { label: "同余数堆满一桶", values: { m: 7, data: "7,14,21,28,35" } }
        ],
        tips: [
          "把数据改成 7,14,21,28,35（都 %7=0）：全部挂到 0 号桶，退化成一整条链——最坏情况 O(n)。",
          "只把容量 m 从 7 改成 11：同样的数据几乎不再冲突，体会负载因子 α = n/m 的含义。",
          "最后两步是查找演示：先算桶号、再沿链顺序找，观察查找也要遍历链。"
        ],
        build(inp) {
          const m = DS.clamp(parseInt(inp.m) || 7, 5, 11);
          const data = DS.parseNums(inp.data, [12, 5, 19, 7, 33, 21, 2, 15], 12);
          const H = k => ((k % m) + m) % m;

          // 预计算每条链的最终形态（槽位固定 → key 稳定、补间平滑）
          const chains = [];
          for (let b = 0; b < m; b++) chains.push([]);
          for (let q = 0; q < data.length; q++) chains[H(data[q])].push(q);
          let maxLen = 1;
          for (const c of chains) if (c.length > maxLen) maxLen = c.length;

          const dy = Math.max(22, Math.min(44, Math.floor(170 / maxLen)));
          const bw = Math.min(62, Math.floor(900 / m));
          const baseX = -(m * bw) / 2;
          const bx = b => baseX + b * bw + bw / 2;
          const ny = p => -102 + p * dy;
          const addr = g => "0x" + (0xA0 + g).toString(16).toUpperCase();

          const steps = [];
          let ins = 0, clash = 0;
          const alpha = () => (ins / m).toFixed(2);
          const st = extra => Object.assign({ "已插入": ins, "冲突": clash, "α负载因子": alpha() }, extra || {});

          const sc = o => {
            o = o || {};
            const shown = o.shown === undefined ? ins : o.shown;
            const elems = [];
            // 桶
            for (let b = 0; b < m; b++) {
              const focus = o.bucket === b;
              const conf = o.conflictB === b;
              elems.push({
                t: "rect", key: "bk" + b, x: bx(b) - bw / 2 + 3, y: -170, w: bw - 6, h: 30,
                text: [String(b)],
                fill: conf ? "rgba(248,113,113,0.28)" : (focus ? "rgba(251,191,36,0.22)" : undefined),
                stroke: conf ? "#f87171" : (focus ? "#fbbf24" : undefined),
                active: focus || conf, radius: 6
              });
            }
            // 链上结点（只显示已插入的）
            for (let b = 0; b < m; b++) {
              const c = chains[b];
              for (let p = 0; p < c.length; p++) {
                const g = c[p];
                if (g >= shown) continue;
                const isNew = o.newnode === g;
                const isWalk = o.walk === g;
                const isDone = o.done === g;
                const tint = o.tintChain === b && !isWalk && !isDone;
                elems.push({
                  t: "circle", key: "nd" + g, x: bx(b), y: ny(p), r: 17,
                  text: String(data[g]), sub: addr(g),
                  fill: isDone ? "rgba(52,211,153,0.35)"
                    : (isNew ? "rgba(52,211,153,0.30)"
                    : (isWalk ? "rgba(251,191,36,0.30)"
                    : (tint ? "rgba(251,191,36,0.20)" : "rgba(91,140,255,0.16)"))),
                  stroke: isDone ? "#34d399" : (isNew ? "#34d399" : (isWalk ? "#fbbf24" : (tint ? "#fbbf24" : undefined))),
                  active: isNew || isWalk || isDone || tint
                });
              }
            }
            // 边：桶→链头、链内结点相连
            for (let b = 0; b < m; b++) {
              if (chains[b].length && chains[b][0] < shown) {
                elems.push({ t: "edge", key: "be" + b, from: "bk" + b, to: "nd" + chains[b][0], color: "#5b8cff", arrow: true });
              }
            }
            for (let b = 0; b < m; b++) {
              const c = chains[b];
              for (let p = 1; p < c.length; p++) {
                if (c[p] < shown) {
                  elems.push({ t: "edge", key: "le" + c[p], from: "nd" + c[p - 1], to: "nd" + c[p], color: "#5b8cff", arrow: true, text: "next" });
                }
              }
            }
            // 待插入队列
            const cwq = data.length > 10 ? 40 : 46;
            const qX = q => -(data.length * cwq) / 2 + q * cwq;
            for (let q = 0; q < data.length; q++) {
              const isCur = o.q === q;
              const isTgt = o.targetQ === q;
              const gone = o.upTo !== undefined && q < o.upTo;
              elems.push({
                t: "cell", key: "vc" + q, x: qX(q), y: 152, w: cwq - 6, h: 36,
                text: String(data[q]),
                fill: isCur ? "rgba(251,191,36,0.30)" : (isTgt ? "rgba(52,211,153,0.25)" : (gone ? "rgba(100,120,160,0.06)" : undefined)),
                stroke: isCur ? "#fbbf24" : (isTgt ? "#34d399" : (gone ? "#31415f" : undefined)),
                active: isCur || isTgt
              });
            }
            elems.push({ t: "text", key: "cap", x: 0, y: -190, text: "链地址法（拉链）：h(x) = x % m，冲突元素同桶共存", size: 14, color: "#8f9cbf", bold: true });
            if (o.formula) {
              elems.push({ t: "text", key: "fx", x: -452, y: 128, text: o.formula, size: 14, color: "#fbbf24", bold: true, mono: true, align: "left" });
            }
            return { elements: elems };
          };

          steps.push(DS.mkStep(sc({ shown: 0 }), "初始状态：" + m + " 个空桶（下标 0 ~ " + (m - 1) + "），数据等待逐个插入。冲突的元素会<b>挂在同一个桶的链上</b>。", { stats: st() }));

          for (let q = 0; q < data.length; q++) {
            const x = data[q];
            const b = H(x);
            const p = chains[b].indexOf(q);
            const formula = "h(" + x + ") = " + x + " % " + m + " = " + b;
            if (p === 0) {
              steps.push(DS.mkStep(sc({ q, bucket: b, formula, upTo: q }), "插入 <b style='color:#fbbf24'>" + x + "</b>：计算 " + formula + " → 桶 " + b + " 是<b>空桶</b>，无冲突，直接挂入。", { stats: st() }));
            } else {
              clash++;
              steps.push(DS.mkStep(sc({ q, bucket: b, conflictB: b, tintChain: b, formula, upTo: q }), "插入 <b style='color:#fbbf24'>" + x + "</b>：计算 " + formula + " → 桶 " + b + " 已有 " + p + " 个元素（黄色链条），<b style='color:#f87171'>发生冲突！</b>", { stats: st() }));
            }
            ins++;
            steps.push(DS.mkStep(sc({ q, newnode: q, bucket: b, upTo: q }), "新结点 <b style='color:#34d399'>" + x + "</b>（地址 " + addr(q) + "）挂到桶 " + b + " 的<b>链尾</b>，next 指针相连——链地址法：冲突元素照常入桶，互不打扰。", { stats: st() }));
          }

          // 查找：以最后一个数作 target
          const t = data[data.length - 1];
          const tb = H(t);
          steps.push(DS.mkStep(sc({ targetQ: data.length - 1, bucket: tb, tintChain: tb, formula: "h(" + t + ") = " + t + " % " + m + " = " + tb, upTo: data.length }), "🔍 查找 <b>target = " + t + "</b>：先算桶号 h(" + t + ") = " + t + " % " + m + " = " + tb + "，然后从桶头沿链<b>顺序遍历</b>。", { stats: st() }));
          const ch = chains[tb];
          for (let p = 0; p < ch.length; p++) {
            const g = ch[p];
            if (data[g] === t) {
              steps.push(DS.mkStep(sc({ targetQ: data.length - 1, walk: g, done: g, upTo: data.length }), "比较链上第 " + (p + 1) + " 个结点 " + data[g] + " —— 与 target <b>相等</b>，<b style='color:#34d399'>找到！</b>一共走了 " + (p + 1) + " 步。", { stats: st() }));
            } else {
              steps.push(DS.mkStep(sc({ targetQ: data.length - 1, walk: g, upTo: data.length }), "比较第 " + (p + 1) + " 个结点 " + data[g] + " —— ≠ target，沿 <code>next</code> 指针走到下一个结点。", { stats: st() }));
            }
          }
          steps.push(DS.mkStep(sc({ targetQ: data.length - 1, upTo: data.length }), "🏁 链地址法查找：最坏沿链走完 O(链长)，平均 O(1 + α/2)。当前装载因子 α = " + ins + " / " + m + " = " + alpha() + "，越小越快。", { stats: st() }));
          return { steps };
        }
      },
      {
        id: "open",
        name: "开放定址（线性探测）",
        desc: "所有元素直接住在表里：冲突就探测下一个位置 (h0+i)%m，直到空位。观察黄色探测链如何越拉越长——聚集现象。",
        inputs: [
          { key: "m", label: "哈希表容量 m", type: "number", def: 7, min: 7, max: 11, desc: "槽位个数：位置被占时往后探测 (h+i)%m。" },
          { key: "data", label: "依次插入的数据", type: "text", def: "25,32,8,26,39,18", cls: "nums", desc: "逐个插入；冲突时线性探测找下一个空位并记录探测次数。" }
        ],
        what: "改 m 与数据：看线性探测如何往后找空位，以及「聚集」如何让探测越来越长。",
        samples: [
          { label: "常规冲突与探测", values: { m: 7, data: "25,32,8,26,39,18" } },
          { label: "同余数（严重聚集）", values: { m: 7, data: "7,14,21,28,35" } },
          { label: "几乎填满", values: { m: 7, data: "1,8,15,22,29,36,43" } }
        ],
        tips: [
          "插入一串互相冲突的数（如都 %7=0）：后面每个都要探测一大段——这就是「一次聚集」。",
          "留意每步统计里的「探测次数」：越满的表探测越长。",
          "对比「链地址法」：同样的冲突，链地址不用跳槽，只需挂链。两种思路各有取舍。"
        ],
        build(inp) {
          const m = DS.clamp(parseInt(inp.m) || 7, 7, 11);
          const data = DS.parseNums(inp.data, [25, 32, 8, 26, 39, 18], 8);
          const H = k => ((k % m) + m) % m;
          const slots = new Array(m).fill(null);
          const steps = [];
          let tot = 0, ins = 0;
          const st = extra => Object.assign({ "探测次数总计": tot, "已插入": ins }, extra || {});

          const sc = o => {
            o = o || {};
            const elems = [];
            const cw = 56;
            const sX = i => -(m * cw) / 2 + i * cw;
            const trail = o.trail || [];
            for (let i = 0; i < m; i++) {
              const occ = slots[i] !== null;
              const isWrite = o.write === i;
              const isProbe = o.probe === i && !isWrite;
              const isTrail = trail.indexOf(i) !== -1 && !isProbe && !isWrite;
              const isH0 = o.h0 === i && !isWrite && !isProbe;
              let fill, stroke, act = false;
              if (isWrite) { fill = "rgba(52,211,153,0.32)"; stroke = "#34d399"; act = true; }
              else if (isProbe) { fill = "rgba(251,191,36,0.30)"; stroke = "#fbbf24"; act = true; }
              else if (isH0 && occ) { fill = "rgba(248,113,113,0.30)"; stroke = "#f87171"; act = true; }
              else if (isH0) { fill = "rgba(52,211,153,0.22)"; stroke = "#34d399"; act = true; }
              else if (isTrail && occ) { fill = "rgba(251,191,36,0.16)"; stroke = "#fbbf24"; act = true; }
              else if (!occ) { fill = "rgba(91,140,255,0.05)"; stroke = "#2c3a5e"; }
              elems.push({
                t: "cell", key: "sl" + i, x: sX(i), y: -76, w: cw - 8, h: 46,
                text: occ ? String(slots[i]) : "·", index: String(i),
                fill, stroke, active: act, radius: 6
              });
            }
            const cwq = data.length > 8 ? 42 : 48;
            const qX = q => -(data.length * cwq) / 2 + q * cwq;
            for (let q = 0; q < data.length; q++) {
              const isCur = o.q === q;
              const gone = o.upTo !== undefined && q < o.upTo;
              elems.push({
                t: "cell", key: "vq" + q, x: qX(q), y: 124, w: cwq - 6, h: 34,
                text: String(data[q]),
                fill: isCur ? "rgba(251,191,36,0.30)" : (gone ? "rgba(100,120,160,0.06)" : undefined),
                stroke: isCur ? "#fbbf24" : (gone ? "#31415f" : undefined),
                active: isCur
              });
            }
            elems.push({ t: "text", key: "cap", x: 0, y: -126, text: "开放定址·线性探测：h(key, i) = (key % m + i) % m", size: 14, color: "#8f9cbf", bold: true });
            if (o.formula) {
              elems.push({ t: "text", key: "fx", x: -410, y: 6, text: o.formula, size: 14, color: "#fbbf24", bold: true, mono: true, align: "left" });
            }
            if (o.note) {
              elems.push({ t: "text", key: "note", x: 0, y: 76, text: o.note, size: 13, color: "#fbbf24", bold: true });
            }
            return { elements: elems };
          };

          steps.push(DS.mkStep(sc({}), "初始状态：" + m + " 个空位（虚框）。开放定址法：元素<b>直接住在数组里</b>，位置由探测序列 h(key, i) 决定。", { stats: st() }));

          for (let q = 0; q < data.length; q++) {
            if (steps.length >= 46) {
              steps.push(DS.mkStep(sc({}), "其余数据不再演示（已接近步数上限，可减少数据量重试）。", { stats: st() }));
              break;
            }
            const x = data[q];
            let pos = H(x);
            tot++;
            const occ0 = slots[pos] !== null;
            steps.push(DS.mkStep(sc({ q, h0: pos, upTo: q, formula: "h₀ = " + x + " % " + m + " = " + pos }),
              "插入 <b style='color:#fbbf24'>" + x + "</b>：先算 h₀ = x % m = " + pos + "。" +
              (occ0 ? "该位置已被 <b>" + slots[pos] + "</b> 占用——<b style='color:#f87171'>冲突！开始线性探测</b>。" : "该位置是<b>空位</b>，直接写入。"),
              { stats: st() }));
            if (!occ0) {
              slots[pos] = x; ins++;
              steps.push(DS.mkStep(sc({ write: pos, q, upTo: q }), "slot[" + pos + "] ← <b style='color:#34d399'>" + x + "</b>。没有冲突，1 次探测完成。", { stats: st() }));
              continue;
            }
            let i = 1;
            for (;;) {
              pos = (H(x) + i) % m;
              tot++;
              const trail = [];
              for (let t2 = 0; t2 < i; t2++) trail.push((H(x) + t2) % m);
              if (slots[pos] === null) {
                steps.push(DS.mkStep(sc({ q, probe: pos, trail, upTo: q, formula: "h(" + x + ", " + i + ") = " + pos }),
                  "第 " + (i + 1) + " 次探测：h(key, " + i + ") = " + pos + " 是<b>空位</b> → 停止探测，准备写入。" +
                  (i >= 2 ? " ⚠️ 已连续顺延 " + i + " 次——这就是<b>聚集（clustering）</b>：连续占用区越长，新元素越容易被吸进去，探测链越拉越长。" : ""),
                  { stats: st() }));
                slots[pos] = x; ins++;
                steps.push(DS.mkStep(sc({ write: pos, trail, q, upTo: q }), "<b style='color:#34d399'>写入完成</b>：slot[" + pos + "] = " + x + "，本次共探测 " + (i + 1) + " 次。", { stats: st() }));
                break;
              }
              steps.push(DS.mkStep(sc({ q, probe: pos, trail, upTo: q, formula: "h(" + x + ", " + i + ") = " + pos }),
                "第 " + (i + 1) + " 次探测：位置 " + pos + " 已被 <b style='color:#f87171'>" + slots[pos] + "</b> 占用 → i++ 继续向后顺延（走到表尾回绕到 0）。", { stats: st() }));
              i++;
              if (i > m) { steps.push(DS.mkStep(sc({}), "⚠️ 整张表都探测过一遍仍然全满——表已满，无法再插入。", { stats: st() })); break; }
            }
            if (i > m) break;
          }
          steps.push(DS.mkStep(sc({}), "🏁 全部插入完成，共探测 " + tot + " 次。线性探测实现简单、缓存友好，但存在<b>一次聚集</b>缺陷；常用改进：二次探测、双散列。", { stats: st() }));
          return { steps };
        }
      }
    ],

    /* ================= C 代码示例 ================= */
    cPresets: [
      {
        id: "hash-open",
        name: "哈希表：开放定址插入+查找",
        mode: "array",
        code: `/* 哈希表（开放定址·线性探测）
   数组 hash[] 直接当桶: -1 表示空位 */
int main(){
  int hash[7];
  int i;
  for(i = 0; i < 7; i++) hash[i] = -1;
  int a[5] = {25, 32, 8, 26, 39};
  int k;
  for(k = 0; k < 5; k++){
    int pos = a[k] % 7;
    while(hash[pos] != -1){
      pos = (pos + 1) % 7;
    }
    hash[pos] = a[k];
  }
  int target = 39;
  int p = target % 7;
  while(hash[p] != target && hash[p] != -1){
    p = (p + 1) % 7;
  }
  if(hash[p] == target) printf("找到 %d 在下标 %d\\n", target, p);
  else printf("未找到 %d\\n", target);
  return 0;
}`,
        lineNotes: {
          2: "开放定址：元素直接住在数组里，-1 表示空位。",
          4: "hash[7]：一张 7 格的哈希数组，下标就是桶号。",
          6: "先把所有位置清空。",
          9: "逐个插入 a[k]（共 5 个）。",
          10: "h(x) = x % 7：除留余数法求桶号。",
          11: "位置被占？说明冲突——进入探测循环。",
          12: "线性探测：顺延到下一格，(pos+1)%7 保证绕回开头。",
          14: "找到空位，写入元素。",
          18: "查找同样从 h(target) 出发，命中或遇空位即停。",
          21: "命中输出位置，否则输出未找到。"
        }
      },
      {
        id: "bucket-count",
        name: "桶计数法（统计出现次数）",
        mode: "array",
        code: `/* 桶计数法（计数排序思想）
   用 a[i] 自己当桶号: 统计每种数字出现了几次 */
int main(){
  int a[10] = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3};
  int bucket[10];
  int i;
  for(i = 0; i < 10; i++) bucket[i] = 0;
  for(i = 0; i < 10; i++){
    bucket[a[i]]++;
  }
  for(i = 0; i < 10; i++){
    if(bucket[i] > 0){
      printf("数字 %d 出现了 %d 次\\n", i, bucket[i]);
    }
  }
  return 0;
}`,
        lineNotes: {
          2: "核心思想：用「值」当桶号——哈希的另一个妙用。",
          4: "10 个待统计的数字（成绩、票号……）。",
          5: "桶数组：bucket[v] 记录数字 v 出现了几次。",
          7: "先整体清零。",
          9: "a[i] 直接当桶下标访问 → bucket[a[i]]++。",
          11: "从小到大遍历所有可能的桶。",
          12: "只输出真正出现过的数字。",
          13: "逐行输出：数字与出现次数。"
        }
      },
      {
        id: "hash-chaining-c",
        name: "链地址法（拉链）· 插入与查找（C）",
        mode: "memory",
        code: `/* 链地址法：每个桶挂一条链表，冲突元素直接串到链头 */
struct Node {
  int data;
  struct Node* next;
};
int main(){
  struct Node* table[7];
  int i;
  for(i = 0; i < 7; i++) table[i] = NULL;
  int data[8] = {12, 5, 19, 7, 33, 21, 2, 15};
  for(i = 0; i < 8; i++){
    int k = data[i] % 7;
    struct Node* p = malloc(sizeof(struct Node));
    p->data = data[i];
    p->next = table[k];
    table[k] = p;
    printf("插入 %d → 桶 %d\\n", data[i], k);
  }
  int key = 33;
  int k2 = key % 7;
  struct Node* cur = table[k2];
  while(cur != NULL && cur->data != key){
    cur = cur->next;
  }
  if(cur != NULL) printf("找到 %d（桶 %d）\\n", key, k2);
  else printf("没找到 %d\\n", key);
  return 0;
}`,
        lineNotes: {
          6: "table 是「指针数组」：7 个桶，每个桶存一条链的头。",
          8: "初始化：所有桶为空（NULL）。",
          11: "h(x) = x % 7 —— 最简单的除留余数法。",
          12: "为待插入元素申请结点。",
          14: "新结点指向该桶原来的链头。",
          15: "桶头改指新结点（头插，O(1) 插入）。",
          19: "查找：先算桶号。",
          20: "再沿这条链逐个比较。",
          21: "没找到就顺着 next 往后走。"
        }
      }
    ]
  });
})();