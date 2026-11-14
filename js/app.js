/* ==========================================================
   app.js — 应用入口：路由、侧栏、首页、播放器、代码编辑器
   ========================================================== */
window.DS = window.DS || {};
DS.app = (function () {
  const $ = DS.$, $$ = DS.$$;
  const state = {
    curId: null,
    curTab: "demo",
    demoPlayer: null,
    codePlayer: null,
    demoSteps: [],
    codeSteps: [],
    curDemo: null,
    curDemoInputs: {},
    curPreset: null,
    curVizMode: "auto",
    zoomDemo: 1,
    zoomCode: 1
  };

  const CATS = ["线性结构", "栈与队列", "查找与排序", "树与堆", "图与匹配", "综合工具"];

  /* ================= 初始化 ================= */
  function init() {
    DS.applyTheme();
    renderSidebar();
    renderCards();
    bindTopbar();
    bindStructPage();
    buildPlayers();
    setupEditor();
    window.addEventListener("hashchange", route);
    DS._rerenderFn = rerenderCurrent;
    route();
  }

  /* ================= 侧栏 ================= */
  function renderSidebar() {
    const sb = $("#sidebar");
    sb.innerHTML = "";
    for (const cat of CATS) {
      const items = DS.structures.list.filter(m => (m.category || "线性结构") === cat);
      if (!items.length) continue;
      const h = document.createElement("div");
      h.className = "sb-cat";
      h.textContent = cat;
      sb.appendChild(h);
      for (const m of items) {
        const b = document.createElement("button");
        b.className = "sb-item";
        b.dataset.id = m.id;
        b.innerHTML = `<span class="em">${m.emoji}</span>${m.name}`;
        b.title = m.summary;
        b.addEventListener("click", () => { location.hash = "#/" + m.id; });
        sb.appendChild(b);
      }
    }
  }

  /* ================= 首页卡片 ================= */
  function renderCards() {
    const grid = $("#cardGrid");
    grid.innerHTML = "";
    for (const m of DS.structures.list) {
      const b = document.createElement("button");
      b.className = "card";
      b.dataset.id = m.id;
      b.innerHTML =
        `<span class="c-badge">${m.badge || ""}</span>` +
        `<span class="c-em">${m.emoji}</span>` +
        `<div class="c-name">${m.name}</div>` +
        `<div class="c-sum">${m.summary}</div>` +
        `<div class="c-tags">${(m.tags || []).map(t => `<span class="c-tag">${t}</span>`).join("")}</div>`;
      b.addEventListener("click", () => { location.hash = "#/" + m.id; });
      grid.appendChild(b);
    }
  }

  function filterCards(q) {
    q = (q || "").trim().toLowerCase();
    $$(".card").forEach(c => {
      const m = DS.structures.byId[c.dataset.id];
      if (!m) return;
      const hit = !q || m.name.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q) ||
        (m.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (m.demos || []).some(d => (d.name + (d.desc || "")).toLowerCase().includes(q)) ||
        (m.cPresets || []).some(p => (p.name + p.code).toLowerCase().includes(q));
      c.style.display = hit ? "" : "none";
    });
    $$(".sb-item").forEach(b => {
      const m = DS.structures.byId[b.dataset.id];
      if (!m) return;
      const hit = !q || m.name.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q);
      b.style.display = hit ? "" : "none";
    });
    if (q) DS.$$(".sb-cat").forEach(el => el.style.display = "none");
    else DS.$$(".sb-cat").forEach(el => el.style.display = "");
  }

  /* ================= 路由 ================= */
  function route() {
    const h = (location.hash || "#/").replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    const home = $("#view-home"), struct = $("#view-struct");
    if (!parts.length) {
      home.classList.remove("hidden");
      struct.classList.add("hidden");
      pauseAll();
      state.curId = null;
      $$(".sb-item").forEach(b => b.classList.remove("active"));
      return;
    }
    const id = parts[0];
    const tab = ["demo", "code", "docs", "complex"].includes(parts[1]) ? parts[1] : "demo";
    const m = DS.structures.byId[id];
    if (!m) { location.hash = ""; return; }
    home.classList.add("hidden");
    struct.classList.remove("hidden");
    state.curId = id;
    $$(".sb-item").forEach(b => b.classList.toggle("active", b.dataset.id === id));
    renderStructPage(m, tab);
  }

  /* ================= 专题页 ================= */
  function renderStructPage(m, tab) {
    $("#structName").textContent = m.emoji + " " + m.name;
    $("#structSummary").textContent = m.summary;
    switchTab(tab);
    if (tab === "demo") renderDemoTab(m);
    if (tab === "code") renderCodeTab(m);
    if (tab === "docs") renderDocsTab(m);
    if (tab === "complex") renderComplexTab(m);
  }

  function switchTab(tab) {
    state.curTab = tab;
    $$("#structTabs .tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    $$(".tab-page").forEach(p => p.classList.add("hidden"));
    const map = { demo: "#tab-demo", code: "#tab-code", docs: "#tab-docs", complex: "#tab-complex" };
    $(map[tab]).classList.remove("hidden");
    // 切换时暂停另一播放器
    if (tab === "code" && state.demoPlayer) state.demoPlayer.pause();
    if (tab === "demo" && state.codePlayer) state.codePlayer.pause();
    setTimeout(() => {
      if (tab === "demo") renderStage(state.demoPlayer, $("#demoCanvas"));
      else renderStage(state.codePlayer, $("#codeCanvas"));
    }, 30);
  }

  function renderStage(player, canvas) {
    if (!player) return;
    DS.render.setupCanvas(canvas);
    const step = player.steps[player.idx];
    const zk = canvas.id === "demoCanvas" ? "zoomDemo" : "zoomCode";
    DS.render.draw(canvas, step && step.scene ? step.scene : null, { scaleMul: state[zk] });
  }

  /* ================= 播放器 ================= */
  function buildPlayerBar(prefix, handlers) {
    const bar = $("#" + prefix);
    bar.innerHTML = "";
    const mk = (cls, act, glyph, title) => {
      const b = document.createElement("button");
      b.className = "pbtn " + cls;
      b.dataset.act = act;
      b.innerHTML = glyph;
      b.title = title;
      bar.appendChild(b);
      return b;
    };
    mk("", "prev", "⏮", "上一步 (←)");
    const play = mk("main", "play", "▶", "播放/暂停 (空格)");
    mk("", "next", "⏭", "下一步 (→)");
    const seek = document.createElement("input");
    seek.type = "range"; seek.min = "0"; seek.max = "0"; seek.value = "0"; seek.className = "seek";
    bar.appendChild(seek);
    const counter = document.createElement("span");
    counter.className = "step-counter";
    counter.textContent = "0 / 0";
    bar.appendChild(counter);
    const spd = document.createElement("select");
    spd.className = "speed-sel";
    spd.id = prefix + "SpeedSel";
    spd.title = "播放速度";
    [["0.25", "0.25x"], ["0.5", "0.5x"], ["1", "1x"], ["1.5", "1.5x"], ["2", "2x"], ["3", "3x"], ["4", "4x"]]
      .forEach(([v, l]) => {
        const o = document.createElement("option");
        o.value = v; o.textContent = l;
        if (v === "1") o.selected = true;
        spd.appendChild(o);
      });
    bar.appendChild(spd);
    mk("", "reset", "↺", "回到第一步");
    mk("", "zoomout", "🔍−", "缩小动画画面");
    mk("", "zoomin", "🔍＋", "放大动画画面");

    bar.querySelector('[data-act="prev"]').addEventListener("click", handlers.prev);
    play.addEventListener("click", handlers.toggle);
    bar.querySelector('[data-act="next"]').addEventListener("click", handlers.next);
    bar.querySelector('[data-act="reset"]').addEventListener("click", handlers.reset);
    bar.querySelector('[data-act="zoomout"]').addEventListener("click", handlers.zoomOut);
    bar.querySelector('[data-act="zoomin"]').addEventListener("click", handlers.zoomIn);
    seek.addEventListener("input", () => handlers.seek(Number(seek.value)));
    spd.addEventListener("change", () => handlers.speed(Number(spd.value)));
    return { playBtn: play, seek, counter, spd };
  }

  function buildPlayers() {
    // ---- 演示播放器 ----
    const demoBar = buildPlayerBar("demoPlayerbar", {
      prev: () => state.demoPlayer && state.demoPlayer.prev(),
      next: () => state.demoPlayer && state.demoPlayer.next(),
      toggle: () => state.demoPlayer && state.demoPlayer.toggle(),
      reset: () => state.demoPlayer && state.demoPlayer.seek(0),
      seek: i => state.demoPlayer && state.demoPlayer.seek(i),
      speed: s => state.demoPlayer && state.demoPlayer.setSpeed(s),
      zoomOut: () => zoomBy("demo", -0.25),
      zoomIn: () => zoomBy("demo", 0.25)
    });
    state.demoPlayer = new DS.engine.Player({
      canvas: $("#demoCanvas"),
      onRender: scene => DS.render.draw($("#demoCanvas"), scene || null, { scaleMul: state.zoomDemo }),
      onStep: (step, i) => demoStepUI(step, i),
      onIndex: (i, n, playing) => {
        demoBar.playBtn.innerHTML = playing ? "⏸" : "▶";
        demoBar.seek.max = Math.max(0, n - 1);
        demoBar.seek.value = Math.max(0, i);
        demoBar.counter.textContent = (i + 1) + " / " + n;
      }
    });

    // ---- 代码播放器 ----
    const codeBar = buildPlayerBar("codePlayerbar", {
      prev: () => state.codePlayer && state.codePlayer.prev(),
      next: () => state.codePlayer && state.codePlayer.next(),
      toggle: () => state.codePlayer && state.codePlayer.toggle(),
      reset: () => state.codePlayer && state.codePlayer.seek(0),
      seek: i => state.codePlayer && state.codePlayer.seek(i),
      speed: s => state.codePlayer && state.codePlayer.setSpeed(s),
      zoomOut: () => zoomBy("code", -0.25),
      zoomIn: () => zoomBy("code", 0.25)
    });
    state.codePlayer = new DS.engine.Player({
      canvas: $("#codeCanvas"),
      onRender: scene => DS.render.draw($("#codeCanvas"), scene || null, { scaleMul: state.zoomCode }),
      onStep: (step, i) => codeStepUI(step, i),
      onIndex: (i, n, playing) => {
        codeBar.playBtn.innerHTML = playing ? "⏸" : "▶";
        codeBar.seek.max = Math.max(0, n - 1);
        codeBar.seek.value = Math.max(0, i);
        codeBar.counter.textContent = (i + 1) + " / " + n;
        scrollActiveLine((step => step && step.line ? step.line - 1 : -1)(state.codePlayer.current));
      }
    });
  }

  function zoomBy(kind, delta) {
    const key = kind === "demo" ? "zoomDemo" : "zoomCode";
    state[key] = DS.clamp(Number((state[key] + delta).toFixed(2)), 0.5, 4);
    const p = kind === "demo" ? state.demoPlayer : state.codePlayer;
    if (p && p.steps.length && p.idx >= 0) p.seek(p.idx, true);
    DS.toast("画布缩放 ×" + state[key], 900);
  }

  function rerenderCurrent() {
    [["#demoCanvas", state.demoPlayer, "zoomDemo"], ["#codeCanvas", state.codePlayer, "zoomCode"]].forEach(([sel, p, zk]) => {
      if (!p) return;
      DS.render.setupCanvas($(sel));
      const step = p.steps[p.idx];
      DS.render.draw($(sel), step && step.scene ? step.scene : null, { scaleMul: state[zk] });
    });
  }

  function pauseAll() {
    if (state.demoPlayer) state.demoPlayer.pause();
    if (state.codePlayer) state.codePlayer.pause();
  }

  function demoStepUI(step) {
    if (!step) return;
    $("#demoText").innerHTML = step.text || "";
    const statsEl = $("#demoStats");
    if (step.stats) {
      statsEl.innerHTML = Object.keys(step.stats).map(k =>
        `<span class="stat"><b>${step.stats[k]}</b> ${k}</span>`).join("");
    } else if (step.statsHTML) {
      statsEl.innerHTML = step.statsHTML;
    } else {
      statsEl.innerHTML = "";
    }
    if (step.phaseHTML) statsEl.innerHTML += step.phaseHTML;
  }

  function codeStepUI(step) {
    if (!step) return;
    $("#codeText").innerHTML = step.text || "";
    const varsEl = $("#codeVars");
    if (step.vars && step.vars.length) {
      varsEl.innerHTML = step.vars.map(v =>
        `<div class="var-row${v.changed ? " changed" : ""}"><span class="vn">${DS.escapeHtml(v.name)}</span><span class="vv" title="${DS.escapeHtml(v.v)}">${DS.escapeHtml(v.v)}</span></div>`
      ).join("");
    } else {
      varsEl.innerHTML = `<span class="empty-hint">暂无变量</span>`;
    }
    $("#codeOutput").textContent = (step.output || []).join("\n");
    const csEl = $("#codeCallstack");
    if (step.stack && step.stack.length) {
      csEl.innerHTML = step.stack.map(f => `<div class="frame-row">${DS.escapeHtml(f)}</div>`).join("");
    } else if (step.isError) {
      csEl.innerHTML = `<span class="empty-hint">⚠️ 程序中止于运行时错误</span>`;
    } else if (step.end) {
      csEl.innerHTML = `<span class="empty-hint">程序已结束</span>`;
    } else {
      csEl.innerHTML = `<span class="empty-hint">（在 main 中，暂无嵌套调用）</span>`;
    }
  }

  /* ================= 演示 Tab ================= */
  function renderDemoTab(m) {
    const wrap = $("#demoControls");
    const demos = m.demos || [];
    if (!demos.length) {
      wrap.innerHTML = `<div class="ctrl-group"><div class="panel-title">🛠️ 本专题为代码实验页</div>
        <div class="ctrl-desc">请切换到「💻 代码可视化」标签，编写或导入 C 代码，观察程序每一步的执行过程。</div></div>`;
      $("#demoText").textContent = "";
      $("#demoStats").innerHTML = "";
      if (state.demoPlayer) state.demoPlayer.load([]);
      return;
    }
    let html = "";
    if (demos.length > 1) {
      html += `<div class="ctrl-group"><div class="ctrl-label">🎛️ 选择演示</div>
        <select id="demoSel">${demos.map((d, i) => `<option value="${i}">${d.name}</option>`).join("")}</select></div>`;
    }
    html += `<div class="ctrl-group" id="demoWhat"><div class="ctrl-desc" id="demoWhatText"></div></div>
      <div id="demoSamples"></div>
      <div id="demoInputs"></div>
      <div class="ctrl-group">
        <div class="ctrl-label">🚀 操作</div>
        <div class="ctrl-row">
          <button class="mini-btn primary" id="demoGenBtn">▶ 生成动画</button>
          <button class="mini-btn" id="demoRandomBtn">🎲 随机数据</button>
          <button class="mini-btn" id="demoRandGenBtn">⚡ 随机并生成</button>
        </div>
        <div class="ctrl-desc" id="demoDesc"></div>
      </div>
      <div id="demoTips"></div>`;
    wrap.innerHTML = html;
    const sel = $("#demoSel");
    let cur = state.curDemo || demos[0];
    const currentDemo = () => demos[sel ? clampIdx(Number(sel.value)) : 0];
    function clampIdx(i) { return DS.clamp(i, 0, demos.length - 1); }
    const showDemo = d => {
      state.curDemo = d;
      $("#demoInputs").innerHTML = buildInputs(d);
      $("#demoDesc").textContent = "";
      $("#demoWhatText").innerHTML = (d.what ? "💬 " + d.what + "" : (d.desc ? d.desc : ""));
      $("#demoWhat").style.display = (d.what || d.desc && demos.length > 1) ? "" : "none";
      renderSamples(d);
      renderTips(d);
      bindInputHints(d);
      $("#demoText").textContent = "";
      $("#demoStats").innerHTML = "";
      if (state.demoPlayer) state.demoPlayer.load([]);
    };
    if (sel) sel.addEventListener("change", () => showDemo(currentDemo()));
    $("#demoRandomBtn").addEventListener("click", () => {
      fillRandom(currentDemo());
      updateInputHints(currentDemo());
    });
    $("#demoRandGenBtn").addEventListener("click", () => {
      fillRandom(currentDemo());
      generateDemo(currentDemo());
    });
    $("#demoGenBtn").addEventListener("click", () => generateDemo(currentDemo()));
    showDemo(cur);
  }

  /** 示例模板 chips：点一下整套填入并立即生成 */
  function renderSamples(demo) {
    const box = $("#demoSamples");
    if (!demo.samples || !demo.samples.length) { box.innerHTML = ""; box.style.display = "none"; return; }
    box.style.display = "";
    box.innerHTML = `<div class="ctrl-label">🎞️ 一键示例（可点选后再自己改）</div>
      <div class="ctrl-row">${demo.samples.map((s, i) =>
        `<button class="mini-btn chip" data-sample-i="${i}">${DS.escapeHtml(s.label)}</button>`).join("")}</div>`;
    $$(".chip", box).forEach(b => {
      b.addEventListener("click", () => {
        const s = demo.samples[Number(b.dataset.sampleI)];
        for (const k in s.values) {
          const el = $(`[data-key="${k}"]`, $("#demoInputs"));
          if (el) el.value = s.values[k];
        }
        updateInputHints(demo);
        generateDemo(demo);
      });
    });
  }

  /** 「试一试」引导区 */
  function renderTips(demo) {
    const box = $("#demoTips");
    const tips = demo.tips || [];
    if (!tips.length) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="ctrl-group"><div class="panel-title">🧪 试一试</div>
      <ul class="tips-list">${tips.map(t => `<li>${t}</li>`).join("")}</ul></div>`;
  }

  /** 实时输入解析提示：让用户随时知道框里内容被理解成什么 */
  function hintFor(inp, value) {
    if (inp.type === "select") return "";
    if (inp.type === "number") {
      const n = Number(value);
      const lo = inp.min !== undefined ? inp.min : -Infinity;
      const hi = inp.max !== undefined ? inp.max : Infinity;
      if (value === "" || isNaN(n)) return `<span class="hint-bad">⚠ 请输入数字</span>`;
      if (n < lo || n > hi) return `<span class="hint-bad">⚠ 会自动截断到 [${lo}, ${hi}]</span>`;
      return `<span class="hint-ok">✓ 数值 ${n}（范围 ${lo} ~ ${hi}）</span>`;
    }
    if (inp.cls === "nums") {
      const arr = DS.parseNums(value, [], 999);
      if (!value.trim()) return `<span class="hint-bad">⚠ 请输入数字序列</span>`;
      return `<span class="hint-ok">✓ 识别为 ${arr.length} 个数字：${arr.slice(0, 14).join(", ")}${arr.length > 14 ? "…" : ""}</span>`;
    }
    if (inp.cls === "ops") {
      const cmds = String(value).split(";").map(s => s.trim()).filter(Boolean);
      const known = /^(ins|add|push_back|head|push_front|insat|find|del|rev|reverse|clear|push|pop|peek|enq|deq|dequeue)\b/i;
      const unknown = cmds.filter(c => !known.test(c));
      if (!value.trim()) return `<span class="hint-bad">⚠ 请输入操作命令</span>`;
      if (unknown.length) return `<span class="hint-bad">⚠ ${unknown.length} 条命令无法识别：${unknown.slice(0, 3).join("; ")}</span>`;
      return `<span class="hint-ok">✓ 识别为 ${cmds.length} 条命令</span>`;
    }
    if (value.trim() === "") return `<span class="hint-bad">⚠ 内容为空</span>`;
    return `<span class="hint-ok">✓ 已输入 ${value.length} 个字符</span>`;
  }

  function bindInputHints(demo) {
    for (const inp of (demo.inputs || [])) {
      const el = $(`[data-key="${inp.key}"]`, $("#demoInputs"));
      if (!el) continue;
      el.addEventListener("input", () => updateOneHint(demo, inp));
      if (inp.type === "number") el.addEventListener("blur", () => {
        let n = Number(el.value);
        if (isNaN(n)) { el.value = inp.def; }
        else if (inp.min !== undefined && n < inp.min) el.value = inp.min;
        else if (inp.max !== undefined && n > inp.max) el.value = inp.max;
        updateOneHint(demo, inp);
      });
    }
    updateInputHints(demo);
  }

  function updateOneHint(demo, inp) {
    const out = $("#hint-" + inp.key);
    if (out) out.innerHTML = hintFor(inp, elValue(inp));
    const vl = $("#inpval-" + inp.key);
    if (vl && inp.type === "range") vl.textContent = elValue(inp);
  }

  function updateInputHints(demo) {
    for (const inp of (demo.inputs || [])) updateOneHint(demo, inp);
  }

  function buildInputs(demo) {
    return (demo.inputs || []).map(inp => {
      if (inp.type === "select") {
        return `<div class="ctrl-group"><div class="ctrl-label">${inp.label}</div>
          <select data-key="${inp.key}">${(inp.options || []).map(o => `<option value="${o[0]}">${o[1]}</option>`).join("")}</select>
          ${inp.desc ? `<div class="ctrl-desc">${inp.desc}</div>` : ""}
          <div class="hint-line" id="hint-${inp.key}"></div></div>`;
      }
      if (inp.type === "range") {
        return `<div class="ctrl-group"><div class="ctrl-label">${inp.label}<span class="val" id="inpval-${inp.key}"></span></div>
          <input type="range" data-key="${inp.key}" min="${inp.min}" max="${inp.max}" value="${inp.def}">
          ${inp.desc ? `<div class="ctrl-desc">${inp.desc}</div>` : ""}
          <div class="hint-line" id="hint-${inp.key}"></div></div>`;
      }
      const type = inp.type === "number" ? "number" : "text";
      return `<div class="ctrl-group"><div class="ctrl-label">${inp.label}</div>
        <input type="${type}" data-key="${inp.key}" value="${DS.escapeHtml(String(inp.def))}" ${inp.type === "number" ? `min="${inp.min}" max="${inp.max}"` : ""}>
        ${inp.desc ? `<div class="ctrl-desc">${inp.desc}</div>` : ""}
        <div class="hint-line" id="hint-${inp.key}"></div></div>`;
    }).join("");
  }

  function readInputs(demo) {
    const out = {};
    for (const inp of (demo.inputs || [])) {
      const el = $(`[data-key="${inp.key}"]`, $("#demoInputs"));
      if (!el) continue;
      out[inp.key] = el.value;
    }
    return out;
  }

  function fillRandom(demo) {
    const rnd = Math.floor(Math.random() * 1e9);
    const nCount = (demo.inputs || []).filter(i => i.type === "number" || i.cls === "nums").length;
    for (const inp of (demo.inputs || [])) {
      const el = $(`[data-key="${inp.key}"]`, $("#demoInputs"));
      if (!el || inp.noRandom) continue;
      if (inp.type === "select") {
        el.value = inp.options[Math.floor(Math.random() * inp.options.length)][0];
      } else if (inp.type === "number") {
        if (nCount > 1) {
          el.value = DS.randInt(inp.min || 2, inp.max || 14);
        } else {
          el.value = DS.randInt(inp.min || 2, inp.max || 50);
        }
      } else if (inp.type === "range") {
        el.value = DS.randInt(inp.min || 1, inp.max || 20);
      } else if (inp.cls === "nums") {
        el.value = DS.genArray(DS.randInt(6, 16), 1, 99, "random", rnd).join(",");
      } else if (inp.cls === "ops") {
        el.value = (inp.opsBank || ["ins 3; ins 8; ins 2; head 9; del 8; rev"]).join(";");
      } else if (inp.type === "text") {
        el.value = (inp.randomPool && inp.randomPool.length) ? inp.randomPool[Math.floor(Math.random() * inp.randomPool.length)] : el.value;
      }
    }
    updateInputHints(demo);
    DS.toast("已随机数据，可直接点 ▶ 生成");
  }

  function elValue(inp) {
    const el = $(`[data-key="${inp.key}"]`, $("#demoInputs"));
    return el ? el.value : String(inp.def);
  }

  function generateDemo(demo) {
    const inputs = readInputs(demo);
    state.curDemoInputs = inputs;
    try {
      const res = demo.build(inputs);
      if (!res || !res.steps || !res.steps.length) {
        DS.toast("未生成任何步骤");
        return;
      }
      $("#demoText").textContent = "";
      $("#demoStats").innerHTML = "";
      DS.render.setupCanvas($("#demoCanvas"));
      state.demoPlayer.load(res.steps, true);
      if (res.preHint) $("#demoText").innerHTML = res.preHint;
    } catch (e) {
      console.error(e);
      DS.toast("生成失败：" + e.message);
    }
  }

  /* ================= 讲解 / 复杂度 Tab ================= */
  function renderDocsTab(m) {
    $("#structDocs").innerHTML = m.overview || "<div class='md'><h3>暂无内容</h3></div>";
  }

  function renderComplexTab(m) {
    const rows = (m.complexity || []);
    if (!rows.length) {
      $("#structComplex").innerHTML = `<div class="md"><h3>暂无内容</h3></div>`;
      return;
    }
    const head = rows[0];
    const cols = Object.keys(head).filter(k => k !== "op");
    $("#structComplex").innerHTML =
      `<table><thead><tr><th>操作</th>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>` +
      rows.map(r => `<tr><td class="op">${r.op}</td>${cols.map(c => `<td>${DS.escapeHtml(String(r[c] == null ? "—" : r[c]))}</td>`).join("")}</tr>`).join("") +
      `</tbody></table>`;
  }

  /* ================= 代码可视化 Tab ================= */
  function renderCodeTab(m) {
    const presets = m.cPresets || [];
    const sel = $("#codePresetSel");
    sel.innerHTML = presets.map((p, i) => `<option value="${i}">${p.name}</option>`).join("") ||
      `<option value="-1">（无内置示例，请编写或导入代码）</option>`;
    const cur = presets[0];
    if (cur) {
      setEditorContent(cur);
    } else {
      setEditorContent({ code: defaultStarter(m), mode: "auto", lineNotes: {} });
    }
    sel.onchange = () => {
      const i = Number(sel.value);
      if (i >= 0) setEditorContent(presets[i]);
    };
  }

  function defaultStarter(m) {
    return `/* ${m.name} - 可视化实验
   支持: int/char/指针/struct/数组/malloc/free/NULL/
         if/while/for/函数递归/printf(&取址、->成员)
   解释器将逐步记录变量、内存与指针变化，并自动选择视图。 */
int main(){
  int a[5] = {1, 2, 3, 4, 5};
  int i;
  int sum = 0;
  for(i = 0; i < 5; i++){
    sum += a[i];
  }
  printf("sum=%d\\n", sum);
  return 0;
}`;
  }

  function setEditorContent(preset) {
    state.curPreset = preset;
    $("#codeEditor").value = preset.code;
    if (preset.mode) {
      state.curVizMode = preset.mode;
      $("#vizModeSel").value = preset.mode;
    }
    // 示例自带标准输入（如 scanf 示例）→ 自动填入标准输入框
    if ($("#codeStdin")) {
      $("#codeStdin").value = preset.stdin || "";
    }
    hideError();
    syncEditor();
    state.codePlayer.load([]);
    $("#codeText").textContent = "";
    $("#codeOutput").textContent = "";
    $("#codeCallstack").innerHTML = "";
    $("#codeVars").innerHTML = "";
  }

  function setupEditor() {
    $("#codeLoadBtn").addEventListener("click", () => $("#codeFileInput").click());
    $("#codeFileInput").addEventListener("change", e => {
      const f = e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const code = String(rd.result);
        state.curPreset = null;
        $("#codePresetSel").value = "-1";
        $("#codeEditor").value = code;
        hideError();
        syncEditor();
        DS.toast("已导入 " + f.name);
      };
      rd.readAsText(f, "utf-8");
      e.target.value = "";
    });
    $("#codePasteBtn").addEventListener("click", async () => {
      try {
        const t = await navigator.clipboard.readText();
        if (!t) { DS.toast("剪贴板为空"); return; }
        $("#codeEditor").value = t;
        state.curPreset = null;
        $("#codePresetSel").value = "-1";
        hideError();
        syncEditor();
        DS.toast("已从剪贴板粘贴");
      } catch (e) {
        DS.toast("无法读取剪贴板，请直接 Ctrl+V 粘贴到编辑框");
        $("#codeEditor").focus();
      }
    });
    $("#codeResetBtn").addEventListener("click", () => {
      const m = DS.structures.byId[state.curId];
      if (m && m.cPresets && m.cPresets.length) {
        $("#codePresetSel").value = "0";
        setEditorContent(m.cPresets[0]);
      } else if (state.curPreset) {
        setEditorContent(state.curPreset);
      } else {
        $("#codeEditor").value = defaultStarter(m || { name: "" });
        syncEditor();
      }
    });
    $("#codeRunBtn").addEventListener("click", runCode);
    $("#vizModeSel").addEventListener("change", e => { state.curVizMode = e.target.value; });
    $("#codeEditor").addEventListener("input", syncHighlightOnly);
    $("#codeEditor").addEventListener("scroll", syncScroll);
    $("#codeEditor").addEventListener("keydown", e => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.target;
        const s = ta.selectionStart, e2 = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(e2);
        ta.selectionStart = ta.selectionEnd = s + 2;
        syncHighlightOnly();
      }
      e.stopPropagation();
    });
  }

  function syncScroll() {
    const ta = $("#codeEditor");
    const pre = $("#codeHl");
    pre.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    $("#codeGutter").scrollTop = ta.scrollTop;
    positionActiveLine();
  }

  function syncHighlightOnly() {
    const ta = $("#codeEditor");
    $("#codeHl").innerHTML = DS.codeviz.highlight(ta.value);
    // 行号
    const lines = ta.value.split("\n").length;
    const g = $("#codeGutter");
    if (g.childElementCount !== lines) {
      g.innerHTML = "";
      const frag = document.createDocumentFragment();
      for (let i = 1; i <= lines; i++) {
        const d = document.createElement("div");
        d.textContent = i;
        frag.appendChild(d);
      }
      g.appendChild(frag);
    }
  }

  function syncEditor() {
    syncHighlightOnly();
    syncScroll();
  }

  function runCode() {
    const code = $("#codeEditor").value;
    if (!code.trim()) { DS.toast("请先编写或导入代码"); return; }
    hideError();
    const mode = state.curVizMode || "auto";
    const lineNotes = state.curPreset && state.curPreset.lineNotes ? state.curPreset.lineNotes : {};
    const stdinValue = ($("#codeStdin") && $("#codeStdin").value) || "";
    let res;
    try {
      res = DS.cinterp.run(code, { stdin: stdinValue });
    } catch (e) {
      showError(1, "内部异常: " + (e && e.message ? e.message : e));
      return;
    }
    if (!res.ok) {
      // 解析期错误：没有可动画化的轨迹
      if (!res.trace || !res.trace.length) {
        showError(res.error.line, res.error.message);
        return;
      }
      // 运行时错误：保留部分轨迹，动画播到“出错前的一步” + 红色错误步
      const viz = DS.codeviz.build(code, res, { lineNotes, mode });
      if (!viz.ok) { showError(res.error.line, res.error.message); return; }
      DS.render.setupCanvas($("#codeCanvas"));
      state.codePlayer.load(viz.steps, true);
      showError(res.error.line, res.error.message);
      DS.toast("程序运行出错：已生成出错前的执行动画，播放到最后一步查看崩溃原因");
      return;
    }
    const viz = DS.codeviz.build(code, res, { lineNotes, mode });
    if (!viz.ok) { showError(1, "可视化构建失败"); return; }
    DS.render.setupCanvas($("#codeCanvas"));
    state.codePlayer.load(viz.steps, true);
    autoSpeed(state.codePlayer, viz.steps.length);
    updateCodeVizTag(viz.mode);
    DS.toast("运行成功！共 " + (viz.steps.length - 1) + " 步，视图：" + modeName(viz.mode));
  }

  /** 步数很多时自动提速，避免几百步要播很久 */
  function autoSpeed(player, n) {
    const sp = n > 350 ? 4 : (n > 200 ? 2 : 1);
    if (sp > 1) {
      player.setSpeed(sp);
      const sel = $("#codeSpeedSel");
      if (sel) sel.value = String(sp);
    }
  }

  function modeName(mode) {
    return { list: "链表视图", tree: "树视图", array: "数组视图", memory: "内存视图" }[mode] || mode;
  }

  function showError(line, message) {
    const el = $("#codeError");
    el.classList.remove("hidden");
    el.textContent = `✖ 第 ${line} 行：${message}`;
    try {
      const ta = $("#codeEditor");
      const target = Math.max(0, Math.min(line - 3, ta.value.split("\n").length - 1));
      const before = ta.value.split("\n").slice(0, target).join("\n").length;
      ta.selectionStart = ta.selectionEnd = before;
      // 行高 20，编辑器顶部留两行
      ta.scrollTop = Math.max(0, (target - 2) * 20);
      syncScroll();
      ta.focus();
    } catch (e) { /* ignore */ }
  }

  function hideError() {
    const el = $("#codeError");
    el.classList.add("hidden");
    el.textContent = "";
    $("#codeActiveLine").classList.remove("show");
  }

  function scrollActiveLine(lineIdx) {
    const al = $("#codeActiveLine");
    if (lineIdx === null || lineIdx < 0) {
      al.classList.remove("show");
      return;
    }
    al.classList.add("show");
    al.style.top = (12 + lineIdx * 20) + "px";
    positionActiveLine();
  }

  function positionActiveLine() {
    const al = $("#codeActiveLine");
    if (!al.classList.contains("show")) return;
    const ta = $("#codeEditor");
    const m = /top\s*:\s*(-?\d+)px/.exec(al.style.top);
    if (m) al.style.transform = `translateY(${-ta.scrollTop}px)`;
  }

  /* ================= 顶栏 ================= */
  function bindTopbar() {
    $("#goHomeBtn").addEventListener("click", () => { location.hash = ""; });
    $("#themeBtn").addEventListener("click", DS.toggleTheme);
    $("#heroCodeBtn").addEventListener("click", () => {
      const lab = DS.structures.byId["codev"];
      if (lab) location.hash = "#/codev/code";
      else {
        const first = DS.structures.list.find(m => (m.cPresets || []).length);
        location.hash = "#/" + (first ? first.id : "array") + "/code";
      }
    });
    $("#heroDocsBtn").addEventListener("click", () => {
      document.getElementById("homeGuide").scrollIntoView({ behavior: "smooth" });
    });
    $("#searchInput").addEventListener("input", e => {
      if (location.hash && location.hash !== "#/") { location.hash = ""; }
      $("#view-home").classList.remove("hidden");
      $("#view-struct").classList.add("hidden");
      filterCards(e.target.value);
    });
    $("#searchInput").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const q = e.target.value.trim().toLowerCase();
        if (!q) return;
        const hit = DS.structures.list.find(m =>
          m.name.toLowerCase().includes(q) || (m.tags || []).some(t => t.toLowerCase().includes(q)));
        if (hit) location.hash = "#/" + hit.id;
      }
    });
  }

  function bindStructPage() {
    $("#backBtn").addEventListener("click", () => { location.hash = ""; });
    $$("#structTabs .tab").forEach(b => {
      b.addEventListener("click", () => {
        const id = state.curId || DS.structures.list[0].id;
        location.hash = "#/" + id + "/" + b.dataset.tab;
      });
    });

    // 全屏舞台：演示页 —— 隐藏左侧控制面板，画布占满
    $("#demoFullBtn").addEventListener("click", () => {
      const wb = $(".workbench:not(.code-bench)");
      if (!wb) return;
      const on = wb.classList.toggle("stage-full");
      state.demoFull = on;
      $("#demoFullBtn").classList.toggle("on", on);
      $("#demoFullBtn").title = on ? "退出全屏舞台" : "全屏演示舞台";
      DS.toast(on ? "已进入全屏舞台" : "已退出全屏舞台", 900);
      // 重算画布尺寸并重绘
      const p = state.demoPlayer;
      if (p && p.steps.length && p.idx >= 0) {
        setTimeout(() => p.seek(p.idx, true), 60);
      }
    });

    // 全屏舞台：代码页 —— 隐藏左编辑器，画布占满（图码风）
    $("#codeFullBtn").addEventListener("click", () => {
      const wb = $("#tab-code .code-bench");
      if (!wb) return;
      const on = wb.classList.toggle("stage-full");
      state.codeFull = on;
      $("#codeFullBtn").classList.toggle("on", on);
      $("#codeFullBtn").title = on ? "退出全屏舞台" : "全屏舞台（隐藏编辑器）";
      DS.toast(on ? "已进入全屏舞台" : "已退出全屏舞台", 900);
      const p = state.codePlayer;
      if (p && p.steps.length && p.idx >= 0) {
        setTimeout(() => p.seek(p.idx, true), 60);
      }
    });
  }

  /** 更新代码舞台角标的视图名 */
  function updateCodeVizTag(mode) {
    const tag = $("#codeVizTag");
    if (tag) tag.textContent = "🔍 " + (modeName(mode) || "视图");
  }

  /* ============ 键盘快捷键 ============ */
  document.addEventListener("keydown", e => {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
    const player = state.curTab === "code" ? state.codePlayer : state.demoPlayer;
    if (!player || !player.steps.length) return;
    if (e.code === "Space") { e.preventDefault(); player.toggle(); }
    else if (e.code === "ArrowRight") { e.preventDefault(); player.next(); }
    else if (e.code === "ArrowLeft") { e.preventDefault(); player.prev(); }
  });

  expose({
    route, renderStructPage, generateDemo, runCode,
    get state() { return state; }
  });

  function expose(o) { DS.appUI = o; }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") setTimeout(init, 0);

  /* ============ QA 自测钩子（?qa=1 时启用，生产环境无影响） ============ */
  if (location.search.indexOf("qa=1") !== -1) {
    window.__qa = { errors: [] };
    window.addEventListener("error", function (e) {
      window.__qa.errors.push(String(e.message) + " @" + String(e.filename || "").split("/").pop() + ":" + e.lineno);
    });
    window.addEventListener("unhandledrejection", function (e) {
      window.__qa.errors.push("rejection: " + e.reason);
    });
    setTimeout(function () {
      try {
        if (!$("#view-struct").classList.contains("hidden")) {
          if (state.curTab === "demo") {
            // QA 参数：?qa=1&demo=1 指定演示序号；&seek=5 指定跳到的步；&n=8&k=3 覆盖输入
            var qs = new URLSearchParams(location.search);
            if (qs.has("demo")) {
              var sel = $("#demoSel");
              if (sel) {
                sel.value = String(DS.clamp(Number(qs.get("demo")), 0, sel.options.length - 1));
                sel.dispatchEvent(new Event("change"));
              }
            }
            if (qs.has("n") || qs.has("k") || qs.has("arr") || qs.has("ops")) {
              ["n", "k", "arr", "ops"].forEach(function (key) {
                if (!qs.has(key)) return;
                var el = document.querySelector('[data-key="' + key + '"]');
                if (el) el.value = qs.get(key);
              });
            }
            var g = $("#demoGenBtn");
            if (g) g.click();
            var seekTo = qs.has("seek") ? Number(qs.get("seek")) : 10;
            setTimeout(function () {
              try {
                state.demoPlayer.pause();
                state.demoPlayer.seek(Math.min(seekTo, state.demoPlayer.steps.length - 1), true);
              } catch (e) { window.__qa.errors.push("seek:" + e.message); }
            }, 1200);
          } else if (state.curTab === "code") {
            var qs2 = new URLSearchParams(location.search);
            if (qs2.has("preset")) {
              var psel = $("#codePresetSel");
              if (psel) {
                psel.value = String(DS.clamp(Number(qs2.get("preset")), 0, psel.options.length - 1));
                psel.dispatchEvent(new Event("change"));
              }
            }
            var r = $("#codeRunBtn");
            if (r) r.click();
            var cseek = qs2.has("seek") ? Number(qs2.get("seek")) : 8;
            setTimeout(function () {
              try { state.codePlayer.pause(); state.codePlayer.seek(Math.min(cseek, state.codePlayer.steps.length - 1), true); }
              catch (e) { window.__qa.errors.push("seek:" + e.message); }
            }, 1400);
          }
        }
      } catch (e) { window.__qa.errors.push("qa-run:" + e.message); }
    }, 900);
    setInterval(function () {
      // QA：强制以 instant 方式重绘当前步，避免 rAF 补间在无头环境下停在中间帧
      try {
        var p = state.curTab === "code" ? state.codePlayer : state.demoPlayer;
        if (p && p.steps && p.steps.length && p.idx >= 0) p.seek(p.idx, true);
      } catch (e) { /* ignore */ }
      var el = document.getElementById("qaState");
      if (!el) { el = document.createElement("div"); el.id = "qaState"; el.style.display = "none"; document.body.appendChild(el); }
      var steps = "0:0", rendered = "0:0";
      try {
        steps = (state.demoPlayer && state.demoPlayer.steps ? state.demoPlayer.steps.length : 0) + ":" + (state.codePlayer && state.codePlayer.steps ? state.codePlayer.steps.length : 0);
        rendered = (state.demoPlayer && state.demoPlayer.idx >= 0 ? 1 : 0) + ":" + (state.codePlayer && state.codePlayer.idx >= 0 ? 1 : 0);
      } catch (e) { /* ignore */ }
      var canvasStats = "none:none";
      try {
        // 把 canvas 像素镜像成 <img>（仅 QA 模式），便于无头浏览器截图捕获
        ["demoCanvas", "codeCanvas"].forEach(function (cid) {
          var cv = document.getElementById(cid);
          if (!cv || cv.width === 0) return;
          var img = document.getElementById("qa-img-" + cid);
          if (!img) {
            img = document.createElement("img");
            img.id = "qa-img-" + cid;
            img.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:6;pointer-events:none;";
            cv.parentElement.appendChild(img);
          }
          try { img.src = cv.toDataURL("image/png"); } catch (e) { /* ignore */ }
        });
      } catch (e) { /* ignore */ }
      try {
        canvasStats = ["demoCanvas", "codeCanvas"].map(function (id) {
          var cv = document.getElementById(id);
          if (!cv || cv.width === 0) return "n/a";
          try {
            var d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
            var painted = 0, samples = 0;
            var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, has = false;
            var W = cv.width, H = cv.height;
            for (var y = 0; y < H; y += 6) {
              for (var x = 0; x < W; x += 6) {
                var a = d[(y * W + x) * 4 + 3];
                samples++;
                if (a > 12) {
                  painted++;
                  has = true;
                  if (x < x0) x0 = x;
                  if (y < y0) y0 = y;
                  if (x > x1) x1 = x;
                  if (y > y1) y1 = y;
                }
              }
            }
            var c = has ? Math.round(((x0 + x1) / 2 / W) * 100) + "%," + Math.round(((y0 + y1) / 2 / H) * 100) + "%" : "-";
            var bb = has ? (x1 - x0) + "x" + (y1 - y0) + " of " + W + "x" + H : "-";
            return Math.round(painted / samples * 100) + "%|bb=" + bb + "|c=" + c;
          } catch (e2) { return "err"; }
        }).join(":");
      } catch (e) { /* ignore */ }
      el.textContent = JSON.stringify({ errors: window.__qa.errors, steps: steps, rendered: rendered, tab: state.curTab, canvas: canvasStats, chain: chainDebug(), idx: (state.curTab === "code" ? state.codePlayer : state.demoPlayer).idx });
    }, 2500);
  }

  /** QA 用：当前步的节点/边摘要，便于在无头浏览器里核对场景结构 */
  function chainDebug() {
    try {
      var p = state.curTab === "code" ? state.codePlayer : state.demoPlayer;
      if (!p || !p.steps || !p.steps[p.idx] || !p.steps[p.idx].scene) return "";
      return (p.steps[p.idx].scene.elements || []).filter(function (e) {
        return e.t === "circle" || e.t === "edge";
      }).map(function (e) {
        return e.t === "circle" ? ("c:" + e.text) : ("e:" + e.key);
      }).join("|");
    } catch (e) { return "err"; }
  }
})();