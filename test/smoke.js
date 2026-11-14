/* 冒烟测试：加载所有结构模块，跑每个 demo 的 build 与每个 C 预设的解释器执行
   运行：node test/smoke.js */
global.window = global;

require("../js/core/helpers.js");
require("../js/core/render.js");
require("../js/core/engine.js");
require("../js/core/cinterp.js");
require("../js/core/codeviz.js");

// 注册表兜底（应用运行时在 helpers 里已有）
if (!window.DS.structures) window.DS.structures = { list: [], byId: {}, register(m) { this.list.push(m); this.byId[m.id] = m; } };

const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "js", "structures");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));

let demos = 0, demoFail = 0, presets = 0, presetFail = 0, notesBad = 0;

for (const f of files) {
  require(path.join(dir, f));
}

function defaultInputs(demo) {
  const out = {};
  for (const inp of demo.inputs || []) {
    out[inp.key] = inp.type === "select" ? (inp.options[0][0] || inp.def) : String(inp.def);
  }
  return out;
}

for (const m of DS.structures.list) {
  console.log(`\n=== ${m.emoji} ${m.name} (${m.id}) ===`);
  for (const d of m.demos || []) {
    demos++;
    try {
      const res = d.build(defaultInputs(d));
      if (!res || !Array.isArray(res.steps) || !res.steps.length) {
        demoFail++;
        console.log(`  ✗ demo[${d.id}] 未产生步骤`);
      } else {
        console.log(`  ✓ demo[${d.id}] → ${res.steps.length} 步`);
        // 校验每个 step 结构
        let bad = 0;
        for (let i = 0; i < res.steps.length; i++) {
          const s = res.steps[i];
          if (!s || typeof s.text !== "string" || !s.scene || !Array.isArray(s.scene.elements)) bad++;
          if (s.scene && s.scene.elements.some(e => !e || !e.t || e.key === undefined)) {
            console.log(`    ⚠ step[${i}] 存在无 key/类型的元素`);
          }
        }
        if (bad) { demoFail++; console.log(`  ✗ demo[${d.id}] 有 ${bad} 个坏步骤`); }
      }
    } catch (e) {
      demoFail++;
      console.log(`  ✗ demo[${d.id}] 异常: ${e && e.message}`);
    }
  }
  for (const p of m.cPresets || []) {
    presets++;
    const r = DS.cinterp.run(p.code, { stdin: p.stdin || "" });
    const expectError = /error-demo/.test(p.id || "");
    const lineCount = p.code.split("\n").length;
    // lineNotes 行号范围检查
    let noteOK = true;
    if (p.lineNotes) {
      for (const ln of Object.keys(p.lineNotes)) {
        if (Number(ln) < 1 || Number(ln) > lineCount) { noteOK = false; notesBad++; }
      }
    }
    if (expectError) {
      if (r.ok) { presetFail++; console.log(`  ✗ preset[${p.id}] 本应报错却通过了`); }
      else console.log(`  ✓ preset[${p.id}] 按预期报错: ${r.error.message}`);
      continue;
    }
    if (!r.ok) {
      presetFail++;
      console.log(`  ✗ preset[${p.id}] 执行失败 第${r.error.line}行: ${r.error.message}`);
    } else {
      const st = r.stdout.join("");
      console.log(`  ✓ preset[${p.id}] → ${r.trace.length} 步, 输出 "${st.slice(0, 50).replace(/\n/g, "\\n")}"${noteOK ? "" : "（lineNotes 有越界行号）"}`);
    }
  }
}

console.log(`\n===== demos: ${demos - demoFail}/${demos} 通过 | presets: ${presets - presetFail}/${presets} 通过 | lineNotes 越界: ${notesBad} =====`);
process.exit(demoFail + presetFail ? 1 : 0);