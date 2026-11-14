/* ==========================================================
   searching.js — 查找：顺序查找 / 二分查找
   ========================================================== */
(function () {
  DS.structures.register({
    id: "searching",
    name: "查找算法",
    emoji: "🔍",
    category: "查找与排序",
    badge: "必会",
    tags: ["顺序查找", "二分查找", "折半"],
    summary: "顺序查找挨个比，二分查找折半搜。有序 + 随机访问 = 二分查找 O(log n) 的神器。",

    overview: `
<div class="md"><h3>🔍 查找问题</h3>
<p>给定集合与目标值 target，回答「target 在不在？在哪个位置？」，这是程序里最高频的操作之一。</p>
<table>
<tr><th>算法</th><th>前提</th><th>时间复杂度</th><th>平均比较次数</th></tr>
<tr><td>顺序查找</td><td>无</td><td>O(n)</td><td>≈ n/2</td></tr>
<tr><td>二分查找</td><td>有序 + 可随机访问</td><td>O(log n)</td><td>≈ log₂n</td></tr>
</table>
</div>
<div class="md"><h3>🚶 顺序查找（Linear Search）</h3>
<p>从第一个元素开始逐个与 target 比较，直到找到或扫描完。简单可靠，但慢。<br>变体 <b>哨兵法</b>：把 target 临时放到数组末尾，循环里省掉一次「是否越界」的判断（只是常数级优化）。</p>
<pre><code>for(i = 0; i < n; i++)
    if(a[i] == target) return i;   // 命中
return -1;                          // 未命中</code></pre>
</div>
<div class="md"><h3>✂️ 二分查找（Binary Search）</h3>
<p>前提：数组<b>有序</b>。每轮看区间中间元素：</p>
<ul>
<li><code>a[mid] == target</code> → 找到！</li>
<li><code>a[mid] < target</code> → target 只可能在右半 → <code>lo = mid + 1</code></li>
<li><code>a[mid] > target</code> → target 只可能在左半 → <code>hi = mid - 1</code></li>
</ul>
<p>每一轮把查找区间<b>砍掉一半</b>，所以即使 10 亿个元素也只需约 30 次比较。</p>
<div class="callout warn">⚠️ 经典易错：<b>mid 的写法</b>。<code>mid = (lo + hi) / 2</code> 在 C/Java 里当 lo+hi 超过 int 上限会<b>溢出</b>，安全写法是 <code>mid = lo + (hi - lo) / 2</code>。</div>
<div class="callout err">⚠️ 边界习惯：循环条件 <code>lo &lt;= hi</code>、收缩 <code>mid ± 1</code> 必须配套。网上有三种常见写法，不要混用。</div>
<pre><code>int lo = 0, hi = n - 1;
while(lo <= hi){
    int mid = lo + (hi - lo) / 2;
    if(a[mid] == target)      return mid;
    else if(a[mid] < target)  lo = mid + 1;
    else                      hi = mid - 1;
}
return -1;</code></pre>
</div>`,

    complexity: [
      { op: "顺序查找", 平均: "O(n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "需有序或无序均可" },
      { op: "二分查找", 平均: "O(log n)", 最坏: "O(log n)", 空间: "O(1)", 稳定性: "—", 说明: "要求数组有序" },
      { op: "二分查找（递归版）", 平均: "O(log n)", 最坏: "O(log n)", 空间: "O(log n)", 稳定性: "—", 说明: "递归调用栈空间" }
    ],

    demos: [
      {
        id: "seq",
        name: "顺序查找",
        desc: "指针从头到尾逐个扫描，与 target 比较，直到命中或扫完。黄色=当前位置，绿色=已命中。",
        what: "改数组和要查找的值：命中（绿）与未命中（扫到底）两种结局都值得看一遍。",
        inputs: [
          { key: "arr", label: "数组", type: "text", def: "15,2,48,7,33,9,21,5,40", cls: "nums", desc: "任意数字序列，顺序查找不要求有序。" },
          { key: "target", label: "要查找的值", type: "number", def: 33, min: -99, max: 99, desc: "在数组里找这个数（数组里没有它时，会一直扫到最后）。" }
        ],
        samples: [
          { label: "命中（在第 5 位）", values: { arr: "15,2,48,7,33,9,21,5,40", target: 33 } },
          { label: "未命中（扫到底）", values: { arr: "15,2,48,7,33,9,21,5,40", target: 100 } },
          { label: "第一个就是目标", values: { arr: "33,2,48,7,9", target: 33 } }
        ],
        tips: [
          "把 target 改成数组里没有的数：体会最坏情况——比较 n 次才说「没有」。",
          "把目标放到数组第一格（如 33,2,48...）：最好情况 1 次命中。",
          "数一数「比较次数」的变化，理解顺序查找平均 ≈ n/2 的含义。"
        ],
        build(inp) {
          const a = DS.parseNums(inp.arr, [15, 2, 48, 7, 33, 9, 21, 5, 40], 24);
          const target = parseInt(inp.target) || 0;
          const steps = [];
          const sc = (cur, found, done) => {
            const cw = 52, startX = -(a.length * cw) / 2;
            const elems = [];
            for (let i = 0; i < a.length; i++) {
              const isCur = i === cur, isF = !!found && i === found;
              const dim = done && cur !== null && cur >= 0 && i < cur && !isF;
              elems.push({
                t: "cell", key: "c" + i, x: startX + i * cw, y: -24, w: cw - 6, h: 44,
                text: String(a[i]), index: String(i),
                fill: isF ? "rgba(52,211,153,0.32)" : (isCur ? "rgba(251,191,36,0.30)" : (dim ? "rgba(100,120,160,0.08)" : undefined)),
                stroke: isF ? "#34d399" : (isCur ? "#fbbf24" : undefined),
                active: isF || isCur
              });
            }
            if (cur !== null && cur < a.length) {
              elems.push({ t: "text", key: "i", x: startX + cur * cw, y: 48, text: "▲ i = " + cur, size: 13, color: "#fbbf24", bold: true });
            }
            return { elements: elems };
          };
          let cmp = 0, found = -1;
          steps.push(DS.mkStep(sc(-1), "从下标 0 开始扫描，查找 " + target + "。", { stats: { 比较次数: 0 } }));
          for (let i = 0; i < a.length; i++) {
            cmp++;
            if (a[i] === target) {
              found = i;
              steps.push(DS.mkStep(sc(i, i), "第 " + cmp + " 次比较：a[" + i + "] == " + target + "，<b style='color:#34d399'>找到了！</b>", { stats: { 比较次数: cmp, 位置: i } }));
              break;
            }
            steps.push(DS.mkStep(sc(i), "第 " + cmp + " 次比较：a[" + i + "] = " + a[i] + " ≠ " + target + "，继续向后。", { stats: { 比较次数: cmp } }));
          }
          if (found === -1) {
            steps.push(DS.mkStep(sc(-1), "🏁 扫描完毕，没有找到 " + target + "。顺序查找最坏需要 " + a.length + " 次比较。", { stats: { 比较次数: cmp } }));
          } else {
            steps.push(DS.mkStep(sc(found, found, true), "🏁 查找结束，共比较 " + cmp + " 次。", { stats: { 比较次数: cmp, 位置: found } }));
          }
          return { steps };
        }
      },
      {
        id: "binary",
        name: "二分查找",
        desc: "输入数组会自动排序（二分的前提）。观察 lo / mid / hi 三个指针如何每轮砍掉一半区间。红色=lo，黄色=mid，蓝色=hi。",
        what: "改数组和目标值：看区间怎么一轮轮对半收缩；也可以让目标不存在，看 lo、hi 如何最终交叉。",
        inputs: [
          { key: "arr", label: "数组（自动排序）", type: "text", def: "15,2,48,7,33,9,21,5,40", cls: "nums", desc: "随便填乱序数字，生成时自动排序（二分查找的前提）。" },
          { key: "target", label: "要查找的值", type: "number", def: 33, min: -99, max: 99, desc: "要查找的目标：存在则绿色命中；不存在则观察 lo 与 hi 最终交叉。" }
        ],
        samples: [
          { label: "命中中位数", values: { arr: "15,2,48,7,33,9,21,5,40", target: 33 } },
          { label: "未命中（交叉结束）", values: { arr: "15,2,48,7,33,9,21,5,40", target: 50 } },
          { label: "找最小值", values: { arr: "15,2,48,7,33,9,21,5,40", target: 2 } }
        ],
        tips: [
          "把 target 设成数组里没有的数（如 50）：观察最后 lo 越过 hi，区间为空才下「没找到」的结论。",
          "数一下比较次数：10 个数最多约 4 次，完成顺序查找平均要 5 次——数据越大差距越悬殊。",
          "试着用 20 个数字的数组再找一次，比较次数几乎不涨，这就是 O(log n)。"
        ],
        build(inp) {
          const a0 = DS.parseNums(inp.arr, [15, 2, 48, 7, 33, 9, 21, 5, 40], 24);
          const a = a0.slice().sort((x, y) => x - y);
          const target = parseInt(inp.target) || 0;
          const n = a.length;
          const steps = [];
          const sc = (lo, hi, mid, dimL, dimR, foundIdx) => {
            const cw = 52, startX = -(n * cw) / 2;
            const elems = [];
            for (let i = 0; i < n; i++) {
              const inRange = lo !== null && i >= lo && i <= hi;
              const isMid = i === mid, isF = i === foundIdx;
              const isLo = i === lo && i !== mid, isHi = i === hi && i !== mid;
              const dim = lo !== null && !inRange && !isF;
              let fill, stroke, tag = null, tcolor;
              if (isF) { fill = "rgba(52,211,153,0.35)"; stroke = "#34d399"; }
              else if (isMid) { fill = "rgba(251,191,36,0.32)"; stroke = "#fbbf24"; tag = "mid"; tcolor = "#fbbf24"; }
              else if (isLo) { fill = "rgba(248,113,113,0.20)"; stroke = "#f87171"; tag = "lo"; tcolor = "#f87171"; }
              else if (isHi) { fill = "rgba(91,140,255,0.22)"; stroke = "#5b8cff"; tag = "hi"; tcolor = "#5b8cff"; }
              else if (dim) { fill = "rgba(100,120,160,0.07)"; stroke = "#2c3a5e"; }
              elems.push({
                t: "cell", key: "c" + i, x: startX + i * cw, y: -24, w: cw - 6, h: 44,
                text: String(a[i]), index: String(i), fill, stroke, active: !!tag || isF
              });
              if (tag) {
                elems.push({ t: "text", key: "t" + i, x: startX + i * cw, y: -6, text: "▲" + tag, size: 12, color: tcolor, bold: true });
              }
            }
            if (lo !== null && lo <= hi) {
              elems.push({ t: "text", key: "rng", x: 0, y: 58, text: dimL || dimR ? "" : "查找区间 [lo, hi] = [" + lo + ", " + hi + "]", size: 13, color: "#8f9cbf" });
            }
            return { elements: elems };
          };
          const stat = (x) => ({ 比较次数: x, 数组: "已排序" });
          let cmp = 0, lo = 0, hi = n - 1, found = -1;
          steps.push(DS.mkStep(sc(null, null, null), "二分查找要求数组<b>有序</b>（输入已自动排序）。初始区间 [0, " + (n - 1) + "]，查找 " + target + "。", { stats: stat(0) }));
          while (lo <= hi) {
            const mid = lo + ((hi - lo) >> 1);
            steps.push(DS.mkStep(sc(lo, hi, mid), "取中间位置 mid = lo + (hi-lo)/2 = " + mid + "，查看 a[mid] = " + a[mid] + "。", { stats: stat(cmp) }));
            cmp++;
            if (a[mid] === target) {
              found = mid;
              steps.push(DS.mkStep(sc(lo, hi, mid, false, false, mid), "a[mid] == " + target + " ➜ <b style='color:#34d399'>找到！位于下标 " + mid + "</b>", { stats: stat(cmp) }));
              break;
            }
            if (a[mid] < target) {
              steps.push(DS.mkStep(sc(lo, hi, mid, true), "a[mid] = " + a[mid] + " < " + target + " ➜ 目标在右半区，<b>lo = mid + 1 = " + (mid + 1) + "</b>（左半区已排除，变灰）。", { stats: stat(cmp) }));
              lo = mid + 1;
            } else {
              steps.push(DS.mkStep(sc(lo, hi, mid, false, true), "a[mid] = " + a[mid] + " > " + target + " ➜ 目标在左半区，<b>hi = mid - 1 = " + (mid - 1) + "</b>（右半区已排除，变灰）。", { stats: stat(cmp) }));
              hi = mid - 1;
            }
          }
          if (found === -1) {
            steps.push(DS.mkStep(sc(lo, hi, null), "🏁 lo > hi，区间为空 —— <b style='color:#f87171'>未找到</b> " + target + "。二分查找共比较 " + cmp + " 次。", { stats: stat(cmp) }));
          } else {
            steps.push(DS.mkStep(sc(lo, hi, null, false, false, found), "🏁 结束。共比较 " + cmp + " 次（顺序查找平均需要 " + Math.round(n / 2) + " 次）。", { stats: stat(cmp) }));
          }
          return { steps };
        }
      }
    ],

    cPresets: [
      {
        id: "seqc",
        name: "顺序查找（C）",
        mode: "array",
        code: `/* 顺序查找：逐个比较 */
int main(){
  int a[8] = {15, 2, 48, 7, 33, 9, 21, 5};
  int target = 33;
  int i;
  int found = -1;
  for(i = 0; i < 8; i++){
    if(a[i] == target){
      found = i;
      break;
    }
  }
  if(found != -1) printf("找到: a[%d]=%d\\n", found, target);
  else printf("未找到\\n");
  return 0;
}`,
        lineNotes: {
          6: "found = -1 表示还没找到。",
          8: "逐个比较 a[i] 与 target。",
          9: "命中后记录位置并 break 提前结束。"
        }
      },
      {
        id: "binc",
        name: "二分查找（C，循环版）",
        mode: "array",
        code: `/* 二分查找：数组必须有序 */
int main(){
  int a[9] = {1, 3, 5, 9, 17, 25, 33, 41, 60};
  int target = 25;
  int lo = 0, hi = 8;
  int mid;
  while(lo <= hi){
    mid = lo + (hi - lo) / 2;
    if(a[mid] == target) break;
    else if(a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  if(lo <= hi) printf("mid=%d a[mid]=%d\\n", mid, a[mid]);
  else printf("not found\\n");
  return 0;
}`,
        lineNotes: {
          4: "前提：数组已按升序排列。",
          7: "核心循环：lo <= hi 时区间还有元素。",
          8: "防溢出写法 mid = lo + (hi-lo)/2。",
          10: "目标在右半区，收缩左边界。",
          11: "目标在左半区，收缩右边界。"
        }
      },
      {
        id: "binf",
        name: "二分查找（C，递归版）",
        mode: "array",
        code: `/* 递归二分查找：注意调用栈的变化 */
int search(int a[], int lo, int hi, int target){
  if(lo > hi) return -1;
  int mid = lo + (hi - lo) / 2;
  if(a[mid] == target) return mid;
  if(a[mid] < target) return search(a, mid + 1, hi, target);
  return search(a, lo, mid - 1, target);
}
int main(){
  int a[8] = {2, 5, 8, 12, 16, 23, 38, 56};
  int r = search(a, 0, 7, 23);
  if(r != -1) printf("a[%d]=%d\\n", r, a[r]);
  else printf("not found\\n");
  return 0;
}`
      }
    ]
  });
})();