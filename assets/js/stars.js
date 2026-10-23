/* ══════════════════════════════════════════════════════════════════════════
   星空背景 — 原生 Canvas 2D「闪烁」效果

   铺满首屏之下的整片区域（通栏演示 / 核心能力 / 常见问题 / 页脚）。
   视觉特征：
   · 星点成团分布（星团 + 少量散星），大小与亮度分层次
   · 各自独立地明暗呼吸；整片背景缓慢循环位移，不显得钉死
   · 页脚越往下越淡，到巨型字标底部完全消失
   · 画布按视口大小绘制 + sticky 贴住视口，滚动全程连续且省显存
   · 尊重 prefers-reduced-motion；标签页切后台时暂停
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var STAR_COUNT = 900;

  function createField(canvas) {
    var host = canvas.parentElement;
    if (!host) return null;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var W = 0, H = 0;
    var stars = [];
    var clusters = [];
    var running = false, raf = 0;

    /* 渐隐/渐显窗口（文档坐标）：
       · 默认（star-zone 用）：页脚第一个 .foot-wrap 顶部起淡出 → .foot-giant 底部消失
       · data-star-fade="top"（hero 用）：从 .dl-group 顶部起淡入 → hero 底部全显，
         与下方 star-zone 无缝衔接。 */
    var fadeStartDoc = null;
    var fadeEndDoc = null;
    var fadeEls = { wrap: null, giant: null };
    var topFade = canvas.getAttribute('data-star-fade') === 'top';
    var dlGroupDoc = null;
    var heroBottomDoc = null;

    function rand(a, b) { return a + Math.random() * (b - a); }

    /* 星团中心：每次 build 随机生成，让星星成团分布而非均匀铺满 */
    function makeClusters() {
      clusters = [];
      for (var i = 0; i < 6; i++) {
        clusters.push({
          x: rand(W * 0.06, W * 0.94),
          y: rand(H * 0.04, H * 0.96),
          rx: rand(W * 0.12, W * 0.34),   // 铺开范围放宽，星团彼此交叠
          ry: rand(H * 0.10, H * 0.28),
        });
      }
    }

    function makeStar() {
      var s = {};
      // 62% 落在星团附近，38% 随机散布
      if (clusters.length && Math.random() < 0.62) {
        var cl = clusters[(Math.random() * clusters.length) | 0];
        // 两次随机相加 ≈ 中间密、边缘疏
        s.x = cl.x + (Math.random() + Math.random() - 1) * cl.rx;
        s.y = cl.y + (Math.random() + Math.random() - 1) * cl.ry;
      } else {
        s.x = Math.random() * W;
        s.y = Math.random() * H;
      }
      // 大小分三档，差异明显
      var roll = Math.random();
      if (roll < 0.72) s.size = rand(0.5, 1.1);
      else if (roll < 0.95) s.size = rand(1.1, 2.2);
      else s.size = rand(2.2, 3.6);
      s.alpha = Math.min(1, rand(0.2, 0.55) + s.size * 0.14);   // 大星更亮
      s.tw = rand(0.9, 2.6);                                    // 闪烁频率
      s.phase = Math.random() * Math.PI * 2;
      s.hue = rand(-18, 18);
      // 缓慢循环位移：幅度 6~18px，周期 12~30 秒
      s.dxAmp = rand(6, 18);
      s.dyAmp = rand(6, 18);
      s.dxPeriod = rand(12, 26);
      s.dyPeriod = rand(14, 30);
      s.dxPhase = Math.random() * Math.PI * 2;
      s.dyPhase = Math.random() * Math.PI * 2;
      return s;
    }

    function build() {
      makeClusters();
      stars = [];
      for (var i = 0; i < STAR_COUNT; i++) stars.push(makeStar());
    }

    /* ── 尺寸 ───────────────────────────────────────────────────────── */

    function resize() {
      var r = host.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(window.innerHeight));
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = '100%';
      canvas.style.height = '100vh';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      build();
      updateMetrics();   // 重建后再测量（布局可能在 build 前后稳定）
      paint(0);
    }

    /* 动画循环里绝不读布局（getBoundingClientRect 会强制重排），
       改在 resize / 滚动时更新一次，绘制时只用缓存值。 */
    var canvasTopDoc = 0;

    function updateMetrics() {
      canvasTopDoc = canvas.getBoundingClientRect().top + window.scrollY;
      var st = window.scrollY;

      if (topFade) {
        // hero 层：从 dl-group 顶部渐显，到 hero 底部完全显现
        var dl = document.querySelector('.dl-group');
        var hero = document.querySelector('.hero');
        if (dl && hero) {
          dlGroupDoc = dl.getBoundingClientRect().top + st;
          heroBottomDoc = hero.getBoundingClientRect().bottom + st;
        }
        return;
      }

      if (!fadeEls.wrap || !fadeEls.giant) {
        fadeEls.wrap = host.querySelector('.foot-wrap');
        fadeEls.giant = host.querySelector('.foot-giant');
      }
      if (!fadeEls.wrap || !fadeEls.giant) { fadeStartDoc = fadeEndDoc = null; return; }
      fadeStartDoc = fadeEls.wrap.getBoundingClientRect().top + st;
      fadeEndDoc = fadeEls.giant.getBoundingClientRect().bottom + st;
    }

    /* 给定星点的文档 y，返回透明度系数 0~1 */
    function fadeAt(docY) {
      if (topFade) {
        if (dlGroupDoc === null) return 0;
        if (docY <= dlGroupDoc) return 0;                 // 下载按钮区之上：不显示
        if (heroBottomDoc === null || docY >= heroBottomDoc) return 1;
        return (docY - dlGroupDoc) / (heroBottomDoc - dlGroupDoc);   // 自上而下渐显
      }
      if (fadeStartDoc === null) return 1;
      if (docY <= fadeStartDoc) return 1;
      if (docY >= fadeEndDoc) return 0;
      return 1 - (docY - fadeStartDoc) / (fadeEndDoc - fadeStartDoc);
    }

    /* ── 绘制 ──────────────────────────────────────────────────────── */

    function paint(t) {
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];

        // 明暗呼吸
        var a = s.alpha * (0.35 + 0.65 * Math.abs(Math.sin(t * s.tw + s.phase)));
        // 缓慢循环位移
        var px = s.x + Math.sin((t / s.dxPeriod) * Math.PI * 2 + s.dxPhase) * s.dxAmp;
        var py = s.y + Math.cos((t / s.dyPeriod) * Math.PI * 2 + s.dyPhase) * s.dyAmp;
        // 底部渐隐
        var f = fadeAt(canvasTopDoc + py);
        if (f <= 0) continue;

        ctx.globalAlpha = a * f;
        ctx.fillStyle = 'hsl(' + (212 + s.hue) + ', 90%, 88%)';
        if (s.size <= 1) ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
        else { ctx.beginPath(); ctx.arc(px, py, s.size, 0, Math.PI * 2); ctx.fill(); }
      }

      ctx.globalAlpha = 1;
    }

    function frame(ts) {
      if (!running) return;
      paint(ts / 1000);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    window.addEventListener('resize', resize);

    // 滚动时刷新布局指标（画布 sticky，滚动会改变其文档位置），rAF 节流
    var tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { tick = false; updateMetrics(); });
    }, { passive: true });

    /* 页面高度会因图片等资源加载而变化，必须跟着重测渐隐窗口，
       否则会一直用过期的值（实测出现过 6330 vs 7422 的偏差）。
       用 load 事件 + ResizeObserver，避免回到「每帧读布局」的高开销做法。 */
    window.addEventListener('load', updateMetrics);
    if ('ResizeObserver' in window) {
      new ResizeObserver(updateMetrics).observe(host);
    }

    return { start: start, stop: stop };
  }

  var fields = [];
  Array.prototype.slice.call(document.querySelectorAll('[data-starfield]')).forEach(function (c) {
    var f = createField(c);
    if (f) fields.push(f);
  });
  if (!fields.length) return;

  fields.forEach(function (f) { f.start(); });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') fields.forEach(function (f) { f.stop(); });
    else fields.forEach(function (f) { f.start(); });
  });
})();