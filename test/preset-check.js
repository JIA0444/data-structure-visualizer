/* preset-check.js — 跑指定模块的全部 C 预设，报告是否通过 / 步骤数 / 输出
   用法: node test/preset-check.js [moduleId]   （省略则检查全部模块） */
global.window = global;
require("../js/core/helpers.js");
require("../js/core/cinterp.js");
require("../js/core/render.js");
require("../js/core/codeviz.js");

const MODULES = [
  "array", "linkedlist", "stack", "queue", "searching", "sorting",
  "hashtable", "binarytree", "bst", "avl", "heap", "graph", "strings", "codev"
];
for (const id of MODULES) {
  try { require("../js/structures/" + id + ".js"); } catch (e) { console.log("LOAD-FAIL", id, e.message); }
}

const only = process.argv[2];
let total = 0, fail = 0, thin = [];
for (const id of MODULES) {
  const m = DS.structures.byId[id];
  if (!m || !m.cPresets) continue;
  if (only && only !== id) continue;
  console.log("\n=== " + m.name + " (" + id + ") · " + m.cPresets.length + " 段 C 代码 ===");
  for (const p of m.cPresets) {
    total++;
    const r = DS.cinterp.run(p.code, { stdin: p.stdin || "" });
    const expectErr = /error-demo|错误/.test(p.id + p.name);
    if (!r.ok) {
      if (expectErr) { console.log("  ✓ " + p.id + "（按预期报错）"); }
      else { fail++; console.log("  ✗ " + p.id + " 第" + r.error.line + "行: " + r.error.message); }
      continue;
    }
    // 检查 lineNotes 越界
    const lineCount = p.code.split("\n").length;
    const badNotes = Object.keys(p.lineNotes || {}).filter(k => Number(k) < 1 || Number(k) > lineCount);
    // 检查最后一步是否保留变量
    const vz = DS.codeviz ? DS.codeviz.build(p.code, r, { mode: p.mode || "auto" }) : null;
    const lastStep = vz && vz.steps[vz.steps.length - 1];
    const keepVars = lastStep && lastStep.vars && lastStep.vars.length > 0;
    const stepsN = r.trace.length;
    if (stepsN < 6) thin.push(id + "." + p.id + "(" + stepsN + "步)");
    console.log("  " + (r.ok ? "✓" : "✗") + " " + p.id +
      " 步=" + stepsN +
      " 输出=" + JSON.stringify(r.stdout.join("")).slice(0, 42) +
      (vz ? " 末步变量=" + (keepVars ? lastStep.vars.length + "个" : "空!") : "") +
      (badNotes.length ? " ⚠lineNotes越界" + badNotes.join(",") : ""));
    if (vz && !keepVars) fail++;
  }
}
console.log("\n===== 总计 " + total + " 段 · 失败 " + fail + " · 步骤过少 " + thin.length + " =====");
if (thin.length) console.log("步骤过少: " + thin.join(", "));
process.exit(fail ? 1 : 0);