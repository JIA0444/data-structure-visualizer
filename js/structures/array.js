/* ==========================================================
   array.js — 数组（顺序表）
   ========================================================== */
(function () {
  DS.structures.register({
    id: "array",
    name: "数组与顺序表",
    emoji: "📚",
    category: "线性结构",
    badge: "基础",
    tags: ["随机访问", "连续内存", "动态扩容"],
    summary: "最基础的结构：一段连续内存按下标直接访问。理解它才能理解数组下标、地址计算与扩容搬移。",

    /* ================= 知识讲解 ================= */
    overview: `
<div class="md"><h3>🧠 什么是数组</h3>
<p>数组把<b>同类型</b>的若干元素存放在<b>一段连续的内存</b>里，用<b>下标（index）</b>直接访问第 i 个元素，因此也叫<b>顺序表（顺序存储结构）</b>。</p>
<pre><code>int a[5] = {10, 20, 30, 40, 50};
a[2];        // 访问第 3 个元素：30 —— 花费 O(1)</code></pre>
<h4>随机访问的原理</h4>
<p>元素地址 = 起始地址 + 下标 × 元素大小。<br>数组名 <code>a</code> 就是首元素地址，<code>a[i]</code> 等价于 <code>*(a + i)</code>。因为可以一步算出地址，所以按位置访问是 <b>O(1)</b>。</p>
<h4>优点与缺点</h4>
<ul>
<li>✅ <b>访问快</b>：按下标读写 O(1)；空间连续、缓存友好。</li>
<li>✅ <b>实现简单</b>：几乎所有语言都内置。</li>
<li>❌ <b>插入/删除慢</b>：中间插入需要把后面的元素整体后移，平均 O(n)。</li>
<li>❌ <b>容量固定</b>：C 语言静态数组大小编译期确定，装满了必须新开更大的数组并搬移（扩容）。</li>
</ul>
</div>
<div class="md"><h3>📈 动态扩容（顺序表的生长）</h3>
<p>动态数组（如 C++ 的 vector、Java 的 ArrayList）装不下时按 <b>约 1.5 ~ 2 倍</b>扩容：</p>
<ol>
<li>申请一块更大的连续内存（new_capacity = old × 2）；</li>
<li>把旧数据<b>逐个复制</b>过去；</li>
<li>释放旧内存，更新容量。</li>
</ol>
<p>这样虽然单次扩容 O(n)，但<b>均摊（amortized）后每次插入仍接近 O(1)</b>。</p>
<div class="callout">💡 思考：为什么扩容倍数是 2 而不是 +1？如果每次只 +1，连续插入 n 次的总搬移量是 O(n²)；翻倍扩容总搬移量只有 O(n)。</div>
</div>
<div class="md"><h3>⚡ 插入与删除</h3>
<p>在位置 i 插入 x：先把 <code>i..n-1</code> 的元素<b>从后往前</b>逐个后移一格，再写入 <code>a[i]=x</code>。<br>删除位置 i：把 <code>i+1..n-1</code> 的元素<b>从前往后</b>前移，减小长度。</p>
<div class="callout err">⚠️ 易错：<b>必须从尾部开始搬移</b>。如果从前往后搬，前面的值会覆盖后面的值，导致全表变成一个值。</div>
</div>`,

    complexity: [
      { op: "按下标访问 / 修改", 平均: "O(1)", 最坏: "O(1)", 空间: "—", 稳定性: "—", 说明: "地址直接计算" },
      { op: "按值查找", 平均: "O(n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "需遍历比较" },
      { op: "插入（末尾）", 平均: "O(1)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "扩容时 O(n)" },
      { op: "插入（中间）", 平均: "O(n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "需搬移元素" },
      { op: "删除（末尾）", 平均: "O(1)", 最坏: "O(1)", 空间: "O(1)", 稳定性: "—", 说明: "" },
      { op: "删除（中间）", 平均: "O(n)", 最坏: "O(n)", 空间: "O(1)", 稳定性: "—", 说明: "需搬移元素" }
    ],

    /* ================= 动手演示 ================= */
    demos: [
      {
        id: "dynamic",
        name: "动态数组扩容",
        desc: "不断向数组末尾插入元素，观察容量用尽时如何翻倍扩容、把旧数据搬进新数组。蓝色=已用，虚线=预留容量。",
        inputs: [
          { key: "cap", label: "初始容量", type: "number", def: 4, min: 2, max: 8 },
          { key: "data", label: "依次插入的数据", type: "text", def: "11,22,33,44,55,66,77,88,99", cls: "nums" }
        ],
        build(inp) {
          const cap0 = DS.clamp(parseInt(inp.cap) || 4, 2, 8);
          const data = DS.parseNums(inp.data, [11, 22, 33, 44, 55], 30);
          const steps = [];
          let cap = cap0, size = 0, arr = new Array(cap).fill(null);

          const scene = (move) => {
            const cw = Math.min(48, 700 / cap);
            const startX = -(cap * cw) / 2;
            const elems = [];
            for (let i = 0; i < cap; i++) {
              const filled = i < size;
              elems.push({
                t: "cell", key: "c" + i, x: startX + i * cw, y: -20, w: cw - 4, h: 40,
                text: filled ? String(arr[i]) : "·",
                index: String(i),
                fill: move === i ? "rgba(251,191,36,0.30)" : (filled ? undefined : "rgba(91,140,255,0.05)"),
                stroke: move === i ? "#fbbf24" : (filled ? undefined : "#2c3a5e"),
                active: move === i,
                radius: move === i ? 10 : 6
              });
            }
            elems.push({ t: "text", key: "cap", x: -startX - 60, y: -64, text: "动态数组", size: 14, color: "#8f9cbf", bold: true, align: "left" });
            return { elements: elems };
          };
          const stat = (extra) => ({ 大小: size, 容量: cap, ...(extra || {}) });

          steps.push(DS.mkStep(scene(), "初始状态：容量 <b>" + cap0 + "</b>，还没有元素。", { stats: stat() }));

          for (const v of data) {
            if (size === cap) {
              const oldCap = cap;
              cap = cap * 2;
              const old = arr;
              arr = new Array(cap).fill(null);
              for (let i = 0; i < oldCap; i++) arr[i] = old[i];
              steps.push(DS.mkStep(scene(), "⚠️ 容量已满！申请新数组：容量 <b>" + oldCap + " → " + cap + "</b>，并把旧元素逐个复制过去。", { stats: stat({ 操作: "扩容 ×2" }) }));
            }
            arr[size] = v;
            const at = size;
            size++;
            steps.push(DS.mkStep(scene(at), "插入 <b style='color:#fbbf24'>" + v + "</b> 到下标 " + at + "。", { stats: stat({ 操作: "末尾插入" }) }));
          }
          steps.push(DS.mkStep(scene(), "🏁 全部插入完成：最终容量 " + cap + "，" + size + " 个元素。", { stats: stat() }));
          return { steps };
        }
      },
      {
        id: "insert",
        name: "中间插入（搬移）",
        desc: "在下标 pos 处插入新值：先腾位置（从后往前搬移），再写入。注意观察搬移方向。",
        inputs: [
          { key: "arr", label: "初始数组", type: "text", def: "12,24,36,48,60,72", cls: "nums" },
          { key: "pos", label: "插入位置下标", type: "number", def: 2, min: 0, max: 9 },
          { key: "val", label: "插入的值", type: "number", def: 99, min: -99, max: 999 }
        ],
        build(inp) {
          let a = DS.parseNums(inp.arr, [12, 24, 36, 48, 60, 72], 16);
          let pos = DS.clamp(parseInt(inp.pos) || 0, 0, a.length);
          const val = parseInt(inp.val) || 0;
          const steps = [];
          const sc = (move) => {
            const cw = 52, startX = -(a.length * cw) / 2;
            const elems = [];
            for (let i = 0; i < a.length; i++) {
              elems.push({
                t: "cell", key: "c" + i, x: startX + i * cw, y: -24, w: cw - 6, h: 44,
                text: String(a[i]), index: String(i),
                fill: i === pos ? "rgba(251,191,36,0.30)" : (move === i ? "rgba(52,211,153,0.25)" : undefined),
                stroke: i === pos ? "#fbbf24" : undefined, active: i === pos || move === i
              });
            }
            // 插入位置指示箭头
            if (pos <= a.length) {
              const ax = pos === a.length ? startX + a.length * cw - cw / 2 : startX + pos * cw;
              elems.push({ t: "text", key: "pv", x: ax, y: 52, text: "▲ 插入位置 pos=" + pos, size: 13, color: "#fbbf24", bold: true });
            }
            return { elements: elems };
          };
          steps.push(DS.mkStep(sc(), "初始数组，准备在下标 pos = " + pos + " 处插入 " + val + "。", { stats: { 长度: a.length } }));
          const finalLen = a.length + 1;
          const arr2 = new Array(finalLen);
          for (let i = 0; i < pos; i++) arr2[i] = a[i];
          for (let i = a.length; i > pos; i--) {
            arr2[i] = a[i - 1];
            steps.push(DS.mkStep(sc(i - 1), "从后往前搬移：a[" + i + "] ← a[" + (i - 1) + "]（绿色为正在搬移的元素）。", { stats: { 长度: a.length, 搬移中: i - 1 } }));
            a = a.slice();
            a[i] = a[i - 1];
          }
          a = arr2; a[pos] = val;
          steps.push(DS.mkStep(sc(-1), "腾出空位后写入：a[" + pos + "] = <b style='color:#fbbf24'>" + val + "</b>。", { stats: { 长度: finalLen, 操作: "写入" } }));
          return { steps };
        }
      },
      {
        id: "remove",
        name: "删除元素（前移）",
        desc: "删除 pos 处元素：后面的元素从前往后依次前移一格，长度减 1。",
        inputs: [
          { key: "arr", label: "初始数组", type: "text", def: "3,1,4,1,5,9,2,6", cls: "nums" },
          { key: "pos", label: "删除位置下标", type: "number", def: 3, min: 0, max: 9 }
        ],
        build(inp) {
          let a = DS.parseNums(inp.arr, [3, 1, 4, 1, 5, 9, 2, 6], 16);
          const pos0 = DS.clamp(parseInt(inp.pos) || 0, 0, a.length - 1);
          const n0 = a.length;
          const steps = [];
          const sc = (del, mat) => {
            const cw = 52, startX = -(a.length * cw) / 2;
            const elems = [];
            for (let i = 0; i < a.length; i++) {
              const isDel = del === i;
              elems.push({
                t: "cell", key: "c" + i, x: startX + i * cw, y: -24, w: cw - 6, h: 44,
                text: isDel ? "?" : String(a[i]), index: String(i),
                fill: isDel ? "rgba(248,113,113,0.22)" : (mat === i ? "rgba(52,211,153,0.25)" : undefined),
                stroke: isDel ? "#f87171" : undefined, active: isDel || mat === i
              });
            }
            return { elements: elems };
          };
          steps.push(DS.mkStep(sc(pos0), "准备删除下标 pos = " + pos0 + " 的元素（红色）。", { stats: { 长度: n0 } }));
          for (let i = pos0; i < n0 - 1; i++) {
            a = a.slice();
            a[i] = a[i + 1];
            steps.push(DS.mkStep(sc(pos0, i), "从前往后前移：a[" + i + "] ← a[" + (i + 1) + "]。", { stats: { 长度: n0, 搬移中: i } }));
          }
          a.pop();
          steps.push(DS.mkStep(sc(-1), "🏁 删除完成，长度减 1。末尾位置已失效。", { stats: { 长度: n0 - 1, 操作: "完成" } }));
          return { steps };
        }
      }
    ],

    /* ================= C 代码示例 ================= */
    cPresets: [
      {
        id: "sum",
        name: "数组遍历求和",
        mode: "array",
        code: `/* 数组遍历：累加求和
   观察 i 的变化与 a[i] 的访问过程 */
int main(){
  int a[6] = {12, 24, 36, 48, 60, 72};
  int i;
  int sum = 0;
  for(i = 0; i < 6; i++){
    sum += a[i];
  }
  printf("sum=%d\\n", sum);
  return 0;
}`,
        lineNotes: {
          4: "声明数组 a[6] 并初始化 6 个元素——在内存中连续存放。",
          6: "sum 初始为 0。",
          7: "循环变量 i 从 0 开始（C 数组下标从 0 起）。",
          8: "sum += a[i]：按下标随机访问，取第 i 个元素累加。",
          10: "输出结果。"
        }
      },
      {
        id: "reverse",
        name: "数组逆序（双指针）",
        mode: "array",
        code: `/* 数组逆序：左右双指针交换 */
int main(){
  int a[7] = {9, 5, 2, 7, 1, 8, 4};
  int i = 0, j = 6;
  int t;
  while(i < j){
    t = a[i];
    a[i] = a[j];
    a[j] = t;
    i++;
    j--;
  }
  int k;
  for(k = 0; k < 7; k++) printf("%d ", a[k]);
  return 0;
}`,
        lineNotes: {
          4: "左右指针 i、j 分别指向首尾。",
          6: "只要 i < j 就继续交换。",
          7: "三步交换：t 暂存 a[i]。",
          10: "i 右移、j 左移，向中间靠拢。"
        }
      },
      {
        id: "findmax",
        name: "查找最大值（打擂台）",
        mode: "array",
        code: `/* 找最大值：逐个比较的“打擂台”法 */
int main(){
  int a[8] = {13, 27, 9, 45, 6, 38, 21, 17};
  int i;
  int max = a[0];
  for(i = 1; i < 8; i++){
    if(a[i] > max){
      max = a[i];
    }
  }
  printf("max=%d\\n", max);
  return 0;
}`,
        lineNotes: {
          5: "先假设 a[0] 是最大值。",
          7: "遇到更大的就更新 max。",
          10: "输出最终最大值。"
        }
      },
      {
        id: "seq-search",
        name: "顺序表查找 · 按值定位",
        mode: "array",
        code: `/* 顺序表查找：从头逐个比较，命中就记下下标 */
int main(){
  int a[8] = {23, 7, 41, 15, 9, 33, 2, 18};
  int n = 8;
  int key = 33;
  int pos = -1;
  int i;
  for(i = 0; i < n; i++){
    if(a[i] == key){
      pos = i;
      break;
    }
  }
  if(pos >= 0) printf("找到 %d，下标 = %d\\n", key, pos);
  else printf("没找到 %d\\n", key);
  return 0;
}`,
        lineNotes: {
          6: "pos 用 -1 表示「还没找到」。",
          8: "从左到右扫描整个表。",
          9: "命中：记录下标并立刻退出循环。",
          14: "用 pos 的符号区分找到/没找到。"
        }
      },
      {
        id: "seq-ordered-insert",
        name: "有序表插入 · 从后挪位",
        mode: "array",
        code: `/* 有序表插入：从后往前挪，腾出位置再放 v */
int main(){
  int a[9] = {2, 7, 12, 26, 35, 48};
  int n = 6;
  int v = 20;
  int i = n - 1;
  while(i >= 0 && a[i] > v){
    a[i + 1] = a[i];
    i--;
  }
  a[i + 1] = v;
  n++;
  int k;
  for(k = 0; k < n; k++) printf("%d ", a[k]);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          7: "从最后一个元素开始往前比。",
          8: "比 v 大的元素整体后移一格（腾位置）。",
          9: "i 前移，继续比前一个。",
          11: "循环停下时 i+1 就是 v 该待的位置。",
          12: "表长 +1。"
        }
      },
      {
        id: "seq-merge",
        name: "有序表合并 · 双指针",
        mode: "array",
        code: `/* 两个有序表合并成一个有序表：双指针谁小取谁 */
int main(){
  int a[4] = {1, 5, 9, 12};
  int b[4] = {2, 6, 8, 20};
  int c[8];
  int i = 0;
  int j = 0;
  int k = 0;
  while(i < 4 && j < 4){
    if(a[i] <= b[j]){
      c[k] = a[i];
      i++;
    } else {
      c[k] = b[j];
      j++;
    }
    k++;
  }
  while(i < 4){ c[k] = a[i]; i++; k++; }
  while(j < 4){ c[k] = b[j]; j++; k++; }
  int t;
  for(t = 0; t < 8; t++) printf("%d ", c[t]);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          9: "i、j 分别是 a、b 的游标，k 是新表写入位置。",
          11: "谁小就先把谁放进 c。",
          17: "两个表长度可能不等，剩下的直接接在 c 尾部。",
          20: "c 现在是完整升序表。"
        }
      }
    ]
  });
})();