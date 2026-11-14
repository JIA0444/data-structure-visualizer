/* ==========================================================
   sorting.js — 排序大集合（10 种算法）
   ========================================================== */
(function () {
  const C_YELLOW = "#fbbf24", C_GREEN = "#34d399", C_RED = "#f87171",
        C_PURPLE = "#a855f7", C_BLUE = "#5b8cff", C_CYAN = "#22d3ee", C_ORANGE = "#fb923c";
  const F_YELLOW = "rgba(251,191,36,0.5)", F_GREEN = "rgba(52,211,153,0.5)",
        F_RED = "rgba(248,113,113,0.5)", F_PURPLE = "rgba(168,85,247,0.5)";
  const F_DIM = "rgba(104,122,166,0.16)";

  /** 条形场景 + 指针标签 */
  function barScene(arr, hl, labels, dim) {
    const n = arr.length;
    const maxW = 880, maxH = 300;
    const gap = n > 26 ? 2 : 7;
    const bw = DS.clamp(Math.floor(maxW / n) - gap, 6, 56);
    const totalW = n * (bw + gap);
    const startX = -totalW / 2;
    const maxV = Math.max(1, ...arr.map(x => Math.abs(x)), 1);
    const elems = [];
    for (let i = 0; i < n; i++) {
      const v = arr[i];
      let h = (Math.abs(v) / maxV) * maxH;
      if (h < 4) h = 4;
      const x = startX + i * (bw + gap);
      const inDim = dim && dim.some(d => i >= d[0] && i <= d[1]);
      let fill;
      if (hl && hl[i] !== undefined) fill = hl[i];
      else if (inDim && !dimGrey) fill = fillFromFlag(dim);
      elems.push({
        t: "bar", key: "b" + i, x, y: -h / 2, w: bw, h,
        fill: (hl && hl[i] !== undefined) ? hl[i] : (inDim ? F_DIM : C_BLUE),
        text: n <= 24 ? String(v) : undefined,
        index: String(i),
        active: !!hl && hl[i] !== undefined
      });
    }
    function fillFromFlag(d) { return F_DIM; }
    const dimGrey = false;
    if (labels) {
      for (const lb of labels) {
        const x = startX + lb.i * (bw + gap);
        elems.push({
          t: "text", key: lb.key, x, y: lb.y !== undefined ? lb.y : 40,
          text: lb.text, size: 13, color: lb.color || C_GREEN, bold: true, mono: true
        });
      }
    }
    return { elements: elems, view: { x0: startX - 24, x1: startX + totalW + 24, y0: -maxH - 34, y1: 64 } };
  }

  const ALGOS = {
    /* ---------- 冒泡 ---------- */
    bubble(a0, stat) {
      const a = a0.slice(), n = a.length, steps = [];
      const sorted = new Array(n).fill(false);
      const hlOf = idxs => { const m = {}; idxs.forEach(i => m[i] = C_YELLOW); return m; };
      const greenOf = () => { const m = {}; sorted.forEach((s, i) => { if (s) m[i] = C_GREEN; }); return m; };
      steps.push(DS.mkStep(barScene(a, {}), "冒泡排序：每轮<b>相邻两两比较</b>，大的向后<b>冒泡</b>，一轮结束本轮最大值沉底（变绿）。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      for (let i = 0; i < n - 1; i++) {
        steps.push(DS.mkStep(barScene(a, greenOf()), "第 " + (i + 1) + " 轮开始：把未排序部分 [0, " + (n - i - 1) + "] 中最大的数冒到最后。", { stats: { 比较: stat.cmp, 交换: stat.swp, 轮次: i + 1 } }));
        for (let j = 0; j < n - 1 - i; j++) {
          stat.cmp++;
          const h = greenOf(); h[j] = C_YELLOW; h[j + 1] = C_YELLOW;
          if (a[j] > a[j + 1]) {
            DS.swap(a, j, j + 1);
            stat.swp++;
            h[j] = C_RED; h[j + 1] = C_RED;
            steps.push(DS.mkStep(barScene(a, h), "比较 a[" + j + "]=" + a[j + 1] + " 与 a[" + (j + 1) + "]=" + a[j] + "：前者更大 → <b>交换</b>（红）。", { stats: { 比较: stat.cmp, 交换: stat.swp, 轮次: i + 1 } }));
          } else {
            steps.push(DS.mkStep(barScene(a, h), "比较相邻元素：前 ≤ 后，<b>不交换</b>，j 继续右移。", { stats: { 比较: stat.cmp, 交换: stat.swp, 轮次: i + 1 } }));
          }
        }
        sorted[n - 1 - i] = true;
        steps.push(DS.mkStep(barScene(a, greenOf(), [{ i: n - 1 - i, key: "done", text: "▼ 本轮最大已就位", color: C_GREEN }]), "本轮结束：a[" + (n - 1 - i) + "]=" + a[n - 1 - i] + " 已就位。", { stats: { 比较: stat.cmp, 交换: stat.swp, 轮次: i + 1 } }));
      }
      sorted[0] = true;
      steps.push(DS.mkStep(barScene(a, greenOf()), "🏁 冒泡排序完成！比较 " + stat.cmp + " 次，交换 " + stat.swp + " 次。时间复杂度 O(n²)。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      return steps;
    },

    /* ---------- 选择 ---------- */
    selection(a0, stat) {
      const a = a0.slice(), n = a.length, steps = [];
      const done = new Array(n).fill(false);
      const base = () => { const m = {}; done.forEach((d, i) => { if (d) m[i] = C_GREEN; }); return m; };
      steps.push(DS.mkStep(barScene(a, {}), "选择排序：每轮<b>扫一遍找最小值</b>，与未排序区第一个元素交换，已排序区逐步扩大（绿）。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      for (let i = 0; i < n - 1; i++) {
        let min = i;
        const h = base(); h[i] = C_ORANGE;
        steps.push(DS.mkStep(barScene(a, h), "第 " + (i + 1) + " 轮：假设 a[" + i + "]=" + a[i] + " 为当前最小，开始扫描 [i+1, n-1]。", { stats: { 比较: stat.cmp, 交换: stat.swp, 轮次: i + 1 } }));
        for (let j = i + 1; j < n; j++) {
          stat.cmp++;
          if (a[j] < a[min]) min = j;
          const h2 = base(); h2[i] = C_ORANGE; h2[min] = C_YELLOW; h2[j] = C_YELLOW;
          steps.push(DS.mkStep(barScene(a, h2), "扫描 a[" + j + "]：目前最小是 a[" + min + "]=" + a[min] + "。", { stats: { 比较: stat.cmp, 交换: stat.swp, 轮次: i + 1 } }));
        }
        if (min !== i) { DS.swap(a, i, min); stat.swp++; }
        const h3 = base(); h3[i] = C_GREEN;
        steps.push(DS.mkStep(barScene(a, h3), "把最小值 " + a[i] + " 交换到位置 " + i + "，已排序区 +1。", { stats: { 比较: stat.cmp, 交换: stat.swp, 轮次: i + 1 } }));
        done[i] = true;
      }
      done[n - 1] = true;
      steps.push(DS.mkStep(barScene(a, base()), "🏁 选择排序完成！比较 " + stat.cmp + " 次，交换最多 " + stat.swp + " 次。O(n²) 但交换次数少。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      return steps;
    },

    /* ---------- 插入 ---------- */
    insertion(a0, stat) {
      const a = a0.slice(), n = a.length, steps = [];
      const done = new Array(n).fill(false);
      const base = () => { const m = {}; done.forEach((d, i) => { if (d) m[i] = C_GREEN; }); return m; };
      steps.push(DS.mkStep(barScene(a, {}), "插入排序：像理扑克牌，把每张新牌<b>插到已排序区的正确位置</b>。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      done[0] = true;
      for (let i = 1; i < n; i++) {
        const key = a[i];
        const h1 = base(); h1[i] = C_PURPLE;
        steps.push(DS.mkStep(barScene(a, h1, [{ i, key: "key", text: "key=" + key, color: C_PURPLE }]), "取出 a[" + i + "]=" + key + " 作为 key（紫），在左边已排序区找它该待的位置。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
        let j = i - 1;
        while (j >= 0) {
          stat.cmp++;
          if (a[j] > key) {
            a[j + 1] = a[j];
            stat.swp++;
            const h = base(); h[j + 1] = C_YELLOW; h[j] = C_YELLOW; h[i] = C_PURPLE;
            steps.push(DS.mkStep(barScene(a, h, [{ i, key: "key", text: "key=" + key, color: C_PURPLE }]), "a[" + j + "]=" + a[j] + " > key → <b>右移一格</b>，腾出空位。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
            j--;
          } else {
            const m2 = base(); m2[i] = C_PURPLE; m2[j + 1] = C_CYAN;
            steps.push(DS.mkStep(barScene(a, m2, [{ i, key: "key", text: "key=" + key, color: C_PURPLE }]), "a[" + j + "]=" + a[j] + " ≤ key，找到插入位置 " + (j + 1) + "。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
            break;
          }
        }
        a[j + 1] = key;
        done[i] = true;
        const h2 = base(); h2[j + 1] = C_CYAN;
        steps.push(DS.mkStep(barScene(a, h2), "key 落位到下标 " + (j + 1) + "，已排序区 +1。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      }
      steps.push(DS.mkStep(barScene(a, base()), "🏁 插入排序完成！比较 " + stat.cmp + " 次，搬移 " + stat.swp + " 次。几乎有序时接近 O(n)。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      return steps;
    },

    /* ---------- 希尔 ---------- */
    shell(a0, stat) {
      const a = a0.slice(), n = a.length, steps = [];
      steps.push(DS.mkStep(barScene(a, {}), "希尔排序：插入排序的升级——先按大间隔分组排序（让元素大步就位），间隔逐轮减半，最后 gap=1 就是普通插入排序。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      for (let gap = n >> 1; gap > 0; gap >>= 1) {
        steps.push(DS.mkStep(barScene(a, {}, [{ i: 0, key: "g", text: "gap=" + gap, color: C_PURPLE, y: -30 }]), "当前间隔 gap = " + gap + "：相隔 gap 的元素视为同一组。", { stats: { 比较: stat.cmp, 交换: stat.swp, 间隔: gap } }));
        for (let i = gap; i < n; i++) {
          const key = a[i];
          let j = i - gap;
          const h = {}; h[i] = C_PURPLE;
          while (j >= 0) {
            stat.cmp++;
            if (a[j] > key) { a[j + gap] = a[j]; j -= gap; stat.swp++; }
            else break;
          }
          a[j + gap] = key;
          const h2 = { [j + gap]: C_CYAN, [i]: C_PURPLE };
          steps.push(DS.mkStep(barScene(a, h2), "组内插入：a[" + i + "] 插入到同组有序位置，点亮同组元素。", { stats: { 比较: stat.cmp, 交换: stat.swp, 间隔: gap } }));
        }
      }
      const all = {}; for (let i = 0; i < n; i++) all[i] = C_GREEN;
      steps.push(DS.mkStep(barScene(a, all), "🏁 希尔排序完成！最后一轮 gap=1 保证整体有序。平均 O(n^1.3)。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      return steps;
    },

    /* ---------- 归并 ---------- */
    merge(a0, stat) {
      const a = a0.slice(), n = a0.length;
      const tmp = new Array(n);
      const steps = [];
      steps.push(DS.mkStep(barScene(a, {}), "归并排序：分治两半、各自排好、再<b>双指针合并</b>。稳定排序，需要 O(n) 辅助空间。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      const depthLabels = [];
      function ms(l, r) {
        if (l >= r) return;
        const mid = (l + r) >> 1;
        const dim = [[l, r]];
        steps.push(DS.mkStep(barScene(a, {}, [{ i: (l + (r - l) / 2), key: "d" + l + r, text: "[" + l + "," + r + "] 分成两半", color: C_PURPLE, y: -34 }], dim), "分治：把区间 [" + l + ", " + r + "] 平分成 [" + l + "," + mid + "] 与 [" + (mid + 1) + "," + r + "]。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
        ms(l, mid);
        ms(mid + 1, r);
        // 合并
        let i = l, j = mid + 1, k = l;
        while (i <= mid && j <= r) {
          stat.cmp++;
          if (a[i] <= a[j]) tmp[k++] = a[i++];
          else tmp[k++] = a[j++];
          const h = {}; h[i - 1] = C_YELLOW; h[j - 1] = C_PURPLE;
          if (i - 1 > mid) { delete h[i - 1]; }
          if (j - 1 > r) { delete h[j - 1]; }
          const copy = a.slice();
          for (let p = l; p < k; p++) if (p < n) copy[p] = tmp[p];
          // 展示合并进度：已合并部分用青色
          for (let p = l; p < k; p++) h[p] = C_CYAN;
          if (i <= mid) h[i] = C_YELLOW;
          if (j <= r) h[j] = C_PURPLE;
          steps.push(DS.mkStep(barScene(copy, h), "合并 [" + l + "," + mid + "] 与 [" + (mid + 1) + "," + r + "]：双指针取较小者（青=已就位，黄/紫=两个指针）。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
        }
        while (i <= mid) tmp[k++] = a[i++];
        while (j <= r) tmp[k++] = a[j++];
        for (let p = l; p <= r; p++) a[p] = tmp[p];
        const h = {}; for (let p = l; p <= r; p++) h[p] = C_GREEN;
        steps.push(DS.mkStep(barScene(a, h), "区间 [" + l + "," + r + "] 合并完成（绿）。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      }
      ms(0, n - 1);
      const all = {}; for (let i = 0; i < n; i++) all[i] = C_GREEN;
      steps.push(DS.mkStep(barScene(a, all), "🏁 归并排序完成！比较 " + stat.cmp + " 次。任何情况都是 O(n log n)，稳定。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      return steps;
    },

    /* ---------- 快速 ---------- */
    quick(a0, stat) {
      const a = a0.slice(), n = a0.length;
      const steps = [];
      const sorted = new Array(n).fill(false);
      const base = () => { const m = {}; sorted.forEach((s, i) => { if (s) m[i] = C_GREEN; }); return m; };
      steps.push(DS.mkStep(barScene(a, {}), "快速排序：选 <b>pivot 基准</b>，比它小的放左、大的放右，再对两边递归。平均 O(n log n)。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      function qs(l, r) {
        if (l >= r) { if (l >= 0 && l < n) { sorted[l] = true; } return; }
        // 挖坑法分区
        const pv = a[l];
        let i = l, j = r;
        const hl = base(); hl[l] = C_PURPLE;
        steps.push(DS.mkStep(barScene(a, hl, [{ i: l, key: "pv", text: "pivot=" + pv, color: C_PURPLE, y: -36 }]), "区间 [" + l + "," + r + "]：选 a[" + l + "]=" + pv + " 为基准（挖坑）。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
        while (i < j) {
          while (i < j) {
            stat.cmp++;
            const h2 = base(); h2[i] = C_PURPLE; h2[j] = C_YELLOW;
            if (a[j] >= pv) { j--; h2[j] = C_YELLOW; steps.push(DS.mkStep(barScene(a, h2), "j 从右往左找比 pivot 小的数：a[" + (j + 1) + "] ≥ pivot，j--。", { stats: { 比较: stat.cmp, 交换: stat.swp } })); continue; }
            a[i] = a[j];
            stat.swp++;
            const h3 = base(); h3[i] = C_RED; h3[j] = C_PURPLE;
            steps.push(DS.mkStep(barScene(a, h3), "找到 a[" + j + "]=" + a[i] + " < pivot → 填到坑 a[" + i + "]（红），坑移到 j 处。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
            break;
          }
          if (i >= j) break;
          while (i < j) {
            stat.cmp++;
            const h4 = base(); h4[j] = C_PURPLE; h4[i] = C_YELLOW;
            if (a[i] <= pv) { i++; h4[i] = C_YELLOW; steps.push(DS.mkStep(barScene(a, h4), "i 从左往右找比 pivot 大的数：a[" + (i - 1) + "] ≤ pivot，i++。", { stats: { 比较: stat.cmp, 交换: stat.swp } })); continue; }
            a[j] = a[i];
            stat.swp++;
            const h5 = base(); h5[j] = C_RED; h5[i] = C_PURPLE;
            steps.push(DS.mkStep(barScene(a, h5), "找到 a[" + i + "]=" + a[j] + " > pivot → 填到坑 a[" + j + "]，坑移到 i 处。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
            break;
          }
        }
        a[i] = pv;
        sorted[i] = true;
        const h6 = base(); h6[i] = C_CYAN;
        steps.push(DS.mkStep(barScene(a, h6, [{ i, key: "pv2", text: "pivot 归位", color: C_CYAN, y: -36 }]), "pivot 填回 a[" + i + "] —— 左边 ≤ pivot ≤ 右边，本轮位置确定。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
        qs(l, i - 1);
        qs(i + 1, r);
      }
      qs(0, n - 1);
      const all = base(); for (let i = 0; i < n; i++) all[i] = C_GREEN;
      steps.push(DS.mkStep(barScene(a, all), "🏁 快速排序完成！比较 " + stat.cmp + " 次。注意：有序数据 + 固定取左端基准会退化为 O(n²)。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      return steps;
    },

    /* ---------- 堆排 ---------- */
    heap(a0, stat) {
      const a = a0.slice(), n = a0.length;
      const steps = [];
      const greens = new Array(n).fill(false);
      const base = () => { const m = {}; greens.forEach((s, i) => { if (s) m[i] = C_GREEN; }); return m; };
      steps.push(DS.mkStep(barScene(a, {}), "堆排序：①自底向上建大顶堆（每个子树根最大）；②反复把堆顶与末尾交换，堆缩小，堆顶下沉。", { stats: { 比较: stat.cmp, 交换: stat.swp, 堆大小: n } }));
      function siftDown(i, size) {
        for (;;) {
          let lg = i, l = 2 * i + 1, r = 2 * i + 2;
          if (l < size) { stat.cmp++; if (a[l] > a[lg]) lg = l; }
          if (r < size) { stat.cmp++; if (a[r] > a[lg]) lg = r; }
          if (lg === i) break;
          DS.swap(a, i, lg); stat.swp++;
          const h = base(); h[i] = C_RED; h[lg] = C_YELLOW;
          steps.push(DS.mkStep(barScene(a, h, [{ i: lg, key: "sd", text: "▲ 下沉", color: C_YELLOW, y: -36 }]), "下沉：父 a[" + i + "] 与较大的孩子 a[" + lg + "] 交换，维持大顶堆。", { stats: { 比较: stat.cmp, 交换: stat.swp, 堆大小: size } }));
          i = lg;
        }
      }
      for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(i, n);
      steps.push(DS.mkStep(barScene(a, base()), "建堆完成：a[" + ((n >> 1) - 1) + "] ~ a[0] 依次下沉后，堆顶 a[0]=" + a[0] + " 是最大值。", { stats: { 比较: stat.cmp, 交换: stat.swp, 堆大小: n } }));
      for (let size = n; size > 1; size--) {
        DS.swap(a, 0, size - 1); stat.swp++;
        const h = base(); h[0] = C_PURPLE; h[size - 1] = C_CYAN;
        greens[size - 1] = true;
        steps.push(DS.mkStep(barScene(a, h), "堆顶 " + a[size - 1] + "（最大值）与堆尾交换，堆大小减 1。", { stats: { 比较: stat.cmp, 交换: stat.swp, 堆大小: size - 1 } }));
        siftDown(0, size - 1);
      }
      const all = {}; for (let i = 0; i < n; i++) all[i] = C_GREEN;
      steps.push(DS.mkStep(barScene(a, all), "🏁 堆排序完成！O(n log n)，原地但不稳定。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      return steps;
    },

    /* ---------- 计数 ---------- */
    counting(a0, stat) {
      const a = a0.slice(), n = a0.length;
      const steps = [];
      const min = Math.min(...a), max = Math.max(...a);
      const range = max - min + 1;
      const cnt = new Array(range).fill(0);
      steps.push(DS.mkStep(barScene(a, {}, [{ i: 0, key: "r", text: "值域 [" + min + ", " + max + "]，cnt 数组长度 " + range, color: C_PURPLE, y: -36 }]), "计数排序：适合<b>值域不大</b>的整数。统计每个值出现次数，再按值域顺序重建。O(n+k)。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      for (let i = 0; i < n; i++) {
        cnt[a[i] - min]++;
        const h = {}; h[i] = C_YELLOW;
        const es = barScene(a, h).elements;
        // 下方加 cnt 格子
        const cw = Math.min(52, 700 / range);
        const sx = -(range * cw) / 2;
        for (let v = 0; v < range; v++) {
          es.push({ t: "cell", key: "ct" + v, x: sx + v * cw, y: 90, w: cw - 5, h: 34, text: String(cnt[v]), index: String(min + v), fill: cnt[v] > 0 ? "rgba(34,211,238,0.16)" : "rgba(100,120,160,0.06)", stroke: cnt[v] > 0 ? C_CYAN : undefined });
        }
        es.push({ t: "text", key: "clb", x: -(range * cw) / 2 - 40, y: 105, text: "cnt", size: 13, color: C_CYAN, bold: true, align: "right", mono: true });
        steps.push(DS.mkStep({ elements: es }, "扫描 a[" + i + "]=" + a[i] + " → cnt[" + a[i] + "]++", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      }
      let k = 0;
      for (let v = 0; v < range; v++) {
        for (let c = 0; c < cnt[v]; c++) {
          a[k] = min + v;
          const h = {}; h[k] = C_GREEN;
          steps.push(DS.mkStep(barScene(a, h), "回填：写入 " + cnt[v] + " 个 " + (min + v) + "，位置 " + k + "。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
          k++;
        }
      }
      steps.push(DS.mkStep(barScene(a, {}), "🏁 计数排序完成！没有比较、没有交换 → 对整数可 O(n+k)。", { stats: { 比较: 0, 交换: 0 } }));
      return steps;
    },

    /* ---------- 基数 ---------- */
    radix(a0, stat) {
      let a = a0.slice(), n = a0.length;
      const steps = [];
      steps.push(DS.mkStep(barScene(a, {}), "基数排序（LSD）：按个位→十位→高位<b>逐位稳定排序</b>。适合定长整数/字符串。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      const maxD = Math.max(...a.map(x => String(x).length));
      for (let d = 0; d < maxD; d++) {
        const div = Math.pow(10, d);
        steps.push(DS.mkStep(barScene(a, {}, [{ i: 0, key: "d" + d, text: "第 " + (d + 1) + " 轮：按" + ["个", "十", "百", "千"][d] + "位排序", color: C_PURPLE, y: -36 }]), "第 " + (d + 1) + " 轮：把所有数按第 " + (d + 1) + " 位（" + ["个", "十", "百"][d] + "位）分组。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
        const buckets = Array.from({ length: 10 }, () => []);
        for (let i = 0; i < n; i++) {
          const digit = Math.floor(a[i] / div) % 10;
          buckets[digit].push(a[i]);
          const h = {}; h[i] = C_YELLOW;
          steps.push(DS.mkStep(barScene(a, h, [{ i, key: "dig" + i, text: "位=" + digit, color: C_YELLOW, y: -36 }]), "a[" + i + "]=" + a[i] + " 的该位数字是 " + digit + " → 放入桶 " + digit + "。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
        }
        let arr2 = [];
        for (let b = 0; b < 10; b++) {
          if (!buckets[b].length) continue;
          arr2 = arr2.concat(buckets[b]);
        }
        a = arr2;
        const h = {}; a.forEach((v, i) => { if (arr2[i] !== undefined) h[i] = C_CYAN; });
        steps.push(DS.mkStep(barScene(a, h), "按桶 0→9 顺序收集（稳定：同桶保持原相对顺序）。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      }
      const all = {}; for (let i = 0; i < n; i++) all[i] = C_GREEN;
      steps.push(DS.mkStep(barScene(a, all), "🏁 基数排序完成！O(d·n)，d 为位数。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      return steps;
    },

    /* ---------- 桶 ---------- */
    bucket(a0, stat) {
      const a = a0.slice(), n = a0.length;
      const steps = [];
      const min = Math.min(...a), max = Math.max(...a);
      const bn = Math.min(n, 5);
      const width = (max - min) / bn + 1e-9;
      steps.push(DS.mkStep(barScene(a, {}, [{ i: 0, key: "b", text: "把值域均分成 " + bn + " 个桶", color: C_PURPLE, y: -36 }]), "桶排序：把数据散到若干有序桶内，桶内先各自排序，再按桶顺序拼接。接近均匀分布时 O(n)。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      const buckets = Array.from({ length: bn }, () => []);
      for (let i = 0; i < n; i++) {
        let b = Math.min(bn - 1, Math.floor((a[i] - min) / width));
        buckets[b].push(a[i]);
        const h = {}; h[i] = C_YELLOW;
        steps.push(DS.mkStep(barScene(a, h, [{ i, key: "bk" + i, text: "入桶 " + b, color: C_YELLOW, y: -36 }]), "a[" + i + "]=" + a[i] + " → 桶 " + b + "（区间约 " + Math.round(min + b * width) + "~" + Math.round(min + (b + 1) * width) + "）。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      }
      for (let b = 0; b < bn; b++) {
        if (buckets[b].length < 2) continue;
        for (let i = 1; i < buckets[b].length; i++) {
          const key = buckets[b][i];
          let j = i - 1;
          stat.cmp++;
          while (j >= 0 && buckets[b][j] > key) { buckets[b][j + 1] = buckets[b][j]; j--; }
          buckets[b][j + 1] = key;
        }
        steps.push(DS.mkStep(barScene(a, { i: b, }), "桶 " + b + " 内部做插入排序（桶内元素通常很少）。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      }
      const out = buckets.flat();
      let k = 0;
      for (const v of out) { a[k] = v; const h = {}; h[k] = C_GREEN; k++; }
      const h = {}; for (let i = 0; i < n; i++) h[i] = C_GREEN;
      steps.push(DS.mkStep(barScene(a, h), "按桶顺序 0→" + (bn - 1) + " 拼接即得有序结果（绿）。", { stats: { 比较: stat.cmp, 交换: stat.swp } }));
      steps.push(barFinish(barScene(a, h), stat));
      return steps;
    }
  };
  function barFinish(scene, stat) {
    return DS.mkStep(scene, "🏁 桶排序完成！", { stats: { 比较: stat.cmp, 交换: stat.swp } });
  }

  const META = [
    ["bubble", "冒泡排序", "相邻两两比较，大的往后冒。O(n²)", "稳定"],
    ["selection", "选择排序", "每轮选最小放前面。O(n²)，交换少", "不稳定"],
    ["insertion", "插入排序", "像理牌一样插到已排序区。O(n²)，几乎有序时很快", "稳定"],
    ["shell", "希尔排序", "按间隔分组插入，间隔递减。平均 O(n^1.3)", "不稳定"],
    ["merge", "归并排序", "分治 + 双指针合并。稳定 O(n log n)，需要辅助空间", "稳定"],
    ["quick", "快速排序", "基准分区 + 递归。平均 O(n log n)，最常用", "不稳定"],
    ["heap", "堆排序", "建堆 + 堆顶交换下沉。原地 O(n log n)", "不稳定"],
    ["counting", "计数排序", "统计值频次重建。O(n+k)，适合小值域整数", "稳定"],
    ["radix", "基数排序", "按位逐轮稳定排。O(d·n)", "稳定"],
    ["bucket", "桶排序", "分桶 + 桶内排 + 拼接。数据均匀时 O(n)", "稳定"]
  ];

  DS.structures.register({
    id: "sorting",
    name: "排序算法总览",
    emoji: "🃏",
    category: "查找与排序",
    badge: "重中之重",
    tags: ["冒泡", "选择", "插入", "希尔", "归并", "快排", "堆排", "计数", "基数", "桶"],
    summary: "十大经典排序一站学完：每种算法都有逐步动画、复杂度对比与 C 代码，附快排/归并的核心思路拆解。",

    overview: `
<div class="md"><h3>🃏 为什么排序如此重要</h3>
<p>排序是最经典的算法问题：它是一切「有序化」操作的基础——二分查找、去重、TopK、归并合并都依赖有序。面试与考研的重点，也是理解<b>复杂度分析</b>与<b>分治思想</b>最好的入口。</p>
<table>
<tr><th>算法</th><th>平均</th><th>最坏</th><th>空间</th><th>稳定性</th><th>一句话</th></tr>
<tr><td>冒泡</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td><td>稳定</td><td>相邻比较、大者后冒</td></tr>
<tr><td>选择</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td><td>不稳定</td><td>每轮选最小</td></tr>
<tr><td>插入</td><td>O(n²)</td><td>O(n²)</td><td>O(1)</td><td>稳定</td><td>新牌插入已排序区</td></tr>
<tr><td>希尔</td><td>O(n^1.3)</td><td>O(n²)</td><td>O(1)</td><td>不稳定</td><td>gap 递减分组插入</td></tr>
<tr><td>归并</td><td>O(n log n)</td><td>O(n log n)</td><td>O(n)</td><td>稳定</td><td>分治 + 双指针合并</td></tr>
<tr><td>快速</td><td>O(n log n)</td><td>O(n²)</td><td>O(log n)</td><td>不稳定</td><td>基准分区 + 递归</td></tr>
<tr><td>堆排</td><td>O(n log n)</td><td>O(n log n)</td><td>O(1)</td><td>不稳定</td><td>建堆 + 交换下沉</td></tr>
<tr><td>计数</td><td>O(n+k)</td><td>O(n+k)</td><td>O(k)</td><td>稳定</td><td>值域计数重建</td></tr>
<tr><td>基数</td><td>O(d·n)</td><td>O(d·n)</td><td>O(n)</td><td>稳定</td><td>按位稳定排序</td></tr>
<tr><td>桶</td><td>O(n)</td><td>O(n²)</td><td>O(n)</td><td>稳定</td><td>分桶 + 桶内排序</td></tr>
</table>
<p style="font-size:13px">说明：堆排轴稳定性取决于实现；计数/基数通常视为稳定（可设计为稳定）。</p>
</div>
<div class="md"><h3>⚖️ 稳定性的含义</h3>
<p><b>稳定排序</b>：值相等的元素排序后<b>保持原来的相对顺序</b>。相等元素交换位置有时会出问题——例如按成绩排序后还要按班级二次排序（基数排序就利用了稳定性），或表格先按 A 列排、再按 B 列排。</p>
<div class="callout warn">⚠️ 快排为什么拓扑课本说不稳定？分区交换会跨过相等元素。选择排序交换最小值到前面时也会打乱相等顺序。</div>
</div>
<div class="md"><h3>🚀 快速排序三板斧</h3>
<ol>
<li><b>选基准</b>：取第一个/随机/三数取中（防退化）；</li>
<li><b>分区</b>：比基准小的放左、大的放右（挖坑/双指针/单向扫描三种实现）；</li>
<li><b>递归</b>：左右区间重复上述过程，直到区间长度 ≤ 1。</li>
</ol>
<p>退化场景：数组<b>已经有序</b>且固定取首元素为基准 → 每次只分出一边 → 递归 n 层 → O(n²)。</p>
</div>
<div class="md"><h3>🧩 基于比较的排序下界</h3>
<p>任何<b>基于比较</b>的排序算法最坏都至少需要 <b>Ω(n log n)</b> 次比较（信息论/决策树证明）——归并、堆排已到达这个最优下界。计数/基数/桶能突破下界，因为它们<b>不比较</b>，而是利用值的特殊结构（小值域、定长位数、均匀分布）。</p>
<div class="callout">💡 工程实践：小规模数据用插入排序（常数小）；Java/C++ 标准库普遍用 <b>快排 + 插入 + 三数取中</b>的混合策略。</div>
</div>`,

    complexity: META.map(m => ({
      op: m[0] === "bubble" ? "冒泡排序" : m[0] === "selection" ? "选择排序" : m[0] === "insertion" ? "插入排序" :
        m[0] === "shell" ? "希尔排序" : m[0] === "merge" ? "归并排序" : m[0] === "quick" ? "快速排序" :
        m[0] === "heap" ? "堆排序" : m[0] === "counting" ? "计数排序" : m[0] === "radix" ? "基数排序" : "桶排序",
      平均: m[0] === "bubble" || m[0] === "selection" || m[0] === "insertion" ? "O(n²)" :
        m[0] === "shell" ? "O(n^1.3)" : m[0] === "counting" ? "O(n+k)" : m[0] === "radix" ? "O(d·n)" :
        m[0] === "bucket" ? "O(n)" : "O(n log n)",
      最坏: m[0] === "merge" || m[0] === "heap" ? "O(n log n)" : m[0] === "counting" ? "O(n+k)" : m[0] === "radix" ? "O(d·n)" :
        m[0] === "quick" || m[0] === "bucket" || m[0] === "shell" ? "O(n²)" : "O(n²)",
      空间: m[0] === "merge" ? "O(n)" : m[0] === "quick" ? "O(log n)" : m[0] === "counting" ? "O(k)" :
        m[0] === "radix" || m[0] === "bucket" ? "O(n)" : "O(1)",
      稳定性: m[1],
      说明: m[2]
    })),

    demos: [
      {
        id: "main",
        name: "排序算法动画",
        desc: "选择算法、调整数据规模与分布，看它一步一步排好。绿=已就位，黄=正在比较，红=交换，紫=基准/key。",
        what: "十大算法 + 五种数据分布 + 可调规模，任意组合。同一组数据换不同算法，比较次数立现高下。",
        inputs: [
          { key: "algo", label: "排序算法", type: "select", def: "bubble", options: META.map(m => [m[0], m[1]]), desc: "切换算法；同一数据换算法对比效率差异。" },
          { key: "n", label: "元素个数", type: "range", def: 12, min: 6, max: 18, desc: "数据规模：越多越乱，但步骤越多。" },
          { key: "dist", label: "数据分布", type: "select", def: "random", options: [["random", "随机"], ["sorted", "已排序"], ["reversed", "逆序"], ["almost", "几乎有序"], ["dupes", "含重复"]], desc: "已排序/逆序数据是快排、冒泡的「照妖镜」。" },
          { key: "seed", label: "随机种子（同种子结果一致）", type: "number", def: 42, min: 1, max: 9999, desc: "随机种子保证可复现：同一个种子永远生成同一组数据。" }
        ],
        samples: [
          { label: "冒泡+随机 12 个", values: { algo: "bubble", n: 12, dist: "random", seed: 42 } },
          { label: "快排在「已排序」数据上", values: { algo: "quick", n: 12, dist: "sorted", seed: 42 } },
          { label: "插入在「几乎有序」数据上", values: { algo: "insertion", n: 12, dist: "almost", seed: 7 } },
          { label: "归并 vs 快排（同数据）", values: { algo: "merge", n: 14, dist: "random", seed: 99 } }
        ],
        tips: [
          "保持种子 42 不变，切到快排再看「已排序」分布：比较次数暴增——这就是快排退化的场景。",
          "同样条件换成插入排序 + 几乎有序：它会特别快，是「小规模+近似有序」的最佳选择。",
          "看看计数排序：它的比较次数永远是 0，因为它根本不比较。"
        ],
        build(inputs) {
          const { algo } = inputs;
          const n = DS.clamp(parseInt(inputs.n) || 12, 6, 18);
          const seed = parseInt(inputs.seed) || 42;
          const arr = DS.genArray(n, 1, 99, inputs.dist || "random", seed);
          const stat = { cmp: 0, swp: 0 };
          let steps;
          if (ALGOS[algo]) {
            // 计数排序需要正值小值域，重新生成 1..20
            if (algo === "counting") {
              const ar2 = DS.genArray(n, 1, 20, "random", seed);
              steps = ALGOS[algo](ar2, stat);
            } else {
              steps = ALGOS[algo](arr.slice(), stat);
            }
          } else {
            steps = ALGOS.bubble(arr.slice(), stat);
          }
          return { steps, preHint: "原始数据：[" + (algo === "counting" ? DS.genArray(n, 1, 20, "random", seed) : arr).join(", ") + "]<br>点击 ▶ 播放，或用 ⏭ 单步观察。" };
        }
      },
      {
        id: "compare",
        name: "近乎有序时：插入 vs 冒泡",
        desc: "同一个几乎有序的数组，插入排序与冒泡排序各要多少次比较/交换？",
        inputs: [
          { key: "n", label: "元素个数", type: "range", def: 10, min: 6, max: 16 },
          { key: "seed", label: "随机种子", type: "number", def: 7, min: 1, max: 9999 }
        ],
        build(inputs) {
          const n = DS.clamp(parseInt(inputs.n) || 10, 6, 16);
          const arr = DS.genArray(n, 1, 99, "almost", parseInt(inputs.seed) || 7);
          const s1 = { cmp: 0, swp: 0 }, s2 = { cmp: 0, swp: 0 };
          const st1 = ALGOS.insertion(arr.slice(), s1);
          const st2 = ALGOS.bubble(arr.slice(), s2);
          const aSorted = arr.slice().sort((x, y) => x - y);
          const all = {}; for (let i = 0; i < n; i++) all[i] = C_GREEN;
          const intro = DS.mkStep(barScene(arr, {}), "输入几乎有序数组 [" + arr.join(", ") + "]。<b>先跑插入排序</b>，注意它比较少。", { statsHTML: "<span class='stat'>插入排序是处理小规模/近似有序数据首选的简单算法</span>" });
          const mid = DS.mkStep(barScene(aSorted, all), "插入排序结果（绿）。接下来<b>用冒泡重跑同一组数据</b>，对比比较/交换次数。", { stats: { 插入排序_比较: s1.cmp, 插入排序_交换: s1.swp } });
          const s3 = { cmp: 0, swp: 0 };
          const st3 = ALGOS.bubble(arr.slice(), s3);
          const end = DS.mkStep(barScene(aSorted, all), "🏁 对比：插入排序比较 " + s1.cmp + " 次；冒泡比较 " + s3.cmp + " 次。近似有序时插入排序明显更优。", { stats: { 插入_比较: s1.cmp, 冒泡_比较: s3.cmp, 插入_交换: s1.swp, 冒泡_交换: s3.swp } });
          // 给插入排序的步骤打上标签
          const tagged1 = st1.map((s, i) => Object.assign({}, s, { stats: Object.assign({}, s.stats, { 算法: "插入" }) }));
          const tagged2 = st2.map((s, i) => Object.assign({}, s, { stats: Object.assign({}, s.stats, { 算法: "冒泡(第一遍)" }) }));
          const tagged3 = st3.map((s, i) => Object.assign({}, s, { stats: Object.assign({}, s.stats, { 算法: "冒泡(第二遍)" }) }));
          return { steps: [intro, ...tagged1.slice(1, -1), mid, ...tagged2.slice(1, -1), ...tagged3.slice(1, -1), end] };
        }
      }
    ],

    cPresets: [
      {
        id: "bubble",
        name: "冒泡排序（C）",
        mode: "array",
        code: `/* 冒泡排序：相邻比较，大者后冒 */
int main(){
  int a[6] = {64, 34, 25, 12, 22, 11};
  int n = 6;
  int i, j, t;
  for(i = 0; i < n - 1; i++){
    for(j = 0; j < n - 1 - i; j++){
      if(a[j] > a[j + 1]){
        t = a[j];
        a[j] = a[j + 1];
        a[j + 1] = t;
      }
    }
  }
  for(i = 0; i < n; i++) printf("%d ", a[i]);
  return 0;
}`,
        lineNotes: {
          4: "待排序数组与长度 n。",
          6: "外层循环：一共 n-1 轮。",
          7: "内层循环：每轮比较到 n-1-i（后面 i 个已经就位）。",
          8: "相邻两元素比较。",
          9: "交换 t = a[j]; a[j] = a[j+1]; a[j+1] = t 三步交换。"
        }
      },
      {
        id: "quick",
        name: "快速排序（C，递归）",
        mode: "array",
        code: `/* 快速排序：挖坑法分区 + 递归 */
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
  int a[9] = {8, 3, 6, 1, 9, 2, 7, 4, 5};
  qs(a, 0, 8);
  int i;
  for(i = 0; i < 9; i++) printf("%d ", a[i]);
  return 0;
}`,
        lineNotes: {
          3: "递归基线：区间长度 ≤ 1 时返回。",
          4: "挖坑：pivot 取区间第一个元素。",
          7: "j 从右往左找小于 pivot 的数。",
          8: "填坑，坑移到 j。",
          9: "i 从左往右找大于 pivot 的数。",
          12: "pivot 归位。",
          13: "递归处理左右两半。"
        }
      },
      {
        id: "insert",
        name: "插入排序（C）",
        mode: "array",
        code: `/* 插入排序：新牌插入已排序区 */
int main(){
  int a[7] = {31, 17, 45, 9, 26, 53, 12};
  int n = 7;
  int i, j, key;
  for(i = 1; i < n; i++){
    key = a[i];
    j = i - 1;
    while(j >= 0 && a[j] > key){
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  for(i = 0; i < n; i++) printf("%d ", a[i]);
  return 0;
}`
      },
      {
        id: "selection",
        name: "选择排序（C）",
        mode: "array",
        code: `/* 选择排序：每轮挑出最小值，放到已排序区末尾 */
int main(){
  int a[7] = {31, 17, 45, 9, 26, 53, 12};
  int n = 7;
  int i, j, minIdx, tmp;
  for(i = 0; i < n - 1; i++){
    minIdx = i;
    for(j = i + 1; j < n; j++){
      if(a[j] < a[minIdx]) minIdx = j;
    }
    if(minIdx != i){
      tmp = a[i];
      a[i] = a[minIdx];
      a[minIdx] = tmp;
    }
  }
  for(i = 0; i < n; i++) printf("%d ", a[i]);
  return 0;
}`,
        lineNotes: {
          7: "i 之前是已排序区（左侧小值区）。",
          8: "先假设当前位置 i 是最小的。",
          9: "在 i 之后找真正的最小值下标。",
          12: "最小值和 a[i] 交换（若本来就对就跳过）。",
          15: "交换结果：左侧逐渐变成有序的小值区。",
          18: "输出升序结果。"
        }
      },
      {
        id: "merge",
        name: "归并排序（C，递归 + 临时数组）",
        mode: "array",
        code: `/* 归并排序：分治 + 合并两个有序段 */
void merge(int a[], int l, int mid, int r, int tmp[]){
  int i = l;
  int j = mid + 1;
  int k = l;
  while(i <= mid && j <= r){
    if(a[i] <= a[j]){ tmp[k] = a[i]; i++; }
    else { tmp[k] = a[j]; j++; }
    k++;
  }
  while(i <= mid){ tmp[k] = a[i]; i++; k++; }
  while(j <= r){ tmp[k] = a[j]; j++; k++; }
  int t;
  for(t = l; t <= r; t++) a[t] = tmp[t];
}
void msort(int a[], int l, int r, int tmp[]){
  if(l >= r) return;
  int mid = (l + r) / 2;
  msort(a, l, mid, tmp);
  msort(a, mid + 1, r, tmp);
  merge(a, l, mid, r, tmp);
}
int main(){
  int a[8] = {38, 27, 43, 3, 9, 82, 10, 1};
  int tmp[8];
  msort(a, 0, 7, tmp);
  int i;
  for(i = 0; i < 8; i++) printf("%d ", a[i]);
  printf("\\n");
  return 0;
}`,
        lineNotes: {
          2: "merge：把 a[l..mid] 和 a[mid+1..r] 两个有序段合并。",
          3: "i 指左段，j 指右段，k 是临时数组写入位置。",
          7: "谁小先取谁（稳定：相等时取左边）。",
          12: "左段剩余元素直接接上。",
          13: "右段剩余元素直接接上。",
          15: "把合并结果写回原数组。",
          17: "msort：递归把区间二分。",
          19: "只剩一个元素就是天然有序（递归出口）。",
          22: "先排左半，再排右半。",
          23: "最后合并两半。",
          27: "tmp 是合并用的临时缓冲区。",
          28: "从整个区间开始排序。"
        }
      }
    ]
  });
})();