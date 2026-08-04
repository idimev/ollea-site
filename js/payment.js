/* =========================================================
   Ollea — плаќање со картичка (Halkbank / NestPay 3D_PAY_HOSTING)
   Редослед: нарачката прво се снима преку Netlify Forms (за да
   не се изгуби адресата ако плаќањето пропадне), па дури потоа
   се оди на безбедната страница на банката.
   Сумата ја пресметува серверот — тука се праќаат само
   производите и количините.
   ========================================================= */
(function () {
  var CARD_VALUE = 'Плаќање со картичка';

  function $(id) { return document.getElementById(id); }

  /* Број на нарачка — истиот оди и во Netlify Forms и кај банката,
     за да може подоцна да се спарат. Форматот се проверува и на серверот. */
  function newOid() {
    var rnd = '';
    try {
      var buf = new Uint8Array(3);
      (window.crypto || window.msCrypto).getRandomValues(buf);
      Array.prototype.forEach.call(buf, function (b) {
        rnd += ('0' + b.toString(16)).slice(-2);
      });
    } catch (e) {
      rnd = Math.floor(Math.random() * 0xffffff).toString(16);
    }
    while (rnd.length < 6) rnd = '0' + rnd;
    return 'OLLEA-' + Date.now() + '-' + rnd.toUpperCase();
  }

  function selectedMethod(form) {
    var el = form.querySelector('input[name="Начин на плаќање"]:checked');
    return el ? el.value : '';
  }

  function isCard(form) { return selectedMethod(form) === CARD_VALUE; }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('form[name="order"]');
    var payForm = $('halkbank-pay');
    if (!form || !payForm) return;

    var submitBtn = $('orderSubmit');
    var oidField = $('orderOid');
    var note = $('cardNote');

    /* Копчето и напомената се менуваат според избраниот начин на плаќање */
    function syncUi() {
      var card = isCard(form);
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.textContent = card ? 'Плати со картичка' : 'Испрати нарачка';
      }
      if (note) note.style.display = card ? 'block' : 'none';
    }

    Array.prototype.forEach.call(
      form.querySelectorAll('input[name="Начин на плаќање"]'),
      function (r) { r.addEventListener('change', syncUi); }
    );
    syncUi();

    form.addEventListener('submit', function (e) {
      if (!isCard(form)) return; // плаќање при достава — стандардно однесување

      var cart = (window.OlleaCart && window.OlleaCart.items) ? window.OlleaCart.items() : [];
      if (!cart.length) return; // cart.js веќе го прекина и извести корисникот

      e.preventDefault();
      if (submitBtn && submitBtn.dataset.busy === '1') return;

      var oid = newOid();
      if (oidField) oidField.value = oid;
      // Осигурај дека содржината на кошничката е запишана во формата
      var field = $('orderField');
      if (field && window.OlleaCart && window.OlleaCart.serialize) {
        field.value = window.OlleaCart.serialize();
      }

      if (submitBtn) {
        submitBtn.dataset.busy = '1';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Се подготвува плаќањето…';
      }

      function restore(msg) {
        if (submitBtn) {
          submitBtn.dataset.busy = '';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Плати со картичка';
        }
        if (msg) alert(msg);
      }

      /* 1) Сними ја нарачката (Netlify Forms) */
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      })
        .then(function (r) {
          if (!r.ok) throw new Error('form ' + r.status);

          /* 2) Прати ги производите на серверот — тој ја пресметува сумата
                и нè пренасочува кон банката */
          $('payItems').value = JSON.stringify(cart.map(function (i) {
            return { name: i.name, qty: i.qty };
          }));
          $('payOid').value = oid;
          payForm.submit();
        })
        .catch(function (err) {
          console.error('Нарачката не е снимена:', err);
          restore('Нарачката не можеше да се сними. Проверете ја интернет врската и обидете се повторно.');
        });
    });
  });
})();
