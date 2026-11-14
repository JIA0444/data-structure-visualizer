/* ==========================================================
   engine.js — 步骤播放引擎 Player
   能力：播放/暂停/上一步/下一步/跳转/调速/场景补间/进度回调
   ========================================================== */
window.DS = window.DS || {};
DS.engine = (function () {
  const BASE_INTERVAL = 950; // 1x 速度下每步停留毫秒

  class Player {
    /**
     * opts:
     *   canvas        — 目标画布
     *   onRender(sceneInterpolated) 每帧渲染回调
     *   onStep(step, index)         步骤内容回调（文字/变量/输出等）
     *   onIndex(index, total, playing) 序号与播放状态回调
     *   onStats? 模块自定义
     */
    constructor(opts) {
      this.opts = opts || {};
      this.steps = [];
      this.idx = -1;
      this.playing = false;
      this.speed = 1;
      this._tickTimer = null;
      this._raf = null;
      this._lastRendered = null;   // 上一帧稳定场景（补间起点）
      this._timeoutId = null;
    }

    get length() { return this.steps.length; }
    get current() { return this.idx >= 0 && this.idx < this.steps.length ? this.steps[this.idx] : null; }

    load(steps, autoplay) {
      this.stop();
      this.steps = steps || [];
      this.idx = -1;
      this._lastRendered = null;
      if (this.steps.length) {
        if (autoplay === false) this.seek(0, true);
        else this.play(true);
      } else {
        this.idx = -1;
        this._emitIndex();
        if (this.opts.onRender) this.opts.onRender(null);
      }
      return this;
    }

    stop() {
      this.playing = false;
      clearTimeout(this._tickTimer);
      cancelAnimationFrame(this._raf);
      this._raf = null;
      this._finalizeLastRendered();
    }

    play(fromStart) {
      if (!this.steps.length) return;
      if (fromStart) this.idx = -1;
      if (this.idx >= this.steps.length - 1) this.idx = -1; // 播完重播
      this.playing = true;
      this._emitIndex();
      this._scheduleNext();
    }

    pause() {
      this.playing = false;
      clearTimeout(this._tickTimer);
      this._finalizeLastRendered();
      this._emitIndex();
    }

    toggle() { this.playing ? this.pause() : this.play(); }

    next() {
      if (!this.steps.length) return;
      if (this.idx < this.steps.length - 1) {
        this._pauseTweenFinish();
        this._goto(this.idx + 1);
        if (this.playing) this._scheduleNext();
      } else if (this.playing) {
        this.pause();
      }
      this._emitIndex();
    }

    prev() {
      if (!this.steps.length) return;
      this._finalizeLastRendered();
      if (this.idx > 0) this._goto(this.idx - 1, true);
      this._emitIndex();
    }

    seek(i, instant) {
      if (!this.steps.length) { this.idx = -1; return; }
      this._finalizeLastRendered();
      i = DS.clamp(Math.round(i), 0, this.steps.length - 1);
      this._goto(i, instant);
      if (this.playing) this._scheduleNext();
      this._emitIndex();
    }

    setSpeed(s) {
      s = DS.clamp(Number(s) || 1, 0.25, 4);
      this.speed = s;
      if (this.playing) this._scheduleNext();
    }

    /* ---------- 内部 ---------- */
    _goto(i, instant) {
      this.idx = i;
      const step = this.steps[i];
      if (this.opts.onStep) this.opts.onStep(step, i);
      const target = step && step.scene ? DS.render.cloneScene(step.scene) : null;
      if (instant || !this._lastRendered || !target) {
        this._lastRendered = target;
        this._rafCancel();
        if (this.opts.onRender) this.opts.onRender(target);
      } else {
        this._startTween(target);
      }
    }

    _startTween(target) {
      this._rafCancel();
      const from = this._lastRendered;
      const dur = DS.clamp(280 / this.speed, 90, 420);
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        const scene = DS.render.lerpScene(from, target, eased);
        if (this.opts.onRender) this.opts.onRender(scene);
        if (t < 1) {
          this._raf = requestAnimationFrame(step);
        } else {
          this._raf = null;
          this._lastRendered = target;
          if (this.opts.onRender) this.opts.onRender(target);
        }
      };
      this._raf = requestAnimationFrame(step);
    }

    _rafCancel() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } }

    _finalizeLastRendered() {
      // 结束补间：把当前显示切换到目标场景
      this._rafCancel();
      if (this.current && this.current.scene) {
        this._lastRendered = DS.render.cloneScene(this.current.scene);
        if (this.opts.onRender) this.opts.onRender(this._lastRendered);
      }
    }

    _pauseTweenFinish() { this._finalizeLastRendered(); }

    _scheduleNext() {
      clearTimeout(this._tickTimer);
      if (!this.playing) return;
      const delay = BASE_INTERVAL / this.speed;
      this._tickTimer = setTimeout(() => {
        if (!this.playing) return;
        if (this.idx < this.steps.length - 1) {
          this.next();
        } else {
          this.pause();
        }
      }, delay);
    }

    _emitIndex() {
      if (this.opts.onIndex) this.opts.onIndex(this.idx, this.steps.length, this.playing);
    }
  }

  return { Player, BASE_INTERVAL };
})();