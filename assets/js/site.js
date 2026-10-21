/* V4 地平线版 = V2 顶部骨架 + V1 中段 + V3 底部
   浮层菜单 / 底部 Dock 指示器 */

(function () {
  /* ── 滚动监听锁：点击导航后是长距离平滑滚动，scroll-spy 若照常工作，
     会把高亮改回"路过的"中间区块，胶囊指示器被来回拉扯、过渡反复重启。
     点击时锁定，滚动结束(scrollend)或超时兜底后解锁。 ───────────────── */
  let spyLocked = false;
  let spyUnlockTimer = 0;

  function lockSpyUntilScrollEnd() {
    spyLocked = true;
    clearTimeout(spyUnlockTimer);
    spyUnlockTimer = setTimeout(function () { spyLocked = false; }, 1800);
  }

  if ('onscrollend' in document) {
    document.addEventListener('scrollend', function () {
      clearTimeout(spyUnlockTimer);
      spyLocked = false;
    });
  }

  /* ── 浮层菜单 ─────────────────────────────────────────────────────── */

  const overlay = document.getElementById('overlay');
  const menuBtn = document.getElementById('menuBtn');

  function setMenu(open) {
    overlay.classList.toggle('open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    // 菜单展开时隐去 Dock，避免两套导航同时出现
    document.body.classList.toggle('menu-open', open);
  }

  menuBtn.addEventListener('click', function () {
    setMenu(!overlay.classList.contains('open'));
  });

  // 点导航项后关闭浮层；随后的平滑滚动期间锁定 spy，Dock 高亮直达目标
  overlay.querySelectorAll('.overlay-nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      setMenu(false);
      lockSpyUntilScrollEnd();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });


  /* ── 底部 Dock：滑动指示器 + 滚动高亮（取自 V3） ─────────────────── */

  const dock = document.getElementById('dock');
  const glider = document.getElementById('dockGlider');

  if (dock && glider) {
    const links = Array.prototype.slice.call(dock.querySelectorAll('a'));
    const sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    function moveGlider(link) {
      if (!link) return;
      // offsetLeft 以 dock 内边距边缘为原点，glider 的 CSS left 又含同样的
      // 内边距，直接用会二次叠加——相减得到相对 glider 锚点的纯位移
      glider.style.width = link.offsetWidth + 'px';
      glider.style.transform = 'translateX(' + (link.offsetLeft - glider.offsetLeft) + 'px)';
    }

    function setActive(id) {
      let active = null;
      links.forEach(function (a) {
        const on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('active', on);
        if (on) active = a;
      });
      moveGlider(active);
    }

    /* 用"判定线"而非 IntersectionObserver 的 ratio：
       .feat 高约 3400px，任何时刻最多只有约 10% 落在视口里，
       ratio 永远够不到 0.12 阈值，高亮会卡死。改为取
       "最后一个顶边越过判定线的区块"，与区块高度无关。 */
    function currentId() {
      const line = innerHeight * 0.28;
      let cur = sections[0];
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top <= line) cur = s;
      });
      return cur ? cur.id : null;
    }

    let spyRaf = null;
    function onScroll() {
      if (spyRaf) return;
      spyRaf = requestAnimationFrame(function () {
        spyRaf = null;
        if (spyLocked) return;
        const id = currentId();
        if (id) setActive(id);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // 点击即时反馈：高亮直达目标，滚动途中 spy 已锁定不会来回拉扯
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        setActive(a.getAttribute('href').slice(1));
        lockSpyUntilScrollEnd();
      });
    });

    // 首次定位 + 窗口变化时重新对齐
    requestAnimationFrame(function () { setActive('install'); });
    window.addEventListener('resize', function () {
      const cur = links.filter(function (a) { return a.classList.contains('active'); })[0];
      if (cur) moveGlider(cur);
    });
  }

  /* ── Chrome 下载按钮：点击展开下拉（前往商店 / 本地安装） ─────────── */

  var chromeItem = document.getElementById('chromeItem');
  var chromeBtn = document.getElementById('chromeMenuBtn');
  if (chromeItem && chromeBtn) {
    var setChromeMenu = function (open) {
      chromeItem.classList.toggle('open', open);
      chromeBtn.setAttribute('aria-expanded', String(open));
    };
    chromeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setChromeMenu(!chromeItem.classList.contains('open'));
    });
    document.addEventListener('click', function () { setChromeMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setChromeMenu(false);
    });
    Array.prototype.slice.call(chromeItem.querySelectorAll('.dl-menu a')).forEach(function (a) {
      a.addEventListener('click', function () { setChromeMenu(false); });
    });
  }
})();
