(function() {
  var STORAGE_KEY = 'letabuild-lang';
  var US_FLAG = '\uD83C\uDDFA\uD83C\uDDF8';
  var BR_FLAG = '\uD83C\uDDE7\uD83C\uDDF7';

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || 'pt';
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    applyLang(lang);
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  function applyLang(lang) {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    // Update all elements with data-pt / data-en attributes
    var els = document.querySelectorAll('[data-pt][data-en]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var text = el.getAttribute('data-' + lang);
      if (text !== null) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = text;
        } else {
          el.innerHTML = text;
        }
      }
    }
    // Update toggle button with flag emoji
    var btn = document.getElementById('langToggle');
    if (btn) {
      btn.style.fontSize = '20px';
      btn.textContent = lang === 'pt' ? US_FLAG : BR_FLAG;
      btn.title = lang === 'pt' ? 'Switch to English' : 'Mudar para Portugues';
    }
  }

  // Apply on DOMContentLoaded (button must exist)
  document.addEventListener('DOMContentLoaded', function() {
    applyLang(getLang());
    var btn = document.getElementById('langToggle');
    if (btn) {
      btn.addEventListener('click', function() {
        var next = getLang() === 'pt' ? 'en' : 'pt';
        setLang(next);
      });
    }
  });

  // Set lang attribute immediately
  var currentLang = getLang();
  document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : 'en';

  // Expose globally for pages with custom translation logic
  window.letabuildLang = {
    get: getLang,
    set: setLang,
    apply: applyLang
  };
})();
