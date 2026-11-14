/* ==========================================================
   cinterp.js — C 语言子集解释器（教学可视化用）
   支持：int/char、指针、struct、typedef 别名、数组（含二维）、
        malloc/free/NULL/sizeof、if/else、while、do-while、for、
        switch/case、break/continue/return、函数与递归、printf/scanf、
        三元 ?:、逗号表达式、位运算 & | ^ ~ << >>、++/--/+= 等复合赋值、
        &取址、*解引用、->/.、类型转换、#include 忽略、#define 对象宏、
        内置 strlen/strcmp/strcpy/strcat
   不支持：goto、库函数（除 printf/scanf/malloc/free/str*）、
        结构体数组按值初始化等 —— 均给出带行号的中文报错。
   ========================================================== */
window.DS = window.DS || {};
DS.cinterp = (function () {

  /* ================= 词法分析 ================= */
  const PUNCT2 = ["->", "++", "--", "+=", "-=", "*=", "/=", "%=", "==", "!=", "<=", ">=", "&&", "||", "<<", ">>"];
  const PUNCT1 = "+-*/%<>=!&|(){}[];,.~^?:";

  function lex(src) {
    const toks = [];
    let i = 0, line = 1, col = 1;
    const n = src.length;
    while (i < n) {
      const c = src[i];
      if (c === "\n") { line++; col = 1; i++; continue; }
      if (c === " " || c === "\t" || c === "\r") { i++; col++; continue; }
      if (c === "/" && src[i + 1] === "/") {
        while (i < n && src[i] !== "\n") { i++; col++; }
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {
        const L = line;
        i += 2; col += 2;
        while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
          if (src[i] === "\n") { line++; col = 1; } else col++;
          i++;
        }
        if (i >= n) throw new CError("未闭合的块注释 /* */", L);
        i += 2; col += 2;
        continue;
      }
      if (c >= "0" && c <= "9") {
        let j = i;
        while (j < n && src[j] >= "0" && src[j] <= "9") j++;
        const v = parseInt(src.slice(i, j), 10);
        toks.push({ type: "num", v, line, col });
        col += j - i; i = j;
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
        toks.push({ type: "ident", v: src.slice(i, j), line, col });
        col += j - i; i = j;
        continue;
      }
      if (c === '"') {
        const L = line, C0 = col;
        let j = i + 1, s = "";
        while (j < n && src[j] !== '"') {
          if (src[j] === "\\") {
            const esc = src[j + 1];
            if (esc === "n") s += "\n";
            else if (esc === "t") s += "\t";
            else if (esc === "\\") s += "\\";
            else if (esc === '"') s += '"';
            else if (esc === "0") s += "\0";
            else s += esc;
            j += 2;
          } else { s += src[j]; j++; }
        }
        if (j >= n) throw new CError("未闭合的字符串字面量", L);
        toks.push({ type: "str", v: s, line: L, col: C0 });
        col += j - i + 1; i = j + 1;
        continue;
      }
      if (c === "'") {
        const L = line;
        let code, adv;
        if (src[i + 1] === "\\") {
          const esc = src[i + 2];
          code = { "n": 10, "t": 9, "0": 0, '"': 34, "'": 39, "\\": 92 }[esc];
          adv = 4;
        } else {
          code = src.charCodeAt(i + 1);
          adv = 3;
        }
        toks.push({ type: "num", v: code, line: L, col });
        col += adv; i += adv;
        continue;
      }
      if (c === "<" && src[i + 1] === "<" || c === ">" && src[i + 1] === ">") {
        i += 2; col += 2;
        toks.push({ type: "punct", v: c + c, line, col });
        continue;
      }
      if (c === "#") {
        throw new CError("预处理指令只支持行首的 #include / #define", line);
      }
      const two = src.slice(i, i + 2);
      if (PUNCT2.indexOf(two) !== -1) {
        toks.push({ type: "punct", v: two, line, col });
        i += 2; col += 2;
        continue;
      }
      if (PUNCT1.indexOf(c) !== -1) {
        toks.push({ type: "punct", v: c, line, col });
        i++; col++;
        continue;
      }
      throw new CError("无法识别的字符 '" + c + "'", line);
    }
    toks.push({ type: "eof", v: "", line, col });
    return toks;
  }

  /* ================= 错误类型 ================= */
  class CError extends Error {
    constructor(msg, line) {
      super(msg);
      this.line = line;
      this.name = "CError";
    }
  }

  /* ================= 预处理：#include 忽略、#define 对象宏 ================= */
  function preprocess(src) {
    const macros = {};
    const out = [];
    for (const rawLine of src.split("\n")) {
      const line = rawLine.trim();
      const inc = /^#\s*include/.test(line);
      if (inc) { out.push(""); continue; }
      const def = /^#\s*define\s+([A-Za-z_]\w*)\s*(.*)$/.exec(line);
      if (def) {
        macros[def[1]] = def[2].trim();
        out.push("");
        continue;
      }
      if (/^#/.test(line)) out.push(""); // 其他预处理指令：忽略该行
      else out.push(rawLine);
    }
    return { src: out.join("\n"), macros };
  }

  /** 把宏标识符替换回 token 流（迭代展开，支持宏引用宏） */
  function expandMacros(toks, macros) {
    const names = Object.keys(macros);
    if (!names.length) return toks;
    let cur = toks;
    for (let round = 0; round < 10; round++) {
      let changed = false;
      const out = [];
      for (const t of cur) {
        if (t.type === "ident" && t.v in macros) {
          const val = macros[t.v];
          const sub = lex(val.length ? val : "0");
          const body = sub.slice(0, sub.length - 1).map(s => Object.assign({}, s, { line: t.line, col: t.col }));
          if (body.length) {
            out.push(...body);
            changed = true;
          }
        } else {
          out.push(t);
        }
      }
      cur = out;
      if (!changed) break;
    }
    return cur;
  }
  function preScan(toks) {
    const aliases = new Set();
    for (let i = 0; i < toks.length - 1; i++) {
      if (toks[i].type === "ident" && toks[i].v === "typedef" && toks[i + 1].v === "struct") {
        // typedef struct [Name] { ... } Alias1, *Alias2, ... ;
        let j = i + 2;
        while (j < toks.length && toks[j].v !== ";" && toks[j].v !== "{") {
          if (toks[j].type === "ident" && toks[j].v !== "struct") aliases.add(toks[j].v);
          j++;
        }
      }
    }
    return aliases;
  }

  /* ================= 解析器 ================= */
  function parse(src) {
    const pp = preprocess(src);
    const toks = expandMacros(lex(pp.src), pp.macros);
    const aliases = preScan(toks);
    const P = {
      toks, pos: 0, aliases,
      cur() { return this.toks[this.pos]; },
      at(v) { const t = this.toks[this.pos]; return (t.type === "punct" || t.type === "ident") && t.v === v; },
      next() {
        const t = this.toks[this.pos];
        if (t.type !== "eof") this.pos++;
        return t;
      },
      eat(v) {
        if (!this.at(v)) throw new CError("缺少 '" + v + "'", this.cur().line);
        return this.next();
      },
      isTypeStart() {
        const t = this.cur();
        if (t.type !== "ident") return false;
        return t.v === "int" || t.v === "char" || t.v === "struct" || this.aliases.has(t.v);
      },
      lookNextIsType() {
        const t = this.toks[this.pos + 1];
        return t && t.type === "ident" && (t.v === "int" || t.v === "char" || t.v === "struct" || this.aliases.has(t.v));
      }
    };

    /** 解析类型：返回 {base, structName, line}；int/char/struct X/别名 */
    function typeSpec() {
      const t = P.next();
      if (t.type !== "ident") throw new CError("应为类型名 (int / char / struct 名)", t.line);
      const spec = { base: t.v, structName: null, line: t.line };
      if (t.v === "struct") {
        const name = P.cur();
        if (name.type !== "ident") throw new CError("struct 后面应有结构体名", name.line);
        P.next();
        spec.structName = name.v;
      }
      return spec;
    }

    /** 前瞻：类型 (+*) 标识符 (  => 函数定义 */
    function looksLikeFuncDef() {
      const toks = P.toks;
      let i = P.pos;
      const t = toks[i];
      if (!t || t.type !== "ident") return false;
      const isType = t.v === "void" || t.v === "int" || t.v === "char" || t.v === "struct" || P.aliases.has(t.v);
      if (!isType) return false;
      if (t.v === "struct") i += 2; else i += 1;
      while (toks[i] && toks[i].type === "punct" && toks[i].v === "*") i++;
      return !!(toks[i] && toks[i].type === "ident" &&
                toks[i + 1] && toks[i + 1].type === "punct" && toks[i + 1].v === "(");
    }
    function looksLikeDecl() {
      const t = P.cur();
      if (!t || t.type !== "ident") return false;
      return t.v === "void" || t.v === "int" || t.v === "char" || t.v === "struct" || P.aliases.has(t.v);
    }

    function parseProgram() {
      const items = [];
      while (P.cur().type !== "eof") {
        const t = P.cur();
        if (t.type !== "ident") throw new CError("顶层出现意外符号 '" + (t.v || "") + "'", t.line);
        if (t.v === "typedef") items.push(parseTypedef());
        else if (t.v === "struct" && !looksLikeFuncDef()) items.push(parseStructDecl());
        else if (looksLikeFuncDef()) items.push(parseFuncDef());
        else if (looksLikeDecl()) items.push(parseDeclStmt());
        else throw new CError("顶层仅允许类型/结构体/函数定义", t.line);
      }
      return { type: "Program", items, line: 1 };
    }

    function parseTypedef() {
      const start = P.next(); // typedef
      P.eat("struct");
      let name = null;
      if (P.cur().type === "ident") { name = P.next().v; }
      const fields = [];
      if (P.at("{")) {
        P.next();
        while (!P.at("}")) {
          const fs = typeSpec();
          while (P.at("*")) P.next();
          const fn = P.cur();
          if (fn.type !== "ident") throw new CError("结构体字段名缺失", fn.line);
          P.next();
          let count = null;
          if (P.at("[")) { P.next(); count = numConst(P.next()); P.eat("]"); }
          P.eat(";");
          fields.push({ type: fs, name: fn.v, count, line: fn.line });
        }
        P.next();
      }
      const alias = P.cur();
      if (alias.type !== "ident") throw new CError("typedef 后缺少类型别名", alias.line);
      P.next();
      while (P.at(",") || P.at("*")) P.next();
      P.eat(";");
      return { type: "Typedef", line: start.line, name: name || ("__anon" + start.line), alias: alias.v, fields };
    }

    function parseStructDecl() {
      const start = P.next(); // struct
      const nameTok = P.cur();
      if (nameTok.type !== "ident") throw new CError("struct 后应有名称", nameTok.line);
      P.next();
      const fields = [];
      if (P.at("{")) {
        P.next();
        while (!P.at("}")) {
          const fs = typeSpec();
          while (P.at("*")) P.next();
          const fn = P.cur();
          if (fn.type !== "ident") throw new CError("结构体字段名缺失", fn.line);
          P.next();
          let count = null;
          if (P.at("[")) { P.next(); count = numConst(P.next()); P.eat("]"); }
          P.eat(";");
          fields.push({ type: fs, name: fn.v, count, line: fn.line });
        }
        P.next();
      }
      P.eat(";");
      return { type: "StructDecl", line: start.line, name: nameTok.v, fields };
    }

    function numConst(tok) {
      if (tok.type !== "num") throw new CError("数组大小应为整数常量", tok.line);
      return tok.v;
    }

    /** 嵌套初始化列表 { 1, {2,3} } */
    function parseInitList() {
      const bt = P.cur();
      P.eat("{");
      const vals = [];
      while (!P.at("}")) {
        if (P.cur().type === "eof") throw new CError("初始化列表缺少 '}'", bt.line);
        if (P.at("{")) vals.push(parseInitList());
        else vals.push(parseAssign());
        if (P.at(",")) P.next();
      }
      P.next();
      return { type: "InitList", vals, line: bt.line };
    }

    /** 变量声明语句：type [*...] name [=init] , ... ;  */
    function parseDeclStmt() {
      const spec = typeSpec();
      let stars = 0;
      while (P.at("*")) { P.next(); stars++; }
      const line = spec.line;
      const decls = [];
      for (;;) {
        const nameTok = P.cur();
        if (nameTok.type !== "ident") throw new CError("声明中应有变量名", nameTok.line);
        P.next();
        const dims = [];
        let init = null;
        while (P.at("[")) {
          P.next();
          if (P.at("]")) { P.next(); dims.push(null); }
          else { dims.push(numConst(P.next())); P.eat("]"); }
        }
        if (P.at("=")) {
          P.next();
          if (P.at("{")) init = parseInitList();
          else init = parseAssign();
        }
        decls.push({ spec, stars, name: nameTok.v, dims, init, isArr: dims.length > 0, line: nameTok.line });
        if (P.at(",")) { P.next(); continue; }
        break;
      }
      P.eat(";");
      return { type: "Decl", line, decls };
    }

    function parseFuncDef() {
      const spec = typeSpec();
      let stars = 0;
      while (P.at("*")) { P.next(); stars++; }
      const nameTok = P.cur();
      if (nameTok.type !== "ident") throw new CError("函数名缺失", nameTok.line);
      P.next();
      P.eat("(");
      const params = [];
      if (P.cur().type === "ident" && P.cur().v === "void" && P.toks[P.pos + 1] && P.toks[P.pos + 1].v === ")") {
        P.next(); P.next();
      } else {
        while (!P.at(")")) {
          const ps = typeSpec();
          let pstars = 0;
          while (P.at("*")) { P.next(); pstars++; }
          const pn = P.cur();
          if (pn.type !== "ident") throw new CError("参数名缺失", pn.line);
          P.next();
          let isArr = false, cnt = null;
          while (P.at("[")) {
            P.next();
            if (P.at("]")) { P.next(); } else { cnt = numConst(P.next()); P.eat("]"); }
            isArr = true;
          }
          params.push({ spec: ps, stars: pstars, name: pn.v, isArr, count: cnt, line: pn.line });
          if (P.at(",")) { P.next(); continue; }
          break;
        }
      }
      P.eat(")");
      const body = parseBlock();
      return { type: "FuncDef", line: nameTok.line, name: nameTok.v, ret: spec, body, params };
    }

    function parseBlock() {
      const line = P.cur().line;
      P.eat("{");
      const stmts = [];
      while (!P.at("}")) {
        if (P.cur().type === "eof") throw new CError("缺少 '}' 闭合代码块", line);
        stmts.push(parseStmt());
      }
      P.next();
      return { type: "Block", line, stmts };
    }

    function parseStmt() {
      const t = P.cur();
      if (P.at("{")) return parseBlock();
      if (t.type === "ident" && (t.v === "case" || t.v === "default")) {
        throw new CError(t.v + " 只能出现在 switch 的 { } 内部", t.line);
      }
      if (t.type === "ident" && t.v === "goto") {
        throw new CError("不支持 goto 语句", t.line);
      }
      if (t.type === "ident" && t.v === "switch") return parseSwitch();
      if (t.type === "ident" && t.v === "do") return parseDoWhile();
      if (t.type === "ident" && t.v === "if") return parseIf();
      if (t.type === "ident" && t.v === "while") return parseWhile();
      if (t.type === "ident" && t.v === "for") return parseFor();
      if (t.type === "ident" && t.v === "return") {
        const tok = P.next();
        let expr = null;
        if (!P.at(";")) expr = parseAssign();
        P.eat(";");
        return { type: "Return", line: tok.line, expr };
      }
      if (t.type === "ident" && t.v === "break") { P.next(); P.eat(";"); return { type: "Break", line: t.line }; }
      if (t.type === "ident" && t.v === "continue") { P.next(); P.eat(";"); return { type: "Continue", line: t.line }; }
      if (P.at(";")) { const tok = P.next(); return { type: "Empty", line: tok.line }; }
      if (P.isTypeStart()) return parseDeclStmt();
      const expr = parseAssign();
      P.eat(";");
      return { type: "ExprStmt", line: expr.line || t.line, expr };
    }

    function parseIf() {
      const tok = P.next();
      P.eat("(");
      const cond = parseExpr();
      P.eat(")");
      const then = parseStmt();
      let els = null;
      if (P.cur().type === "ident" && P.cur().v === "else") {
        P.next();
        els = parseStmt();
      }
      return { type: "If", line: tok.line, cond, then, els };
    }

    function parseSwitch() {
      const tok = P.next(); // switch
      P.eat("(");
      const expr = parseExpr();
      P.eat(")");
      P.eat("{");
      const cases = [];
      let cur = null;
      while (!P.at("}")) {
        if (P.cur().type === "eof") throw new CError("switch 块缺少 '}'", tok.line);
        if (P.cur().type === "ident" && P.cur().v === "case") {
          P.next();
          const label = parseBinary();
          P.eat(":");
          cur = { labels: [label], isDefault: false, line: P.toks[P.pos - 1].line || tok.line, stmts: [] };
          cases.push(cur);
        } else if (P.cur().type === "ident" && P.cur().v === "default") {
          const dt = P.next();
          P.eat(":");
          cur = { labels: [], isDefault: true, line: dt.line, stmts: [] };
          cases.push(cur);
        } else {
          if (!cur) {
            cur = { labels: [], isDefault: false, line: P.cur().line, stmts: [] };
            cases.push(cur);
          }
          cur.stmts.push(parseStmt());
        }
      }
      P.next();
      return { type: "Switch", line: tok.line, expr, cases };
    }

    function parseDoWhile() {
      const tok = P.next(); // do
      const body = parseStmt();
      if (P.cur().type !== "ident" || P.cur().v !== "while") {
        throw new CError("do 循环后应有 while(条件);", P.cur().line);
      }
      P.next();
      P.eat("(");
      const cond = parseExpr();
      P.eat(")");
      P.eat(";");
      return { type: "DoWhile", line: tok.line, body, cond };
    }

    function parseWhile() {
      const tok = P.next();
      P.eat("(");
      const cond = parseExpr();
      P.eat(")");
      const body = parseStmt();
      return { type: "While", line: tok.line, cond, body };
    }

    function parseFor() {
      const tok = P.next();
      P.eat("(");
      let init = null;
      if (!P.at(";")) {
        if (P.isTypeStart()) init = parseDeclStmt();
        else { const e = parseExpr(); P.eat(";"); init = { type: "ExprInit", line: e.line || tok.line, expr: e }; }
      } else P.next();
      let cond = null;
      if (!P.at(";")) cond = parseExpr();
      P.next();
      let upd = null;
      if (!P.at(")")) upd = parseExpr();
      P.eat(")");
      const body = parseStmt();
      return { type: "For", line: tok.line, init, cond, upd, body };
    }

    function parseTernary() {
      const l = parseBinary();
      const t = P.cur();
      if (t.type === "punct" && t.v === "?") {
        P.next();
        const a = parseExpr();
        P.eat(":");
        const b = parseTernary();
        return { type: "Ternary", line: t.line, cond: l, a, b };
      }
      return l;
    }

    function parseAssign() {
      const l = parseTernary();
      const t = P.cur();
      if (t.type === "punct" && (t.v === "=" || t.v === "+=" || t.v === "-=" || t.v === "*=" || t.v === "/=" || t.v === "%=")) {
        P.next();
        const r = parseAssign();
        return { type: "Asg", line: t.line, op: t.v, l, r };
      }
      return l;
    }

    /** 逗号表达式：从左到右依次求值，取最后一个的值 */
    function parseExpr() {
      let e = parseAssign();
      while (P.at(",")) {
        const op = P.next();
        const r = parseAssign();
        e = { type: "Bin", line: op.line, op: ",", l: e, r };
      }
      return e;
    }

    function parseBinary() { return parseLv3(); }
    function parseLv3() {
      let l = parseLv2();
      while (P.at("||")) { const op = P.next(); l = { type: "Bin", line: op.line, op: "||", l, r: parseLv2() }; }
      return l;
    }
    function parseLv2() {
      let l = parseLv1();
      while (P.at("&&")) { const op = P.next(); l = { type: "Bin", line: op.line, op: "&&", l, r: parseLv1() }; }
      return l;
    }
    function parseLv1() {
      let l = parseBitOr();
      while ((P.at("==") || P.at("!="))) { const op = P.next(); l = { type: "Bin", line: op.line, op: op.v, l, r: parseBitOr() }; }
      return l;
    }
    function parseBitOr() {
      let l = parseBitXor();
      while (P.at("|")) { const op = P.next(); l = { type: "Bin", line: op.line, op: "|", l, r: parseBitXor() }; }
      return l;
    }
    function parseBitXor() {
      let l = parseBitAnd();
      while (P.at("^")) { const op = P.next(); l = { type: "Bin", line: op.line, op: "^", l, r: parseBitAnd() }; }
      return l;
    }
    function parseBitAnd() {
      let l = parseEq();
      while (P.at("&")) { const op = P.next(); l = { type: "Bin", line: op.line, op: "&", l, r: parseEq() }; }
      return l;
    }
    function parseEq() {
      let l = parseShift();
      while ((P.at("<") || P.at("<=") || P.at(">") || P.at(">="))) { const op = P.next(); l = { type: "Bin", line: op.line, op: op.v, l, r: parseShift() }; }
      return l;
    }
    function parseShift() {
      let l = parseRel();
      while ((P.at("<<") || P.at(">>"))) { const op = P.next(); l = { type: "Bin", line: op.line, op: op.v, l, r: parseRel() }; }
      return l;
    }
    function parseRel() {
      let l = parseAdd();
      while ((P.at("+") || P.at("-"))) { const op = P.next(); l = { type: "Bin", line: op.line, op: op.v, l, r: parseAdd() }; }
      return l;
    }
    function parseAdd() {
      let l = parseMul();
      while ((P.at("*") || P.at("/") || P.at("%"))) { const op = P.next(); l = { type: "Bin", line: op.line, op: op.v, l, r: parseMul() }; }
      return l;
    }
    function parseMul() {
      const t = P.cur();
      if (t.type === "punct" && (t.v === "-" || t.v === "!" || t.v === "+" || t.v === "*" || t.v === "&" || t.v === "~")) {
        P.next();
        return { type: "Un", line: t.line, op: t.v, x: parseMul() };
      }
      if (t.type === "punct" && (t.v === "++" || t.v === "--")) {
        P.next();
        return { type: "Post", line: t.line, op: t.v, x: parseMul(), pre: true };
      }
      if (t.type === "ident" && t.v === "sizeof") {
        P.next();
        if (P.at("(")) {
          P.next();
          if (P.isTypeStart()) {
            const spec = typeSpec();
            let stars = 0;
            while (P.at("*")) { P.next(); stars++; }
            P.eat(")");
            return { type: "SizeofT", line: t.line, spec, stars };
          }
          const e = parseExpr();
          P.eat(")");
          if (e.type === "Id") return { type: "SizeofId", line: t.line, name: e.name };
          return { type: "SizeofEx", line: t.line, x: e };
        }
        const id = P.cur();
        if (id.type !== "ident") throw new CError("sizeof 用法错误", id.line);
        P.next();
        return { type: "SizeofId", line: t.line, name: id.v };
      }
      return parsePostfix();
    }

    function parsePostfix() {
      let p = parsePrimary();
      for (;;) {
        const t = P.cur();
        if (P.at("[")) {
          P.next();
          const idx = parseExpr();
          P.eat("]");
          p = { type: "Arr", line: t.line, x: p, idx };
        } else if (P.at("->")) {
          P.next();
          const f = P.cur();
          if (f.type !== "ident") throw new CError("'->' 后应有字段名", f.line);
          P.next();
          p = { type: "PtrField", line: t.line, x: p, name: f.v };
        } else if (P.at(".")) {
          P.next();
          const f = P.cur();
          if (f.type !== "ident") throw new CError("'.' 后应有字段名", f.line);
          P.next();
          p = { type: "Field", line: t.line, x: p, name: f.v };
        } else if (P.at("(")) {
          P.next();
          const args = [];
          if (!P.at(")")) { args.push(parseAssign()); while (P.at(",")) { P.next(); args.push(parseAssign()); } }
          P.eat(")");
          p = { type: "Call", line: p.line || t.line, callee: p, args };
        } else if (t.type === "punct" && (t.v === "++" || t.v === "--")) {
          P.next();
          p = { type: "Post", line: t.line, op: t.v, x: p, pre: false };
        } else break;
      }
      return p;
    }

    function parsePrimary() {
      const t = P.cur();
      if (t.type === "num") { P.next(); return { type: "Num", line: t.line, v: t.v }; }
      if (t.type === "str") { P.next(); return { type: "Str", line: t.line, v: t.v }; }
      if (t.type === "ident") {
        P.next();
        if (t.v === "NULL") return { type: "NullLit", line: t.line };
        return { type: "Id", line: t.line, name: t.v };
      }
      if (P.at("(")) {
        // 尝试类型转换 (int)(x) / (Node*)x / 括号表达式 (x)
        const save = P.pos;
        P.next();
        if (P.isTypeStart()) {
          const spec = typeSpec();
          let stars = 0;
          while (P.at("*")) { P.next(); stars++; }
          if (P.at(")")) {
            P.next();
            if (P.at("{")) throw new CError("结构体不支持初始化列表赋值", t.line);
            const x = parseMul();
            return { type: "Cast", line: t.line, spec, stars, x };
          }
        }
        P.pos = save;
        P.next();
        const e = parseExpr();
        P.eat(")");
        return e;
      }
      throw new CError("意外的符号 '" + (t.v || "") + "'", t.line);
    }

    return parseProgram();
  }

  /* ================= 运行时 ================= */
  const MAX_STEPS = 700, MAX_DEPTH = 64;

  class Runtime {
    constructor(ast) {
      this.ast = ast;
      this.globals = { vars: new Map(), parent: null };
      this.structs = new Map();
      this.funcs = new Map();
      this.heap = new Map();
      this.nextAddr = 0x1000;
      this.frames = [];
      this.trace = [];
      this.stdout = [];
      this.stdin = [];
      this._stepCount = 0;
      this._signals = { ret: false, brk: false, cont: false };
      this.curLine = 1;
    }

    err(msg, line) { throw new CError(msg, line || this.curLine); }
    tick() { if (++this._stepCount > MAX_STEPS) this.err("执行步数超过 " + MAX_STEPS + " 步，疑似死循环，已中断"); }
    ptrNull() { return { t: "ptr", ref: null }; }

    truthy(v) {
      if (!v) return false;
      if (v.t === "num") return v.v !== 0;
      if (v.t === "ptr") return v.ref !== null;
      if (v.t === "objref") return !!v.obj;
      return true;
    }

    /* ---------- 结构体注册 ---------- */
    registerStructs() {
      for (const item of this.ast.items) {
        if (item.type === "StructDecl") {
          if (!this.structs.has(item.name)) {
            this.structs.set(item.name, this.makeStructDef(item.name, null, item.fields));
          }
        } else if (item.type === "Typedef") {
          const def = this.makeStructDef(item.name, item.alias, item.fields);
          this.structs.set(item.name, def);
          this.structs.set(item.alias, def);
        }
      }
    }
    makeStructDef(name, alias, fields) {
      const fs = fields.map(f => ({
        name: f.name,
        isPtr: f.type.structName !== null || f.type.base !== "int" && f.type.base !== "char",
        typeName: f.type.structName !== null ? f.type.structName : (f.type.base !== "int" && f.type.base !== "char" ? f.type.base : null),
        count: f.count
      }));
      let size = 0;
      for (const f of fs) size += f.count ? 4 * f.count : (f.typeName ? 8 : 4);
      size = Math.max(8, size);
      return { name: name || alias, alias, fields: fs, size };
    }
    structDef(typeName, line) {
      let n = String(typeName || "").trim();
      if (n.startsWith("struct ")) n = n.slice(7).trim();
      if (n.endsWith("*")) n = n.slice(0, -1).trim();
      const d = this.structs.get(n);
      if (!d) this.err("未定义的结构体类型: " + typeName, line);
      return d;
    }

    allocObj(typeName, line) {
      const def = this.structDef(typeName, line);
      const obj = { addr: this.nextAddr, typeName: def.name, repr: def.alias || def.name, fields: {}, freed: false };
      for (const f of def.fields) {
        if (f.count) obj.fields[f.name] = { t: "arr", items: new Array(f.count).fill(0) };
        else if (f.typeName) obj.fields[f.name] = this.ptrNull();
        else obj.fields[f.name] = { t: "num", v: 0 };
      }
      this.nextAddr += def.size;
      this.heap.set(obj.addr, obj);
      return obj;
    }
    ptrTo(obj) { return { t: "ptr", ref: { kind: "obj", obj } }; }

    /* ---------- 环境 ---------- */
    newEnv(parent) { return { vars: new Map(), parent: parent || null }; }
    findEnv(env, name) {
      for (let e = env; e; e = e.parent) if (e.vars.has(name)) return e;
      return null;
    }
    getVar(env, name, line) {
      const e = this.findEnv(env, name);
      if (!e) this.err("未定义的变量 '" + name + "'", line);
      return e.vars.get(name);
    }

    /* ---------- lvalue ---------- */
    lvEval(node, env) {
      if (node.line) this.curLine = node.line;
      if (node.type === "Id") {
        const e = this.findEnv(env, node.name);
        if (!e) this.err("未定义的变量 '" + node.name + "'", node.line);
        return {
          get: () => e.vars.get(node.name),
          set: (v) => { e.vars.set(node.name, v); },
          ptrTo: () => ({ t: "ptr", ref: { kind: "var", env: e, name: node.name } })
        };
      }
      if (node.type === "Arr") return this.arrLv(node, env);
      if (node.type === "Un" && node.op === "&") {
        // scanf("%d", &a) 等：取址目标就是写入目标
        if (node.x.type === "Id" || node.x.type === "Arr") return this.lvEval(node.x, env);
        this.err("& 取址只能作用于变量或数组元素", node.line);
      }
      if (node.type === "Un" && node.op === "*") {
        const p = this.eval(node.x, env);
        if (p.t !== "ptr" || !p.ref) this.err("解引用 NULL 指针或非指针", node.line);
        const r = p.ref;
        if (r.kind === "var") {
          return {
            get: () => r.env.vars.get(r.name),
            set: (v) => { r.env.vars.set(r.name, v); },
            ptrTo: () => p
          };
        }
        if (r.kind === "arrSlot") {
          return {
            get: () => ({ t: "num", v: r.arr.items[r.idx] }),
            set: (v) => { r.arr.items[r.idx] = v.v; },
            ptrTo: () => p
          };
        }
        if (r.kind === "arr2slot") {
          return {
            get: () => ({ t: "num", v: r.arr.flat[r.pos] }),
            set: (v) => { r.arr.flat[r.pos] = v.v; },
            ptrTo: () => p
          };
        }
        this.err("不能对结构体指针整体赋值", node.line);
      }
      if (node.type === "Field" || node.type === "PtrField") {
        const o = this.eval(node.x, env);
        let obj = null;
        if (o.t === "objref") obj = o.obj;
        else if (o.t === "ptr" && o.ref && o.ref.kind === "obj") obj = o.ref.obj;
        if (!obj) this.err("'" + (node.type === "Field" ? "." : "->") + "' 左侧不是有效结构体（可能为 NULL 指针）", node.line);
        if (!(node.name in obj.fields)) this.err("结构体 " + obj.repr + " 没有字段 '" + node.name + "'", node.line);
        return {
          get: () => obj.fields[node.name],
          set: (v) => { obj.fields[node.name] = v; }
        };
      }
      this.err("不能对该表达式赋值（需为变量/数组元素/指针目标）", node.line);
    }

    arrLv(node, env) {
      const base = this.eval(node.x, env);
      const idx = this.eval(node.idx, env).v;
      if (base.t === "arr2") {
        const [rows, cols] = base.dims;
        if (idx < 0 || idx >= rows) this.err("二维数组行越界: 行 " + idx + " 超出 [0," + (rows - 1) + "]", node.line);
        return {
          get: () => ({ t: "arr2row", arr: base, row: idx }),
          set: (v) => {
            if (v.t === "arr") for (let c = 0; c < cols; c++) base.flat[idx * cols + c] = c < v.items.length ? v.items[c] : 0;
            else this.err("二维数组行只能整体赋一维数组", node.line);
          }
        };
      }
      if (base.t === "arr2row") {
        const cols = base.arr.dims[1];
        if (idx < 0 || idx >= cols) this.err("列越界: " + idx + " 超出 [0," + (cols - 1) + "]", node.line);
        const pos = base.row * cols + idx;
        return {
          get: () => ({ t: "num", v: base.arr.flat[pos] }),
          set: (v) => { base.arr.flat[pos] = v.v; },
          ptrTo: () => ({ t: "ptr", ref: { kind: "arr2slot", arr: base.arr, pos } })
        };
      }
      if (base.t === "sarr") {
        if (idx < 0 || idx >= base.items.length) this.err("结构体数组越界: " + idx, node.line);
        return {
          get: () => ({ t: "objref", obj: base.items[idx] }),
          set: (v) => {
            base.items[idx] = (v && v.t === "objref") ? v.obj :
              (v && v.t === "ptr" && v.ref && v.ref.kind === "obj") ? v.ref.obj : v;
          }
        };
      }
      if (base.t === "parr") {
        if (idx < 0 || idx >= base.items.length) this.err("指针数组越界: " + idx, node.line);
        return {
          get: () => base.items[idx] === null ? { t: "ptr", ref: null } : base.items[idx],
          set: (v) => { base.items[idx] = v; }
        };
      }
      if (base.t === "str") {
        if (idx < 0 || idx >= base.v.length) this.err("字符串下标越界: " + idx, node.line);
        return {
          get: () => ({ t: "num", v: base.v.charCodeAt(idx) })
        };
      }
      if (base.t === "arr") {
        this.checkIdx(base, idx, node.line);
        return {
          get: () => ({ t: "num", v: base.items[idx] }),
          set: (v) => { base.items[idx] = v.v; },
          ptrTo: () => ({ t: "ptr", ref: { kind: "arrSlot", arr: base, idx } })
        };
      }
      if (base.t === "ptr" && base.ref) {
        if (base.ref.kind === "var") {
          const tv = base.ref.env.vars.get(base.ref.name);
          if (tv && tv.t === "arr") {
            this.checkIdx(tv, idx, node.line);
            return {
              get: () => ({ t: "num", v: tv.items[idx] }),
              set: (v) => { tv.items[idx] = v.v; },
              ptrTo: () => ({ t: "ptr", ref: { kind: "arrSlot", arr: tv, idx } })
            };
          }
        }
        if (base.ref.kind === "arrSlot") {
          const arr = base.ref.arr;
          this.checkIdx(arr, idx, node.line);
          return {
            get: () => ({ t: "num", v: arr.items[idx] }),
            set: (v) => { arr.items[idx] = v.v; }
          };
        }
      }
      this.err("不能对非数组值使用下标（目前仅支持 int 数组与指向数组的指针）", node.line);
    }
    checkIdx(arr, idx, line) {
      if (idx < 0 || idx >= arr.items.length || (idx | 0) !== idx) {
        this.err("数组越界: 下标 " + idx + " 超出 [0," + (arr.items.length - 1) + "]", line);
      }
    }

    /* ---------- 表达式求值 ---------- */
    eval(node, env) {
      if (!node) this.err("内部错误: 空表达式");
      if (node.line) this.curLine = node.line;
      switch (node.type) {
        case "Num": return { t: "num", v: node.v };
        case "Str": return { t: "str", v: node.v };
        case "NullLit": return this.ptrNull();
        case "Id": return this.getVar(env, node.name, node.line);
        case "SizeofT": {
          const spec = node.spec;
          if (node.stars > 0) return { t: "num", v: 8 };
          if (spec.structName !== null) return { t: "num", v: this.structDef(spec.structName, node.line).size };
          if (spec.base === "char") return { t: "num", v: 1 };
          if (spec.base === "int") return { t: "num", v: 4 };
          return { t: "num", v: this.structDef(spec.base, node.line).size };
        }
        case "SizeofId": {
          if (this.structs.has(node.name)) return { t: "num", v: this.structs.get(node.name).size };
          const e = this.findEnv(env, node.name);
          if (e) {
            const v = e.vars.get(node.name);
            if (v && v.t === "arr") return { t: "num", v: v.items.length * 4 };
            if (v && v.t === "ptr" && v.ref && v.ref.kind === "var") {
              const tv = v.ref.env.vars.get(v.ref.name);
              if (tv && tv.t === "arr") return { t: "num", v: tv.items.length * 4 };
            }
          }
          return { t: "num", v: 4 };
        }
        case "SizeofEx": return { t: "num", v: 4 };
        case "Ternary": {
          const c = this.eval(node.cond, env);
          return this.truthy(c) ? this.eval(node.a, env) : this.eval(node.b, env);
        }
        case "InitList": return { t: "arr", items: node.vals.map(x => this.eval(x, env).v) };
        case "Bin": return this.evalBin(node, env);
        case "Un":
          if (node.op === "-") return { t: "num", v: -this.asNum(this.eval(node.x, env), node.line) };
          if (node.op === "+") return { t: "num", v: this.asNum(this.eval(node.x, env), node.line) };
          if (node.op === "!") return { t: "num", v: this.truthy(this.eval(node.x, env)) ? 0 : 1 };
          if (node.op === "~") return { t: "num", v: ~this.asNum(this.eval(node.x, env), node.line) };
          if (node.op === "*") return this.deref(this.eval(node.x, env), node.line);
          if (node.op === "&") return this.addrOf(node.x, env, node.line);
          this.err("不支持的一元运算符 '" + node.op + "'", node.line);
          break;
        case "Cast": return this.eval(node.x, env);
        case "Post": {
          const lv = this.lvEval(node.x, env);
          const old = lv.get();
          const delta = node.op === "++" ? 1 : -1;
          const after = old.t === "num" ? { t: "num", v: old.v + delta } : Object.assign({}, old);
          lv.set(after);
          return node.pre ? after : old;
        }
        case "Asg": {
          const lv = this.lvEval(node.l, env);
          const r = this.eval(node.r, env);
          let v = r;
          if (node.op !== "=") {
            const a = this.asNum(lv.get(), node.line), b = this.asNum(r, node.line);
            switch (node.op) {
              case "+=": v = { t: "num", v: a + b }; break;
              case "-=": v = { t: "num", v: a - b }; break;
              case "*=": v = { t: "num", v: a * b }; break;
              case "/=":
                if (b === 0) this.err("除数为 0", node.line);
                v = { t: "num", v: Math.trunc(a / b) };
                break;
              case "%=":
                if (b === 0) this.err("取模运算除数为 0", node.line);
                v = { t: "num", v: a % b };
                break;
            }
          }
          lv.set(v);
          return v;
        }
        case "Arr": return this.lvEval(node, env).get();
        case "Field": return this.lvEval(node, env).get();
        case "PtrField": {
          const p = this.eval(node.x, env);
          let obj = null;
          if (p.t === "ptr" && p.ref && p.ref.kind === "obj") obj = p.ref.obj;
          else if (p.t === "objref") obj = p.obj;
          if (!obj) this.err("'->' 左侧不是结构体指针（可能为 NULL 或悬挂指针）", node.line);
          if (!(node.name in obj.fields)) this.err("结构体 " + obj.repr + " 没有字段 '" + node.name + "'", node.line);
          return obj.fields[node.name];
        }
        case "Call": return this.evalCall(node, env);
        default: this.err("无法求值的表达式: " + node.type, node.line);
      }
      return { t: "num", v: 0 };
    }

    evalBin(node, env) {
      const op = node.op;
      if (op === "&&") return { t: "num", v: (this.truthy(this.eval(node.l, env)) && this.truthy(this.eval(node.r, env))) ? 1 : 0 };
      if (op === "||") return { t: "num", v: (this.truthy(this.eval(node.l, env)) || this.truthy(this.eval(node.r, env))) ? 1 : 0 };
      const l = this.eval(node.l, env), r = this.eval(node.r, env);
      if (op === ",") return r; // 逗号表达式：依次求值，取右值
      if (op === "==" || op === "!=") {
        let eq;
        if (l.t === "ptr" || r.t === "ptr" || l.t === "objref" || r.t === "objref") {
          const la = l.t === "ptr" ? l.ref : (l.t === "objref" ? l.obj : null);
          const ra = r.t === "ptr" ? r.ref : (r.t === "objref" ? r.obj : null);
          eq = (la === ra) || (la && ra && la.kind === "obj" && ra.kind === "obj" && la.obj === ra.obj);
        } else if (l.t === "arr" || r.t === "arr") {
          eq = (l.t === "arr" && r.t === "arr" && l.items === r.items);
        } else {
          eq = l.v === r.v;
        }
        if (op === "==") return { t: "num", v: eq ? 1 : 0 };
        return { t: "num", v: eq ? 0 : 1 };
      }
      const a = this.asNum(l, node.line), b = this.asNum(r, node.line);
      switch (op) {
        case "+": return { t: "num", v: a + b };
        case "-": return { t: "num", v: a - b };
        case "*": return { t: "num", v: a * b };
        case "/":
          if (b === 0) this.err("除数为 0", node.line);
          return { t: "num", v: Math.trunc(a / b) };
        case "%":
          if (b === 0) this.err("取模运算除数为 0", node.line);
          return { t: "num", v: a % b };
        case "<": return { t: "num", v: a < b ? 1 : 0 };
        case "<=": return { t: "num", v: a <= b ? 1 : 0 };
        case ">": return { t: "num", v: a > b ? 1 : 0 };
        case ">=": return { t: "num", v: a >= b ? 1 : 0 };
        case "&": return { t: "num", v: a & b };
        case "|": return { t: "num", v: a | b };
        case "^": return { t: "num", v: a ^ b };
        case "<<": return { t: "num", v: a << (b & 31) };
        case ">>": return { t: "num", v: a >> (b & 31) };
      }
      this.err("不支持的运算符 '" + op + "'", node.line);
    }

    asNum(v, line) {
      if (v.t === "num" || v.t === "char") return v.v;
      if (v.t === "ptr") this.err("指针不能直接参与数值运算（除非先 * 解引用）", line);
      if (v.t === "arr") this.err("数组不能直接参与数值运算（缺少下标）", line);
      this.err("运算需要数值", line);
      return 0;
    }
    deref(p, line) {
      if (p.t === "ptr") {
        if (!p.ref) this.err("解引用 NULL 指针", line);
        const r = p.ref;
        if (r.kind === "var") return r.env.vars.get(r.name);
        if (r.kind === "arrSlot") return { t: "num", v: r.arr.items[r.idx] };
        if (r.kind === "arr2slot") return { t: "num", v: r.arr.flat[r.pos] };
        if (r.kind === "obj") return { t: "objref", obj: r.obj };
        this.err("无法解引用该指针", line);
      }
      if (p.t === "objref") return p;
      this.err("解引用需要指针", line);
    }
    addrOf(node, env, line) {
      if (node.type === "Id") return this.lvEval(node, env).ptrTo();
      if (node.type === "Arr") return this.lvEval(node, env).ptrTo();
      if (node.type === "Un" && node.op === "*") return this.eval(node.x, env);
      this.err("& 仅支持变量或数组元素", line);
    }

    /* ---------- 函数 ---------- */
    evalCall(node, env) {
      const name = node.callee && node.callee.type === "Id" ? node.callee.name : "";
      const args = node.args.map(a => this.eval(a, env));
      if (name === "printf") return this.builtinPrintf(args, node.line);
      if (name === "scanf") return this.builtinScanf(node, env);
      if (name === "strlen" || name === "strcmp" || name === "strcpy" || name === "strcat") return this.builtinStr(node, name, env);
      if (name === "malloc") return this.builtinMalloc(node, args, env);
      if (name === "free") { this.builtinFree(args, node.line); return this.ptrNull(); }
      const fn = this.funcs.get(name);
      if (!fn) this.err("未定义的函数 '" + name + "'（仅支持 printf / malloc / free 与自定义函数）", node.line);
      if (args.length !== fn.params.length) {
        this.err("函数 " + name + " 需要 " + fn.params.length + " 个参数，实际传入 " + args.length + " 个", node.line);
      }
      if (this.frames.length >= MAX_DEPTH) this.err("递归深度超过 " + MAX_DEPTH + " 层（防止栈溢出）", node.line);

      const frameEnv = this.newEnv(this.globals);
      for (let i = 0; i < fn.params.length; i++) {
        const p = fn.params[i];
        // 数组参数：绑定为同一数组引用（共享 items，与 C 的指针语义一致）
        frameEnv.vars.set(p.name, args[i]);
      }
      const argsLabel = fn.params.map((p, i) => {
        const a = args[i];
        if (!a) return "?";
        if (a.t === "ptr") return a.ref === null ? "NULL" : this.addrLabel(a);
        if (a.t === "arr") return "[数组]";
        if (a.t === "objref") return "{结构体}";
        return String(a.v);
      }).join(", ");
      const frame = { name: fn.name, argsLabel, env: frameEnv, retVal: undefined };
      this.frames.push(frame);
      this.emit(fn.line, frameEnv);
      const saved = this._signals;
      this._signals = { ret: false, brk: false, cont: false };
      let res = this.ptrNull();
      try {
        this.execBlock(fn.body, frameEnv);
      } finally {
        if (frame.retVal !== undefined) res = frame.retVal;
        else if (fn.ret.base === "int" || fn.ret.base === "char" || fn.ret.base === "void") res = { t: "num", v: 0 };
      }
      this.frames.pop();
      this._signals = saved;
      return res;
    }

    builtinPrintf(args, line) {
      if (!args.length) return { t: "num", v: 0 };
      const fmt = args[0].t === "str" ? args[0].v : String(args[0].v);
      let out = "", ai = 1;
      for (let i = 0; i < fmt.length; i++) {
        const ch = fmt[i];
        if (ch !== "%") { out += ch; continue; }
        const spec = fmt[++i];
        if (spec === "%") { out += "%"; continue; }
        if (spec === "n") { this.stdout.push(out); out = ""; continue; }
        const a = args[ai++];
        if (spec === "d" || spec === "i") out += a ? this.asNum(a, line) : 0;
        else if (spec === "c") out += a ? String.fromCharCode(a.v) : " ";
        else if (spec === "s") out += a ? (a.t === "str" ? a.v : this.asNum(a, line)) : "";
        else if (spec === "p") out += a ? (a.t === "ptr" ? (a.ref === null ? "NULL" : this.addrLabel(a)) : this.format(a)) : "NULL";
        else if (spec === "x") out += a ? (a.v >>> 0).toString(16) : "0";
        else out += "%" + spec;
      }
      if (out !== "") this.stdout.push(out);
      return { t: "num", v: 0 };
    }

    builtinScanf(node, env) {
      const fmtArg = node.args && node.args[0] ? this.eval(node.args[0], env) : { t: "str", v: " %d" };
      const fmt = fmtArg.t === "str" ? fmtArg.v : String(fmtArg.v);
      let ai = 1, got = 0;
      for (let i = 0; i < fmt.length; i++) {
        if (fmt[i] !== "%") continue;
        const spec = fmt[++i];
        if (spec === "%") continue;
        if (spec === " " || spec === "\n") continue;
        const lvArg = node.args[ai];
        if (!lvArg) this.err("scanf 参数不足", node.line);
        const lv = this.lvEval(lvArg, env);
        if (spec === "d" || spec === "i") {
          const tok = this.stdin.shift();
          if (tok === undefined) {
            this.err("标准输入已用完：scanf 需要更多数字（请在编辑器下方「标准输入」框填写，空格分隔）", node.line);
          }
          lv.set({ t: "num", v: tok });
          got++;
        } else if (spec === "c") {
          const tok = this.stdin.shift();
          lv.set({ t: "num", v: tok === undefined ? 32 : tok });
          got++;
        } else if (spec === "s") {
          const tok = this.stdin.shift();
          lv.set(tok === undefined ? { t: "str", v: "" } : { t: "str", v: String(tok) });
          got++;
        } else {
          this.err("scanf 仅支持 %d / %c / %s 格式", node.line);
        }
        ai++;
      }
      return { t: "num", v: got };
    }

    builtinStr(node, name, env) {
      const args = node.args.map(a => this.eval(a, env));
      const sv = x => (x && x.t === "str" ? x.v : String(x && x.v !== undefined ? x.v : ""));
      if (name === "strlen") return { t: "num", v: sv(args[0]).length };
      if (name === "strcmp") {
        const a = sv(args[0]), b = sv(args[1]);
        return { t: "num", v: a === b ? 0 : (a < b ? -1 : 1) };
      }
      if (name === "strcpy" || name === "strcat") {
        if (!node.args[0]) this.err(name + " 缺少参数", node.line);
        const lv = this.lvEval(node.args[0], env);
        const src = sv(args[1]);
        const dst = sv(args[0]);
        const res = { t: "str", v: name === "strcpy" ? src : dst + src };
        lv.set(res);
        return res;
      }
      return this.ptrNull();
    }

    builtinMalloc(node, args, env) {
      // 判断分配目标类型：malloc(sizeof(struct Node)) / malloc(sizeof(Node))
      const a0 = node.args && node.args[0];
      if (a0 && a0.type === "SizeofT" && a0.spec) {
        const spec = a0.spec;
        if (spec.structName !== null) return this.ptrTo(this.allocObj(spec.structName, node.line));
        if (spec.base === "int" || spec.base === "char") return this.rawMalloc(spec.base === "char" ? 1 : 4, node.line);
        return this.ptrTo(this.allocObj(spec.base, node.line));
      }
      if (a0 && a0.type === "SizeofId" && this.structs.has(a0.name)) {
        return this.ptrTo(this.allocObj(a0.name, node.line));
      }
      if (!args.length || args[0].t !== "num") this.err("malloc 参数应为 sizeof(类型)，如 malloc(sizeof(struct Node))", node.line);
      return this.rawMalloc(args[0].v, node.line);
    }
    rawMalloc(bytes, line) {
      const obj = { addr: this.nextAddr, typeName: "__raw", repr: "内存块", fields: {}, freed: false };
      this.nextAddr += Math.max(8, Math.round(bytes));
      this.heap.set(obj.addr, obj);
      return this.ptrTo(obj);
    }
    builtinFree(args, line) {
      const p = args[0];
      if (p && p.t === "ptr" && p.ref && p.ref.kind === "obj") {
        p.ref.obj.freed = true;
        this.heap.delete(p.ref.obj.addr);
        p.ref = null;
      }
    }

    /* ---------- 语句 ---------- */
    execBlock(block, env) {
      for (const s of block.stmts) {
        this.execStmt(s, env);
        if (this._signals.ret || this._signals.brk || this._signals.cont) return;
      }
    }

    execStmt(s, env) {
      if (this._signals.ret || this._signals.brk || this._signals.cont) return;
      if (s.line) this.curLine = s.line;
      switch (s.type) {
        case "Empty": return;
        case "Block": {
          // C 语义：块内声明属于块作用域
          this.execBlock(s, this.newEnv(env));
          return;
        }
        case "Decl":
          this.execDecl(s, env);
          this.emit(s.line, env);
          return;
        case "ExprStmt":
        case "Asg":
          if (s.expr) this.eval(s.expr, env);
          else this.eval(s, env);
          this.emit(s.line, env);
          return;
        case "Switch": {
          const v = this.eval(s.expr, env);
          this.emit(s.line, env);
          let started = false;
          for (const c of s.cases) {
            if (!started) {
              const hit = c.isDefault || c.labels.some(l => this.eval(l, env).v === v.v);
              if (hit) started = true;
            }
            if (!started) continue;
            for (const st of c.stmts) {
              if (!st.line) st.line = c.line;
              this.execStmt(st, env);
              if (this._signals.brk) { this._signals.brk = false; return; }
              if (this._signals.ret || this._signals.cont) return;
            }
          }
          return;
        }
        case "DoWhile": {
          for (;;) {
            this.tick();
            this.execStmt(s.body, env);
            if (this._signals.brk) { this._signals.brk = false; break; }
            if (this._signals.cont) this._signals.cont = false;
            if (this._signals.ret) return;
            const c = this.truthy(this.eval(s.cond, env));
            this.emit(s.line, env);
            if (!c) break;
          }
          return;
        }
        case "If": {
          const c = this.truthy(this.eval(s.cond, env));
          this.emit(s.line, env);
          if (c) this.execStmt(s.then, env);
          else if (s.els) this.execStmt(s.els, env);
          return;
        }
        case "While": {
          for (;;) {
            this.tick();
            const c = this.truthy(this.eval(s.cond, env));
            this.emit(s.line, env);
            if (!c) break;
            this.execStmt(s.body, env);
            if (this._signals.brk) { this._signals.brk = false; break; }
            if (this._signals.cont) { this._signals.cont = false; continue; }
            if (this._signals.ret) return;
          }
          return;
        }
        case "For": {
          const loopEnv = this.newEnv(env);
          if (s.init) {
            if (s.init.type === "Decl") this.execDecl(s.init, loopEnv);
            else if (s.init.type === "ExprInit") this.eval(s.init.expr, loopEnv);
            else this.eval(s.init, loopEnv);
          }
          for (;;) {
            this.tick();
            let c = true;
            if (s.cond) c = this.truthy(this.eval(s.cond, loopEnv));
            this.emit(s.line, env);
            if (!c) break;
            this.execStmt(s.body, loopEnv);
            if (this._signals.brk) { this._signals.brk = false; break; }
            if (this._signals.cont) { this._signals.cont = false; }
            if (this._signals.ret) return;
            if (s.upd) this.eval(s.upd, loopEnv);
          }
          return;
        }
        case "Return": {
          const sv = s.expr ? this.eval(s.expr, env) : null;
          this.emit(s.line, env);
          const frame = this.frames[this.frames.length - 1];
          if (frame) frame.retVal = sv;
          this._signals.ret = true;
          return;
        }
        case "Break": this.emit(s.line, env); this._signals.brk = true; return;
        case "Continue": this.emit(s.line, env); this._signals.cont = true; return;
      }
    }

    execDecl(s, env) {
      for (const d of s.decls) {
        const tn = d.spec.structName !== null ? d.spec.structName :
          (d.spec.base !== "int" && d.spec.base !== "char" ? d.spec.base : null);
        if (d.isArr) {
          const dims = d.dims ? d.dims.slice() : [];
          // 指针数组：struct Node* heads[5]; / int* p[5];
          if (d.stars > 0) {
            if (dims.length > 1) this.err("暂不支持二维指针数组", d.line);
            const n = dims.length && dims[0] !== null ? dims[0] : 0;
            const items = [];
            if (d.init && d.init.type === "InitList") {
              for (const iv of d.init.vals) items.push(this.eval(iv, env));
            }
            while (items.length < n) items.push({ t: "ptr", ref: null });
            env.vars.set(d.name, { t: "parr", items });
            continue;
          }
          // char s[] = "hello"：字符串初始化
          if (d.init && d.init.type === "Str" && d.spec.base === "char") {
            env.vars.set(d.name, { t: "str", v: d.init.v });
            continue;
          }
          // 结构体数组：struct Node nodes[3];
          if (tn && d.stars === 0) {
            if (dims.length > 1) this.err("暂不支持结构体二维数组", d.line);
            const n = dims.length ? (dims[0] !== null ? dims[0] : 0) : 0;
            const items = [];
            for (let i = 0; i < n; i++) items.push(this.allocObj(tn, d.line));
            env.vars.set(d.name, { t: "sarr", items });
            continue;
          }
          // 二维数组
          const is2d = dims.length >= 2 || (d.init && d.init.type === "InitList" && d.init.vals.some(x => x && x.type === "InitList"));
          if (is2d) {
            const rows = dims[0] !== null && dims[0] !== undefined ? dims[0] :
              (d.init && d.init.type === "InitList" ? d.init.vals.length : 0);
            let cols = dims[1] !== null && dims[1] !== undefined ? dims[1] : 0;
            if (!cols && d.init && d.init.type === "InitList" && d.init.vals[0] && d.init.vals[0].type === "InitList") {
              cols = d.init.vals[0].vals.length;
            }
            if (!cols) this.err("二维数组第二维必须是常量（如 int a[2][3]）", d.line);
            let flat = [];
            if (d.init && d.init.type === "InitList") {
              if (d.init.vals.some(x => x && x.type === "InitList")) {
                for (const rv of d.init.vals) {
                  const row = rv && rv.type === "InitList" ? rv.vals.map(x => this.eval(x, env).v) : [];
                  for (let cc = 0; cc < cols; cc++) flat.push(cc < row.length ? row[cc] : 0);
                }
              } else {
                flat = d.init.vals.map(x => this.eval(x, env).v);
              }
            }
            while (flat.length < rows * cols) flat.push(0);
            env.vars.set(d.name, { t: "arr2", dims: [rows, cols], flat });
            continue;
          }
          // 一维数组
          if (d.init && d.init.type === "InitList") {
            const items = d.init.vals.map(x => this.eval(x, env).v);
            // C 语义：声明长度更大时，未显式初始化的元素补 0
            const declared = dims.length && dims[0] !== null ? dims[0] : 0;
            if (declared > items.length) {
              while (items.length < declared) items.push(0);
            }
            env.vars.set(d.name, { t: "arr", items });
          } else {
            const n = dims.length && dims[0] !== null ? dims[0] : 0;
            env.vars.set(d.name, { t: "arr", items: new Array(n).fill(0) });
          }
        } else if (d.stars > 0) {
          env.vars.set(d.name, d.init ? this.eval(d.init, env) : this.ptrNull());
        } else if (tn) {
          // 结构体变量（值语义）
          env.vars.set(d.name, { t: "objref", obj: this.allocObj(tn, d.line) });
        } else {
          env.vars.set(d.name, d.init ? this.eval(d.init, env) : { t: "num", v: 0 });
        }
      }
    }

    /* ---------- 快照 ---------- */
    emit(line, env) {
      this.tick();
      this.trace.push({
        line,
        vars: this.snapshotVars(env),
        heap: this.snapshotHeap(),
        stdout: this.stdout.length,
        stack: this.frames.map(f => f.name + "(" + f.argsLabel + ")")
      });
    }

    snapshotVars(env) {
      const chain = [];
      for (let e = env; e; e = e.parent) chain.unshift(e);
      const seen = [], out = [];
      for (const e of chain) {
        // 调用帧变量放最后展示？保持声明顺序即可
        for (const [name, v] of e.vars) {
          if (seen.indexOf(name) === -1) {
            seen.push(name);
            out.push({ name, v: this.format(v) });
          }
        }
      }
      return out;
    }

    snapshotHeap() {
      const objs = [];
      for (const o of this.heap.values()) {
        const f = {};
        for (const k in o.fields) {
          const v = o.fields[k];
          if (v.t === "ptr") f[k] = v.ref === null ? null : this.addrLabel(v);
          else if (v.t === "arr") f[k] = { __arr: v.items.slice() };
          else f[k] = v.v;
        }
        objs.push({ addr: o.addr, type: o.repr || o.typeName, freed: false, fields: f });
      }
      return objs;
    }

    format(v) {
      if (!v) return "?";
      if (v.t === "num" || v.t === "char") return String(v.v);
      if (v.t === "str") return '"' + v.v + '"';
      if (v.t === "arr") {
        const s = v.items.slice(0, 12).join(", ");
        return "[" + s + (v.items.length > 12 ? ", …" : "") + "]";
      }
      if (v.t === "arr2") {
        const rows = Math.min(v.dims[0], 4);
        const parts = [];
        for (let r = 0; r < rows; r++) {
          parts.push("[" + v.flat.slice(r * v.dims[1], r * v.dims[1] + Math.min(v.dims[1], 8)).join(",") + (v.dims[1] > 8 ? ",…" : "") + "]");
        }
        return "[" + parts.join(" ") + (v.dims[0] > 4 ? " …" : "") + "]";
      }
      if (v.t === "sarr") return "[" + v.items.length + " × {结构体}]";
      if (v.t === "arr2row") {
        const cols = v.arr.dims[1];
        return "[" + v.arr.flat.slice(v.row * cols, v.row * cols + Math.min(cols, 8)).join(", ") + "]";
      }
      if (v.t === "ptr") return v.ref === null ? "NULL" : this.addrLabel(v);
      if (v.t === "objref") return "0x" + v.obj.addr.toString(16).toUpperCase();
      return "?";
    }
    addrLabel(ptr) {
      const r = ptr && ptr.ref;
      if (!r) return "NULL";
      // 统一带 0x 前缀：可视化层靠它识别指针/地址
      if (r.kind === "obj") return "0x" + r.obj.addr.toString(16).toUpperCase();
      if (r.kind === "arrSlot") return "@arr#" + r.idx;
      return "@" + (r.name || "?");
    }

    run() {
      this.registerStructs();
      for (const item of this.ast.items) {
        if (item.type === "FuncDef") this.funcs.set(item.name, item);
      }
      const main = this.funcs.get("main");
      if (!main) {
        for (const item of this.ast.items) {
          if (item.type === "Decl") this.execDecl(item, this.globals);
        }
        this.emit(1, this.globals);
      } else {
        this.evalCall({ type: "Call", callee: { type: "Id", name: "main" }, args: [], line: main.line }, this.globals);
        // main 结束后补一次帧弹出后的快照
        if (this.trace.length && this.trace[this.trace.length - 1].stack.length === 0) { /* ok */ }
      }
      return { trace: this.trace, stdout: this.stdout };
    }
  }

  /* ================= 对外接口 ================= */
  function run(src, opts) {
    opts = opts || {};
    let rt = null;
    try {
      const ast = parse(src);
      rt = new Runtime(ast);
      // 标准输入：支持 "12 34" 字符串或数字数组
      const rawStdin = Array.isArray(opts.stdin) ? opts.stdin : String(opts.stdin || "");
      const parts = (Array.isArray(rawStdin) ? rawStdin : rawStdin.split(/[,\s]+/))
        .filter(s => String(s).trim() !== "");
      rt.stdin = parts.map(s => {
        if (typeof s === "number") return s;
        const n = Number(s);
        return isFinite(n) ? n : String(s).trim();
      });
      const res = rt.run();
      return {
        ok: true,
        trace: res.trace,
        stdout: res.stdout,
        lineCount: src.split("\n").length
      };
    } catch (e) {
      if (e instanceof CError) {
        const out = { ok: false, error: { message: e.message, line: e.line || 1 } };
        // 运行时错误（解析期错误没有 rt）：保留出错前的部分执行轨迹，
        // 让动画能播到“崩掉之前的那一步”
        if (rt) {
          out.trace = rt.trace;
          out.stdout = rt.stdout;
          out.lineCount = src.split("\n").length;
          out.partial = true;
        }
        return out;
      }
      throw e;
    }
  }

  function check(src) {
    try {
      parse(src);
      return { ok: true };
    } catch (e) {
      if (e instanceof CError) return { ok: false, error: { message: e.message, line: e.line || 1 } };
      throw e;
    }
  }

  return { run, check, lex, parse, CError };
})();