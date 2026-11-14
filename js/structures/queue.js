/* ==========================================================
   queue.js — 队列与循环队列
   ========================================================== */
(function () {
  const CY = "#fbbf24", CG = "#34d399", CR = "#f87171", CB = "#5b8cff", CP = "#a855f7";
  const FY = "rgba(251,191,36,0.32)", FG = "rgba(52,211,153,0.30)", FR = "rgba(248,113,113,0.28)";

  DS.structures.register({
    id: "queue",
    name: "队列",
    emoji: "🚶",
    category: "栈与队列",
    badge: "核心",
    tags: ["FIFO", "先进先出", "队头", "队尾", "循环队列"],
    summary: "先进先出 FIFO：队尾进、队头出。理解顺序队的「假溢出」，就理解了循环队列的由来。",

    overview: `
<div class="md"><h3>🚶 什么是队列</h3>
<p>队列也是<b>受限的线性表</b>：只能在<b>队尾</b>插入（enqueue 入队）、在<b>队头</b>删除（dequeue 出队）——<b>FIFO</b>（First In First Out），像排队买票：先来的先办。</p>
<pre><code>int q[MAX];
front = 0;  rear = 0;                 // 空队
q[rear++] = v;                        // 入队（队尾）
v = q[front++];                       // 出队（队头）
if(rear == MAX)  ...                  // 队满？（线性队列看这里会出问题）</code></pre>
<h4>顺序队的"假溢出"</h4>
<p>入队时 rear 一路增长，出队后 front 前面的空间<b>空着却用不上</b>——rear 顶到边界就报"队满"，实际前面全是空位。解决办法：<b>把队列首尾相接变成环形</b>，也就是循环队列。</p>
</div>
<div class="md"><h3>🔄 循环队列</h3>
<p>把数组想象成环：</p>
<pre><code>入队:  q[rear] = v;  rear = (rear + 1) % MAX;
出队:  v = q[front]; front = (front + 1) % MAX;
判空:  front == rear
判满:  (rear + 1) % MAX == front   // 牺牲一格区分空/满</code></pre>
<div class="callout warn">⚠️ 为什么"牺牲一格"？若把 MAX 格全用满，队满时 rear 会追上 front，与队空状态<b>无法区分</b>。留一个空位是最经典的做法；也可用 count 计数器法。</div>
</div>
<div class="md"><h3>🎯 队列的应用</h3>
<ul>
<li><b>BFS 广度优先搜索</b>：按层扩散，天生就是队列。</li>
<li><b>层序遍历二叉树</b>：一层一层访问。</li>
<li><b>消息队列 / 任务调度</b>：生产者-消费者模型。</li>
<li><b>双端队列 deque</b>：两头都能进出，进一步放宽限制。</li>
</ul>
</div>`,

    complexity: [
      { op: "入队（顺序/链式）", 平均: "O(1)", 最坏: "O(1)", 空间: "O(n)", 稳定性: "—", 说明: "" },
      { op: "出队（顺序/链式）", 平均: "O(1)", 最坏: "O(1)", 空间: "O(n)", 稳定性: "—", 说明: "" },
      { op: "取队头", 平均: "O(1)", 最坏: "O(1)", 空间: "O(n)", 稳定性: "—", 说明: "" },
      { op: "按值查找", 平均: "O(n)", 最坏: "O(n)", 空间: "O(n)", 稳定性: "—", 说明: "" }
    ],

    demos: [
      {
        id: "basic",
        name: "顺序队列：入队 / 出队",
        desc: "注意看：出队后 front 前面的空位<b>无法复用</b>（假溢出）——这就是循环队列要解决的问题。",
        what: "自由写 enq / deq 命令，观察 front、rear 两个指针如何移动，空位如何被浪费。",
        inputs: [
          { key: "ops", label: "命令序列", type: "text", def: "enq 5; enq 2; enq 8; deq; deq; enq 1; enq 4; deq", cls: "ops",
            desc: "enq 入队（队尾）、deq 出队（队头）；分号分隔。",
            opsBank: ["enq 1; enq 2; enq 3; enq 4; deq; deq", "enq 9; deq; enq 8; deq; enq 7; deq", "enq 1; enq 2; enq 3; enq 4; enq 5; enq 6; enq 7"] }
        ],
        samples: [
          { label: "进进出出（出现假溢出）", values: { ops: "enq 5; enq 2; enq 8; deq; deq; enq 1; enq 4; deq" } },
          { label: "一路入队直到标满", values: { ops: "enq 1; enq 2; enq 3; enq 4; enq 5; enq 6; enq 7" } },
          { label: "交替进出", values: { ops: "enq 9; deq; enq 8; deq; enq 7; deq; enq 6" } }
        ],
        tips: [
          "连续 enq 7 次（容量 6）触发「假溢出」——明明前面有空位却报队满，这就是循环队列的由来。",
          "对比下面「循环队列」演示：同样命令，循环队列能复用空位。"
        ],
        build(inp) {
          const cmds = String(inp.ops || "").split(";").map(s => s.trim()).filter(Boolean);
          const CAP = 6;
          const steps = [];
          const q = new Array(CAP).fill(null);
          let front = 0, rear = 0;
          let id = 0;
          const CW = 78, CH = 56;
          const scene = (hiI, xtra) => {
            const els = [];
            const startX = -(CAP * CW) / 2;
            for (let i = 0; i < CAP; i++) {
              els.push({
                t: "rect", key: "slot" + i, x: startX + i * CW, y: -CH / 2, w: CW - 8, h: CH,
                fill: "rgba(100,120,160,0.06)", stroke: "#2c3a5e",
                text: i < rear && i >= front ? String(q[i]) : "ᐧ",
                radius: 8,
                index: String(i)
              });
            }
            if (rear < CAP) {
              els.push({ t: "text", key: "rearlb", x: startX + rear * CW, y: -CH / 2 - 24, text: "▲ rear=" + rear, size: 13, color: CG, bold: true });
            }
            els.push({ t: "text", key: "frontlb", x: startX + Math.min(front, CAP - 0.5) * CW, y: CH / 2 + 22, text: "▼ front=" + front, size: 13, color: CY, bold: true });
            return { elements: els };
          };
          const stats = () => ({ 队长: Math.max(0, rear - front), front, rear });
          steps.push(DS.mkStep(scene(), "队列容量 6。front 指向队头元素，rear 指向<b>下一个待入队位置</b>。", { stats: stats() }));
          for (const raw of cmds) {
            const p = raw.toLowerCase().split(/\s+/);
            if (p[0] === "enq" || p[0] === "push") {
              const v = parseInt(p[1]);
              if (isNaN(v)) continue;
              if (rear >= CAP) {
                steps.push(DS.mkStep(scene(), "❌ rear 已到容量边界 → 报「队满」！但注意 front 前面其实有 " + front + " 个空位——<b>假溢出</b>！", { stats: stats() }));
                continue;
              }
              steps.push(DS.mkStep(scene(), "入队 " + v + "：写入 q[" + rear + "]（黄虚线处）。", { stats: stats() }));
              q[rear] = v;
              rear++;
              steps.push(DS.mkStep(scene(rear - 1), "rear 后移 → " + rear + "。" + v + " 现在是队尾。", { stats: stats() }));
            } else if (p[0] === "deq" || p[0] === "pop") {
              if (front >= rear || q[front] === null) {
                steps.push(DS.mkStep(scene(), "❌ front == rear → 队空，无法出队。", { stats: stats() }));
                continue;
              }
              const v = q[front];
              steps.push(DS.mkStep(scene(front), "出队：取出队头 q[" + front + "] = " + v + "。", { stats: stats() }));
              q[front] = null;
              front++;
              steps.push(DS.mkStep(scene(), "front 后移 → " + front + "。注意位置 " + (front - 1) + " 空出来之后<b>无法再被使用</b>。", { stats: stats() }));
            }
          }
          steps.push(DS.mkStep(scene(), "🏁 演示结束" + (rear >= CAP ? "：rear 卡在边界——这就是「假溢出」。" : "。"), { stats: stats() }));
          return { steps };
        }
      },
      {
        id: "circular",
        name: "循环队列",
        desc: "同样的操作，用 (rear+1)%n 环形走位：空间转起来，假溢出消失。",
        what: "和前一个演示同样自由的 enq / deq 命令，但指针对 6 取模绕圈走位。",
        inputs: [
          { key: "ops", label: "命令序列", type: "text", def: "enq 10; enq 20; enq 30; deq; enq 40; enq 50; deq; enq 60", cls: "ops",
            desc: "enq 入队、deq 出队；容量 6（牺牲 1 格判满，最多放 5 个）。",
            opsBank: ["enq 1; enq 2; enq 3; enq 4; enq 5; deq; enq 6", "enq 1; deq; enq 2; deq; enq 3; deq; enq 4", "enq 1; enq 2; enq 3; enq 4; enq 5; enq 6"] }
        ],
        samples: [
          { label: "绕圈一周", values: { ops: "enq 10; enq 20; enq 30; deq; enq 40; enq 50; deq; enq 60" } },
          { label: "装满到牺牲格", values: { ops: "enq 1; enq 2; enq 3; enq 4; enq 5; enq 6" } },
          { label: "交替进出绕圈", values: { ops: "enq 1; deq; enq 2; deq; enq 3; deq; enq 4; deq; enq 5" } }
        ],
        tips: [
          "试着连续 enq 6 次：第 6 次触发「(rear+1)%6==front → 队满」，这就是牺牲格的作用。",
          "回到上一个「顺序队列」演示跑完全相同的命令，对比两者的区别。",
          "观察 rear 到 5 之后再 +1 就变回 0——这就是 % 取模的「绕环」。"
        ],
        build(inp) {
          const cmds = String(inp.ops || "").split(";").map(s => s.trim()).filter(Boolean);
          const N = 6;
          const steps = [];
          const q = new Array(N).fill(null);
          let front = 0, rear = 0;
          const posXY = i => {
            const ang = -Math.PI / 2 + (i / N) * Math.PI * 2;
            return { x: Math.cos(ang) * 170, y: Math.sin(ang) * 150 };
          };
          const scene = (hiSlot, hiFront, hiRear) => {
            const els = [];
            for (let i = 0; i < N; i++) {
              const p = posXY(i);
              const has = q[i] !== null;
              els.push({
                t: "rect", key: "slot" + i, x: p.x - 34, y: p.y - 30, w: 68, h: 56,
                fill: i === hiSlot ? FY : (has ? "rgba(91,140,255,0.18)" : "rgba(100,120,160,0.06)"),
                stroke: i === hiSlot ? CY : (has ? CB : "#2c3a5e"),
                active: i === hiSlot,
                text: has ? String(q[i]) : "空",
                radius: 10
              });
              els.push({ t: "text", key: "ix" + i, x: p.x, y: p.y + 18, text: "[" + i + "]", size: 11, color: "#8895b3" });
              // 环形虚线
              const p2 = posXY((i + 1) % N);
              els.push({
                t: "edge", key: "ring" + i, from: "slot" + i, to: "slot" + (i + 1) % N,
                color: "rgba(102,115,154,0.25)", style: "dotted", arrow: false, width: 1.2
              });
            }
            els.push({ t: "text", key: "fl", x: posXY(front).x, y: posXY(front).y - 62, text: "▼ front=" + front, size: 13, color: CY, bold: true });
            els.push({ t: "text", key: "rl", x: posXY(rear).x, y: posXY(rear).y - 84, text: "▲ rear=" + rear, size: 13, color: CG, bold: true });
            return { elements: els };
          };
          const isFull = () => (rear + 1) % N === front;
          const isNewFull = () => (rear + 1) % N === front;
          const stat = () => ({ front, rear, 元素数: (rear - front + N) % N });
          steps.push(DS.mkStep(scene(), "循环队列容量 6（牺牲 1 格判满，最多放 5 个）。所有下标都按 % 6 取模绕圈。", { stats: stat() }));
          for (const raw of cmds) {
            const p = raw.toLowerCase().split(/\s+/);
            if (p[0] === "enq") {
              const v = parseInt(p[1]);
              if (isNaN(v)) continue;
              if (isFull()) {
                steps.push(DS.mkStep(scene(), "计算 (rear+1)%6 == front → <b style='color:#f87171'>队满</b>（牺牲格），拒绝入队。", { stats: stat() }));
                continue;
              }
              steps.push(DS.mkStep(scene(rear), "入队 " + v + "：写入 q[rear] = q[" + rear + "]。", { stats: stat() }));
              q[rear] = v;
              const oldR = rear;
              rear = (rear + 1) % N;
              steps.push(DS.mkStep(scene(), "rear = (" + oldR + "+1) % " + N + " = " + rear + "，指针绕环移动。", { stats: stat() }));
            } else if (p[0] === "deq") {
              if (front === rear) {
                steps.push(DS.mkStep(scene(), "front == rear → <b>队空</b>，无法出队。", { stats: stat() }));
                continue;
              }
              const v = q[front];
              steps.push(DS.mkStep(scene(front), "出队：取队头 q[" + front + "] = " + v + "。", { stats: stat() }));
              q[front] = null;
              const oldF = front;
              front = (front + 1) % N;
              steps.push(DS.mkStep(scene(), "front = (" + oldF + "+1) % " + N + " = " + front + "。" + (q[oldF] === null ? "位置 " + oldF + " 释放，<b>可以再次入队</b>！" : ""), { stats: stat() }));
            }
          }
          steps.push(DS.mkStep(scene(), "🏁 同样的操作序列：循环队列把 front 空出的格子重新利用起来，不存在假溢出。", { stats: stat() }));
          return { steps };
        }
      }
    ],

    cPresets: [
      {
        id: "linear",
        name: "顺序队列（C）",
        mode: "array",
        code: `/* 顺序队列：front / rear 单向增长 */
int main(){
  int q[6];
  int front = 0, rear = 0;
  q[rear++] = 5;
  q[rear++] = 2;
  q[rear++] = 8;
  int v = q[front++];
  printf("deq=%d front=%d rear=%d\\n", v, front, rear);
  q[rear++] = 1;
  printf("queue: %d %d %d\\n", q[front], q[front + 1], q[rear - 1]);
  return 0;
}`,
        lineNotes: {
          3: "front = rear = 0 为空队。",
          4: "入队：写入 rear 位再后移。",
          7: "出队：取出 front 位再前移。"
        }
      },
      {
        id: "circular",
        name: "循环队列（C）",
        mode: "array",
        code: `/* 循环队列：% 取模实现环形移动 */
int main(){
  int q[5];
  int front = 0, rear = 0;
  q[rear] = 10; rear = (rear + 1) % 5;
  q[rear] = 20; rear = (rear + 1) % 5;
  q[rear] = 30; rear = (rear + 1) % 5;
  int v = q[front];
  front = (front + 1) % 5;
  printf("deq=%d\\n", v);
  q[rear] = 40; rear = (rear + 1) % 5;
  int cnt = (rear - front + 5) % 5;
  printf("cnt=%d front=%d rear=%d\\n", cnt, front, rear);
  return 0;
}`,
        lineNotes: {
          5: "入队后 rear 取模：到达边界就绕回 0。",
          8: "出队后 front 同样取模。",
          11: "元素个数 = (rear - front + n) % n。"
        }
      },
      {
        id: "linked-queue",
        name: "链队列 · 带头结点 + 尾指针（C）",
        mode: "list",
        code: `/* 链队列：rear 尾指针入队 O(1)，front 出队 O(1) */
struct Node {
  int data;
  struct Node* next;
};
struct Node* enq(struct Node* rear, int v){
  struct Node* p = malloc(sizeof(struct Node));
  p->data = v;
  p->next = NULL;
  rear->next = p;
  return p;
}
struct Node* deq(struct Node* front){
  struct Node* dummy = front;
  struct Node* p = dummy->next;
  if(p == NULL) return dummy;
  printf("deq %d\\n", p->data);
  dummy->next = p->next;
  free(p);
  return dummy;
}
int main(){
  struct Node* dummy = malloc(sizeof(struct Node));
  dummy->next = NULL;
  struct Node* front = dummy;
  struct Node* rear = dummy;
  rear = enq(rear, 10);
  rear = enq(rear, 20);
  rear = enq(rear, 30);
  front = deq(front);
  front = deq(front);
  rear = enq(rear, 40);
  struct Node* cur = dummy->next;
  while(cur != NULL){
    printf("%d ", cur->data);
    cur = cur->next;
  }
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          5: "enq 用尾指针 rear 直接把新结点接到队尾。",
          9: "旧队尾 next 指向新结点。",
          10: "返回新队尾——这行是链队列 O(1) 入队的关键。",
          12: "deq 从队头（dummy->next）取。",
          15: "空队列直接返回。",
          17: "队头后移，相当于出队。",
          24: "dummy 是头结点（哨兵），front/rear 都从它出发。",
          27: "三次入队：10、20、30。",
          30: "出队两次：10、20（先进先出）。",
          32: "再入队 40。",
          33: "剩下 30、40。"
        }
      }
    ]
  });
})();