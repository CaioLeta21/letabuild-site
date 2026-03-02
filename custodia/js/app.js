// ============================================================
// App — Main orchestration for custodia tutorial
// ============================================================

(function () {
  let lang = 'pt';
  let pendingTutorialId = null;

  // ── DOM ─────────────────────────────────────────────────
  const $ = function (id) { return document.getElementById(id); };

  const screens = {
    landing:      $('screenLanding'),
    wizard:       $('screenWizard'),
    browse:       $('screenBrowse'),
    practices:    $('screenPractices'),
    tutorial:     $('screenTutorial'),
    completion:   $('screenCompletion')
  };

  // ── Screen Management ───────────────────────────────────
  function showScreen(name) {
    Object.values(screens).forEach(function (s) { s.classList.remove('active'); });
    screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Language ────────────────────────────────────────────
  function setLanguage(newLang) {
    lang = newLang;
    var ui = UI_STRINGS[lang];

    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.title = ui.landingTitle + ' — ' + ui.landingTitleHighlight;

    $('langToggle').textContent = ui.langToggle;

    // Landing
    $('landingTitle').innerHTML = lang === 'pt'
      ? 'Auto-Custódia <span class="highlight">Bitcoin</span>'
      : 'Bitcoin <span class="highlight">Self-Custody</span>';
    $('landingSubtitle').textContent = ui.landingSubtitle;
    $('landingMeta').textContent = ui.landingMeta;
    $('btnGuideLabel').textContent = ui.btnGuide;
    $('btnGuideDesc').textContent = ui.btnGuideDesc;
    $('btnBrowseLabel').textContent = ui.btnBrowse;
    $('btnBrowseDesc').textContent = ui.btnBrowseDesc;

    // Disclaimer
    $('disclaimerTitle').textContent = ui.disclaimerTitle;
    $('disclaimerText').innerHTML = ui.disclaimerText;
    $('btnDisclaimer').textContent = ui.disclaimerAccept;

    // Wizard
    $('wizardTitle').textContent = ui.wizardTitle;

    // PDF button
    $('btnDownloadPDFText').textContent = ui.downloadPDF;

    // Footer
    $('footerCredits').textContent = ui.credits + ' ';
    $('footerAnd').textContent = ' ' + ui.and + ' ';
  }

  // ── Disclaimer ──────────────────────────────────────────
  function showDisclaimer(callback) {
    var overlay = $('disclaimerOverlay');
    overlay.classList.add('show');

    function onAccept() {
      overlay.classList.remove('show');
      $('btnDisclaimer').removeEventListener('click', onAccept);
      if (callback) callback();
    }

    $('btnDisclaimer').addEventListener('click', onAccept);
  }

  // ── Wizard Rendering ───────────────────────────────────
  // Steps: wizQ1(0), wizQ2(1), wizInlineWarning(2), wizQ3(3), wizResult(4)
  var wizardStep = 0;
  var allWizardPanels = ['wizQ1', 'wizQ2', 'wizInlineWarning', 'wizQ3', 'wizResult'];
  var pendingNextStep = null; // where to go after inline warning

  function showWizardPanel(stepIndex) {
    wizardStep = stepIndex;
    allWizardPanels.forEach(function (id, i) {
      $(id).classList.toggle('active', i === stepIndex);
    });
    // Scroll wizard into view
    $('screenWizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderWizard() {
    var ui = UI_STRINGS[lang];

    $('wizQ1Title').textContent = ui.wizardQ1;
    renderWizardOptions('wizQ1Options', ui.wizardQ1Opts, 'level');

    $('wizQ2Title').textContent = ui.wizardQ2;
    renderWizardOptions('wizQ2Options', ui.wizardQ2Opts, 'device');

    $('wizQ3Title').textContent = ui.wizardQ3;
    renderWizardOptions('wizQ3Options', ui.wizardQ3Opts, 'hardware');

    $('wizResultLabel').textContent = ui.wizardResult;
    $('btnWizardBackText').textContent = ui.wizardChange;
    $('btnWizardStartText').textContent = ui.wizardStart;

    Wizard.reset();
    showWizardPanel(0);
  }

  function renderWizardOptions(containerId, opts, questionKey) {
    var container = $(containerId);
    container.innerHTML = '';

    opts.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className = 'wizard-option';
      btn.innerHTML =
        '<span class="opt-label">' + opt.label + '</span>' +
        '<span class="opt-desc">' + opt.desc + '</span>';

      btn.addEventListener('click', function () {
        container.querySelectorAll('.wizard-option').forEach(function (b) {
          b.classList.remove('selected');
        });
        btn.classList.add('selected');

        Wizard.setAnswer(questionKey, opt.value);

        setTimeout(function () {
          advanceWizard(questionKey);
        }, 250);
      });

      container.appendChild(btn);
    });
  }

  function advanceWizard(justAnswered) {
    var warnings = [];

    if (justAnswered === 'level') {
      // After Q1 → go to Q2
      warnings = Wizard.getWarningsAfterQ1(lang);
      if (warnings.length > 0) {
        showInlineWarnings(warnings, 1); // after warning, go to Q2 (panel index 1)
      } else {
        showWizardPanel(1); // Q2
      }

    } else if (justAnswered === 'device') {
      // After Q2 → check warnings → go to Q3
      warnings = Wizard.getWarningsAfterQ2(lang);
      if (warnings.length > 0) {
        showInlineWarnings(warnings, 3); // after warning, go to Q3 (panel index 3)
      } else {
        showWizardPanel(3); // Q3
      }

    } else if (justAnswered === 'hardware') {
      // After Q3 → check warnings → go to Result
      warnings = Wizard.getWarningsAfterQ3(lang);
      if (warnings.length > 0) {
        showInlineWarnings(warnings, 4); // after warning, go to Result (panel index 4)
        showWizardResult(); // pre-render result
      } else {
        showWizardResult();
        showWizardPanel(4); // Result
      }
    }
  }

  function showInlineWarnings(warnings, nextPanelIndex) {
    pendingNextStep = nextPanelIndex;

    var html = '';
    warnings.forEach(function (w) {
      html += '<div class="wizard-warning-full">';
      html += '<div class="wizard-warning-full-title">&#9888; ' + w.title + '</div>';
      html += '<div class="wizard-warning-full-text">' + w.text + '</div>';

      if (w.points && w.points.length > 0) {
        html += '<ul class="wizard-warning-points">';
        w.points.forEach(function (p) {
          html += '<li>' + p + '</li>';
        });
        html += '</ul>';
      }

      if (w.recommendation) {
        html += '<div class="wizard-warning-rec">' + w.recommendation + '</div>';
      }
      html += '</div>';
    });

    $('wizInlineWarningContent').innerHTML = html;

    var btnText = lang === 'pt' ? 'Entendi, continuar' : 'I understand, continue';
    $('btnInlineWarningContinue').innerHTML = btnText + ' &rarr;';

    showWizardPanel(2); // show inline warning panel
  }

  function showWizardResult() {
    var rec = Wizard.getRecommendation(lang);

    $('wizResultIcon').innerHTML = '<img src="' + rec.walletIcon + '" alt="' + rec.walletName + '" class="wizard-result-img">';
    $('wizResultName').textContent = rec.walletName;
    $('wizResultLevel').textContent = rec.level;
    $('wizResultDesc').textContent = rec.walletDescription;

    // Clear old warnings container (we now use inline)
    $('wizWarnings').innerHTML = '';
    $('wizWarnings').style.display = 'none';
  }

  // ── Browse Rendering ───────────────────────────────────
  function renderBrowse() {
    var ui = UI_STRINGS[lang];
    $('browseTitle').textContent = ui.browseTitle;

    var levels = ['simple', 'passphrase', 'multisig'];
    var html = '';
    var summary = Progress.getSummary();

    levels.forEach(function (level) {
      var levelInfo = ui.levels[level];
      var badgeClass = 'level-badge-' + level;

      html += '<div class="level-section">';
      html += '<div class="level-header">';
      html += '<span class="level-badge ' + badgeClass + '">' + levelInfo + '</span>';
      html += '<span class="level-desc">' + ui.levels[level + 'Desc'] + '</span>';
      html += '</div>';
      html += '<div class="wallet-grid">';

      WALLETS.forEach(function (w) {
        if (!w.supports.includes(level)) return;

        var tutorialId = null;
        w.tutorials.forEach(function (tid) {
          if (TUTORIALS[tid] && TUTORIALS[tid].level === level) {
            tutorialId = tid;
          }
        });
        if (!tutorialId) return;

        var prog = summary[tutorialId];
        var progressHtml = '';
        if (prog && prog.completed) {
          progressHtml = '<div class="wallet-card-progress">&#10003; ' +
            (lang === 'pt' ? 'Concluído' : 'Completed') + '</div>';
        } else if (prog && prog.started) {
          progressHtml = '<div class="wallet-card-progress" style="color:var(--accent)">&#9654; ' +
            (lang === 'pt' ? 'Em andamento' : 'In progress') + '</div>';
        }

        html += '<div class="wallet-card" data-tutorial="' + tutorialId + '">';
        html += '<div class="wallet-card-header">';
        html += '<img class="wallet-card-icon" src="' + w.icon + '" alt="' + w.name + '">';
        html += '<div>';
        html += '<div class="wallet-card-name">' + w.name + '</div>';
        html += '<div class="wallet-card-type">' + ui.walletTypes[w.type] + '</div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="wallet-card-desc">' + w.description[lang] + '</div>';
        html += progressHtml;
        html += '</div>';
      });

      html += '</div></div>';
    });

    $('browseContent').innerHTML = html;

    $('browseContent').querySelectorAll('.wallet-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var tid = card.getAttribute('data-tutorial');
        startTutorial(tid);
      });
    });
  }

  // ── Best Practices Rendering ───────────────────────────
  function renderPractices(tutorialId) {
    var meta = TUTORIALS[tutorialId];
    var wallet = WALLETS.find(function (w) { return w.id === meta.wallet; });
    var sections = getBestPracticesForPath(meta.level, meta.wallet);

    var titleEl = $('practicesTitle');
    var subtitleEl = $('practicesSubtitle');
    var contentEl = $('practicesContent');
    var progressEl = $('practicesProgress');

    titleEl.textContent = lang === 'pt' ? 'Boas Práticas' : 'Best Practices';
    subtitleEl.textContent = lang === 'pt'
      ? 'Leia com atenção antes de começar o tutorial de ' + wallet.name
      : 'Read carefully before starting the ' + wallet.name + ' tutorial';

    // Flatten all practice items from relevant sections
    var allItems = [];
    sections.forEach(function (sectionKey) {
      var section = BEST_PRACTICES[sectionKey];
      if (section && section[lang]) {
        section[lang].forEach(function (item) {
          allItems.push({ item: item, section: sectionKey });
        });
      }
    });

    // Render all items
    var html = '';
    var sectionLabels = {
      core: { pt: 'Fundamentos', en: 'Fundamentals' },
      devices: { pt: 'Escolha do Dispositivo', en: 'Device Choice' },
      backup: { pt: 'Backup e Recuperação', en: 'Backup & Recovery' },
      verification: { pt: 'Verificação', en: 'Verification' },
      opsec: { pt: 'Segurança Operacional', en: 'Operational Security' },
      passphrase_info: { pt: 'Sobre Passphrase', en: 'About Passphrase' },
      multisig_info: { pt: 'Sobre Multisig', en: 'About Multisig' },
      ledger_warning: { pt: 'Aviso Ledger', en: 'Ledger Warning' }
    };

    var currentSection = '';
    allItems.forEach(function (entry, i) {
      // Section divider
      if (entry.section !== currentSection) {
        currentSection = entry.section;
        var label = sectionLabels[currentSection] || {};
        html += '<div class="practices-section-label">' + (label[lang] || currentSection) + '</div>';
      }

      html += '<div class="fund-card" data-practice-index="' + i + '">';
      html += '<div class="fund-card-header">';
      html += '<span class="fund-icon">' + entry.item.icon + '</span>';
      html += '<span class="fund-title">' + entry.item.title + '</span>';
      html += '</div>';
      html += '<div class="fund-content">' + entry.item.content + '</div>';
      html += '</div>';
    });

    contentEl.innerHTML = html;

    // Progress indicator
    var totalPractices = allItems.length;
    progressEl.textContent = totalPractices + (lang === 'pt' ? ' tópicos' : ' topics');

    // Button text
    var btnText = lang === 'pt'
      ? 'Li tudo. Começar tutorial de ' + wallet.name
      : 'I\'ve read everything. Start ' + wallet.name + ' tutorial';
    $('btnPracticesContinue').innerHTML = btnText + ' &rarr;';
  }

  // ── Tutorial Rendering ─────────────────────────────────
  function startTutorial(tutorialId) {
    pendingTutorialId = tutorialId;

    // Always show best practices before the first tutorial
    // After reading once, the user can skip for subsequent tutorials
    if (!Progress.fundamentalsRead()) {
      renderPractices(tutorialId);
      showScreen('practices');
      return;
    }

    loadTutorial(tutorialId);
  }

  function loadTutorial(tutorialId) {
    if (!Tutorial.load(tutorialId, lang)) return;

    var ui = UI_STRINGS[lang];
    var wallet = Tutorial.getWallet();
    var meta = Tutorial.getMeta();

    $('tutorialIcon').innerHTML = '<img src="' + wallet.icon + '" alt="' + wallet.name + '" class="tutorial-wallet-img">';
    $('tutorialName').textContent = wallet.name;

    var badge = $('tutorialBadge');
    badge.textContent = ui.levels[meta.level];
    badge.className = 'tutorial-level-badge level-badge-' + meta.level;

    renderStepDots();
    renderStep();
    showScreen('tutorial');
  }

  function renderStepDots() {
    var total = Tutorial.getTotalSteps();
    var current = Tutorial.getStepIndex();
    var progress = Tutorial.getProgress();
    var dotsContainer = $('stepDots');
    dotsContainer.innerHTML = '';

    for (var i = 0; i < total; i++) {
      var dot = document.createElement('span');
      dot.className = 'step-dot';
      if (i === current) dot.classList.add('current');
      else if (progress.completedSteps.includes(i)) dot.classList.add('completed');

      (function (idx) {
        dot.addEventListener('click', function () {
          Tutorial.goToStep(idx);
          renderStep();
          renderStepDots();
        });
      })(i);

      dotsContainer.appendChild(dot);
    }
  }

  function renderStep() {
    var ui = UI_STRINGS[lang];
    var step = Tutorial.getCurrentStep();
    var idx = Tutorial.getStepIndex();
    var total = Tutorial.getTotalSteps();

    if (!step) return;

    $('tutorialProgressCount').textContent = ui.step + ' ' + (idx + 1) + ' ' + ui.of + ' ' + total;
    $('tutorialProgressFill').style.width = ((idx + 1) / total * 100) + '%';
    $('tutorialSaved').textContent = ui.progressSaved;

    $('stepNumber').textContent = ui.step + ' ' + (idx + 1);
    $('stepTitle').textContent = step.title;
    $('stepContent').innerHTML = step.content;

    if (step.warning) {
      $('stepWarning').innerHTML =
        '<div class="step-warning">' +
        '<span class="step-warning-icon">&#9888;</span>' +
        '<span class="step-warning-text">' + step.warning + '</span>' +
        '</div>';
    } else {
      $('stepWarning').innerHTML = '';
    }

    if (step.tip) {
      $('stepTip').innerHTML =
        '<div class="step-tip">' +
        '<span class="step-tip-icon">&#9889;</span>' +
        '<span class="step-tip-text">' + step.tip + '</span>' +
        '</div>';
    } else {
      $('stepTip').innerHTML = '';
    }

    if (step.video) {
      $('stepVideo').innerHTML =
        '<a class="step-video" href="' + step.video.url + '" target="_blank" rel="noopener noreferrer">' +
        '&#9654; ' + step.video.label +
        '</a>';
    } else {
      $('stepVideo').innerHTML = '';
    }

    $('btnStepPrev').style.display = Tutorial.isFirst() ? 'none' : '';
    $('btnStepPrevText').textContent = ui.prev;

    if (Tutorial.isLast()) {
      $('btnStepNext').className = 'btn-step btn-step-finish';
      $('btnStepNextText').textContent = ui.finish;
    } else {
      $('btnStepNext').className = 'btn-step btn-step-next';
      $('btnStepNextText').textContent = ui.next;
    }

    var saved = $('tutorialSaved');
    saved.classList.add('show');
    setTimeout(function () { saved.classList.remove('show'); }, 2000);

    var card = $('stepCard');
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'fadeIn 0.3s ease';

    renderStepDots();
  }

  // ── Completion Rendering ───────────────────────────────
  function renderCompletion() {
    var ui = UI_STRINGS[lang];
    var wallet = Tutorial.getWallet();
    var meta = Tutorial.getMeta();
    var steps = Tutorial.getSteps();

    $('completionTitle').textContent = ui.completionTitle;
    $('completionDesc').textContent = ui.completionDesc;

    $('completionChecklistTitle').textContent = ui.completionChecklist;
    var checkHtml = '';
    steps.forEach(function (step) {
      checkHtml += '<div class="checklist-item">' +
        '<span class="checklist-check">&#10003;</span>' +
        '<span>' + step.title + '</span>' +
        '</div>';
    });
    $('completionChecklistContent').innerHTML = checkHtml;

    $('completionNextTitle').textContent = ui.completionNext;
    var nextHtml = '';

    if (meta.level === 'simple') {
      nextHtml += '<div class="next-item" data-tutorial="coldcard-passphrase">' +
        '🔐 ' + (lang === 'pt' ? 'Aprenda sobre Passphrase (Coldcard + Sparrow)' : 'Learn about Passphrase (Coldcard + Sparrow)') +
        '</div>';
    } else if (meta.level === 'passphrase') {
      nextHtml += '<div class="next-item" data-tutorial="nunchuk-multisig">' +
        '🥷 ' + (lang === 'pt' ? 'Aprenda Multisig (Nunchuk)' : 'Learn Multisig (Nunchuk)') +
        '</div>';
    }

    nextHtml += '<div class="next-item" data-action="browse">' +
      '📋 ' + (lang === 'pt' ? 'Ver todos os tutoriais' : 'See all tutorials') +
      '</div>';

    $('completionNextContent').innerHTML = nextHtml;

    $('completionNextContent').querySelectorAll('.next-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var tid = item.getAttribute('data-tutorial');
        var action = item.getAttribute('data-action');
        if (tid) startTutorial(tid);
        else if (action === 'browse') { renderBrowse(); showScreen('browse'); }
      });
    });

    $('btnRetakeText').textContent = ui.completionRetake;
    $('btnBackHomeText').textContent = ui.completionHome;
    $('btnDownloadPDFText').textContent = ui.downloadPDF;
  }

  // ── PDF Generation ────────────────────────────────────
  function generatePDF() {
    var ui = UI_STRINGS[lang];
    var wallet = Tutorial.getWallet();
    var meta = Tutorial.getMeta();
    var steps = Tutorial.getSteps();
    var levelLabel = ui.levels[meta.level];

    var btn = $('btnDownloadPDF');
    var btnText = $('btnDownloadPDFText');
    var originalText = btnText.textContent;
    btnText.textContent = ui.generatingPDF;
    btn.disabled = true;

    var html = '';
    html += '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif; color: #1a1a1a; padding: 40px 32px;">';

    // Header
    html += '<div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #f7931a;">';
    html += '<div style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">' + wallet.name + '</div>';
    html += '<div style="font-size: 14px; color: #f7931a; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">' + levelLabel + '</div>';
    html += '</div>';

    // Steps
    steps.forEach(function (step, i) {
      html += '<div style="margin-bottom: 28px; page-break-inside: avoid;">';
      html += '<div style="font-size: 11px; font-weight: 600; color: #f7931a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">' + ui.step + ' ' + (i + 1) + '</div>';
      html += '<div style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">' + step.title + '</div>';
      html += '<div style="font-size: 14px; color: #444; line-height: 1.8;">' + step.content + '</div>';

      if (step.warning) {
        html += '<div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 13px; color: #b91c1c; line-height: 1.6;">';
        html += '<strong>&#9888; ' + ui.warning + ':</strong> ' + step.warning;
        html += '</div>';
      }

      if (step.tip) {
        html += '<div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 13px; color: #166534; line-height: 1.6;">';
        html += '<strong>&#9889; ' + ui.tip + ':</strong> ' + step.tip;
        html += '</div>';
      }

      html += '</div>';
    });

    // Footer
    var today = new Date();
    var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    html += '<div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #888;">';
    html += 'letabuild.com/custodia &middot; ' + dateStr;
    html += '</div>';

    html += '</div>';

    // Create temporary on-screen container (behind everything, for html2canvas)
    var container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:0;top:0;width:700px;background:#fff;z-index:-1;';
    container.innerHTML = html;
    document.body.appendChild(container);

    var filename = 'Tutorial-' + wallet.name.replace(/\s+/g, '-') + '-' + levelLabel.replace(/\s+/g, '-') + '.pdf';

    var opt = {
      margin: [10, 0, 10, 0],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    function cleanup() {
      if (container.parentNode) container.parentNode.removeChild(container);
      btnText.textContent = originalText;
      btn.disabled = false;
    }

    html2pdf().set(opt).from(container).save().then(cleanup).catch(cleanup);
  }

  // ── Event Handlers ─────────────────────────────────────
  function init() {
    setLanguage(lang);

    $('langToggle').addEventListener('click', function () {
      lang = lang === 'pt' ? 'en' : 'pt';
      setLanguage(lang);

      if (screens.browse.classList.contains('active')) renderBrowse();
      if (screens.wizard.classList.contains('active')) renderWizard();
      if (screens.practices.classList.contains('active') && pendingTutorialId) renderPractices(pendingTutorialId);
      if (screens.tutorial.classList.contains('active')) {
        Tutorial.load(Tutorial.getTutorialId(), lang);
        renderStep();
      }
    });

    // Landing
    $('btnGuide').addEventListener('click', function () {
      showDisclaimer(function () { renderWizard(); showScreen('wizard'); });
    });

    $('btnBrowse').addEventListener('click', function () {
      showDisclaimer(function () { renderBrowse(); showScreen('browse'); });
    });

    // Wizard
    $('btnWizardStart').addEventListener('click', function () {
      var rec = Wizard.recommend();
      startTutorial(rec);
    });

    $('btnWizardBack').addEventListener('click', function () {
      Wizard.reset();
      renderWizard();
    });

    // Inline warning continue
    $('btnInlineWarningContinue').addEventListener('click', function () {
      showWizardPanel(pendingNextStep);
    });

    // Best practices continue
    $('btnPracticesContinue').addEventListener('click', function () {
      Progress.markFundamentalsRead();
      if (pendingTutorialId) loadTutorial(pendingTutorialId);
    });

    // Tutorial back to browse
    $('btnTutorialBack').addEventListener('click', function () {
      renderBrowse();
      showScreen('browse');
    });

    // Tutorial navigation
    $('btnStepNext').addEventListener('click', function () {
      if (Tutorial.isLast()) {
        Tutorial.finishTutorial();
        renderCompletion();
        showScreen('completion');
      } else {
        Tutorial.goNext();
        renderStep();
      }
    });

    $('btnStepPrev').addEventListener('click', function () {
      Tutorial.goPrev();
      renderStep();
    });

    // Completion
    $('btnRetake').addEventListener('click', function () {
      Progress.resetTutorial(Tutorial.getTutorialId());
      loadTutorial(Tutorial.getTutorialId());
    });

    $('btnBackHome').addEventListener('click', function () {
      showScreen('landing');
    });

    $('btnDownloadPDF').addEventListener('click', function () {
      generatePDF();
    });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      if (!screens.tutorial.classList.contains('active')) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') $('btnStepNext').click();
      if (e.key === 'ArrowLeft' && !Tutorial.isFirst()) $('btnStepPrev').click();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
