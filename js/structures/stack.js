/* ==========================================================
   stack.js — 栈
   ========================================================== */
(function () {
  const CY = "#fbbf24", CG = "#34d399", CR = "#f87171", CB = "#5b8cff", CP = "#a855f7", CC = "#22d3ee";
  const FY = "rgba(251,191,36,0.32)", FG = "rgba(52,211,153,0.30)", FR = "rgba(248,113,113,0.28)";

  DS.structures.register({
    id: "stack",
    name: "栈",
    emoji: "🥞",
    category: "栈与队列",
    badge: "核心",
    tags: ["LIFO", "后进先出", "栈顶", "括号匹配", "表达式求值"],
    summary: "后进先出 LIFO：只能在顶端进出。函数调用、括号匹配、表达式求值都是它的主场。",

    overview: `
<div class="md"><h3>🥞 什么是栈</h3>
<p>栈是<b>操作受限</b>的线性表：只能在<b>栈顶</b>插入（push / 入栈）和删除（pop / 出栈），后进入的元素先出去——<b>LIFO</b>（Last In First Out）。像一叠盘子：取只能取最上面那张。</p>
<pre><code>int st[MAX];        int top = -1;          // 空栈
st[++top] = v;      // push：先 top+1 再写入
v = st[top--];      // pop：先取值再 top-1
if(top == MAX - 1)  // 栈满
if(top == -1)       // 栈空（peek/pop 前必须判！）</code></pre>
<div class="callout err">⚠️ 易错：<b>pop 对空栈</b>、<b>push 对满栈</b>都要先检查，否则越界。顺序栈用 <code>top</code> 表示栈顶下标，栈空 top = -1。</div>
</div>
<div class="md"><h3>🏗️ 两种实现</h3>
<table>
<tr><th>实现</th><th>存储</th><th>判满</th><th>场景</th></tr>
<tr><td>顺序栈</td><td>数组 + top</td><td>top = MAX−1</td><td>容量已知</td></tr>
<tr><td>链栈</td><td>链表，头作栈顶</td><td>malloc 失败</td><td>容量不定</td></tr>
</table>
<p>push / pop / peek 都是 <b>O(1)</b>。</p>
</div>
<div class="md"><h3>🎯 栈的应用</h3>
<ul>
<li><b>括号匹配</b>：左括号入栈，右括号与栈顶配对。</li>
<li><b>表达式求值</b>：中缀 → 后缀（逆波兰），再用栈计算。</li>
<li><b>函数调用</b>：递归每层函数都压入"调用栈"（本页代码可视化就能看到！）。</li>
<li><b>DFS、撤销（Undo）、浏览器的后退</b>：都是 LIFO 场景。</li>
</ul>
<div class="callout">💡 递归 = 隐式的栈。任何递归都可以改成显式用栈模拟，例如把递归的前序遍历改成非递归。</div>
</div>`,

    complexity: [
      { op: "入栈 push", 平均: "O(1)", 最坏: "O(1)", 空间: "O(n)", 稳定性: "—", 说明: "" },
      { op: "出栈 pop", 平均: "O(1)", 最坏: "O(1)", 空间: "O(n)", 稳定性: "—", 说明: "" },
      { op: "取栈顶 peek", 平均: "O(1)", 最坏: "O(1)", 空间: "O(n)", 稳定性: "—", 说明: "" },
      { op: "按值查找", 平均: "O(n)", 最坏: "O(n)", 空间: "O(n)", 稳定性: "—", 说明: "需要破坏栈结构或辅助栈" }
    ],

    demos: [
      {
        id: "basic",
        name: "入栈 / 出栈",
        desc: "命令脚本：push v、pop、peek。看「后进先出」是如何发生的。",
        what: "栈的操作台：自由组合 push / pop / peek，观察 top 指针与后进先出。",
        inputs: [
          { key: "ops", label: "命令序列", type: "text", def: "push 11; push 22; push 33; peek; pop; push 55; pop", cls: "ops",
            desc: "push 入栈、pop 出栈、peek 只读栈顶；分号分隔。",
            opsBank: ["push 1; push 2; push 3; pop; pop; pop", "push 9; pop; push 8; pop; push 7; pop", "push 10; peek; peek; pop; peek"] }
        ],
        samples: [
          { label: "三进两出", values: { ops: "push 11; push 22; push 33; pop; pop" } },
          { label: "先进后出反转", values: { ops: "push 1; push 2; push 3; pop; pop; pop" } },
          { label: "peek 不出栈", values: { ops: "push 10; peek; peek; pop; peek" } }
        ],
        tips: [
          "输入 <b>push 1; push 2; push 3; pop; pop; pop</b>：出栈顺序是 3、2、1——栈天然反转序列。",
          "在栈空的时候 pop / peek，观察边界检查（真实代码必须先判空）。",
          "连续 push 超过容量 10 次，看看「栈满」时程序怎么拒绝。"
        ],
        build(inp) {
          const cmds = String(inp.ops || "").split(";").map(s => s.trim()).filter(Boolean);
          const steps = [];
          const elems = [];
          let top = -1;
          let id = 0;
          const CW = 74, CH = 52;
          const scene = (hiI) => {
            const els = [];
            // 栈槽（槽位 key 固定 st0..st9）
            for (let i = 9; i >= 0; i--) {
              const y = -150 + (9 - i) * (CH + 10);
              els.push({
                t: "rect", key: "slot" + i, x: -CW / 2, y, w: CW, h: CH,
                fill: "rgba(100,120,160,0.06)",
                stroke: i === top + 1 ? CY : "#2c3a5e",
                text: "·", radius: 8
              });
            }
            elems.forEach((it, i) => {
              const y = -150 + (9 - i) * (CH + 10);
              els.push({
                t: "rect", key: it.key, x: -CW / 2, y, w: CW, h: CH,
                text: String(it.v),
                fill: i === hiI ? FY : "rgba(91,140,255,0.18)",
                stroke: i === hiI ? CY : CB,
                active: i === hiI,
                radius: 8
              });
            });
            els.push({ t: "text", key: "top", x: -CW / 2 - 58, y: -150 + (9 - (top + 1)) * (CH + 10) + CH / 2, text: "▲ top=" + top, size: 13, color: CG, bold: true, align: "right", mono: true });
            els.push({ t: "text", key: "cap", x: -CW / 2 + CW + 50, y: -150 + (9 - 0) * (CH + 10), text: "容量 10", size: 12, color: "#8895b3", align: "left" });
            return { elements: els };
          };
          steps.push(DS.mkStep(scene(), "初始空栈：top = −1，黄色虚线框是下一个 push 的落点。", { stats: { 栈长度: 0 } }));
          for (const raw of cmds) {
            const p = raw.toLowerCase().split(/\s+/);
            if (p[0] === "push" && p[1] !== undefined) {
              const v = parseInt(p[1]);
              if (isNaN(v)) continue;
              if (elems.length >= 10) {
                steps.push(DS.mkStep(scene(), "❌ 栈满（容量 10），push " + v + " 失败！", { stats: { 栈长度: elems.length } }));
                continue;
              }
              steps.push(DS.mkStep(scene(), "push " + v + "：先 top++（空位变黄待写入）。", { stats: { 栈长度: elems.length } }));
              const it = { key: "e" + (id++), v };
              elems.push(it);
              top = elems.length - 1;
              steps.push(DS.mkStep(scene(elems.length - 1), "把 " + v + " 写入新栈顶。后进先出——它将是下一个出栈的元素。", { stats: { 栈长度: elems.length, 栈顶: v } }));
            } else if (p[0] === "pop") {
              if (!elems.length) {
                steps.push(DS.mkStep(scene(), "❌ 栈空，不能 pop（真实代码会先判栈空）。", { stats: { 栈长度: 0 } }));
                continue;
              }
              const it = elems[elems.length - 1];
              steps.push(DS.mkStep(scene(elems.length - 1), "pop：先取出栈顶元素 " + it.v + "（黄）。", { stats: { 栈长度: elems.length, 取到: it.v } }));
              elems.pop();
              top = elems.length - 1;
              steps.push(DS.mkStep(scene(), "top--，元素 " + it.v + " 已出栈。", { stats: { 栈长度: elems.length } }));
            } else if (p[0] === "peek") {
              if (!elems.length) {
                steps.push(DS.mkStep(scene(), "peek：栈空，没有栈顶元素。", { stats: { 栈长度: 0 } }));
                continue;
              }
              steps.push(DS.mkStep(scene(elems.length - 1), "peek：只读栈顶 = " + elems[elems.length - 1].v + "，<b>并不出栈</b>。", { stats: { 栈长度: elems.length, 栈顶: elems[elems.length - 1].v } }));
            }
          }
          steps.push(DS.mkStep(scene(), "🏁 演示结束。" + (elems.length ? "栈内自底向上：" + elems.map(e => e.v).join(", ") : "栈为空。"), { stats: { 栈长度: elems.length } }));
          return { steps };
        }
      },
      {
        id: "brackets",
        name: "括号匹配检查",
        desc: "遇左括号入栈；遇右括号与栈顶配对；不匹配或最后栈非空都判错。",
        inputs: [{ key: "s", label: "待检查表达式", type: "text", def: "{[()()]}" }],
        build(inp) {
          const s = DS.parseStr(inp.s, "{[()()]}");
          const steps = [];
          const stack = [];
          const chs = s.split("");
          let id = 0;
          const scene = (curI, hiPair, errI) => {
            const els = [];
            const cw = 34, startX = -(chs.length * cw) / 2;
            chs.forEach((c, i) => {
              const done = i < curI;
              const isCur = i === curI;
              let fill, stroke;
              if (isCur) { fill = FY; stroke = CY; }
              else if (i === errI) { fill = FR; stroke = CR; }
              else if (hiPair === i) { fill = FG; stroke = CG; }
              else if (done) { fill = "rgba(100,120,160,0.10)"; stroke = "#2c3a5e"; }
              els.push({
                t: "cell", key: "c" + i, x: startX + i * cw, y: -90, w: cw - 4, h: 36,
                text: c, index: String(i), fill, stroke, active: isCur || hiPair === i
              });
            });
            // 栈（竖排）
            const stY0 = 40;
            stack.forEach((b, i) => {
              els.push({
                t: "rect", key: "s" + i, x: -64, y: stY0 - i * 46, w: 56, h: 38,
                text: b.c, fill: b.hi ? FG : "rgba(91,140,255,0.16)", stroke: b.hi ? CG : CB, active: b.hi, radius: 8
              });
            });
            els.push({ t: "text", key: "t1", x: -92, y: stY0 - Math.max(0, stack.length - 1) * 46 / 2 + 10, text: "栈", size: 12, color: "#8895b3", align: "right" });
            els.push({ t: "text", key: "t2", x: -40, y: -90, text: "输入", size: 12, color: "#8895b3", align: "center" });
            return { elements: els };
          };
          const pair = { ")": "(", "]": "[", "}": "{" };
          const open = new Set(["(", "[", "{"]);
          steps.push(DS.mkStep(scene(0), "扫描表达式 " + s + "：左括号入栈，右括号找栈顶配对。", { stats: { 栈长度: 0, 检查中: 0 } }));
          let ok = true;
          for (let i = 0; i < chs.length; i++) {
            const c = chs[i];
            if (open.has(c)) {
              stack.push({ c, hi: false });
              steps.push(DS.mkStep(scene(i), "符号 '" + c + "' 是左括号 → <b>入栈</b>。", { stats: { 栈长度: stack.length, 位置: i } }));
            } else if (pair[c]) {
              if (!stack.length) {
                steps.push(DS.mkStep(scene(i), "遇到右括号 '" + c + "' 但栈为空 → <b style='color:#f87171'>不匹配！</b>", { stats: { 栈长度: 0, 位置: i } }));
                return { steps };
              }
              const tp = stack[stack.length - 1];
              if (tp.c === pair[c]) {
                tp.hi = true;
                steps.push(DS.mkStep(scene(i, i), "右括号 '" + c + "' 与栈顶 '" + tp.c + "' <b>配对成功</b>（绿）→ 弹栈。", { stats: { 栈长度: stack.length, 位置: i } }));
                stack.pop();
              } else {
                steps.push(DS.mkStep(scene(i), "右括号 '" + c + "' 与栈顶 '" + tp.c + "' <b style='color:#f87171'>不匹配</b> → 表达式非法！", { stats: { 栈长度: stack.length, 位置: i } }));
                ok = false;
                return { steps };
              }
            } else {
              steps.push(DS.mkStep(scene(i), "符号 '" + c + "' 不是括号，跳过。", { stats: { 栈长度: stack.length, 位置: i } }));
            }
          }
          if (ok && stack.length) {
            steps.push(DS.mkStep(scene(chs.length), "扫描完成，但栈里还剩 " + stack.length + " 个左括号未配对 → <b style='color:#f87171'>不匹配！</b>", { stats: { 栈长度: stack.length } }));
          } else {
            steps.push(DS.mkStep(scene(chs.length), "🏁 扫描完成且栈为空 → <b style='color:#34d399'>括号匹配 ✓</b>", { stats: { 栈长度: 0, 结论: "匹配 ✓" } }));
          }
          return { steps };
        }
      },
      {
        id: "infix",
        name: "中缀转后缀（逆波兰）",
        desc: "数字直接输出；运算符比较优先级：栈顶优先级 ≥ 当前则弹栈输出；左括号入栈、右括号弹到左括号。",
        inputs: [{ key: "expr", label: "中缀表达式", type: "text", def: "3+5*(2-8)/4" }],
        build(inp) {
          const expr = String(inp.expr || "3+5*(2-8)/4").replace(/\s/g, "");
          const steps = [];
          const chs = expr.split("");
          const stack = [];
          const outQ = [];
          const pr = { "+": 1, "-": 1, "*": 2, "/": 2 };
          let id = 0;
          const scene = (curI, hiOut) => {
            const els = [];
            const cw = 34, startX = -(chs.length * cw) / 2;
            chs.forEach((c, i) => {
              const isCur = i === curI;
              els.push({
                t: "cell", key: "c" + i, x: startX + i * cw, y: -110, w: cw - 4, h: 36,
                text: c, index: String(i),
                fill: isCur ? FY : (i < curI ? "rgba(100,120,160,0.10)" : undefined),
                stroke: isCur ? CY : undefined,
                active: isCur
              });
            });
            els.push({ t: "text", key: "inlb", x: 0, y: -152, text: "输入（中缀）", size: 12, color: "#8895b3" });
            // 输出队列
            outQ.forEach((v, i) => {
              els.push({
                t: "cell", key: "o" + i, x: -160 + i * 44, y: 40, w: 40, h: 40,
                text: String(v),
                fill: hiOut === i ? FY : undefined, stroke: hiOut === i ? CY : undefined,
                active: hiOut === i
              });
            });
            els.push({ t: "text", key: "olb", x: -200, y: 60, text: "输出", size: 12, color: "#8895b3", align: "right" });
            // 运算符栈
            stack.forEach((op, i) => {
              els.push({
                t: "rect", key: "sp" + i, x: 150, y: 96 - i * 46, w: 52, h: 38,
                text: op, fill: "rgba(168,85,247,0.18)", stroke: CP, radius: 8
              });
            });
            els.push({ t: "text", key: "slb", x: 176, y: 96 - Math.max(0, stack.length - 1) * 23, text: "运算符栈↑", size: 12, color: "#8895b3", align: "left" });
            return { elements: els };
          };
          steps.push(DS.mkStep(scene(0), "规则：数字直接输出；运算符与栈顶比优先级（栈顶 ≥ 当前就弹）；'(' 直接入栈，')' 弹栈直到 '('。", { stats: { 输出: 0, 运算符: 0 } }));
          for (let i = 0; i < chs.length; i++) {
            const c = chs[i];
            if (/[0-9]/.test(c)) {
              outQ.push(c);
              steps.push(DS.mkStep(scene(i, outQ.length - 1), "数字 '" + c + "' 直接进入输出队列。", { stats: { 输出: outQ.length } }));
            } else if (c === "(") {
              stack.push(c);
              steps.push(DS.mkStep(scene(i), "'(' 无条件入运算符栈。", { stats: { 输出: outQ.length, 运算符: stack.length } }));
            } else if (c === ")") {
              steps.push(DS.mkStep(scene(i), "遇到 ')'：持续弹栈输出，直到遇到 '('。", { stats: { 输出: outQ.length, 运算符: stack.length } }));
              let guard = 0;
              while (stack.length && stack[stack.length - 1] !== "(" && guard++ < 20) {
                const op = stack.pop();
                outQ.push(op);
                steps.push(DS.mkStep(scene(i, outQ.length - 1), "弹出运算符 '" + op + "' 加入输出。", { stats: { 输出: outQ.length, 运算符: stack.length } }));
              }
              if (stack.length && stack[stack.length - 1] === "(") {
                stack.pop();
                steps.push(DS.mkStep(scene(i), "丢弃配对左括号 '('。", { stats: { 输出: outQ.length, 运算符: stack.length } }));
              } else {
                steps.push(DS.mkStep(scene(i), "❌ 括号不匹配！", { stats: { 输出: outQ.length } }));
                return { steps };
              }
            } else if (pr[c] !== undefined) {
              steps.push(DS.mkStep(scene(i), "运算符 '" + c + "'（优先级 " + pr[c] + "）：与栈顶比较优先级。", { stats: { 输出: outQ.length, 运算符: stack.length } }));
              let guard = 0;
              while (stack.length && stack[stack.length - 1] !== "(" && pr[stack[stack.length - 1]] >= pr[c] && guard++ < 20) {
                const op = stack.pop();
                outQ.push(op);
                steps.push(DS.mkStep(scene(i, outQ.length - 1), "栈顶 '" + op + "' 优先级 ≥ " + c + " → 弹出栈顶到输出。", { stats: { 输出: outQ.length, 运算符: stack.length } }));
              }
              stack.push(c);
              steps.push(DS.mkStep(scene(i), "'" + c + "' 入运算符栈。", { stats: { 输出: outQ.length, 运算符: stack.length } }));
            } else {
              steps.push(DS.mkStep(scene(i), "忽略符号 '" + c + "'（本演示只支持数字与 + - * / ( )）。", { stats: { 输出: outQ.length } }));
            }
          }
          let guard = 0;
          steps.push(DS.mkStep(scene(chs.length), "扫描完毕，把运算符栈<b>清空</b>到输出。", { stats: { 输出: outQ.length, 运算符: stack.length } }));
          while (stack.length && guard++ < 20) {
            const op = stack.pop();
            if (op === "(") continue;
            outQ.push(op);
            steps.push(DS.mkStep(scene(chs.length, outQ.length - 1), "弹出 '" + op + "' 到输出。", { stats: { 输出: outQ.length } }));
          }
          steps.push(DS.mkStep(scene(chs.length), "🏁 后缀表达式：<b style='color:#34d399'>" + outQ.join(" ") + "</b>", { stats: { 输出: outQ.length, 后缀: outQ.join("") } }));
          return { steps };
        }
      }
    ],

    cPresets: [
      {
        id: "arrstack",
        name: "数组模拟栈（C）",
        mode: "array",
        code: `/* 数组模拟顺序栈 */
int main(){
  int st[10];
  int top = -1;
  st[++top] = 11;
  st[++top] = 22;
  st[++top] = 33;
  int v = st[top--];
  printf("pop=%d\\n", v);
  int peek = st[top];
  printf("peek=%d top=%d\\n", peek, top);
  return 0;
}`,
        lineNotes: {
          3: "top = -1 表示空栈。",
          4: "++top 先自增再取下标 → 入栈。",
          7: "top-- 先取值再自减 → 出栈。",
          9: "peek 只读不删：直接用 st[top]。"
        }
      },
      {
        id: "match",
        name: "括号匹配（C）",
        mode: "array",
        code: `/* 用栈检查括号匹配 */
int main(){
  char s[7] = {'(', '{', '}', ')', '[', ']', '\\0'};
  char st[10];
  int top = -1;
  int i;
  int ok = 1;
  for(i = 0; s[i] != '\\0'; i++){
    if(s[i] == '(' || s[i] == '{' || s[i] == '['){
      st[++top] = s[i];
    } else if(s[i] == ')' || s[i] == '}' || s[i] == ']'){
      if(top == -1){ ok = 0; break; }
      char c = st[top--];
      if((s[i] == ')' && c != '(') || (s[i] == '}' && c != '{') || (s[i] == ']' && c != '[')){
        ok = 0;
        break;
      }
    }
  }
  if(ok && top == -1) printf("匹配\\n");
  else printf("不匹配\\n");
  return 0;
}`,
        lineNotes: {
          8: "ok 记录匹配状态。",
          10: "左括号一律入栈。",
          12: "右括号：先判栈空。",
          14: "取出栈顶配对。",
          15: "类型对不上 → 不匹配。"
        }
      },
      {
        id: "linked-stack",
        name: "链栈 · 不带头结点（C）",
        mode: "list",
        code: `/* 链栈：用链表实现栈，push/pop 都在链头做，O(1) */
struct Node {
  int data;
  struct Node* next;
};
struct Node* push(struct Node* top, int v){
  struct Node* p = malloc(sizeof(struct Node));
  p->data = v;
  p->next = top;
  return p;
}
struct Node* pop(struct Node* top){
  if(top == NULL) return NULL;
  struct Node* p = top;
  printf("pop %d\\n", p->data);
  top = p->next;
  free(p);
  return top;
}
int main(){
  struct Node* top = NULL;
  top = push(top, 11);
  top = push(top, 22);
  top = push(top, 33);
  top = pop(top);
  top = pop(top);
  top = push(top, 44);
  if(top != NULL) printf("栈顶=%d\\n", top->data);
  return 0;
}`,
        lineNotes: {
          5: "链栈的栈顶就是链表头 top。",
          6: "push：新建结点插到链头（头插）。",
          9: "新结点 next 指向原栈顶。",
          10: "返回新栈顶。",
          13: "pop：先判空，否则取出栈顶。",
          17: "让栈顶下移一格。",
          18: "释放旧栈顶，避免内存泄漏。",
          22: "空栈 top = NULL。",
          23: "反复 push 后 33 在最上面。",
          26: "pop 两次：33、22 依次出栈（后进先出）。",
          28: "再 push 44，它成为新栈顶。"
        }
      },
      {
        id: "linked-stack-dummy",
        name: "链栈 · 带头结点（C）",
        mode: "list",
        code: `/* 链栈（带头结点）：dummy->next 才是真正的栈顶 */
struct Node {
  int data;
  struct Node* next;
};
void push(struct Node* dummy, int v){
  struct Node* p = malloc(sizeof(struct Node));
  p->data = v;
  p->next = dummy->next;
  dummy->next = p;
}
void pop(struct Node* dummy){
  if(dummy->next == NULL) return;
  struct Node* p = dummy->next;
  printf("pop %d\\n", p->data);
  dummy->next = p->next;
  free(p);
}
int main(){
  struct Node* dummy = malloc(sizeof(struct Node));
  dummy->next = NULL;
  push(dummy, 11);
  push(dummy, 22);
  push(dummy, 33);
  pop(dummy);
  pop(dummy);
  push(dummy, 44);
  if(dummy->next != NULL) printf("栈顶=%d\\n", dummy->next->data);
  return 0;
}`,
        lineNotes: {
          5: "dummy 是哨兵结点，不存数据；dummy->next 才是栈顶。",
          6: "push 不需要返回新的 top（因为头结点永远不变）。",
          9: "新结点指向原栈顶。",
          10: "dummy 指向新结点。",
          12: "pop 只需判断 dummy->next 是否为空。",
          15: "栈顶下移。",
          23: "空栈：dummy->next = NULL。",
          27: "pop 两次：33、22。",
          29: "再 push 44。",
          30: "栈顶直接从 dummy->next 读，省一次返回值传递。"
        }
      }
    ]
  });
})();