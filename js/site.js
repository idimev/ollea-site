/* =========================================================
   Ollea — динамичка содржина од content/*.json
   Се полни преку Decap CMS. Ако податоците не се достапни
   (на пр. локален преглед), остануваат статичките примери.
   ========================================================= */
(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = (t == null) ? '' : String(t);
    return d.innerHTML;
  }

  function slugify(t) {
    return (t || '').toString().toLowerCase().trim()
      .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function load(url) {
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('not ok'); return r.json(); })
      .catch(function () { return null; });
  }

  /* ---- Поставки (hero текст, контакт) ---- */
  function applySettings(s) {
    if (!s) return;
    $all('[data-cms]').forEach(function (el) {
      var key = el.getAttribute('data-cms');
      var val = key.split('.').reduce(function (o, k) {
        return (o && o[k] != null) ? o[k] : null;
      }, s);
      if (val == null || val === '') return;

      if (el.tagName === 'A' && key.indexOf('email') > -1) {
        el.textContent = val; el.href = 'mailto:' + val;
      } else if (el.tagName === 'A' && key.indexOf('phone') > -1) {
        el.textContent = val; el.href = 'tel:' + val.replace(/\s+/g, '');
      } else {
        el.textContent = val;
      }
    });
  }

  /* ---- Картичка за блог пост ---- */
  function postCard(p) {
    var slug = p.slug || slugify(p.title);
    var meta = esc(p.category || '') + (p.readTime ? ' • ' + esc(p.readTime) : '');
    var media = p.cover
      ? '<img src="' + esc(p.cover) + '" alt="' + esc(p.title) + '" style="width:100%;height:100%;object-fit:cover;">'
      : '<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="240" fill="#e9e1f2"/><text x="200" y="125" text-anchor="middle" fill="#9a9a8e" font-family="Arial" font-size="14">Слика на статија</text></svg>';
    return '<article class="card">' +
      '<div class="card__media">' + media + '</div>' +
      '<div class="card__body">' +
      '<span class="card__meta">' + meta + '</span>' +
      '<h3>' + esc(p.title) + '</h3>' +
      '<p>' + esc(p.summary || '') + '</p>' +
      '<div class="card__footer"><a href="blog-post.html?slug=' + encodeURIComponent(slug) + '">Прочитај →</a></div>' +
      '</div></article>';
  }

  function sortByDate(posts) {
    return posts.slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    });
  }

  function renderList(el, posts, limit) {
    if (!el || !posts || !posts.length) return; // задржи статички fallback
    var list = sortByDate(posts);
    if (limit) list = list.slice(0, limit);
    el.innerHTML = list.map(postCard).join('');
  }

  /* ---- Поединечен блог пост ---- */
  function renderPost(posts) {
    var c = $('#postContent');
    if (!c || !posts || !posts.length) return; // задржи статички fallback

    var params = new URLSearchParams(location.search);
    var slug = params.get('slug');
    var post = null;
    if (slug) {
      post = posts.filter(function (p) { return (p.slug || slugify(p.title)) === slug; })[0];
    }
    if (!post) post = sortByDate(posts)[0];
    if (!post) return;

    var meta = (post.date ? 'Објавено на ' + esc(post.date) : '') +
      (post.category ? ' • ' + esc(post.category) : '') +
      (post.readTime ? ' • ' + esc(post.readTime) : '');

    var cover = post.cover
      ? '<img src="' + esc(post.cover) + '" alt="' + esc(post.title) + '" style="width:100%;border-radius:var(--radius);margin:28px 0;">'
      : '';

    var body = post.body || '';
    body = (window.marked && window.marked.parse) ? window.marked.parse(body) : '<p>' + esc(body) + '</p>';

    document.title = post.title + ' — Ollea Блог';
    var bc = $('#breadcrumbTitle');
    if (bc) bc.textContent = post.title;

    c.innerHTML =
      '<span class="eyebrow">' + esc(post.category || 'Блог') + '</span>' +
      '<h1>' + esc(post.title) + '</h1>' +
      '<p class="article__meta">' + meta + '</p>' +
      cover +
      body +
      '<hr style="border:0; border-top:1px solid var(--color-line); margin:40px 0;">' +
      '<p class="muted">Сакате повеќе совети? <a href="blog.html">Разгледајте ги другите статии</a> или <a href="products.html">погледнете ги нашите производи</a>.</p>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    load('content/settings.json').then(applySettings);

    var needsBlog = $('#blogList') || $('#latestPosts') || $('#postContent');
    if (needsBlog) {
      load('content/blog.json').then(function (data) {
        var posts = (data && data.posts) ? data.posts : [];
        renderList($('#blogList'), posts);
        renderList($('#latestPosts'), posts, 3);
        renderPost(posts);
      });
    }
  });
})();
