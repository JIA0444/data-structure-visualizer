/* 随机代码泛化性验证：这些代码不存在于网站任何预设中
   运行：node test/arbitrary-test.js */
global.window = global;
require("../js/core/cinterp.js");
require("../js/core/codeviz.js");
require("../js/core/helpers.js");

let pass = 0, fail = 0;
function T(name, src, expectOut, expectErr) {
  const r = DS.cinterp.run(src);
  const out = (r.stdout || []).join("");
  let ok = true, detail = "";
  if (expectErr) {
    if (r.ok) { ok = false; detail = "本应报错却成功"; }
    else detail = "按预期报错@" + r.error.line + ": " + r.error.message + (r.partial ? "（有部分轨迹 " + r.trace.length + " 条）" : "");
  } else {
    if (!r.ok) { ok = false; detail = "报错: " + r.error.message + "@" + r.error.line; }
    else if (out.indexOf(expectOut) === -1) { ok = false; detail = `输出 "${out}" 不含 "${expectOut}"`; }
  }
  if (!ok) {
    fail++;
    console.log(`✗ ${name} ${detail}`);
  } else {
    pass++;
    const steps = r.trace ? r.trace.length : 0;
    // 验证 codeviz 能对这段随机代码产出动画步骤
    const vz = r.ok || r.partial ? DS.codeviz.build(src, r, { mode: "auto" }) : null;
    const vzSteps = vz && vz.ok ? vz.steps.length : 0;
    console.log(`✓ ${name} → ${steps} 步, 动画步骤 ${vzSteps}, 视图: ${vz ? vz.mode : "-"}  ${expectErr ? "(" + detail + ")" : ("输出: " + out.trim().slice(0, 40))}`);
  }
}

/* 1. 最大公约数（欧几里得辗转相除） */
T("最大公约数", `
int main(){
  int a = 48, b = 18;
  while(b != 0){
    int t = a % b;
    a = b;
    b = t;
  }
  printf("gcd=%d\\n", a);
  return 0;
}`, "gcd=6");

/* 2. 十进制转二进制（倒序余数） */
T("十进制转二进制", `
int main(){
  int n = 42;
  int bits[8];
  int k = 0;
  while(n > 0){
    bits[k] = n % 2;
    n = n / 2;
    k++;
  }
  int i;
  for(i = k - 1; i >= 0; i--) printf("%d", bits[i]);
  return 0;
}`, "101010");

/* 3. 素数筛（简化版：逐个检测 2..30 的素数） */
T("素数检测", `
int main(){
  int n, i;
  for(n = 2; n <= 20; n++){
    int isp = 1;
    for(i = 2; i < n; i++){
      if(n % i == 0){ isp = 0; break; }
    }
    if(isp == 1) printf("%d ", n);
  }
  return 0;
}`, "2 3 5 7 11 13 17 19");

/* 4. 统计字符出现次数（'a' 计数，含嵌套 if） */
T("字符统计", `
int main(){
  char s[10] = {'a', 'b', 'a', 'c', 'a', 'd', 'a', 'e', 'a', '\\0'};
  int i = 0;
  int cnt = 0;
  while(s[i] != '\\0'){
    if(s[i] == 'a') cnt++;
    i++;
  }
  printf("a:%d\\n", cnt);
  return 0;
}`, "a:5");

/* 5. 运行时中途崩溃：第 3 次循环时数组越界（验证部分轨迹） */
T("越界崩溃(部分轨迹)", `
int main(){
  int a[3] = {1, 2, 3};
  int i;
  int sum = 0;
  for(i = 0; i < 6; i++){
    sum += a[i];
  }
  printf("%d\\n", sum);
  return 0;
}`, null, true);

/* 6. 除零崩溃 */
T("除零崩溃(部分轨迹)", `
int main(){
  int x = 10;
  int y = 0;
  int z = x / y;
  printf("%d\\n", z);
  return 0;
}`, null, true);

/* 7. 语法错误（goto 仍不支持，应行号报错且无轨迹） */
T("语法错误(goto不支持)", `
int main(){
  int x = 2;
  goto end;
  x = 3;
  return 0;
}`, null, true);

console.log(`\n===== 随机代码验证: ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);