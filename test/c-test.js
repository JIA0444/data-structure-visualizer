/* C 解释器测试：node test/c-test.js */
global.window = global;
require("../js/core/cinterp.js");

let pass = 0, fail = 0;
function T(name, src, checks) {
  const r = DS.cinterp.run(src);
  let ok = true, msgs = [];
  for (const c of checks) {
    const [kind, key, expect] = c;
    let actual;
    if (kind === "stdout") actual = r.stdout ? r.stdout.join("") : "";
    else if (kind === "err") actual = (r.error && r.error.message) || "";
    else if (kind === "errline") actual = r.error ? r.error.line : -1;
    else if (kind === "trace") actual = r.trace ? r.trace.length : -1;
    const good = String(actual).indexOf(String(expect)) !== -1 || actual === String(expect);
    if (!good) { ok = false; msgs.push(`  [${key}] 期望包含 "${expect}" 实际为 "${actual}"`); }
  }
  const last = r.trace && r.trace.length ? r.trace[r.trace.length - 1] : null;
  if (ok) {
    pass++;
    console.log(`✓ ${name}  (${r.trace ? r.trace.length : 0} 步) 最后快照: ${last ? JSON.stringify(last.vars).slice(0, 160) : "-"}`);
  } else {
    fail++;
    console.log(`✗ ${name}`);
    msgs.forEach(m => console.log(m));
    if (last) console.log("   末 snapshot:", JSON.stringify(last).slice(0, 300));
  }
}

/* 1. 基础运算与循环 */
T("求和 + for 循环", `
int main(){
  int sum = 0;
  int i;
  for(i=1;i<=5;i++){
    sum += i;
  }
  printf("sum=%d\\n", sum);
  return 0;
}`, [["stdout", "sum", "sum=15"]]);

/* 2. 数组与冒泡排序 */
T("冒泡排序（数组、swap 函数、& 取址）", `
void swap(int *a, int *b){
  int t = *a;
  *a = *b;
  *b = t;
}
int main(){
  int a[5] = {5, 2, 9, 1, 7};
  int i, j;
  for(i=0;i<4;i++){
    for(j=0;j<4-i;j++){
      if(a[j] > a[j+1]){
        swap(&a[j], &a[j+1]);
      }
    }
  }
  for(i=0;i<5;i++) printf("%d ", a[i]);
  printf("\\n");
  return 0;
}`, [["stdout", "sorted", "1 2 5 7 9"]]);

/* 3. 链表：malloc + 头插 + 遍历 + 释放 */
T("单链表（struct/malloc/->/free）", `
struct Node {
  int data;
  struct Node* next;
};
int main(){
  struct Node* head = NULL;
  int i;
  for(i=1;i<=4;i++){
    struct Node* p = malloc(sizeof(struct Node));
    p->data = i * 10;
    p->next = head;
    head = p;
  }
  struct Node* cur = head;
  while(cur != NULL){
    printf("%d ", cur->data);
    cur = cur->next;
  }
  printf("\\n");
  cur = head;
  while(cur != NULL){
    struct Node* tmp = cur->next;
    free(cur);
    cur = tmp;
  }
  return 0;
}`, [["stdout", "link", "40 30 20 10"]]);

/* 4. typedef 别名 + 递归 + 尾插 */
T("typedef 别名 + 尾插函数", `
typedef struct Node {
  int data;
  struct Node* next;
} Node;
Node* tailInsert(Node* head, int v){
  Node* p = malloc(sizeof(Node));
  p->data = v;
  p->next = NULL;
  if(head == NULL) return p;
  Node* cur = head;
  while(cur->next != NULL) cur = cur->next;
  cur->next = p;
  return head;
}
int main(){
  Node* head = NULL;
  head = tailInsert(head, 3);
  head = tailInsert(head, 1);
  head = tailInsert(head, 4);
  Node* cur = head;
  while(cur != NULL){
    printf("%d ", cur->data);
    cur = cur->next;
  }
  printf("\\n");
  return 0;
}`, [["stdout", "tail", "3 1 4"]]);

/* 5. 递归：快速排序 */
T("递归快速排序", `
void qs(int a[], int l, int r){
  if(l >= r) return;
  int p = a[l];
  int i = l, j = r;
  while(i < j){
    while(i < j && a[j] >= p) j--;
    a[i] = a[j];
    while(i < j && a[i] <= p) i++;
    a[j] = a[i];
  }
  a[i] = p;
  qs(a, l, i - 1);
  qs(a, i + 1, r);
}
int main(){
  int a[8] = {8, 3, 6, 1, 9, 2, 7, 4};
  qs(a, 0, 7);
  int i;
  for(i=0;i<8;i++) printf("%d ", a[i]);
  return 0;
}`, [["stdout", "qs", "1 2 3 4 6 7 8 9"]]);

/* 6. 二分查找 */
T("二分查找", `
int main(){
  int a[8] = {2, 5, 8, 12, 16, 23, 38, 56};
  int target = 23;
  int lo = 0, hi = 7;
  int found = -1;
  while(lo <= hi){
    int mid = (lo + hi) / 2;
    if(a[mid] == target){ found = mid; break; }
    else if(a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  if(found != -1) printf("找到 a[%d]=%d\\n", found, target);
  else printf("未找到\\n");
  return 0;
}`, [["stdout", "bin", "找到 a[5]=23"]]);

/* 7. 结构体按值变量 + 字段赋值 */
T("结构体变量字段", `
struct Point { int x; int y; };
int main(){
  struct Point p;
  p.x = 3;
  p.y = p.x * 2;
  printf("%d,%d\\n", p.x, p.y);
  return 0;
}`, [["stdout", "pt", "3,6"]]);

/* 8. 错误：未定义变量（含行号） */
T("错误定位：未定义变量", `
int main(){
  int a = 1;
  b = 5;
  return 0;
}`, [["errline", "l", 4]]);

/* 9. 错误：除 0 */
T("错误定位：除数为 0", `
int main(){
  int a = 10, b = 0;
  int c = a / b;
  return 0;
}`, [["err", "div", "除数为 0"]]);

/* 10. 死循环保护 */
T("死循环保护（超 700 步）", `
int main(){
  int i = 0;
  while(1){ i = i + 1; }
  return 0;
}`, [["err", "loop", "超过 700 步"]]);

/* 11. 递归函数 + NULL 判断 */
T("字符串输出 + 字符", `
int main(){
  char c = 'A';
  int n = f(4);
  printf("%c%d\\n", c, n);
  return 0;
}
int f(int n){
  if(n <= 1) return 1;
  return n * f(n - 1);
}`, [["stdout", "rec", "A24"]]);

/* 12. main 无参 (void) 与 break/continue */
T("break / continue", `
int main(){
  int i, sum = 0;
  for(i=1;i<=10;i++){
    if(i == 3) continue;
    if(i == 6) break;
    sum += i;
  }
  printf("%d\\n", sum);
  return 0;
}`, [["stdout", "bc", "12"]]);

/* 13. 栈应用：数组模拟栈 */
T("数组模拟栈", `
int main(){
  int st[10];
  int top = -1;
  st[++top] = 5;
  st[++top] = 9;
  int v = st[top--];
  printf("pop=%d top=%d\\n", v, top);
  return 0;
}`, [["stdout", "st", "pop=9 top=0"]]);

/* 14. 报错：数组越界 */
T("错误定位：数组越界", `
int main(){
  int a[3] = {1, 2, 3};
  int x = a[5];
  return 0;
}`, [["err", "oob", "数组越界"]]);

console.log(`\n===== 通过 ${pass} / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);