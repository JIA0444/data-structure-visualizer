/* ==========================================================
   strings.js — 字符串匹配：朴素算法 / KMP
   ========================================================== */
(function () {
  DS.structures.register({
    id: "strings",
    name: "字符串匹配 KMP",
    emoji: "🧵",
    category: "图与匹配",
    badge: "进阶",
    tags: ["模式匹配", "朴素算法", "KMP", "next数组", "前缀函数"],
    summary: "朴素匹配失配就整体重来 O(n·m)；KMP 用「已匹配部分的最长公共真前后缀」（next 数组）让指针 i 永不回退，O(n+m) 扫完。",

    /* ================= 知识讲解 ================= */
    overview: `
<div class="md">
<h3>🧵 问题定义</h3>
<p>给定<b>文本串 T</b>（长 n）与<b>模式串 P</b>（长 m，通常 m ≪ n），求 P 在 T 中<b>第一次出现的位置</b>。它是 Ctrl+F、编辑器补全、DNA 比对背后的原语。</p>
<pre><code>T = "ababcabcacbab"  (n = 13)
P = "abcac"          (m = 5)   →  答案：位置 5</code></pre>
<h4>朴素算法及其浪费</h4>
<p>每个起点 s 都让 P 从头比到尾，失配就整体右移一格重来：</p>
<pre><code>for(s = 0; s &lt;= n - m; s++){
    j = 0;
    while(j &lt; m &amp;&amp; T[s+j] == P[j]) j++;
    if(j == m) return s;   /* 命中 */
}</code></pre>
<p>最坏 <b>O(n·m)</b>：T = "aaaaa…a"、P = "aaaab" 时每次都只差最后一格失败，前面辛苦比对的成果全部作废——<b>失配后回退太多</b>。</p>
<table>
<tr><th>失配之后</th><th>朴素算法</th><th>KMP</th></tr>
<tr><td>文本指针 i</td><td>回退到 s+1</td><td><b>原地不动，永不回退</b></td></tr>
<tr><td>模式指针 j</td><td>归 0 重来</td><td>跳到 next[j]（有依据地跳）</td></tr>
<tr><td>时间复杂度</td><td>O(n·m)</td><td>O(n + m)</td></tr>
</table>
</div>
<div class="md">
<h3>💡 KMP 核心思想：失配 = 已知情报</h3>
<p>匹配到 T[i] ≠ P[j] 时，<b>P[0..j-1] 已经与 T[i-j..i-1] 完全相等</b>——这是刚付过「比较学费」换来的情报。朴素算法把它扔了，KMP 把它用起来：</p>
<ol>
<li>算出已匹配串 P[0..j-1] 的<b>最长公共真前后缀</b>长度 k（即 next[j]）；</li>
<li>既然后缀 P[j-k..j-1] 等于前缀 P[0..k-1]，而整个 P[0..j-1] 又贴着 T，那么 P 可以<b>整体右移 j − k 格</b>，前 k 个字符<b>不用重比</b>；</li>
<li>等价操作：<b>i 原地不动，j 跳到 next[j]</b>。</li>
</ol>
<pre><code>匹配到 i=6 时失配（正在比 P[4]='c'）：
T: a b a b c a b c a c ...
P: a b c a c          已匹配 "abca"，
      ↑ ↑           其最长公共真前后缀是 "a"（长 1）
i 不动，j: 4 → next[4] = 1，P 相对右移 3 格 —— 前缀 "a" 无需重比</code></pre>
<div class="callout">🚀 一句话：<b>失配时把「已匹配部分」整段平移，让它的前缀对准它的后缀</b>——这就是 next 数组的含义。</div>
</div>
<div class="md">
<h3>📏 前缀函数与 next 数组（长度定义）</h3>
<p><b>真前缀</b>：去掉最后一个字符的前缀；<b>真后缀</b>：去掉第一个字符的后缀。<br><b>next[j]</b> = 串 P[0..j-1] 的<b>最长公共真前后缀</b>的长度；规定 <b>next[0] = 0</b>（空串无前后缀）。</p>
<h4>手算 P = "abcac"</h4>
<table>
<tr><th>j</th><th>P[0..j-1]</th><th>公共真前后缀</th><th>next[j]</th></tr>
<tr><td>0</td><td>ε（空串）</td><td>—</td><td>0</td></tr>
<tr><td>1</td><td>"a"</td><td>无</td><td>0</td></tr>
<tr><td>2</td><td>"ab"</td><td>无</td><td>0</td></tr>
<tr><td>3</td><td>"abc"</td><td>无</td><td>0</td></tr>
<tr><td>4</td><td>"abca"</td><td>"a"</td><td>1</td></tr>
</table>
<p>于是 next = [0, 0, 0, 0, 1]。再练一个：P = "aaaab" → next = [0, 0, 1, 2, 3]（"a"→"aa"→"aaa" 依次加长）。</p>
</div>
<div class="md">
<h3>🔁 递推构建：P 与自己匹配</h3>
<p>next 用「自匹配」一次线扫求出——把 P 想象成挪到自己头上去找「哪个前缀长得像哪个后缀」：</p>
<pre><code>void getNext(char P[], int m, int next[]){
    next[0] = 0;            /* 空串 */
    int i, k;
    if(m &gt; 1) next[1] = 0;  /* 单字符无真前后缀 */
    i = 2;
    k = 0;
    while(i &lt; m){
        if(P[i-1] == P[k]){ /* 后缀还能长一位 */
            k++;
            next[i] = k;
            i++;
        }else if(k &gt; 0){   /* 退到更短候选 */
            k = next[k];
        }else{              /* 没有公共前后缀 */
            next[i] = 0;
            i++;
        }
    }
}</code></pre>
<h4>为什么 KMP 是线性 O(n + m)（摊还分析）</h4>
<p>匹配循环每轮要么 <b>i++</b>（全程至多 n 次），要么 <b>j 沿 next 回退</b>——而 j 的回退总量不会超过 i 的前进总量（每次回退都对应此前的一次前进）。总步数 ≤ 2n；求 next 同理 ≤ 2m。整个算法 <b>O(n + m)</b>，对比朴素的 O(n·m)，数据越大差距越悬殊。</p>
</div>
<div class="md">
<h3>🌍 应用与易错点</h3>
<ul>
<li>C 库 <code>strstr</code>、几乎所有编辑器 / IDE 的搜索框、正则引擎的回溯优化；</li>
<li>DNA / RNA 序列比对、入侵检测与网络包匹配；</li>
<li>任何「在一大段数据里找一个小片段」的场景。</li>
</ul>
<div class="callout err">⚠️ <b>两种 next 定义，混用必死</b>：教材 A 定义 <code>next[0] = -1</code>（跳转即 <code>j = next[j]</code>）；本页采用教材 B（长度式）：<code>next[0] = 0</code>、next[j] = P[0..j-1] 的前后缀长度、失配写 <code>j = next[j]</code>。两者数值相差 1，公式不能串用。</div>
<div class="callout warn">⚠️ 另外两个高频坑：① next[j] 描述的是 <b>P[0..j-1]</b>（不含 P[j] 本身），手算时别把当前字符也算进前后缀；② 匹配循环里若出现了 <code>i--</code>，那一定是把 KMP 写回了朴素算法。</div>
</div>`,

    complexity: [
      { op: "朴素匹配", 平均: "O(n·m)", 最坏: "O(n·m)", 空间: "O(1)", 稳定性: "—", 说明: "最坏如 T=aaaa…a、P=aaaab" },
      { op: "KMP 求 next", 平均: "O(m)", 最坏: "O(m)", 空间: "O(m)", 稳定性: "—", 说明: "自匹配，一次线扫" },
      { op: "KMP 匹配", 平均: "O(n+m)", 最坏: "O(n+m)", 空间: "O(m)", 稳定性: "—", 说明: "i 不回退，摊还线性" }
    ],

    /* ================= 动手演示 ================= */
    demos: [
      {
        id: "naive",
        name: "朴素匹配",
        desc: "P 每次右移一格对齐 T，从头逐个比较：相等继续（绿）、失配放弃（红）。观察有多少已比较的工作被白白丢弃。",
        inputs: [
          { key: "T", label: "文本串 T（≤18 个字母）", type: "text", def: "ababcabcacbab", desc: "被搜索的长串，只含英文字母。" },
          { key: "P", label: "模式串 P（≤6 个字母）", type: "text", def: "abcac", desc: "要找的模式串。" }
        ],
        what: "换文本与模式：观察朴素匹配如何反复回退重比，体会它的浪费。",
        samples: [
          { label: "经典示例", values: { T: "ababcabcacbab", P: "abcac" } },
          { label: "最坏情况（大量回退）", values: { T: "aaaaab", P: "aaab" } },
          { label: "匹配在开头", values: { T: "abcacdefg", P: "abcac" } },
          { label: "完全找不到", values: { T: "abcdef", P: "xyz" } }
        ],
        tips: [
          "用 T=aaaaab、P=aaab：失配后大量重比，这就是朴素的 O(n·m) 最坏情况。",
          "数 i 指针：失配后 i 会大幅回退；下一个演示的 KMP 中 i 永不回退。"
        ],
        build(inp) {
          let T = String(inp.T || "").replace(/[^a-zA-Z]/g, "");
          if (!T) T = "ababcabcacbab";
          T = T.slice(0, 18);
          let P = String(inp.P || "").replace(/[^a-zA-Z]/g, "");
          if (!P) P = "abcac";
          P = P.slice(0, 6);
          const n = T.length, m2 = P.length;
          const steps = [];
          const cw = Math.min(46, Math.floor(940 / Math.max(n, 1)));
          const gX = i => -(n * cw) / 2 + i * cw;
          const tX = i => gX(i);

          const sc = o => {
            o = o || {};
            const elems = [];
            for (let i2 = 0; i2 < n; i2++) {
              const cmpT = o.cmpT === i2;
              const inWin = o.found && i2 >= o.s && i2 < o.s + m2;
              let fill, stroke, act = false;
              if (inWin) { fill = "rgba(52,211,153,0.32)"; stroke = "#34d399"; act = true; }
              else if (cmpT) { fill = (o.eq ? "rgba(52,211,153,0.30)" : "rgba(248,113,113,0.30)"); stroke = o.eq ? "#34d399" : "#f87171"; act = true; }
              elems.push({ t: "cell", key: "tc" + i2, x: tX(i2), y: -94, w: cw - 4, h: 38, text: T[i2], index: String(i2), fill, stroke, active: act });
            }
            for (let j2 = 0; j2 < m2; j2++) {
              const cmpP = o.j === j2;
              let fill, stroke, act2 = false;
              if (o.found) { fill = "rgba(52,211,153,0.35)"; stroke = "#34d399"; act2 = true; }
              else if (cmpP) { fill = (o.eq ? "rgba(52,211,153,0.30)" : "rgba(248,113,113,0.30)"); stroke = o.eq ? "#34d399" : "#f87171"; act2 = true; }
              elems.push({ t: "cell", key: "pc" + j2, x: gX((o.s || 0) + j2), y: -8, w: cw - 4, h: 36, text: P[j2], fill, stroke, active: act2 });
            }
            if (o.i !== undefined && !o.found) elems.push(DS.stepLib.label(tX(o.i), -56, "i=" + o.i, { key: "li", color: "#61d3a7", size: 14, bold: true, mono: true }));
            if (o.j !== undefined && !o.found) elems.push(DS.stepLib.label(gX((o.s || 0) + o.j), 28, "j=" + o.j, { key: "lj", color: "#61d3a7", size: 14, bold: true, mono: true }));
            elems.push({ t: "text", key: "cap", x: 0, y: -132, text: "朴素匹配 · 起点 s 逐个尝试，失配就整体右移一位", size: 14, color: "#8f9cbf", bold: true });
            elems.push({ t: "text", key: "hint", x: 0, y: 72, text: "最坏 O(n·m)：T = aaaaa…a, P = aaaab 时每次都白比一大半", size: 12, color: "#8f9cbf" });
            return { elements: elems };
          };

          let cmp = 0;
          const st = extra => Object.assign({ 比较次数: cmp }, extra || {});
          steps.push(DS.mkStep(sc({}), "目标：找 P 在 T 中<b>第一次出现</b>的位置。朴素算法：起点 s = 0, 1, 2, … 逐个尝试。", { stats: st() }));

          if (m2 > n) {
            steps.push(DS.mkStep(sc({}), "⚠️ P 比 T 还长，不可能匹配成功。", { stats: st() }));
          } else {
            let foundAt = -1;
            for (let s = 0; s <= n - m2; s++) {
              if (steps.length >= 58) {
                steps.push(DS.mkStep(sc({ s, i: s, j: 0 }), "其余起点不再演示（已接近步数上限）。", { stats: st() }));
                break;
              }
              steps.push(DS.mkStep(sc({ s, i: s, j: 0 }), "第 " + (s + 1) + " 次尝试：P 对齐 T 的位置 " + s + "（起点 i=" + s + "），j 归 0 从头比较。", { stats: st() }));
              let j = 0;
              for (j = 0; j < m2; j++) {
                cmp++;
                const eq = T[s + j] === P[j];
                steps.push(DS.mkStep(sc({ s, i: s + j, j, cmpT: s + j, eq }),
                  "比较 T[" + (s + j) + "]='" + T[s + j] + "' 与 P[" + j + "]='" + P[j] + "'：" +
                  (eq ? "<b style='color:#34d399'>相等 ✓ 继续比下一个</b>" : "<b style='color:#f87171'>失配 ✗ 放弃本次尝试</b>") +
                  "（i=" + (s + j) + ", j=" + j + "）。",
                  { stats: st() }));
                if (!eq) break;
              }
              if (j === m2) {
                foundAt = s;
                steps.push(DS.mkStep(sc({ s, found: true }), "P 的 " + m2 + " 个字符<b>全部匹配</b>：<b style='color:#34d399'>在位置 " + s + " 找到 P！</b>", { stats: st() }));
                break;
              }
            }
            if (foundAt !== -1) {
              steps.push(DS.mkStep(sc({ s: foundAt, found: true }), "🏁 朴素匹配结束：共比较 " + cmp + " 次。最坏情况 O(n·m)，失配前比对的字符全部浪费——这正是 KMP 要解决的。", { stats: st() }));
            } else {
              steps.push(DS.mkStep(sc({}), "🏁 尝试了全部 " + (n - m2 + 1) + " 个起点，均未完全匹配。共比较 " + cmp + " 次。", { stats: st() }));
            }
          }
          return { steps };
        }
      },
      {
        id: "kmp",
        name: "KMP 算法",
        desc: "阶段①：P 与自己匹配，递推求出 next 数组；阶段②：用 next 指导匹配——i 只前进不回退，失配时 j 沿虚线弧线跳到 next[j]。",
        inputs: [
          { key: "T", label: "文本串 T（≤18 个字母）", type: "text", def: "ababcabcacbab", desc: "被搜索的长串。" },
          { key: "P", label: "模式串 P（≤6 个字母）", type: "text", def: "abcac", desc: "要找的模式串；KMP 会先为它构建 next 数组。" }
        ],
        what: "任意文本与模式：先看 next 数组如何自匹配求出，再看匹配时 i 如何一路不回退。",
        samples: [
          { label: "经典示例", values: { T: "ababcabcacbab", P: "abcac" } },
          { label: "有重叠前后缀", values: { T: "ababababac", P: "ababac" } },
          { label: "最坏情况（对比朴素）", values: { T: "aaaaab", P: "aaab" } },
          { label: "找不到的情况", values: { T: "abcdef", P: "xyz" } }
        ],
        tips: [
          "关注阶段①：P 往自己头上挪动找「公共前后缀」，next 数组就是这么来的。",
          "匹配阶段盯住 i：它一直前进从不回退，失配只改 j = next[j]。",
          "用 T=aaaaab、P=aaab 对比上一个朴素演示：同样数据，KMP 步数明显更少。"
        ],
        build(inp) {
          let T = String(inp.T || "").replace(/[^a-zA-Z]/g, "");
          if (!T) T = "ababcabcacbab";
          T = T.slice(0, 18);
          let P = String(inp.P || "").replace(/[^a-zA-Z]/g, "");
          if (!P) P = "abcac";
          P = P.slice(0, 6);
          const n = T.length, m2 = P.length;
          const steps = [];
          const cw = Math.min(44, Math.floor(940 / Math.max(n, 1)));
          const cwP = 48;
          const gX = i => -(n * cw) / 2 + i * cw;
          const tX = id => gX(id);
          const pAX = j2 => -(m2 * cwP) / 2 + j2 * cwP;

          // 自己先算一遍 next（用于展示与阶段②推进）
          // 长度定义：next[j] = P[0..j-1] 的最长公共真前后缀长度，next[0]=0
          const next = new Array(m2).fill(0);
          if (m2 > 1) next[1] = 0; // 单字符没有真前后缀
          let ci = 2, ck = 0;
          while (ci < m2) {
            if (P[ci - 1] === P[ck]) { ck++; next[ci] = ck; ci++; }
            else if (ck > 0) ck = next[ck];
            else { next[ci] = 0; ci++; }
          }
          let ncd = Math.min(m2, 2); // 已算出的 next 个数

          /* ---------- 阶段① 场景：构建 next ---------- */
          const scA = o => {
            o = o || {};
            const elems = [];
            for (let j2 = 0; j2 < m2; j2++) {
              const inCmpJ = o.cmpJ === j2;
              const inCmpK = o.cmpK === j2;
              let fill, stroke, act = false;
              if ((inCmpJ || inCmpK) && o.eq2) { fill = "rgba(52,211,153,0.30)"; stroke = "#34d399"; act = true; }
              else if (inCmpJ || inCmpK) { fill = "rgba(248,113,113,0.30)"; stroke = "#f87171"; act = true; }
              elems.push({ t: "cell", key: "pc" + j2, x: pAX(j2), y: -110, w: cwP - 6, h: 40, text: P[j2], index: String(j2), fill, stroke, active: act });
            }
            for (let j2 = 0; j2 < m2; j2++) {
              const val = j2 < ncd;
              const just = o.newNc === j2;
              elems.push({
                t: "cell", key: "nc" + j2, x: pAX(j2), y: 50, w: cwP - 8, h: 32,
                text: val ? String(next[j2]) : "·",
                fill: just ? "rgba(251,191,36,0.30)" : (val ? "rgba(52,211,153,0.18)" : "rgba(91,140,255,0.05)"),
                stroke: just ? "#fbbf24" : (val ? "#34d399" : "#2c3a5e"),
                active: just, radius: 6
              });
            }
            if (o.fbkFrom !== undefined) {
              elems.push({ t: "edge", key: "fbk", from: "pc" + o.fbkFrom, to: "pc" + o.fbkTo, color: "#fbbf24", style: "dashed", curve: 0.35, text: "k = next[k-1]", arrow: true });
            }
            if (!o.doneA) {
              elems.push(DS.stepLib.label(pAX(o.a), -54, "i-1=" + o.a, { key: "lja", color: "#fbbf24", size: 14, bold: true, mono: true }));
              elems.push(DS.stepLib.label(pAX(o.k), -24, "k=" + o.k, { key: "lka", color: "#34d399", size: 14, bold: true, mono: true }));
            }
            elems.push({ t: "text", key: "cap", x: 0, y: -152, text: "阶段 1/2 · 自匹配求 next：P 挪到自己头上找公共前后缀", size: 14, color: "#8f9cbf", bold: true });
            elems.push({ t: "text", key: "hint", x: 0, y: 100, text: "next 定义（长度版）：next[0] = 0，next[j] = P[0..j-1] 的最长公共真前后缀长度", size: 12, color: "#8f9cbf" });
            return { elements: elems };
          };
          const stA = (jj, kk) => ({ i: jj, k: kk });

          /* ---------- 阶段② 场景：匹配 ---------- */
          const scB = o => {
            o = o || {};
            const elems = [];
            const s = o.s || 0, jn = o.j || 0;
            for (let i2 = 0; i2 < n; i2++) {
              const cmpT = o.cmpT === i2;
              const inWin = i2 >= s && i2 < s + m2;
              const matchedBefore = !o.found && o.cmpT !== undefined && inWin && i2 < o.cmpT;
              const suffixSeg = o.jumpF !== undefined && o.cmpT !== undefined && i2 >= s && i2 < o.cmpT;
              let fill, stroke, act = false;
              if (o.found && inWin) { fill = "rgba(52,211,153,0.32)"; stroke = "#34d399"; act = true; }
              else if (cmpT && o.eq) { fill = "rgba(52,211,153,0.30)"; stroke = "#34d399"; act = true; }
              else if (cmpT && o.pending) { fill = "rgba(251,191,36,0.30)"; stroke = "#fbbf24"; act = true; }
              else if (cmpT) { fill = "rgba(248,113,113,0.30)"; stroke = "#f87171"; act = true; }
              else if (suffixSeg) { fill = "rgba(251,191,36,0.15)"; stroke = "#fbbf24"; }
              else if (matchedBefore) { fill = "rgba(52,211,153,0.16)"; stroke = "#34d399"; }
              elems.push({ t: "cell", key: "tc" + i2, x: tX(i2), y: -92, w: cw - 4, h: 38, text: T[i2], index: String(i2), fill, stroke, active: act });
            }
            for (let pj = 0; pj < m2; pj++) {
              const cmpP = pj === jn;
              const before = pj < jn;
              let fill, stroke, act2 = false;
              if (o.found) { fill = "rgba(52,211,153,0.35)"; stroke = "#34d399"; act2 = true; }
              else if (cmpP && o.eq) { fill = "rgba(52,211,153,0.30)"; stroke = "#34d399"; act2 = true; }
              else if (cmpP && o.pending) { fill = "rgba(251,191,36,0.30)"; stroke = "#fbbf24"; act2 = true; }
              else if (cmpP) { fill = "rgba(248,113,113,0.30)"; stroke = "#f87171"; act2 = true; }
              else if (before) { fill = "rgba(52,211,153,0.16)"; stroke = "#34d399"; }
              elems.push({ t: "cell", key: "pc" + pj, x: tX(s + pj), y: -6, w: cw - 4, h: 36, text: P[pj], fill, stroke, active: act2 });
            }
            for (let j2 = 0; j2 < m2; j2++) {
              const cur = j2 === jn && !o.found;
              elems.push({
                t: "cell", key: "nc" + j2, x: tX(j2), y: 58, w: cw - 8, h: 28,
                text: String(next[j2]),
                fill: cur ? "rgba(251,191,36,0.28)" : "rgba(52,211,153,0.14)",
                stroke: cur ? "#fbbf24" : "#34d399",
                active: cur, radius: 6
              });
            }
            if (o.jumpF !== undefined) {
              elems.push({ t: "edge", key: "jp", from: "pc" + o.jumpF, to: "pc" + o.jumpT, color: "#fbbf24", style: "dashed", curve: 0.4, text: "next[" + o.jumpF + "]=" + o.jumpT, arrow: true });
            }
            if (o.showI) elems.push(DS.stepLib.label(tX(o.i), -54, "i=" + o.i, { key: "li", color: "#61d3a7", size: 14, bold: true, mono: true }));
            if (o.showJ) elems.push(DS.stepLib.label(tX(s + jn), 26, "j=" + jn, { key: "lj", color: "#61d3a7", size: 14, bold: true, mono: true }));
            elems.push({ t: "text", key: "cap", x: 0, y: -130, text: "阶段 2/2 · KMP 匹配：i 只前进不回退", size: 14, color: "#8f9cbf", bold: true });
            elems.push({ t: "text", key: "hint", x: 0, y: 92, text: "失配时 j = next[j]（虚线弧线），已匹配前缀按 next 平移复用", size: 12, color: "#8f9cbf" });
            return { elements: elems };
          };

          /* ===== 阶段①：构建 next ===== */
          ci = 2; ck = 0;
          if (m2 < 2) {
            steps.push(DS.mkStep(scA({ a: 0, k: 0, doneA: true, newNc: 0 }), "P 只有 1 个字符：空串无前后缀，<b>next = [0]</b>，无需计算。", { stats: stA(0, 0) }));
          } else {
            steps.push(DS.mkStep(scA({ a: 1, k: 0, newNc: 1 }),
              "阶段 1/2：<b>自匹配求 next 数组</b>（长度定义）。初始值：<b>next[0] = 0</b>（空串）与 <b>next[1] = 0</b>（单字符无真前后缀）。从 next[2] 起，把 P[i-1] 与 P[k] 对齐比较。",
              { stats: stA(2, 0) }));
            while (ci < m2) {
              if (P[ci - 1] === P[ck]) {
                const nk = ck + 1;
                steps.push(DS.mkStep(scA({ a: ci - 1, k: ck, cmpJ: ci - 1, cmpK: ck, eq2: true }),
                  "比较 P[" + (ci - 1) + "]='" + P[ci - 1] + "' 与 P[" + ck + "]='" + P[ck] + "'：<b style='color:#34d399'>相等</b> → 公共前后缀延长一位 (i=" + ci + ", k=" + ck + ")。",
                  { stats: stA(ci, ck) }));
                ck = nk; next[ci] = nk; ncd++;
                const doneI = ci; ci++;
                steps.push(DS.mkStep(scA({ a: ci - 1, k: ck, newNc: doneI }),
                  "写 <b style='color:#fbbf24'>next[" + doneI + "] = " + nk + "</b>：P[0.." + (doneI - 1) + "] 的最长公共真前后缀长度为 " + nk + "。i 前进到 " + ci + " (i=" + ci + ", k=" + ck + ")。",
                  { stats: stA(ci, ck) }));
              } else if (ck > 0) {
                steps.push(DS.mkStep(scA({ a: ci - 1, k: ck, cmpJ: ci - 1, cmpK: ck }),
                  "比较 P[" + (ci - 1) + "]='" + P[ci - 1] + "' 与 P[" + ck + "]='" + P[ck] + "'：<b style='color:#f87171'>失配</b>，且 k &gt; 0 (i=" + ci + ", k=" + ck + ")。",
                  { stats: stA(ci, ck) }));
                const kn = next[ck];
                steps.push(DS.mkStep(scA({ a: ci - 1, k: kn, fbkFrom: ck, fbkTo: kn }),
                  "k 沿 next 回退：<b>k = next[k] = next[" + ck + "] = " + kn + "</b>（虚线弧线），试探更短的候选前缀；i 原地不动，回到循环头重新比较 (i=" + ci + ", k=" + kn + ")。",
                  { stats: stA(ci, kn) }));
                ck = kn;
              } else {
                steps.push(DS.mkStep(scA({ a: ci - 1, k: 0, cmpJ: ci - 1, cmpK: 0, newNc: ci }),
                  "比较 P[" + (ci - 1) + "]='" + P[ci - 1] + "' 与 P[0]='" + P[0] + "'：失配，且 k = 0 → 没有公共前后缀，写 <b style='color:#fbbf24'>next[" + ci + "] = 0</b> (i=" + ci + ", k=0)。",
                  { stats: stA(ci, 0) }));
                next[ci] = 0; ncd++; ci++;
              }
            }
            steps.push(DS.mkStep(scA({ doneA: true, a: ci - 1, k: ck, newNc: m2 - 1 }),
              "🎉 next 构建完成：<b>next = [" + next.join(", ") + "]</b>。含义：next[j] = P[0..j-1] 的最长公共真前后缀长度；匹配失配在 P[j] 时用 <code>j = next[j]</code> 平移。",
              { stats: stA(ci, ck) }));
          }
          steps.push(DS.mkStep(scB({ i: 0, j: 0, s: 0, showI: true, showJ: true }),
            "阶段 2/2：<b>开始匹配</b>。i 扫描 T、j 指向 P 的待比较位置，起始 (i=0, j=0)。",
            { stats: { i: 0, j: 0, 比较次数: 0 } }));

          /* ===== 阶段②：匹配 ===== */
          let i = 0, j = 0, cmp2 = 0, foundAt = -1;
          const stB = (ii, jj) => ({ "i": ii, "j": jj, 比较次数: cmp2 });
          for (;;) {
            if (steps.length >= 76) {
              steps.push(DS.mkStep(scB({ i, j, s: i - j, showI: true, showJ: true }), "其余步骤不再演示（已接近步数上限）。", { stats: stB(i, j) }));
              break;
            }
            if (i >= n) break;
            if (j >= m2) break;
            if (T[i] === P[j]) {
              cmp2++;
              const oi = i, oj = j;
              i++; j++;
              if (j === m2) {
                steps.push(DS.mkStep(scB({ i, j, s: i - j, cmpT: oi, eq: true, showI: true, showJ: true }),
                  "比较 T[" + oi + "]='" + T[oi] + "' 与 P[" + oj + "]='" + P[oj] + "'：相等，i++、j++ 后 <b>j == m</b> → <b style='color:#34d399'>P 在位置 " + (oi - (m2 - 1)) + " 匹配成功！</b> (i=" + i + ", j=" + j + ")。",
                  { stats: stB(i, j) }));
                foundAt = oi - (m2 - 1);
                break;
              }
              steps.push(DS.mkStep(scB({ i, j, s: i - j, cmpT: oi, eq: true, showI: true, showJ: true }),
                "比较 T[" + oi + "]='" + T[oi] + "' 与 P[" + oj + "]='" + P[oj] + "'：<b style='color:#34d399'>相等 ✓</b> i++、j++ (i=" + i + ", j=" + j + ")。",
                { stats: stB(i, j) }));
            } else {
              cmp2++;
              steps.push(DS.mkStep(scB({ i, j, s: i - j, cmpT: i, eq: false, showI: true, showJ: true }),
                "比较 T[" + i + "]='" + T[i] + "' 与 P[" + j + "]='" + P[j] + "'：<b style='color:#f87171'>失配 ✗</b> (i=" + i + ", j=" + j + ")。",
                { stats: stB(i, j) }));
              if (j > 0) {
                const jn = next[j];
                steps.push(DS.mkStep(scB({ i, j: jn, s: i - jn, cmpT: i, pending: true, jumpF: j, jumpT: jn, showI: true, showJ: true }),
                  "已匹配段是 P[0.." + (j - 1) + "]（绿色），其最长公共真前后缀长 <b>next[" + j + "] = " + jn + "</b> → <b>j 从 " + j + " 跳到 " + jn + "</b>（虚线弧线），<b>i 停在 " + i + " 不回退</b>；黄色段（后缀）与前缀重合，已匹配的 " + jn + " 个字符<b>无需重比</b> (i=" + i + ", j=" + jn + ")。",
                  { stats: stB(i, jn) }));
                j = jn;
              } else {
                const ni = i + 1;
                steps.push(DS.mkStep(scB({ i, j: 0, s: i, cmpT: i, eq: false, showI: true, showJ: true }),
                  "j = 0 仍失配：说明 T[" + i + "] ≠ P[0]，连第一个字符都不同，只能 <b>i++</b> 前进 (i=" + ni + ", j=0)。",
                  { stats: stB(ni, 0) }));
                i = ni;
              }
            }
          }
          if (foundAt !== -1) {
            steps.push(DS.mkStep(scB({ i: foundAt + m2, j: m2, s: foundAt, found: true }),
              "🏁 命中位置 " + foundAt + "。全程 i 一次都没回退：共比较 " + cmp2 + " 次，复杂度 O(n + m)，而朴素算法最坏 O(n·m)。",
              { stats: { "i": foundAt + m2, "j": m2, 比较次数: cmp2 } }));
          } else {
            steps.push(DS.mkStep(scB({ i, j, s: Math.max(0, i - j), showI: true, showJ: true }),
              "🏁 扫描完毕：P 未在 T 中出现。注意整个过程中 i 从未回退（这是 O(n+m) 的来源）。共比较 " + cmp2 + " 次。",
              { stats: stB(i, j) }));
          }
          return { steps };
        }
      }
    ],

    /* ================= C 代码示例 ================= */
    cPresets: [
      {
        id: "naive-c",
        name: "朴素匹配（C）",
        mode: "array",
        code: `/* 朴素模式匹配: 在 T 中找 P 第一次出现的位置
   每个起点 i 都让 P 从头比一遍 T[i+j] 与 P[j] */
int main(){
  char T[13] = {'a','b','a','b','c','a','b','c','a','c','b','a','b'};
  char P[5] = {'a','b','c','a','c'};
  int i, j;
  int pos = -1;
  for(i = 0; i <= 8; i++){
    j = 0;
    while(j < 5 && T[i + j] == P[j]){
      j++;
    }
    if(j == 5){
      pos = i;
      break;
    }
  }
  if(pos != -1) printf("位置 %d 匹配成功\\n", pos);
  else printf("未找到\\n");
  return 0;
}`,
        lineNotes: {
          2: "目标：报告 P 在 T 中第一次出现的位置。",
          4: "文本串 T，共 13 个字符。",
          5: "模式串 P，共 5 个字符。",
          7: "pos = -1：先假设没找到。",
          8: "起点 i 从 0 试到 n-m=8（最后一个可能起点）。",
          10: "逐字符比较 T[i+j] 与 P[j]：相等继续，否则放弃。",
          13: "j 能走到 5 —— 说明 5 个字符全对上。",
          15: "找到就 break，结束所有尝试。",
          18: "输出结果：默认数据应在位置 5 匹配成功。"
        }
      },
      {
        id: "kmp-c",
        name: "KMP（C，next 数组）",
        mode: "array",
        code: `/* KMP：next 采用长度定义 next[0] = 0
   next[j] = P[0..j-1] 的最长公共真前后缀长度 */
void getNext(char P[], int m, int next[]){
  next[0] = 0;
  int i, k;
  if(m > 1) next[1] = 0;
  i = 2;
  k = 0;
  while(i < m){
    if(P[i - 1] == P[k]){
      k = k + 1;
      next[i] = k;
      i = i + 1;
    }else if(k > 0){
      k = next[k];
    }else{
      next[i] = 0;
      i = i + 1;
    }
  }
}
int kmp(char T[], int n, char P[], int m, int next[]){
  int i = 0, j = 0;
  while(i < n){
    if(T[i] == P[j]){
      i = i + 1;
      j = j + 1;
      if(j == m) return i - m;
    }else if(j > 0){
      j = next[j];
    }else{
      i = i + 1;
    }
  }
  return -1;
}
int main(){
  char T[13] = {'a','b','a','b','c','a','b','c','a','c','b','a','b'};
  char P[6] = {'a','b','c','a','c'};
  int next[6];
  getNext(P, 5, next);
  int k;
  for(k = 0; k < 5; k++) printf("%d ", next[k]);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          1: "KMP 拆两步：先求 next，再做匹配。",
          4: "长度定义：next[0] 恒为 0（空串）。",
          6: "next[1] = 0：单字符没有真前后缀，作为递推起点。",
          9: "i 从 2 扫到 m-1，逐个求出 next[i]。",
          10: "P[i-1] 与 P[k] 相等：公共前后缀延长一位。",
          12: "next[i] = k：P[0..i-1] 的最长公共真前后缀长度。",
          15: "失配且 k > 0：k 跳到 next[k]，试探更短的后缀。",
          17: "k 已退到 0：next[i] = 0。",
          24: "匹配主循环：i 每轮要么前进、要么 j 回退，总计 O(n+m)。",
          28: "j == m：整个 P 匹配完成，返回起点 i-m。",
          30: "失配：j 跳到 next[j]，i 原地不动 —— KMP 的精髓。",
          32: "j == 0 仍失配：T[i] 与 P[0] 都不同，只能前进 i。",
          43: "输出 next：默认 P=\"abcac\" 得到 0 0 0 0 1。"
        }
      }
    ]
  });
})();