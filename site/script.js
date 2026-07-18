(function () {
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mobile nav toggle
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');
  navToggle.addEventListener('click', function () {
    var isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  mainNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    q.addEventListener('click', function () {
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (open) {
        open.classList.remove('open');
      });
      if (!wasOpen) item.classList.add('open');
    });
  });

  // "Buy Now" tier buttons: jump to the order form and preselect that bundle
  var bundleSelect = document.getElementById('bundle');
  document.querySelectorAll('.tier-buy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (bundleSelect) bundleSelect.value = btn.dataset.bundle;
      document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Sticky mobile CTA: show after scrolling past hero, hide near the order form
  var stickyCta = document.getElementById('mobile-sticky-cta');
  var orderSection = document.getElementById('order');
  var hero = document.querySelector('.advertorial-hero');
  if ('IntersectionObserver' in window && stickyCta && hero && orderSection) {
    var heroObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (window.innerWidth > 720) return;
          stickyCta.classList.toggle('visible', !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );
    heroObserver.observe(hero);

    var orderObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (window.innerWidth > 720) return;
          if (entry.isIntersecting) stickyCta.classList.remove('visible');
        });
      },
      { threshold: 0.3 }
    );
    orderObserver.observe(orderSection);
  }

  // Order form: AJAX submit to Netlify Forms so we can show an inline thank-you
  // without a redirect. Falls back to a normal POST if fetch fails (e.g. not
  // hosted on Netlify yet), or to a mailto-style alert during local preview.
  var form = document.getElementById('order-form');
  var successEl = document.getElementById('form-success');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString(),
      })
        .then(function () {
          form.hidden = true;
          successEl.hidden = false;
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Place My Order — Pay on Delivery';
          alert(
            'Hindi na-submit ang order. Paki-check ang internet connection mo, o mag-message na lang sa Facebook page.'
          );
        });
    });
  }
})();
