// ============================================================
// Results — Cálculo de nível, temas fracos, recomendações
// ============================================================

const Results = (function () {

  function calculate(lang) {
    const data = QuizEngine.calculateResults();
    const recommendations = getRecommendations(lang, data.weakCategories);

    return {
      score: data.score,
      total: data.total,
      level: data.level,
      details: data.details,
      weakCategories: data.weakCategories,
      weakCategoryNames: data.weakCategories.map(c => CATEGORIES[lang][c]),
      recommendations
    };
  }

  function getRecommendations(lang, weakCategories) {
    const recs = RECOMMENDATIONS[lang];
    const result = {};

    const cats = weakCategories.length > 0 ? weakCategories : ['onchain_technical'];

    cats.forEach(cat => {
      if (recs[cat]) {
        result[cat] = recs[cat];
      }
    });

    return result;
  }

  return { calculate };
})();
