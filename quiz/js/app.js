// ============================================================
// App — Inicialização e orquestração do quiz
// Respostas reveladas apenas ao final (sem feedback imediato)
// ============================================================

(function () {
  let lang = 'pt';
  let result = null;

  // ── DOM Elements ──────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const screens = {
    landing: $('screenLanding'),
    quiz:    $('screenQuiz'),
    result:  $('screenResult')
  };

  const els = {
    langToggle:    $('langToggle'),
    btnStart:      $('btnStart'),
    progressCount: $('progressCount'),
    diffBadge:     $('difficultyBadge'),
    progressFill:  $('progressFill'),
    questionCard:  $('questionCard'),
    questionText:  $('questionText'),
    optionsList:   $('optionsList'),
    feedback:      $('feedbackBanner'),
    btnPrev:       $('btnPrev'),
    btnNext:       $('btnNext'),
    btnNextText:   $('btnNextText'),
    answeredCount: $('answeredCount'),
    resultIcon:    $('resultIcon'),
    resultLevel:   $('resultLevel'),
    scoreRingFill: $('scoreRingFill'),
    resultScore:   $('resultScore'),
    resultScoreLabel: $('resultScoreLabel'),
    resultDesc:    $('resultDesc'),
    weakAreasTitle: $('weakAreasTitle'),
    weakAreasContent: $('weakAreasContent'),
    recsTitle:     $('recsTitle'),
    recsContent:   $('recsContent'),
    btnSaveImg:    $('btnSaveImg'),
    btnSaveImgText: $('btnSaveImgText'),
    btnCopyLink:   $('btnCopyLink'),
    btnCopyLinkText: $('btnCopyLinkText'),
    btnRetake:     $('btnRetake'),
    btnRetakeText: $('btnRetakeText'),
    ctaTitle:      $('ctaTitle'),
    ctaDesc:       $('ctaDesc'),
    ctaButton:     $('ctaButton'),
    ctaButtonText: $('ctaButtonText'),
    landingTitle:  $('landingTitle'),
    landingSubtitle: $('landingSubtitle'),
    landingMeta:   $('landingMeta'),
    reviewSection: $('reviewSection'),
    reviewTitle:   $('reviewTitle'),
    reviewContent: $('reviewContent')
  };

  // ── Screen Management ─────────────────────────────────────
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Language ──────────────────────────────────────────────
  function setLanguage(newLang) {
    lang = newLang;
    const ui = UI[lang];

    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.title = ui.title + ' — Quiz';

    els.langToggle.textContent = ui.lang;
    els.landingTitle.innerHTML = lang === 'pt'
      ? 'Você Entende <span class="highlight">Bitcoin</span>?'
      : 'Do You Understand <span class="highlight">Bitcoin</span>?';
    els.landingSubtitle.textContent = ui.subtitle;
    els.landingMeta.textContent = ui.meta;
    els.btnStart.innerHTML = ui.start + ' <span>&rarr;</span>';

    els.ctaButton.href = lang === 'pt'
      ? 'https://caioleta.com/contato'
      : 'https://caioleta.com/en/contact';
  }

  function toggleLanguage() {
    setLanguage(lang === 'pt' ? 'en' : 'pt');
  }

  // ── Render Question ───────────────────────────────────────
  function renderQuestion() {
    const ui = UI[lang];
    const idx = QuizEngine.getCurrentIndex();
    const total = QuizEngine.getTotalQuestions();
    const q = QuizEngine.getCurrentQuestion();
    const selected = QuizEngine.getSelectedOption(idx);

    // Progress
    els.progressCount.textContent = (idx + 1) + ' ' + ui.questionOf + ' ' + total;
    els.progressFill.style.width = ((idx + 1) / total * 100) + '%';

    // Answered count
    const answeredN = QuizEngine.getAnsweredCount();
    els.answeredCount.textContent = answeredN + '/' + total;

    // Difficulty badge
    els.diffBadge.textContent = ui.difficulty[q.difficulty];
    els.diffBadge.className = 'difficulty-badge difficulty-' + q.difficulty;

    // Question text
    els.questionText.textContent = q.question;

    // Options — no correct/wrong, just selected state
    els.optionsList.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D', 'E'];

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (i === selected) btn.classList.add('selected');

      btn.innerHTML =
        '<span class="option-letter">' + letters[i] + '</span>' +
        '<span class="option-text">' + opt + '</span>';

      btn.addEventListener('click', () => handleAnswer(i));
      els.optionsList.appendChild(btn);
    });

    // Hide feedback banner (not used during quiz)
    els.feedback.classList.remove('show');

    // Navigation buttons
    els.btnPrev.style.display = QuizEngine.canGoBack() ? '' : 'none';
    updateNavButton();

    // Animate card
    els.questionCard.style.animation = 'none';
    els.questionCard.offsetHeight;
    els.questionCard.style.animation = 'fadeIn 0.3s ease';
  }

  function handleAnswer(optionIndex) {
    QuizEngine.selectAnswer(optionIndex);

    // Update option visuals
    const buttons = els.optionsList.querySelectorAll('.option-btn');
    buttons.forEach((btn, i) => {
      btn.classList.toggle('selected', i === optionIndex);
    });

    // Update answered count
    const ui = UI[lang];
    const total = QuizEngine.getTotalQuestions();
    els.answeredCount.textContent = QuizEngine.getAnsweredCount() + '/' + total;

    updateNavButton();
  }

  function updateNavButton() {
    const ui = UI[lang];
    const hasCurrent = QuizEngine.hasAnsweredCurrent();
    const isLast = QuizEngine.isLastQuestion();
    const allDone = QuizEngine.allAnswered();

    if (isLast && allDone) {
      els.btnNextText.textContent = ui.finish;
      els.btnNext.className = 'btn-nav btn-finish';
      els.btnNext.disabled = false;
    } else if (isLast && !allDone) {
      // On last question but not all answered: show how many missing
      const missing = QuizEngine.getTotalQuestions() - QuizEngine.getAnsweredCount();
      const missingText = lang === 'pt'
        ? missing + ' sem resposta'
        : missing + ' unanswered';
      els.btnNextText.textContent = missingText;
      els.btnNext.className = 'btn-nav btn-next';
      els.btnNext.disabled = true;
    } else {
      els.btnNextText.textContent = ui.next;
      els.btnNext.className = 'btn-nav btn-next';
      els.btnNext.disabled = !hasCurrent;
    }
  }

  // ── Render Result ─────────────────────────────────────────
  function renderResult(res) {
    result = res;
    const ui = UI[lang];

    // Hero
    els.resultIcon.textContent = res.level.icon;
    els.resultLevel.textContent = res.level.name;
    els.resultScore.textContent = res.score + '/' + res.total;
    els.resultScoreLabel.textContent = res.score + ' ' + ui.result.score;
    els.resultDesc.textContent = res.level.description;

    // Score ring animation
    const circumference = 2 * Math.PI * 58;
    const offset = circumference - (res.score / res.total) * circumference;
    els.scoreRingFill.style.strokeDasharray = circumference;
    els.scoreRingFill.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        els.scoreRingFill.style.strokeDashoffset = offset;
      });
    });

    // Weak areas
    els.weakAreasTitle.textContent = ui.result.weakAreas;
    if (res.weakCategories.length === 0) {
      els.weakAreasContent.innerHTML = '<p class="all-correct-msg">&#10003; ' + ui.result.allCorrect + '</p>';
    } else {
      els.weakAreasContent.innerHTML = '<div class="weak-list">' +
        res.weakCategoryNames.map(name => '<span class="weak-tag">&#10007; ' + name + '</span>').join('') +
        '</div>';
    }

    // Review of answers
    if (res.details) {
      renderReview(res.details);
    }

    // Recommendations
    els.recsTitle.textContent = ui.result.recommendations;
    let recsHTML = '';

    Object.keys(res.recommendations).forEach(cat => {
      const catName = CATEGORIES[lang][cat];
      const items = res.recommendations[cat];

      recsHTML += '<div class="rec-category">';
      recsHTML += '<div class="rec-category-title">' + catName + '</div>';
      recsHTML += '<div class="rec-list">';

      items.forEach(item => {
        const typeBadge = ui.contentType[item.type] || item.type;
        recsHTML += '<a class="rec-item" href="' + item.url + '" target="_blank" rel="noopener noreferrer">';
        recsHTML += '<span class="rec-type-badge rec-type-' + item.type + '">' + typeBadge + '</span>';
        recsHTML += '<div class="rec-info">';
        recsHTML += '<div class="rec-title">' + item.title + '</div>';
        recsHTML += '<div class="rec-source">' + item.source + '</div>';
        recsHTML += '</div>';
        recsHTML += '<span class="rec-arrow">&rarr;</span>';
        recsHTML += '</a>';
      });

      recsHTML += '</div></div>';
    });

    els.recsContent.innerHTML = recsHTML;

    // Share buttons text
    els.btnSaveImgText.textContent = ui.result.saveImage;
    els.btnCopyLinkText.textContent = ui.result.copyLink;

    // CTA
    els.ctaTitle.textContent = ui.result.cta;
    els.ctaDesc.textContent = ui.result.ctaDesc;
    els.ctaButtonText.textContent = ui.result.ctaButton;

    // Retake
    els.btnRetakeText.textContent = ui.result.retake;
  }

  // ── Review: mostra cada pergunta com correto/errado ───────
  function renderReview(details) {
    const ui = UI[lang];
    const qs = QUESTIONS[lang];

    els.reviewTitle.textContent = lang === 'pt' ? 'Revisão das respostas' : 'Answer review';
    els.reviewSection.style.display = '';

    let html = '';
    details.forEach((d, i) => {
      const q = qs[i];
      const isCorrect = d.isCorrect;
      const statusClass = isCorrect ? 'review-correct' : 'review-wrong';
      const statusIcon = isCorrect ? '&#10003;' : '&#10007;';
      const letters = ['A', 'B', 'C', 'D', 'E'];

      html += '<div class="review-item ' + statusClass + '">';
      html += '<div class="review-header">';
      html += '<span class="review-number">' + (i + 1) + '</span>';
      html += '<span class="review-status-icon">' + statusIcon + '</span>';
      html += '</div>';
      html += '<p class="review-question">' + q.question + '</p>';

      if (!isCorrect) {
        html += '<div class="review-answers">';
        html += '<div class="review-your-answer">';
        html += '<span class="review-label">' + (lang === 'pt' ? 'Sua resposta:' : 'Your answer:') + '</span> ';
        html += '<span class="review-wrong-text">' + letters[d.selected] + '. ' + q.options[d.selected] + '</span>';
        html += '</div>';
        html += '<div class="review-correct-answer">';
        html += '<span class="review-label">' + (lang === 'pt' ? 'Correta:' : 'Correct:') + '</span> ';
        html += '<span class="review-correct-text">' + letters[d.correct] + '. ' + q.options[d.correct] + '</span>';
        html += '</div>';
        html += '</div>';
      }

      html += '</div>';
    });

    els.reviewContent.innerHTML = html;
  }

  function showSharedResult(shared) {
    lang = shared.lang;
    setLanguage(lang);

    renderResult({
      score: shared.score,
      total: shared.total,
      level: shared.level,
      details: null,
      weakCategories: [],
      weakCategoryNames: [],
      recommendations: {}
    });

    // Hide sections not relevant for shared view
    $('weakAreas').style.display = 'none';
    $('recommendations').style.display = 'none';
    $('reviewSection').style.display = 'none';

    showScreen('result');
  }

  // ── Event Handlers ────────────────────────────────────────
  function startQuiz() {
    QuizEngine.init(lang);
    showScreen('quiz');
    renderQuestion();
  }

  function handleNext() {
    if (QuizEngine.isLastQuestion() && QuizEngine.allAnswered()) {
      const res = Results.calculate(lang);
      renderResult(res);
      showScreen('result');
    } else {
      QuizEngine.goNext();
      renderQuestion();
    }
  }

  function handlePrev() {
    QuizEngine.goBack();
    renderQuestion();
  }

  function handleRetake() {
    // Restore visibility
    $('weakAreas').style.display = '';
    $('recommendations').style.display = '';
    $('reviewSection').style.display = 'none';

    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    startQuiz();
  }

  function handleSaveImage() {
    if (result) Share.saveImage(result, lang);
  }

  function handleCopyLink() {
    if (result) {
      const ui = UI[lang];
      Share.copyLink(result, lang).then(() => {
        els.btnCopyLink.classList.add('copied');
        els.btnCopyLinkText.textContent = ui.result.copied;
        setTimeout(() => {
          els.btnCopyLink.classList.remove('copied');
          els.btnCopyLinkText.textContent = ui.result.copyLink;
        }, 2000);
      });
    }
  }

  // ── Init ──────────────────────────────────────────────────
  function boot() {
    // Check for shared result in URL
    const shared = Share.parseShareParams();
    if (shared) {
      showSharedResult(shared);
      return;
    }

    setLanguage(lang);

    els.langToggle.addEventListener('click', () => {
      toggleLanguage();
      if (screens.quiz.classList.contains('active')) {
        startQuiz();
      }
    });

    els.btnStart.addEventListener('click', startQuiz);
    els.btnNext.addEventListener('click', handleNext);
    els.btnPrev.addEventListener('click', handlePrev);
    els.btnRetake.addEventListener('click', handleRetake);
    els.btnSaveImg.addEventListener('click', handleSaveImage);
    els.btnCopyLink.addEventListener('click', handleCopyLink);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!screens.quiz.classList.contains('active')) return;

      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (!els.btnNext.disabled) handleNext();
      }
      if (e.key === 'ArrowLeft') {
        handlePrev();
      }

      const num = parseInt(e.key);
      if (num >= 1 && num <= 5) {
        handleAnswer(num - 1);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
