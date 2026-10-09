/* ══════════════════════════════════════════════════════════════════════════
   虚空搜索 XuSearch — 公共交互层（三版共用）
   i18n 应用 / 语言切换 / 滚动淡入 / 视频可见性播放
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  const DICT = window.XUSEARCH_I18N;
  let lang = 'zh';

  /* ── i18n ─────────────────────────────────────────────────────────── */

  function applyLang(next) {
    // v4 页文案已内联，不加载字典；此时跳过 i18n，只保留本文件的淡入/视频功能
    if (!DICT) return;
    lang = next;
    const d = DICT[lang];
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const v = d[el.dataset.i18n];
      // 文案里的 \n 转成 <br>，且允许内联 <strong>
      if (v !== undefined) el.innerHTML = v.replace(/\n/g, '<br>');
    });

    document.querySelectorAll('[data-lang-label]').forEach(function (el) {
      el.textContent = d.lang_label;
    });

    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  /* ── 滚动淡入 ─────────────────────────────────────────────────────── */

  function initReveal() {
    // 不支持 IntersectionObserver 时直接显示，避免内容永久隐形
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ── 视频：进入视口才播，离开即停（省 CPU） ──────────────────────── */

  function initVideos() {
    const vids = Array.prototype.slice.call(document.querySelectorAll('video'));
    vids.forEach(function (v) {
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    });

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        const v = e.target;
        if (e.isIntersecting) {
          v.play().catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.2 });

    vids.forEach(function (v) { io.observe(v); });

    // 首屏视频兜底：部分浏览器需要一次用户交互才允许播放
    ['click', 'touchstart', 'scroll', 'keydown'].forEach(function (evt) {
      document.addEventListener(evt, function once() {
        vids.forEach(function (v) {
          const r = v.getBoundingClientRect();
          if (r.top < innerHeight && r.bottom > 0) v.play().catch(function () {});
        });
        document.removeEventListener(evt, once);
      }, { once: true });
    });
  }

  /* ── 语言按钮：所有 .lang-btn 统一绑定 ───────────────────────────── */

  function initLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLang(lang === 'zh' ? 'en' : 'zh');
      });
    });
  }

  /* ── 对外接口 ─────────────────────────────────────────────────────── */

  window.XS = {
    applyLang: applyLang,
    getLang: function () { return lang; },
    toggleLang: function () { applyLang(lang === 'zh' ? 'en' : 'zh'); },
    t: function (key) { return DICT[lang][key] !== undefined ? DICT[lang][key] : key; },
    $: function (s, r) { return (r || document).querySelector(s); },
    $$: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    onLang: function (fn) { document.addEventListener('langchange', fn); }
  };

  function boot() {
    initLangButtons();
    applyLang('zh');
    initReveal();
    initVideos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
