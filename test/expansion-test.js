/* 解释器扩展特性测试：node test/expansion-test.js */
global.window = global;
require("../js/core/cinterp.js");
require("../js/core/codeviz.js");
require("../js/core/helpers.js");

let pass = 0, fail = 0;
function T(name, src, expect, opts) {
  const r = DS.cinterp.run(src, opts || {});
  const out = (r.stdout || []).join("").trim();
  let ok = false, why = "";
  if (!r.ok) {
    if (expect && String(r.error.message).indexOf(expect) !== -1) ok = true;
    else why = "报错@" + r.error.line + ": " + r.error.message;
  } else if (out.indexOf(expect) !== -1) ok = true;
  else why = `输出 "${out}" 不含期望 "${expect}"`;
  if (!ok) fail++;
  else pass++;
  console.log((ok ? "✓" : "✗") + " " + name + (ok ? ` → ${r.trace.length} 步` : " " + why));
  // 动画步骤可构建性（除纯解析错误外）
  if (r.ok || r.partial) {
    const vz = DS.codeviz.build(src, r, { mode: "auto" });
    if (!vz.ok) { console.log("    ⚠ codeviz 构建失败"); }
  }
}

T("switch/case/default/break", `
int main(){
  int day = 3;
  int fee = 0;
  switch(day){
    case 1: fee = 10;
    break;
    case 2: fee = 20;
    break;
    case 3:
    case 4: fee = 30;
    break;
    default: fee = 99;
  }
  printf("fee=%d\\n", fee);
  return 0;
}`, "fee=30");

T("switch 落到 default", `
int main(){
  int x = 8;
  int r = 0;
  switch(x){
    case 1: r = 1;
    break;
    default: r = -1;
  }
  printf("r=%d\\n", r);
  return 0;
}`, "r=-1");

T("do-while 至少执行一次", `
int main(){
  int i = 10;
  int cnt = 0;
  do{
    cnt++;
    i++;
  } while(i < 5);
  printf("%d\\n", cnt);
  return 0;
}`, "1");

T("三元运算符", `
int main(){
  int a = 7, b = 4;
  int m = a > b ? a : b;
  int s = a < b ? 1 : (a == b ? 0 : -1);
  printf("%d %d\\n", m, s);
  return 0;
}`, "7 -1");

T("逗号表达式（for 双变量）", `
int main(){
  int i, j;
  for(i = 0, j = 10; i < 4; i++, j--){
    printf("%d%d ", i, j);
  }
  printf("done\\n");
  return 0;
}`, "done");

T("位运算全套", `
int main(){
  int a = 6, b = 3;
  printf("%d ", a & b);
  printf("%d ", a | b);
  printf("%d ", a ^ b);
  printf("%d ", ~a);
  printf("%d ", a << 2);
  printf("%d\\n", a >> 1);
  return 0;
}`, "-7");

T("二维数组 + 嵌套初始化 + 读写", `
int main(){
  int m[2][3] = {{1, 2, 3}, {4, 5, 6}};
  m[1][2] = m[0][0] + m[0][2];
  printf("%d %d\\n", m[1][2], m[1][0]);
  return 0;
}`, "4 4");

T("二维数组扁平初始化", `
int main(){
  int m[2][2] = {1, 2, 3, 4};
  printf("%d\\n", m[0][0] + m[1][1]);
  return 0;
}`, "5");

T("结构体数组", `
struct Node { int data; int id; };
int main(){
  struct Node arr[3];
  arr[0].data = 11;
  arr[1].data = 22;
  arr[2].data = 33;
  int i;
  for(i = 0; i < 3; i++){
    arr[i].id = i;
  }
  printf("%d\\n", arr[1].id + arr[2].data);
  return 0;
}`, "34");

T("#include 忽略 + #define 宏", `
#include <stdio.h>
#define MAXN 10
#define LIMIT (MAXN - 2)
int main(){
  int i;
  int sum = 0;
  for(i = 0; i < LIMIT; i++){
    sum += i;
  }
  printf("%d\\n", sum);
  return 0;
}`, "28");

T("scanf 从标准输入读两个数", `
#include <stdio.h>
int main(){
  int a, b;
  scanf("%d %d", &a, &b);
  printf("get=%d\\n", a + b);
  return 0;
}`, "get=35", { stdin: "20 15" });

T("scanf 输入不足时报错提示", `
int main(){
  int x;
  scanf("%d", &x);
  return 0;
}`, "标准输入已用完", { stdin: "" });

T("字符串内建函数", `
#include <string.h>
int main(){
  char a[] = "hello";
  char b[20] = "world";
  char c[40] = "";
  printf("%d ", strlen(a));
  printf("%d ", strcmp(a, b));
  strcpy(c, a);
  strcat(c, b);
  printf("%s\\n", c);
  return 0;
}`, "helloworld");

T("字符数组逐位访问", `
int main(){
  char s[] = "abc";
  printf("%c%c%c\\n", s[0], s[1], s[2]);
  printf("len=%d\\n", strlen(s) + 0);
  return 0;
}`, "abc");

// strlen 未 include 也行（内置）
T("strlen 免 include", `
int main(){
  char s[] = "data";
  printf("%d\\n", strlen(s));
  return 0;
}`, "4");

console.log(`\n===== 扩展特性验证: ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);