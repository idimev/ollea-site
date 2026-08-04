/* =========================================================
   Ollea — кошничка (basket)
   Се чува во прелистувачот (localStorage). Целата кошничка
   се испраќа како една нарачка преку Netlify Forms.
   ========================================================= */
(function () {
  var KEY = 'ollea_cart';

  /* Достава — истото правило е применето и на серверот
     (netlify/functions/create-payment.js чита од content/settings.json),
     за да не се разликува прикажаната од наплатената сума. */
  var delivery = { fee: 130, freeOver: 1500 };

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function write(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }
  // Цените доаѓаат од единствениот извор (content/products.json преку products.js)
  function price(name) { return (window.OlleaProducts && window.OlleaProducts.priceOf) ? window.OlleaProducts.priceOf(name) : 0; }
  function fmt(n) { return String(n) + ' ден.'; }
  function esc(t) { var d = document.createElement('div'); d.textContent = (t == null) ? '' : String(t); return d.innerHTML; }
  function count() { return read().reduce(function (n, i) { return n + i.qty; }, 0); }

  function add(name, qty) {
    if (!name) return;
    qty = qty || 1;
    var c = read();
    var found = c.filter(function (i) { return i.name === name; })[0];
    if (found) found.qty += qty; else c.push({ name: name, qty: qty });
    write(c); updateBadge(); renderCart();
  }
  function setQty(name, qty) {
    var c = read().map(function (i) { if (i.name === name) i.qty = Math.max(1, qty); return i; });
    write(c); updateBadge(); renderCart();
  }
  function remove(name) {
    write(read().filter(function (i) { return i.name !== name; }));
    updateBadge(); renderCart();
  }

  function updateBadge() {
    var n = count();
    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-count]'), function (el) { el.textContent = n; });
  }

  /* Пресметка на сумите за дадена кошничка */
  function totals(c) {
    c = c || read();
    var sub = c.reduce(function (s, i) { return s + price(i.name) * i.qty; }, 0);
    var ship = (sub > 0 && sub < delivery.freeOver) ? delivery.fee : 0;
    return { subtotal: sub, delivery: ship, total: sub + ship };
  }

  function serialize(c) {
    var lines = c.map(function (i) {
      return i.qty + '× ' + i.name + ' (' + fmt(price(i.name)) + ') = ' + fmt(price(i.name) * i.qty);
    });
    var t = totals(c);
    return lines.join('\n') +
      '\nМеѓузбир (производи): ' + fmt(t.subtotal) +
      '\nДостава: ' + (t.delivery ? fmt(t.delivery) : 'бесплатно') +
      '\nВкупно: ' + fmt(t.total);
  }

  function renderCart() {
    var wrap = document.getElementById('cartItems');
    if (!wrap) return;
    var c = read();
    var empty = document.getElementById('cartEmpty');
    var totalsEl = document.getElementById('cartTotals');
    var field = document.getElementById('orderField');
    var submit = document.getElementById('orderSubmit');

    if (!c.length) {
      wrap.innerHTML = '';
      if (empty) empty.style.display = 'block';
      if (totalsEl) totalsEl.style.display = 'none';
      if (field) field.value = '';
      if (submit) { submit.disabled = true; submit.style.opacity = .5; submit.style.pointerEvents = 'none'; }
      return;
    }
    if (empty) empty.style.display = 'none';
    if (totalsEl) totalsEl.style.display = 'block';
    if (submit) { submit.disabled = false; submit.style.opacity = 1; submit.style.pointerEvents = 'auto'; }

    wrap.innerHTML = c.map(function (i) {
      var line = price(i.name) * i.qty;
      return '<div class="cart-line">' +
        '<div style="flex:1;"><div class="cart-line__name">' + esc(i.name) + '</div>' +
        '<div class="cart-line__price">' + fmt(price(i.name)) + ' / парче</div></div>' +
        '<div class="cart-qty">' +
        '<button type="button" data-dec="' + esc(i.name) + '" aria-label="Намали">−</button>' +
        '<span>' + i.qty + '</span>' +
        '<button type="button" data-inc="' + esc(i.name) + '" aria-label="Зголеми">+</button>' +
        '</div>' +
        '<div style="width:96px;text-align:right;font-weight:600;">' + fmt(line) + '</div>' +
        '<button type="button" class="cart-remove" data-rem="' + esc(i.name) + '" title="Отстрани" aria-label="Отстрани">×</button>' +
        '</div>';
    }).join('');

    var t = totals(c);
    if (totalsEl) {
      totalsEl.innerHTML =
        '<div class="row"><span>Меѓузбир (производи)</span><span>' + fmt(t.subtotal) + '</span></div>' +
        '<div class="row"><span>Достава</span><span>' +
          (t.delivery ? fmt(t.delivery) : 'Бесплатно') + '</span></div>' +
        '<div class="row grand"><span>Вкупно</span><span>' + fmt(t.total) + '</span></div>';
    }
    if (field) field.value = serialize(c);
  }

  /* Клик-делегација: додај / +/- / отстрани */
  document.addEventListener('click', function (e) {
    var addBtn = e.target.closest ? e.target.closest('[data-add]') : null;
    if (addBtn) {
      e.preventDefault();
      var name = addBtn.getAttribute('data-add');
      var qty = 1;
      var box = addBtn.closest ? addBtn.closest('.product-info') : null;
      if (box) { var qi = box.querySelector('.qty input'); if (qi) qty = Math.max(1, parseInt(qi.value, 10) || 1); }
      add(name, qty);
      if (!addBtn.getAttribute('data-label')) addBtn.setAttribute('data-label', addBtn.textContent);
      var orig = addBtn.getAttribute('data-label');
      addBtn.textContent = 'Додадено ✓';
      setTimeout(function () { addBtn.textContent = orig; }, 1400);
      return;
    }
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-inc')) {
      var inc = read().filter(function (i) { return i.name === t.getAttribute('data-inc'); })[0];
      setQty(t.getAttribute('data-inc'), (inc ? inc.qty : 1) + 1);
    } else if (t.hasAttribute && t.hasAttribute('data-dec')) {
      var dec = read().filter(function (i) { return i.name === t.getAttribute('data-dec'); })[0];
      setQty(t.getAttribute('data-dec'), (dec ? dec.qty : 1) - 1);
    } else if (t.hasAttribute && t.hasAttribute('data-rem')) {
      remove(t.getAttribute('data-rem'));
    }
  });

  /* Цената на доставата доаѓа од content/settings.json (уредливо од админот).
     Ако не е достапна, остануваат стандардните вредности погоре. */
  var settingsReady = fetch('content/settings.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('no'); return r.json(); })
    .then(function (s) {
      var p = (s && s.payment) || {};
      if (typeof p.deliveryFee === 'number' && p.deliveryFee >= 0) delivery.fee = p.deliveryFee;
      if (typeof p.freeDeliveryOver === 'number' && p.freeDeliveryOver >= 0) delivery.freeOver = p.freeDeliveryOver;
    })
    .catch(function () {});

  document.addEventListener('DOMContentLoaded', function () {
    updateBadge();
    renderCart();
    settingsReady.then(function () { renderCart(); });
    // Кога ќе се вчитаат цените од products.json, повторно прикажи ја кошничката
    if (window.OlleaProducts && window.OlleaProducts.ready && window.OlleaProducts.ready.then) {
      window.OlleaProducts.ready.then(function () { updateBadge(); renderCart(); });
    }
    var form = document.querySelector('form[name="order"]');
    if (form) {
      form.addEventListener('submit', function (e) {
        var c = read();
        if (!c.length) { e.preventDefault(); alert('Вашата кошничка е празна. Додадете производ пред да нарачате.'); return; }
        var field = document.getElementById('orderField');
        if (field) field.value = serialize(c);
      });
    }
  });

  window.OlleaCart = {
    add: add,
    refresh: function () { updateBadge(); renderCart(); },
    clear: function () { write([]); updateBadge(); renderCart(); },
    /* Користено од js/payment.js (плаќање со картичка) */
    items: read,
    totals: totals,
    serialize: function () { return serialize(read()); },
    ready: settingsReady
  };
})();
