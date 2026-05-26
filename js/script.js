/* Ollea — заеднички скрипти */

document.addEventListener('DOMContentLoaded', function () {

  /* --- Мобилно мени --- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  /* --- Tabs на страница за производ --- */
  var tabButtons = document.querySelectorAll('.tab-buttons button');
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-buttons button').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      var panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });

  /* --- Количина (+/-) на страница за производ --- */
  document.querySelectorAll('[data-qty]').forEach(function (wrap) {
    var input = wrap.querySelector('input');
    wrap.querySelector('[data-qty-minus]')?.addEventListener('click', function () {
      input.value = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
    });
    wrap.querySelector('[data-qty-plus]')?.addEventListener('click', function () {
      input.value = (parseInt(input.value, 10) || 1) + 1;
    });
  });

  /* --- Dummy „додај во кошничка" / форми --- */
  document.querySelectorAll('[data-demo]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      alert('Ова е демо верзија на сајтот. Функцијата сè уште не е поврзана.');
    });
  });
  document.querySelectorAll('form[data-demo-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Благодариме! Ова е демо форма — внесените податоци не се испраќаат.');
      form.reset();
    });
  });

  /* --- Активна ставка во менито според URL --- */
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(function (a) {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

});
