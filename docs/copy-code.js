/* ══════════════════════════════════════════════════════════════════════════
   教程文档 — 代码块一键复制
   给每个 .doc-body pre 加「复制」按钮，点击把代码原文复制进剪贴板。
   引入方式（放在 </body> 前，放在 toc.js 之后）：<script src="copy-code.js"></script>
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  const blocks = document.querySelectorAll('.doc-body pre');
  if (!blocks.length) return;

  blocks.forEach(function (pre) {
    const code = pre.querySelector('code');
    if (!code) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = '复制';
    btn.setAttribute('aria-label', '复制代码');
    pre.appendChild(btn);

    btn.addEventListener('click', function () {
      copyText(code.textContent).then(function () {
        btn.textContent = '已复制';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = '复制';
          btn.classList.remove('copied');
        }, 1800);
      }).catch(function () {
        btn.textContent = '复制失败';
        setTimeout(function () { btn.textContent = '复制'; }, 1800);
      });
    });
  });

  function copyText(text) {
    // 优先 Clipboard API；被拒（权限/非安全上下文）时自动落到 execCommand 兜底
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.pointerEvents = 'none';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) {
        reject(e);
      }
    });
  }
})();
