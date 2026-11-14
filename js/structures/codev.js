/* ==========================================================
   codev.js — 代码实验室（自由导入 C 代码）
   ========================================================== */
(function () {
  DS.structures.register({
    id: "codev",
    name: "代码实验室",
    emoji: "🧪",
    category: "综合工具",
    badge: "实验室",
    tags: ["导入代码", "C解释器", "指针", "malloc"],
    summary: "自由编写 / 导入 C 代码，内置解释器逐步执行，自动识别链表/树/数组/内存视图，画出指针与变量变化。",

    overview: `
<div class="md"><h3>🧪 这个页面能做什么</h3>
<p>在「💻 代码可视化」标签里<b>写代码、从剪贴板粘贴、或直接导入 .c 文件</b>，点 ▶ 运行，内置的 C 子集解释器会：</p>
<ol>
<li><b>逐条执行</b>语句，记录每一步的变量值、内存对象（malloc）与指针关系；</li>
<li><b>自动选择视图</b>：看到 struct 有 next 字段 → 链表视图；有 left/right → 树视图；出现数组 → 数组视图；也可手动切换「内存视图」看所有对象；</li>
<li>面板同步显示<b>变量变化（黄闪）、printf 输出、函数调用栈（递归可见）</b>；</li>
<li>语法/运行时错误的<b>精确行号 + 中文解释</b>。</li>
</ol>
<div class="callout">💡 建议：先在左侧下拉框选一个内置示例跑一遍，再改数字、加循环，体会每一行代码对内存的影响。</div>
</div>
<div class="md"><h3>📜 解释器支持的语言子集</h3>
<table>
<tr><th>类别</th><th>支持</th></tr>
<tr><td>类型</td><td><code>int</code>、<code>char</code>、指针 <code>T*</code>、<code>struct</code> / <code>typedef struct</code>（+别名如 Node）、结构体数组、指针数组</td></tr>
<tr><td>变量/数组</td><td>声明+初始化、<code>int a[5]</code>、<code>int a[] = {1,2,3}</code>、<b>二维数组</b> <code>int m[2][3] = {{...}}</code>、字符串 <code>char s[] = "hello"</code>、下标访问（带越界检查）</td></tr>
<tr><td>内存</td><td><code>malloc(sizeof(struct Node))</code>、<code>free(p)</code>、<code>NULL</code>、<code>sizeof(int)</code></td></tr>
<tr><td>语句</td><td>if / else、while、for、<b>do-while</b>、<b>switch / case / default</b>、break、continue、return、{} 块作用域</td></tr>
<tr><td>函数</td><td>自定义函数、<b>递归</b>（深度 ≤ 64）、数组/二维数组做参数（引用语义）、指针/数值返回值、<code>int main(void)</code></td></tr>
<tr><td>表达式</td><td>+ − * / %、比较、逻辑 &&/||/!、<b>三元 a?b:c</b>、<b>逗号表达式</b>、<b>位运算 & | ^ ~ &lt;&lt; &gt;&gt;</b>、<code>++ -- += -= *= /= %=</code>、<code>&</code> 取址、<code>*</code> 解引用、<code>-&gt;</code>、<code>.</code>、类型转换 <code>(Node*)x</code></td></tr>
<tr><td>输入输出</td><td><code>printf("%d %s %c %p %x")</code>、<b><code>scanf("%d %s %c")</code></b>（数据来自下方「标准输入」框）、转义 \\n \\t</td></tr>
<tr><td>预处理/库</td><td><code>#include</code> 行自动忽略、<code>#define</code> 对象宏、内置 <code>strlen / strcmp / strcpy / strcat</code></td></tr>
</table>
<h4>不支持（会给出明确报错）</h4>
<p><code>goto / 位域 / 联合体 / 三维以上数组 / 函数指针 / 标准库函数（除 printf·scanf·malloc·free·str*）/ 结构体数组的 { } 初始化</code> 等。</p>
<div class="callout">💡 提示：<code>scanf</code> 需要的数据写在左侧面板下方「⌨️ 标准输入」框里；若读取时数据不足，会在动画头部给出明确的行号报错。</div>
<div class="callout err">⚠️ 保护机制：最多执行 <b>700 步</b>、递归深度 ≤ <b>64</b>——防止死循环卡死浏览器。</div>
</div>
<div class="md"><h3>🔎 常见报错速查</h3>
<table>
<tr><th>报错</th><th>原因与排查</th></tr>
<tr><td>未定义的变量 'x'</td><td>变量未声明或声明在另一个块中（作用域）；C 要求先声明后使用</td></tr>
<tr><td>数组越界</td><td>下标 ≥ 数组长度或为负；注意下标从 0 开始</td></tr>
<tr><td>解引用 NULL 指针</td><td>对 NULL 用 <code>*p</code> 或 <code>p-&gt;field</code>；先判断 <code>if(p != NULL)</code></td></tr>
<tr><td>除数为 0</td><td>整数除法/取模右操作数为 0</td></tr>
<tr><td>执行步数超过 700</td><td>循环条件写错导致死循环；检查边界变量是否更新</td></tr>
<tr><td>缺少 ';' / 意外的符号</td><td>语句结束没写分号；中英文标点混用（分号必须半角 ;）</td></tr>
</table>
</div>`,

    complexity: [
      { op: "解释执行", 平均: "O(语句步数)", 最坏: "≤700 步", 空间: "O(变量+堆对象)", 稳定性: "—", 说明: "教学解释器，非真实编译器" }
    ],

    demos: [],

    cPresets: [
      {
        id: "hello",
        name: "第一个程序：变量与 printf",
        mode: "memory",
        code: `/* 变量与输出：观察右侧变量面板 */
int main(){
  int a = 10;
  int b = 3;
  int sum = a + b;
  int mul = a * b;
  int quo = a / b;
  int rem = a % b;
  printf("%d + %d = %d\\n", a, b, sum);
  printf("%d * %d = %d\\n", a, b, mul);
  printf("%d / %d = %d 余 %d\\n", a, b, quo, rem);
  return 0;
}`,
        lineNotes: {
          3: "整型变量 a 赋初值 10。",
          4: "变量 b = 3。",
          7: "整数除法：10/3 = 3（向下取整，不是 3.33！）。",
          8: "% 取模：10%3 = 1。"
        }
      },
      {
        id: "factorial",
        name: "递归：阶乘函数",
        mode: "memory",
        code: `/* 递归阶乘：观察「调用栈」面板的变化 */
int fac(int n){
  if(n <= 1) return 1;
  return n * fac(n - 1);
}
int main(){
  int r = fac(5);
  printf("5! = %d\\n", r);
  return 0;
}`,
        lineNotes: {
          3: "递归基线：n ≤ 1 时返回 1，不再深入。",
          4: "递归：n × fac(n-1)——注意每一层调用都压入调用栈。"
        }
      },
      {
        id: "ptr",
        name: "指针：取址与解引用",
        mode: "memory",
        code: `/* 指针三件套：&取址、*解引用、swap */
void swap(int* a, int* b){
  int t = *a;
  *a = *b;
  *b = t;
}
int main(){
  int x = 3;
  int y = 8;
  int* p = &x;
  *p = 100;
  swap(&x, &y);
  printf("x=%d y=%d\\n", x, y);
  return 0;
}`,
        lineNotes: {
          3: "参数是指针：接收变量的地址。",
          4: "*a 解引用：取 a 指向的值。",
          11: "&x 取地址，赋给指针 p。",
          12: "*p = 100 等价于 x = 100！"
        }
      },
      {
        id: "array",
        name: "数组：遍历与累加",
        mode: "array",
        code: `/* 数组视图：观察每次按下标访问 a[i] 的格子高亮 */
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
          3: "数组 a 含 6 个元素，array 视图下每个元素一格。",
          6: "sum 初始 0。",
          7: "for 循环：i 从 0 到 5（下标从 0 起）。",
          8: "sum += a[i]：随机访问第 i 格。",
          10: "输出累加结果。"
        }
      },
      {
        id: "tree",
        name: "二叉树：递归先序遍历",
        mode: "tree",
        code: `/* 二叉树先序遍历：根 -> 左 -> 右 */
struct Node {
  int data;
  struct Node* left;
  struct Node* right;
};
struct Node* mk(int v){
  struct Node* p = malloc(sizeof(struct Node));
  p->data = v;
  p->left = NULL;
  p->right = NULL;
  return p;
}
int main(){
  struct Node* a = mk(5);
  struct Node* b = mk(3);
  struct Node* c = mk(8);
  a->left = b;
  a->right = c;
  b->left = mk(1);
  c->right = mk(9);
  printf("%d %d %d\\n", a->data, a->left->data, a->right->data);
  return 0;
}`,
        lineNotes: {
          7: "mk 函数：malloc 一个结点并赋 data。",
          15: "创建根结点 a（data=5）。",
          18: "a 的左孩子是 b(3)、右孩子是 c(8)。",
          20: "再给 b 挂左孩子 1、c 挂右孩子 9。",
          21: "tree 视图下能看到这棵二叉树的形状。"
        }
      },
      {
        id: "error-demo",
        name: "常见报错演示（试一试）",
        mode: "memory",
        code: `/* 把注释去掉试试不同报错 */
int main(){
  int a[3] = {1, 2, 3};
  int x = a[3];
  /* 数组越界：下标 3 超出 [0,2] */
  return 0;
}`,
        lineNotes: {
          3: "数组 a 只有 3 个元素，下标范围 0~2。",
          4: "a[3] 越界了！运行到这行会报错并停在崩溃前一步。"
        }
      },
      {
        id: "array2d",
        name: "二维数组：矩阵转置",
        mode: "array",
        code: `/* 二维数组：2×3 矩阵转置成 3×2，逐元素搬运 */
int main(){
  int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
  int b[3][2];
  int i;
  int j;
  for(i = 0; i < 2; i++){
    for(j = 0; j < 3; j++){
      b[j][i] = a[i][j];
    }
  }
  for(i = 0; i < 3; i++){
    for(j = 0; j < 2; j++){
      printf("%d ", b[i][j]);
    }
    printf("\\n");
  }
  return 0;
}`,
        lineNotes: {
          3: "a 是 2 行 3 列，array 视图分行显示。",
          4: "b 是转置后的 3 行 2 列。",
          7: "外层循环走原矩阵的行。",
          8: "内层循环走原矩阵的列。",
          9: "转置关键：b[列][行] = a[行][列]（行列对调）。",
          12: "打印转置结果：3 行 2 列。"
        }
      },
      {
        id: "struct-demo",
        name: "结构体：字段赋值",
        mode: "memory",
        code: `/* 结构体：观察 memory 视图里的对象与字段 */
struct Point {
  int x;
  int y;
};
int main(){
  struct Point p;
  p.x = 3;
  p.y = p.x * 2;
  printf("%d,%d\\n", p.x, p.y);
  return 0;
}`,
        lineNotes: {
          3: "定义结构体 Point（x、y 两个字段）。",
          7: "声明结构体变量 p。",
          8: "给字段 p.x 赋值 3。",
          9: "p.y = p.x * 2 = 6。",
          10: "memory 视图能看到 Point 对象及其字段。"
        }
      },
      {
        id: "scanf-demo",
        name: "scanf：标准输入",
        mode: "memory",
        stdin: "20 15",
        code: `/* scanf 从「标准输入」框读数据 */
int main(){
  int a, b;
  scanf("%d %d", &a, &b);
  int s = a + b;
  printf("%d + %d = %d\\n", a, b, s);
  return 0;
}`,
        lineNotes: {
          3: "声明两个变量 a、b。",
          4: "scanf 按「标准输入」框里的数据给 a、b 赋值（在此框填：20 15）。",
          5: "求和。",
          6: "输出。"
        }
      },
      {
        id: "bitwise",
        name: "位运算：& | ^ ~ << >>",
        mode: "memory",
        code: `/* 位运算：观察各运算符的结果 */
int main(){
  int a = 6;   /* 0110 */
  int b = 3;   /* 0011 */
  int and = a & b;
  int or  = a | b;
  int xor = a ^ b;
  int not = ~a;
  int shl = a << 2;
  int shr = a >> 1;
  printf("&=%d |=|%d ^=%d ~=%d <<=%d >>=%d\\n", and, or, xor, not, shl, shr);
  return 0;
}`,
        lineNotes: {
          3: "a=6（二进制 0110）。",
          4: "b=3（二进制 0011）。",
          6: "按位与：0110 & 0011 = 0010 = 2。",
          7: "按位或：0110 | 0011 = 0111 = 7。",
          8: "按位异或：0110 ^ 0011 = 0101 = 5。",
          9: "按位取反：~0110 = ...1001 = -7。",
          10: "左移：0110 << 2 = 11000 = 24。",
          11: "右移：0110 >> 1 = 0011 = 3。"
        }
      },
      {
        id: "macro",
        name: "宏与 #define",
        mode: "memory",
        code: `/* 预处理：#include 忽略、#define 展开 */
#include <stdio.h>
#define MAXN 10
#define LIMIT (MAXN - 2)
int main(){
  int i;
  int sum = 0;
  for(i = 0; i < LIMIT; i++){
    sum += i;
  }
  printf("sum=%d\\n", sum);
  return 0;
}`,
        lineNotes: {
          2: "#include 行被解释器自动忽略。",
          3: "宏 MAXN 定义为 10。",
          4: "宏 LIMIT 定义为 (MAXN-2)=8（宏可引用宏）。",
          8: "循环 i 从 0 到 LIMIT-1 = 7。",
          11: "输出 0+1+...+7 = 28。"
        }
      },
      {
        id: "hanoi",
        name: "汉诺塔（经典递归）",
        mode: "memory",
        code: `/* 汉诺塔：把 n 个盘子从 A 柱经 B 柱搬到 C 柱 */
void hanoi(int n, char from, char via, char to){
  if(n == 1){
    printf("%c -> %c\\n", from, to);
    return;
  }
  hanoi(n - 1, from, to, via);
  printf("%c -> %c\\n", from, to);
  hanoi(n - 1, via, from, to);
}
int main(){
  hanoi(3, 'A', 'B', 'C');
  return 0;
}`,
        lineNotes: {
          3: "递归基线：只剩一个盘子，直接搬。",
          7: "先把 n-1 个搬到中转柱（递归）。",
          8: "再把最大的盘子搬到目标柱。",
          9: "最后把 n-1 个从中转柱搬到目标柱（递归）。",
          12: "观察「调用栈」面板：递归层层压栈再弹出。"
        }
      }
    ]
  });
})();