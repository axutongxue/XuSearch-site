/* ══════════════════════════════════════════════════════════════════════════
   多源视频加载器 v4 — 4 路 CDN 竞速 + 本地顺序兜底 + 记住成功源 + 懒加载

   用法：<video data-media="文件名.mp4"
                 data-media-extra="完整URL1|完整URL2"   ← CDN 源与本地兜底源，竖线分隔
                 poster="兜底静态图" muted loop playsinline preload="metadata"></video>

   加载模型：
   · 竞速阶段：前 RACE_COUNT 个源（3 个 npm CDN + file.garden）同时下载，
     谁先 canplay 谁赢——其余竞速者立即中止（带宽浪费≈中止前的部分字节）；
     赢家若是脱离文档的竞速元素，则原位换入 DOM（保留缓冲，无黑屏无跳变）
   · ⚠️ 本地 Pages 文件（assets/video/…）刻意不参与竞速：竞速=每个访客都会
     同时从 Pages 拉视频，"省 Pages 流量"的目标就作废了。它只做最后一级顺序兜底
   · 竞速期限 6 秒：无人就绪 → 中止全部竞速，从本地文件继续顺序尝试
   · 顺序阶段单源超时 6 秒；全部失败 → 保留 poster 静态兜底
   · 判定失败：error 事件 / loadedmetadata 后无画面宽度
     （"200 + 错误页"会被 <video> 解码失败天然兜住）
   · 成功源写入 localStorage（xusearch-media-src），下次访问该源排最前
   · 懒加载：首屏内的视频立即开跑；其余在进入视口前 600px 才开跑
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  var BASES = [
    'https://cdn.jsdmirror.com/npm/xusearch-media@1.0.0/videos/',
    'https://cdn.jsdmirror.cn/npm/xusearch-media@1.0.0/videos/',
    'https://cdn.jsdelivr.net/npm/xusearch-media@1.0.0/videos/'
  ];
  var MEM_KEY = 'xusearch-media-src';
  var RACE_COUNT = 4;         // 参与竞速的源数量（BASES 3 个 + file.garden）
  var RACE_TIMEOUT = 6000;    // 竞速总期限：无人就绪就转顺序模式
  var LOAD_TIMEOUT = 6000;    // 顺序模式单源等待上限
  var LAZY_MARGIN = '600px 0px';

  function rememberedIndex() {
    try {
      var i = parseInt(localStorage.getItem(MEM_KEY), 10);
      return (i >= 0 && i < BASES.length) ? i : 0;
    } catch (e) { return 0; }
  }

  function remember(i) {
    try { localStorage.setItem(MEM_KEY, String(i)); } catch (e) {}
  }

  function inViewport(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  function orderFor(el, start) {
    var name = el.getAttribute('data-media');
    var order = [];
    for (var k = 0; k < BASES.length; k++) {
      order.push(BASES[(start + k) % BASES.length] + name);
    }
    var extra = (el.getAttribute('data-media-extra') || '').split('|');
    for (var j = 0; j < extra.length; j++) if (extra[j]) order.push(extra[j]);
    return order;
  }

  /* 可见性统一管理：在视口内且已就绪 → 播放；离开视口 → 暂停
     （竞速换入的节点不在 shared.js 的观察名单里，由这里接管） */
  var visIO = null;
  function watchVisibility(node) {
    if (!('IntersectionObserver' in window)) return;
    if (!visIO) {
      visIO = new IntersectionObserver(function (entries) {
        Array.prototype.forEach.call(entries, function (e) {
          var v = e.target;
          if (e.isIntersecting) {
            if (v.readyState >= 2 && v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          } else if (!v.paused) {
            v.pause();
          }
        });
      }, { threshold: 0.15 });
    }
    visIO.observe(node);
  }

  function attach(el) {
    if (el.__mediaWired) return;
    el.__mediaWired = true;

    var start = rememberedIndex();
    var order = orderFor(el, start);
    var raceN = Math.min(RACE_COUNT, order.length);

    var state = {
      racers: [],            // [{ node, baseIdx, dead }]，不含主元素
      elDead: false,
      deadCount: 0,
      settled: false,        // 竞速阶段是否已结束
      seqIndex: raceN,       // 顺序阶段的下一个源下标（从本地文件开始）
      timer: 0,
      winner: null,          // 竞速赢家节点（可能在 DOM 外）
      currentBase: -1
    };

    function baseIdxFor(i) { return (i < BASES.length) ? (start + i) % BASES.length : -1; }
    function clearTimer() { if (state.timer) { clearTimeout(state.timer); state.timer = 0; } }

    function tryPlay(node) {
      if (inViewport(node)) {
        var p = node.play(); if (p && p.catch) p.catch(function () {});
      }
      /* 不在视口不主动播：进入视口后由可见性观察接管 */
    }

    function abortNode(n) {
      n.pause();
      n.removeAttribute('src');
      n.load();
    }

    /* 顺序阶段在「赢家节点」上继续（若赢家是换入的竞速元素，它现在就在 DOM 里） */
    function liveNode() { return (state.winner && state.winner.parentNode) ? state.winner : el; }

    function seqNext() {
      clearTimer();
      if (state.seqIndex >= order.length) {
        /* 全部失败：回到 poster 静态兜底 */
        var n = liveNode();
        n.pause();
        n.removeAttribute('src');
        n.load();
        return;
      }
      var node = liveNode();
      state.currentBase = (state.seqIndex < BASES.length) ? (start + state.seqIndex) % BASES.length : -1;
      node.src = order[state.seqIndex++];
      node.load();
      state.timer = setTimeout(seqNext, LOAD_TIMEOUT);
      tryPlay(node);
    }

    /* 竞速出赢家：其余竞速者中止；赢家若在 DOM 外则原位换入 */
    function settle(node, baseIdx) {
      if (state.settled) return;
      state.settled = true;
      clearTimer();
      if (baseIdx >= 0) remember(baseIdx);

      state.racers.forEach(function (r) {
        if (r.node !== node) {
          abortNode(r.node);
          if (r.node.parentNode) r.node.parentNode.removeChild(r.node);
        }
      });
      state.racers = [];

      if (node !== el && el.parentNode) {
        node.style.cssText = '';                     /* 还原为文档流布局 */
        el.parentNode.insertBefore(node, el);
        el.parentNode.removeChild(el);
      }
      state.winner = node;
      tryPlay(node);
      watchVisibility(node);
    }

    function onOk(node, baseIdx) {
      if (node.videoWidth <= 0) { onFail(node); return; }
      settle(node, baseIdx);
    }

    function onFail(node) {
      if (state.settled) { seqNext(); return; }      /* 顺序/换入后的失败 → 下一顺序源 */
      if (node === el) { if (!el.__raceDead) { el.__raceDead = true; state.deadCount++; } }
      else {
        for (var i = 0; i < state.racers.length; i++) {
          if (state.racers[i].node === node && !state.racers[i].dead) {
            state.racers[i].dead = true; state.deadCount++;
          }
        }
      }
      if (state.deadCount >= raceN) {
        state.settled = true;
        seqNext();                                    /* 竞速全员失败 → 本地文件 */
      }
      /* 其余竞速者仍在跑：赢了就是零等待切换 */
    }

    /* ── 启动竞速：主元素用 order[0]，竞速元素用 order[1..raceN-1] ── */
    el.addEventListener('loadedmetadata', function () { onOk(el, baseIdxFor(0)); });
    el.addEventListener('error', function () { onFail(el); });
    el.src = order[0];
    el.load();
    tryPlay(el);
    watchVisibility(el);

    for (var i = 1; i < raceN; i++) {
      (function (idx) {
        var r = el.cloneNode(false);
        r.removeAttribute('id');
        r.addEventListener('loadedmetadata', function () { onOk(r, baseIdxFor(idx)); });
        r.addEventListener('error', function () { onFail(r); });
        r.src = order[idx];
        r.load();
        state.racers.push({ node: r, baseIdx: baseIdxFor(idx), dead: false });
      })(i);
    }

    /* 竞速期限：6 秒内无人就绪 → 中止全部竞速，转顺序模式（本地文件） */
    state.timer = setTimeout(function () {
      if (state.settled) return;
      state.settled = true;
      state.racers.forEach(function (r) {
        abortNode(r.node);
        if (r.node.parentNode) r.node.parentNode.removeChild(r.node);
      });
      state.racers = [];
      state.seqIndex = raceN;
      seqNext();
    }, RACE_TIMEOUT);
  }

  function init() {
    var els = Array.prototype.slice.call(document.querySelectorAll('video[data-media]'));
    if (!els.length) return;

    /* 首屏内的立即开跑；其余懒加载 */
    var lazy = [];
    Array.prototype.forEach.call(els, function (el) {
      if (inViewport(el)) attach(el);
      else lazy.push(el);
    });

    if (lazy.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        Array.prototype.forEach.call(entries, function (e) {
          if (e.isIntersecting) { attach(e.target); io.unobserve(e.target); }
        });
      }, { rootMargin: LAZY_MARGIN });
      Array.prototype.forEach.call(lazy, function (el) { io.observe(el); });
    } else {
      Array.prototype.forEach.call(lazy, attach);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
