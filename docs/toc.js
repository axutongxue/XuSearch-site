/* ══════════════════════════════════════════════════════════════════════════
   教程文档 — 左侧可折叠目录
   读取 .doc-body 里的 h2–h6 自动生成为树：
   · h2（二级目录，顶层）始终展开，不带折叠按钮。
   · h3 及更深（h2 以下）默认收起；各自带折叠按钮，点击只切换当前节点
     （展开/收起该节点自己的子树），互不影响。
   点击跳转，滚动高亮当前小节并自滚回显示。
   页面没有 .doc-body 或标题少于 2 个时自动跳过，无副作用。
   引入方式（放在 </body> 前）：<script src="toc.js"></script>
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  const body = document.querySelector('.doc-body');
  if (!body) return;

  const headings = Array.prototype.slice.call(body.querySelectorAll('h2, h3, h4, h5, h6'));
  if (headings.length < 2) return;

  const levelOf = function (tag) { return +tag.slice(1); };

  headings.forEach(function (h, i) { if (!h.id) h.id = 'sec-' + i; });

  /* ── 构建立层级树 ────────────────────────────────────────────────────── */

  const root = { level: 0, children: [] };
  let stack = [root];

  headings.forEach(function (h) {
    const node = { heading: h, level: levelOf(h.tagName), children: [], link: null };
    while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });

  const all = [];
  (function collect(ns) {
    ns.forEach(function (n) { all.push(n); collect(n.children); });
  })(root.children);

  function render(ns) {
    const ul = document.createElement('ul');
    ns.forEach(function (n) {
      const li = document.createElement('li');
      li.className = 'toc-li lv' + n.level;

      const a = document.createElement('a');
      a.href = '#' + n.heading.id;
      a.textContent = n.heading.textContent;
      a.classList.add('toc-link');
      n.link = a;
      // 不依赖原生 hash 导航：同 hash 重复点击浏览器不会再次滚动（切走再点回来也失效）。
      // 改用显式 scrollIntoView，每次都精确滚到对应标题；scroll-margin-top 会自动避让吸顶栏。
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.getElementById(n.heading.id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      li.appendChild(a);

      const hasChildren = n.children.length > 0;

      if (hasChildren) {
        if (n.level > 2) {
          // h2 以下：默认收起，带折叠按钮，点击只切换当前节点
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'toc-toggle';
          b.setAttribute('aria-label', '展开 / 收起');
          b.setAttribute('aria-expanded', 'false'); // 默认收起
          li.classList.add('collapsed'); // 默认收起
          b.addEventListener('click', function () {
            const collapsed = li.classList.toggle('collapsed');
            b.setAttribute('aria-expanded', String(!collapsed));
          });
          li.insertBefore(b, li.firstChild);
        }
        // h2 顶层无论是否带按钮，子级 ul 始终渲染；收起状态由 li.collapsed 的 CSS 隐藏
        li.appendChild(render(n.children));
      }

      ul.appendChild(li);
    });
    return ul;
  }

  const nav = document.createElement('nav');
  nav.className = 'doc-toc';
  nav.setAttribute('aria-label', '文章目录');
  nav.appendChild(render(root.children));
  document.body.appendChild(nav);

  /* ── 滚动高亮：取最后一个顶边越过判定线的标题，并自滚回显示 ─────────── */

  const LINE = 88; // 吸顶栏高度 + 余量
  let raf = null;

  function setActive() {
    let cur = all[0];
    headings.forEach(function (h, i) {
      if (h.getBoundingClientRect().top <= LINE) cur = all[i];
    });
    // 滚到页底时强制高亮最后一项（最后一项滚不过判定线）
    if (window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2) {
      cur = all[all.length - 1];
    }
    all.forEach(function (n) {
      if (n.link) n.link.classList.toggle('active', n === cur);
    });
    if (cur && cur.link) {
      const nr = nav.getBoundingClientRect();
      const cr = cur.link.getBoundingClientRect();
      // 侧边栏自滚回显示当前项：nav 与 link 都是 fixed，用视口坐标直接相减。
      // 不能用 cur.link.offsetTop——它的 offsetParent 是 <li>（position:relative），
      // 算出的偏差是相对 li 而不是 nav，会把侧边栏滚到 0/乱位，选中项对不上位置。
      if (cr.top < nr.top || cr.bottom > nr.bottom) {
        nav.scrollTop += (cr.top - nr.top) - (nr.height / 2 - cr.height / 2);
      }
    }
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = null;
      setActive();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  setActive();
})();
