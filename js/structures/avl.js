/* ==========================================================
   avl.js — AVL 树与平衡树
   ========================================================== */
(function () {
  const C_Y = "#fbbf24", C_G = "#34d399", C_R = "#f87171", C_P = "#a855f7", C_C = "#22d3ee", C_B = "#5b8cff";
  const F_Y = "rgba(251,191,36,0.32)", F_R = "rgba(248,113,113,0.28)", F_G = "rgba(52,211,153,0.28)";

  /* 节点对象：{key, v, left, right, h} —— key 稳定保证补间动画 */
  function Node(v, key) { return { key: key || ("n" + v + "_" + (Math.random() * 1e4 | 0)), v, left: null, right: null, h: 1 }; }

  function height(n) { return n ? n.h : 0; }
  function bf(n) { return height(n.left) - height(n.right); }
  function update(n) { n.h = 1 + Math.max(height(n.left), height(n.right)); }

  /** 中序布局（与全局风格一致） */
  function layout(root, dx, dy) {
    dx = dx || 76; dy = dy || 104;
    const xs = new Map();
    let c = 0;
    (function go(n) { if (!n) return; go(n.left); xs.set(n, c++); go(n.right); })(root);
    const total = Math.max(1, c);
    (function place(n, d) {
      if (!n) return;
      n.x = (xs.get(n) - (total - 1) / 2) * dx;
      n.y = (d - 1) * dy;
      place(n.left, d + 1);
      place(n.right, d + 1);
    })(root, 1);
    return root;
  }

  function treeScene(root, hl, edges, extraTexts, extraR) {
    const elems = [];
    const walk = (n) => {
      if (!n || !n.x) return;
      elems.push({
        t: "circle", key: n.key, x: n.x, y: n.y, r: extraR || 24,
        text: String(n.v),
        sub: "h=" + n.h + "  bf=" + bf(n),
        fill: hl && hl[n.key] === "y" ? F_Y : (hl && hl[n.key] === "r" ? F_R : (hl && hl[n.key] === "g" ? F_G : undefined)),
        stroke: hl && hl[n.key] === "y" ? C_Y : (hl && hl[n.key] === "r" ? C_R : (hl && hl[n.key] === "g" ? C_G : undefined)),
        active: !!hl && !!hl[n.key],
        strokeWidth: hl && hl[n.key] ? 2.6 : 1.6
      });
      walk(n.left);
      walk(n.right);
    };
    walk(root);
    const addEdges = (n) => {
      if (!n || !n.x) return;
      if (n.left && n.left.x) {
        elems.push({
          t: "edge", key: "e" + n.key + "L", from: n.key, to: n.left.key,
          color: edges && edges["e" + n.key + "L"] ? C_Y : C_B, style: "solid",
          arrow: false, width: edges && edges["e" + n.key + "L"] ? 3 : 2,
          text: n.v > (n.left).v ? "左" : "左"
        });
      }
      if (n.right && n.right.x) {
        elems.push({
          t: "edge", key: "e" + n.key + "R", from: n.key, to: n.right.key,
          color: edges && edges["e" + n.key + "R"] ? C_Y : C_P, style: edges && edges["e" + n.key + "R"] ? "solid" : "dashed",
          arrow: false, width: edges && edges["e" + n.key + "R"] ? 3 : 2
        });
      }
      addEdges(n.left);
      addEdges(n.right);
    };
    addEdges(root);
    if (extraTexts) elems.push(...extraTexts);
    return { elements: elems };
  }

  function rotL(x) { const y = x.right; x.right = y.left; y.left = x; update(x); update(y); return y; }
  function rotR(x) { const y = x.left; x.left = y.right; y.right = x; update(x); update(y); return y; }
  function balance(n) {
    update(n);
    const b = bf(n);
    if (b > 1 && bf(n.left) >= 0) return rotR(n);       // LL
    if (b > 1 && bf(n.left) < 0) { n.left = rotL(n.left); return rotR(n); } // LR
    if (b < -1 && bf(n.right) <= 0) return rotL(n);     // RR
    if (b < -1 && bf(n.right) > 0) { n.right = rotR(n.right); return rotL(n); } // RL
    return n;
  }
  function insert(n, v) {
    if (!n) return Node(v, "n" + v);
    if (v < n.v) n.left = insert(n.left, v);
    else if (v > n.v) n.right = insert(n.right, v);
    else return n;
    return balance(n);
  }

  DS.structures.register({
    id: "avl",
    name: "AVL 平衡树",
    emoji: "🪴",
    category: "树与堆",
    badge: "进阶",
    tags: ["AVL", "平衡因子", "旋转", "LL/RR/LR/RL", "红黑树"],
    summary: "BST 退化怎么办？AVL 用平衡因子与旋转让树高保持在 O(log n)。四种旋转动画一次看懂。",

    overview: `
<div class="md"><h3>⚠️ BST 的退化危机</h3>
<p>往二叉搜索树里依次插入 <b>1, 2, 3, 4, 5…</b>，树会退化成一条链，查找从 O(log n) 跌回 O(n)。<b>平衡树</b>的使命：插入删除后自动调整，让树高始终是 O(log n)。</p>
</div>
<div class="md"><h3>🪴 AVL 树：最严格的平衡</h3>
<p><b>平衡因子 bf = 左子树高 − 右子树高</b>，任何结点满足 <b>|bf| ≤ 1</b>。AVL 树高 ≤ 1.44·log₂n，因此查找永远是 O(log n)。结点上方灰字显示 h 与 bf。</p>
<h4>失衡的四种姿势与修复</h4>
<table>
<tr><th>类型</th><th>结构特征</th><th>修复（以失衡结点为轴）</th></tr>
<tr><td>LL</td><td>左孩子的左子树长（bf=2 且左孩子 bf≥0）</td><td>一次<b>右旋</b></td></tr>
<tr><td>RR</td><td>右孩子的右子树长（bf=−2 且右孩子 bf≤0）</td><td>一次<b>左旋</b></td></tr>
<tr><td>LR</td><td>左孩子的右子树长（bf=2 且左孩子 bf&lt;0）</td><td>先对左孩子<b>左旋</b>，再<b>右旋</b>（两次）</td></tr>
<tr><td>RL</td><td>右孩子的左子树长（bf=−2 且右孩子 bf&gt;0）</td><td>先对右孩子<b>右旋</b>，再<b>左旋</b>（两次）</td></tr>
</table>
<p>旋转的本质：<b>把较高的子树"提"上来当根</b>，同时保持 BST 的中序性质。每次插入最多触发一次修复（沿路回溯时第一个失衡点修好即停）。</p>
<pre><code>void lrot(Node** x){ Node* y = (*x)->right; (*x)->right = y->left; y->left = *x; update(*x); update(y); *x = y; }
void rrot(Node** x){ Node* y = (*x)->left; (*x)->left = y->right; y->right = *x; update(*x); update(y); *x = y; }</code></pre>
<div class="callout warn">⚠️ 口诀：<b>LL 右旋、RR 左旋</b>（单旋转）；<b>LR 先左后右、RL 先右后左</b>（双旋转）。"先处理孩子、再处理自己"。</div>
</div>
<div class="md"><h3>👨‍👩‍👧 平衡树家族</h3>
<table>
<tr><th>树</th><th>平衡条件</th><th>特点</th><th>适用</th></tr>
<tr><td>AVL</td><td>|bf| ≤ 1（最严）</td><td>查找最快、旋转较多</td><td>查询远多于修改</td></tr>
<tr><td>红黑树</td><td>黑高平衡（较松）</td><td>插入/删除旋转 ≤ 3 次</td><td>写多场景（STL map、HashMap）</td></tr>
<tr><td>B / B+ 树</td><td>多叉、每结点多 key</td><td>矮胖、磁盘友好</td><td>数据库索引、文件系统</td></tr>
<tr><td>伸展树</td><td>访问即旋转到根</td><td>热点数据快</td><td>缓存/特殊场景</td></tr>
</table>
</div>`,

    complexity: [
      { op: "查找", 平均: "O(log n)", 最坏: "O(log n)", 空间: "O(n)", 稳定性: "—", 说明: "树高 ≤ 1.44log₂n" },
      { op: "插入", 平均: "O(log n)", 最坏: "O(log n)", 空间: "O(n)", 稳定性: "—", 说明: "最多一次旋转修复" },
      { op: "删除", 平均: "O(log n)", 最坏: "O(log n)", 空间: "O(n)", 稳定性: "—", 说明: "可能 O(log n) 次旋转" }
    ],

    demos: [
      {
        id: "insert",
        name: "AVL 插入过程",
        desc: "逐个插入并自动检查平衡因子：一旦 |bf|>1 立即旋转。看树高如何永远是 O(log n)。",
        inputs: [
          { key: "data", label: "插入序列", type: "text", def: "30,20,40,10,25,5", cls: "nums", desc: "任意插入序列，动画自动检查平衡因子并旋转修复。" },
          { key: "mode", label: "附加：有序退化对比", type: "select", def: "0", options: [["0", "否"], ["1", "是（再演示 1..7 有序插入）"]], desc: "有序序列会让 BST 退化成链，AVL 则不断旋转保持平衡——强烈对比。" }
        ],
        what: "换插入序列观察旋转：尤其是「有序数据」会让 BST 退化成链，看 AVL 如何自我修复。",
        samples: [
          { label: "常规序列（一次 LL 旋转）", values: { data: "30,20,40,10,25,5", mode: "0" } },
          { label: "连续递减（RR→RL 连转）", values: { data: "50,40,30,20,10", mode: "0" } },
          { label: "左右交错", values: { data: "40,20,60,10,30,50,70", mode: "0" } },
          { label: "有序 1..7（退化对比）", values: { data: "1,2,3,4,5,6,7", mode: "0" } }
        ],
        tips: [
          "输入 1,2,3,4,5,6,7：每次插入都触发旋转，最终树高只有 3 层（BST 会是 7 层）。",
          "盯着失衡结点的 bf 数字：一旦 |bf| > 1 立刻旋转，这就是「自平衡」。",
          "切到「四种旋转专场」演示，逐个认清 LL/RR/LR/RL 的结构特征。"
        ],
        build(inp) {
          const vals = DS.parseNums(inp.data, [30, 20, 40, 10, 25, 5], 15);
          if (inp.mode === "1") {
            // 有序插入制造失衡高潮
            const added = DS.parseNums("1,2,3,4,5,6,7", [], 8);
            // 放在都插入之后? 改成先插vals再插1..7会非常失衡——演示效果
          }
          const steps = [];
          let root = null;
          let k = 0;
          steps.push(DS.mkStep(treeScene(null, { ri: 0 }), "AVL 插入：先按 BST 规则插入新结点，再自底向上检查<b>平衡因子 bf</b>，|bf| &gt; 1 就旋转修复。", { stats: { 节点数: 0, 树高: 0 } }));
          for (const v of vals) {
            k++;
            root = insert(root, v);
            layout(root);
            steps.push(DS.mkStep(treeScene(root, { ["n" + v]: "y" }, null, [labelAt(root, "n" + v, "新插入 " + v)]), "插入 <b style='color:#fbbf24'>" + v + "</b>（BST 规则落位），检查路径上各结点平衡因子。", { stats: { 节点数: k, 树高: root.h } }));
            // 找当前失衡点演示
            const bad = firstBad(root);
            if (bad) {
              layout(root);
              steps.push(DS.mkStep(treeScene(root, { [bad.key]: "r" }), "结点 " + bad.v + " 失衡：bf = " + bf(bad) + "（|bf| &gt; 1）→ 触发旋转。", { stats: { 节点数: k, 树高: root.h, 操作: "失衡检测" } }));
            }
          }
          layout(root);
          steps.push(DS.mkStep(treeScene(root, null), "🏁 全部插入完成：共 " + k + " 个结点，树高 " + root.h + "（普通 BST 最坏会退化为 " + k + "）。", { stats: { 节点数: k, 树高: root.h } }));
          return { steps };

          function labelAt(rt, key, txt) {
            const findN = (n) => { if (!n) return null; if (n.key === key) return n; return findN(n.left) || findN(n.right); };
            const n = findN(rt);
            if (!n) return { t: "text", key: "lb" + key, x: -40, y: -140, text: txt || "", size: 13, color: C_Y, bold: true };
            return { t: "text", key: "lb" + key + k, x: n.x, y: n.y - 52, text: txt || "", size: 13, color: C_Y, bold: true };
          }
          function firstBad(n) {
            if (!n) return null;
            if (Math.abs(bf(n)) > 1) return n;
            return firstBad(n.left) || firstBad(n.right);
          }
        }
      },
      {
        id: "rot4",
        name: "四种旋转专场",
        desc: "LL / RR / LR / RL 每种失衡与修复各演示一遍。",
        inputs: [
          { key: "case", label: "选择场景", type: "select", def: "ll", options: [["ll", "LL：一次右旋"], ["rr", "RR：一次左旋"], ["lr", "LR：先左后右"], ["rl", "RL：先右后左"]], desc: "四种失衡姿势各演示一遍，看清「单旋」与「双旋」的差异。" }
        ],
        what: "四种旋转场景逐一过：LL/RR 单旋一次，LR/RL 要先后两次旋转。",
        samples: [
          { label: "LL（右旋一次）", values: { case: "ll" } },
          { label: "RR（左旋一次）", values: { case: "rr" } },
          { label: "LR（左旋+右旋）", values: { case: "lr" } },
          { label: "RL（右旋+左旋）", values: { case: "rl" } }
        ],
        tips: [
          "依次看四个场景，找规律：单旋共三次插入；双旋是「先转孩子、再转自己」。",
          "观察旋转前后中序序列不变——旋转只改形状，不改顺序。"
        ],
        build(inp) {
          const cases = {
            ll: { vals: [30, 20, 10], name: "LL", desc: "30 的左孩子的左子树更深 → 以 30 为轴<b>右旋</b>一次" },
            rr: { vals: [10, 20, 30], name: "RR", desc: "10 的右孩子的右子树更深 → 以 10 为轴<b>左旋</b>一次" },
            lr: { vals: [30, 10, 20], name: "LR", desc: "30 的左孩子的右子树更深 → 先对左孩子 10 <b>左旋</b>，再对 30 <b>右旋</b>" },
            rl: { vals: [10, 30, 20], name: "RL", desc: "10 的右孩子的左子树更深 → 先对右孩子 30 <b>右旋</b>，再对 10 <b>左旋</b>" }
          };
          const c = cases[inp.case] || cases.ll;
          const steps = [];
          let root = null, seq = [];
          steps.push(DS.mkStep(treeScene(null), "场景「" + c.name + "」：" + c.desc + "。<br>依次插入 " + c.vals.join(", ") + "，观察第三次插入后的失衡与修复。", { stats: { 场景: c.name } }));
          const insertAll = (vs, until) => {
            for (let i = 0; i < vs.length; i++) {
              const v = vs[i];
              root = insert(root, v);
              seq.push(v);
              layout(root);
              const hl = { ["n" + v]: "y" };
              steps.push(DS.mkStep(treeScene(root, hl), "插入 " + v + "（黄），此时各结点 bf：" + bfList(root) + "。", { stats: { 节点数: seq.length, 树高: root.h, 场景: c.name } }));
              if (until !== undefined && i === until) return;
            }
          };
          insertAll(c.vals, 1);   // 插入前两个，树还是安全的
          const bad = firstBad(root);
          if (bad) {
            layout(root);
            steps.push(DS.mkStep(treeScene(root, { [bad.key]: "r" }), "插入 " + c.vals[2] + " 后结点 " + bad.v + " 失衡：bf = " + bf(bad) + "（红）。", { stats: { 场景: c.name, 操作: "检测失衡" } }));
            const before = root;
            // 单旋转
            if (c.name === "LL") {
              layout(root);
              steps.push(DS.mkStep(treeScene(root, { [root.key]: "r", [root.left && root.left.key]: "y" }, null, [{ t: "text", key: "rt", x: 0, y: -150, text: "右旋：20 与 30 辅轴互换角色", size: 13, color: C_C, bold: true }]), "LL 型修复：以 " + root.v + "（红）为轴右旋。", { stats: { 场景: c.name, 旋转: "右旋" } }));
              root = rotR(root);
            } else if (c.name === "RR") {
              layout(root);
              steps.push(DS.mkStep(treeScene(root, { [root.key]: "r", [root.right && root.right.key]: "y" }), "RR 型修复：以 " + root.v + " 为轴左旋。", { stats: { 场景: c.name, 旋转: "左旋" } }));
              root = rotL(root);
            } else if (c.name === "LR") {
              const lc = root.left;
              layout(root);
              steps.push(DS.mkStep(treeScene(root, { [lc.key]: "y" }), "LR 型第一步：先对左孩子 " + lc.v + " 左旋。", { stats: { 场景: c.name, 旋转: "左旋(第一步)" } }));
              root.left = rotL(root.left);
              layout(root);
              steps.push(DS.mkStep(treeScene(root, { [root.key]: "r" }), "LR 型第二步：再对 " + root.v + " 右旋。", { stats: { 场景: c.name, 旋转: "右旋(第二步)" } }));
              root = rotR(root);
            } else if (c.name === "RL") {
              const rc = root.right;
              layout(root);
              steps.push(DS.mkStep(treeScene(root, { [rc.key]: "y" }), "RL 型第一步：先对右孩子 " + rc.v + " 右旋。", { stats: { 场景: c.name, 旋转: "右旋(第一步)" } }));
              root.right = rotR(root.right);
              layout(root);
              steps.push(DS.mkStep(treeScene(root, { [root.key]: "r" }), "RL 型第二步：再对 " + root.v + " 左旋。", { stats: { 场景: c.name, 旋转: "左旋(第二步)" } }));
              root = rotL(root);
            }
            layout(root);
            steps.push(DS.mkStep(treeScene(root, {}), "🏁 旋转完成！所有结点 |bf| ≤ 1，中序依然是升序：" + inorder(root).join(", "), { stats: { 场景: c.name, 树高: root.h } }));
          }
          return { steps };

          function bfList(n) {
            const out = [];
            (function g(x) { if (!x) return; g(x.left); out.push(x.v + "(" + bf(x) + ")"); g(x.right); })(n);
            return out.join(" ");
          }
          function inorder(n) {
            const out = [];
            (function g(x) { if (!x) return; g(x.left); out.push(x.v); g(x.right); })(n);
            return out;
          }
          function firstBad(n) {
            if (!n) return null;
            if (Math.abs(bf(n)) > 1) return n;
            return firstBad(n.left) || firstBad(n.right);
          }
        }
      }
    ],

    cPresets: [
      {
        id: "height",
        name: "递归计算树高与平衡因子",
        mode: "tree",
        code: `/* 树高递归：h = 1 + max(h(左), h(右))
   构建小树并计算每个结点高度 */
struct Node {
  int data;
  struct Node* left;
  struct Node* right;
};
int height(struct Node* n){
  if(n == NULL) return 0;
  int l = height(n->left);
  int r = height(n->right);
  if(l > r) return l + 1;
  return r + 1;
}
int main(){
  struct Node* n30 = malloc(sizeof(struct Node));
  n30->data = 30;
  struct Node* n20 = malloc(sizeof(struct Node));
  n20->data = 20; n20->left = NULL; n20->right = NULL;
  struct Node* n40 = malloc(sizeof(struct Node));
  n40->data = 40; n40->left = NULL; n40->right = NULL;
  n30->left = n20;
  n30->right = n40;
  printf("height=...\\n");
  printf("h=%d\\n", height(n30));
  return 0;
}`,
        lineNotes: {
          7: "递归基线：空树高度为 0。",
          8: "先递归求左子树高度。",
          9: "再递归求右子树高度。",
          10: "取较大者 +1：后序遍历思想。"
        }
      },
      {
        id: "rot",
        name: "LL 型右旋（C）",
        mode: "tree",
        code: `/* 右旋：左孩子上位，原根变右子树 */
struct Node {
  int data;
  struct Node* left;
  struct Node* right;
};
struct Node* rotR(struct Node* x){
  struct Node* y = x->left;
  x->left = y->right;
  y->right = x;
  return y;
}
int main(){
  struct Node* n30 = malloc(sizeof(struct Node));
  n30->data = 30;
  struct Node* n20 = malloc(sizeof(struct Node));
  n20->data = 20;
  struct Node* n10 = malloc(sizeof(struct Node));
  n10->data = 10;
  n30->left = n20;
  n20->left = n10;
  n30->right = NULL;
  n20->right = NULL;
  n10->left = NULL;
  n10->right = NULL;
  struct Node* root = rotR(n30);
  printf("root=%d left=%d right=%d\\n", root->data, root->left->data, root->right->data);
  return 0;
}`,
        lineNotes: {
          8: "y 指向左孩子（即将上位）。",
          9: "x 接管 y 的右子树（BST 中序不变的关键！）。",
          10: "y 的右孩子指向 x。",
          18: "构造 LL 型失衡链：30←20←10。",
          27: "旋转后新根应为 20。"
        }
      },
      {
        id: "avl-insert",
        name: "AVL 插入 + 自动旋转（C）",
        mode: "tree",
        code: `/* AVL 插入：每次插入后算平衡因子，失衡立刻旋转 */
typedef struct Node {
  int data;
  int h;
  struct Node *left;
  struct Node *right;
} Node;
Node *newNode(int v){
  Node *p = malloc(sizeof(Node));
  p->data = v;
  p->h = 1;
  p->left = NULL;
  p->right = NULL;
  return p;
}
int height(Node *t){
  if(t == NULL) return 0;
  return t->h;
}
int maxv(int a, int b){
  if(a > b) return a;
  return b;
}
void upd(Node *t){
  t->h = 1 + maxv(height(t->left), height(t->right));
}
Node *rotR(Node *y){
  Node *x = y->left;
  Node *t2 = x->right;
  x->right = y;
  y->left = t2;
  upd(y);
  upd(x);
  return x;
}
Node *rotL(Node *x){
  Node *y = x->right;
  Node *t2 = y->left;
  y->left = x;
  x->right = t2;
  upd(x);
  upd(y);
  return y;
}
Node *insert(Node *t, int v){
  if(t == NULL) return newNode(v);
  if(v < t->data) t->left = insert(t->left, v);
  else t->right = insert(t->right, v);
  upd(t);
  int bf = height(t->left) - height(t->right);
  if(bf > 1 && v < t->left->data) return rotR(t);
  if(bf < -1 && v > t->right->data) return rotL(t);
  if(bf > 1 && v > t->left->data){
    t->left = rotL(t->left);
    return rotR(t);
  }
  if(bf < -1 && v < t->right->data){
    t->right = rotR(t->right);
    return rotL(t);
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
  int vals[5] = {10, 20, 30, 25, 5};
  int i;
  for(i = 0; i < 5; i++){
    root = insert(root, vals[i]);
    printf("插入 %d 后根=%d 高=%d\\n", vals[i], root->data, root->h);
  }
  printf("中序: ");
  inorder(root);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          3: "h 存「以本结点为根的子树高度」，用于算平衡因子。",
          9: "新结点初始高度 1。",
          17: "空树高度记 0。",
          27: "插入或旋转后，重新计算高度 = 1 + 较高子树。",
          30: "右旋：以 y 为轴，把 y 的左孩子 x 提上来。",
          31: "x 接管 y 的右子树（保证中序不变）。",
          32: "y 成为 x 的右孩子。",
          39: "左旋：对称操作。",
          49: "递归插入（BST 规则）。",
          52: "回溯路上更新高度。",
          53: "平衡因子 = 左高 - 右高，绝对值 > 1 就失衡。",
          54: "LL 型（左边偏左）→ 一次右旋。",
          55: "RR 型（右边偏右）→ 一次左旋。",
          56: "LR 型：先对左孩子左旋，再整体右旋。",
          60: "RL 型：先对右孩子右旋，再整体左旋。",
          72: "连续插入 5 个数（10→20→30 会触发旋转，25、5 再各触发一次）。",
          73: "每插一个就打印当前根与树高：能看到根在不断变化（旋转所致）。",
          77: "中序仍是升序——旋转只改形状不改顺序。"
        }
      }
    ]
  });
})();