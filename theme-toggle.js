(function() {
  var STORAGE_KEY = 'letabuild-theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '\u2600' : '\u263E';
      btn.style.color = theme === 'dark' ? '' : '#5a5a5a';
      btn.style.borderColor = theme === 'dark' ? '' : 'rgba(90,90,90,0.3)';
    }
    // Also fix lang toggle visibility in light mode
    var langBtn = document.getElementById('langToggle');
    if (langBtn) {
      langBtn.style.color = theme === 'dark' ? '' : '#5a5a5a';
      langBtn.style.borderColor = theme === 'dark' ? '' : 'rgba(90,90,90,0.3)';
    }
  }

  // Apply immediately to prevent flash
  applyTheme(getTheme());

  document.addEventListener('DOMContentLoaded', function() {
    applyTheme(getTheme());
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', function() {
        var current = document.documentElement.getAttribute('data-theme') || getSystemTheme();
        var next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
      });
    }
  });

  // Listen for system theme changes (only if no manual override)
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(getSystemTheme());
    }
  });
})();
