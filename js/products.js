/* =========================================================
   Ollea — производи од content/products.json (единствен извор)
   Ги полни: листата (#productList), страницата за производ и
   обезбедува цени за кошничката (window.OlleaProducts.priceOf).
   ========================================================= */
(function () {
  var byName = {};   // име → производ
  var bySlug = {};   // слаг → производ
  var list = [];

  function esc(t) { var d = document.createElement('div'); d.textContent = (t == null) ? '' : String(t); return d.innerHTML; }
  function fmt(n) { return String(n) + ' ден.'; }

  function index(arr) {
    list = arr || [];
    byName = {}; bySlug = {};
    list.forEach(function (p) { if (p.name) byName[p.name] = p; if (p.slug) bySlug[p.slug] = p; });
  }

  function placeholderSvg() {
    return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" aria-label="Слика на производ">' +
      '<rect width="400" height="300" fill="#f2ecf3"/>' +
      '<rect x="150" y="95" width="100" height="125" rx="16" fill="#c2a9d6"/>' +
      '<rect x="148" y="71" width="104" height="30" rx="9" fill="#cbc9cf"/>' +
      '<text x="200" y="275" text-anchor="middle" fill="#9a8aa0" font-family="Arial" font-size="14">Слика на производ</text></svg>';
  }

  function media(p) {
    return p.image
      ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" style="width:100%;height:100%;object-fit:cover;">'
      : placeholderSvg();
  }

  function renderList() {
    var wrap = document.getElementById('productList');
    if (!wrap || !list.length) return; // задржи статички fallback
    wrap.innerHTML = list.map(function (p) {
      var link = 'proizvod.html?proizvod=' + encodeURIComponent(p.slug || p.name);
      return '<article class="card">' +
        '<div class="card__media">' + media(p) + '</div>' +
        '<div class="card__body">' +
        '<span class="card__meta">' + esc(p.category || '') + '</span>' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<p>' + esc(p.summary || '') + '</p>' +
        '<div class="card__footer">' +
        '<span class="price">' + fmt(p.price) + '</span>' +
        '<a href="' + link + '" class="btn btn--primary" style="padding:9px 18px;">Детали</a>' +
        '</div></div></article>';
    }).join('');
  }

  function renderDetail() {
    if (!document.getElementById('pdAddBtn')) return; // не е страница за производ
    var param = new URLSearchParams(location.search).get('proizvod');
    if (!param) return; // задржи стандардниот (статички) производ
    var p = bySlug[param] || byName[param];
    if (!p) return;

    function set(id, val) { var el = document.getElementById(id); if (el && val != null) el.textContent = val; }
    set('pdName', p.name);
    set('pdTitle', p.name);
    set('pdCategory', p.category);
    set('pdPrice', fmt(p.price));
    set('pdDesc', p.description || p.summary);
    set('pdCode', p.code);
    set('pdSkin', p.skinType);
    set('pdVolume', p.volume);
    var mediaEl = document.getElementById('pdMedia');
    if (mediaEl) mediaEl.innerHTML = media(p);
    var thumbsEl = document.getElementById('pdThumbs');
    if (thumbsEl) thumbsEl.innerHTML = '<div class="card__media">' + media(p) + '</div>';
    var btn = document.getElementById('pdAddBtn');
    if (btn) btn.setAttribute('data-add', p.name);
    if (p.name) document.title = p.name + ' — Ollea';
  }

  var ready = fetch('content/products.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('no'); return r.json(); })
    .then(function (data) { index(data && data.products ? data.products : []); })
    .catch(function () { index([]); })
    .then(function () {
      renderList();
      renderDetail();
      if (window.OlleaCart && window.OlleaCart.refresh) window.OlleaCart.refresh();
    });

  window.OlleaProducts = {
    ready: ready,
    priceOf: function (name) { return (byName[name] && typeof byName[name].price === 'number') ? byName[name].price : 0; },
    all: function () { return list.slice(); }
  };
})();
