// ============================================================
// Share — Geração de imagem (Canvas) + link compartilhável
// ============================================================

const Share = (function () {

  function generateImage(result, lang) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 1200x630 — OG image standard
    canvas.width = 1200;
    canvas.height = 630;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, 1200, 630);

    // Top accent bar
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(0, 0, 1200, 6);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 630);
      ctx.stroke();
    }
    for (let y = 0; y < 630; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // Card background
    const cardX = 60, cardY = 50, cardW = 1080, cardH = 530;
    ctx.fillStyle = '#161b22';
    roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();

    // Card border
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2;
    roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.stroke();

    // Card top accent
    ctx.fillStyle = '#f7931a';
    ctx.beginPath();
    ctx.moveTo(cardX + 20, cardY);
    ctx.lineTo(cardX + cardW - 20, cardY);
    ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + 20, 20);
    ctx.lineTo(cardX + cardW, cardY + 6);
    ctx.lineTo(cardX, cardY + 6);
    ctx.lineTo(cardX, cardY + 20);
    ctx.arcTo(cardX, cardY, cardX + 20, cardY, 20);
    ctx.closePath();
    ctx.fill();

    // Level icon
    ctx.font = '72px serif';
    ctx.textAlign = 'center';
    ctx.fillText(result.level.icon, 600, 140);

    // Level name
    ctx.font = 'bold 52px Inter, sans-serif';
    ctx.fillStyle = '#f7931a';
    ctx.textAlign = 'center';
    ctx.fillText(result.level.name, 600, 210);

    // Score
    ctx.font = 'bold 80px Inter, sans-serif';
    ctx.fillStyle = '#e6edf3';
    ctx.fillText(result.score + '/' + result.total, 600, 310);

    // Score label
    const scoreLabel = lang === 'pt' ? 'acertos' : 'correct';
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillStyle = '#8b949e';
    ctx.fillText(scoreLabel, 600, 350);

    // Description
    ctx.font = '400 22px Inter, sans-serif';
    ctx.fillStyle = '#8b949e';
    wrapText(ctx, result.level.description, 600, 410, 800, 30);

    // Quiz title
    const title = lang === 'pt' ? 'Você Entende Bitcoin?' : 'Do You Understand Bitcoin?';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillStyle = '#484f58';
    ctx.fillText(title, 600, 530);

    // Branding
    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillStyle = '#484f58';
    ctx.fillText('letabuild.com/quiz', 600, 560);

    return canvas;
  }

  function saveImage(result, lang) {
    const canvas = generateImage(result, lang);
    const link = document.createElement('a');
    const levelName = result.level.key;
    link.download = 'bitcoin-quiz-' + levelName + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function getShareLink(result, lang) {
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      s: result.score,
      l: result.level.key,
      lang: lang
    });
    return base + '?' + params.toString();
  }

  function copyLink(result, lang) {
    const url = getShareLink(result, lang);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(url);
    }
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }

  function parseShareParams() {
    const params = new URLSearchParams(window.location.search);
    const score = parseInt(params.get('s'));
    const levelKey = params.get('l');
    const lang = params.get('lang') || 'pt';

    if (isNaN(score) || !levelKey) return null;

    const levels = LEVELS[lang] || LEVELS['pt'];
    const level = levels.find(l => l.key === levelKey);
    if (!level) return null;

    return { score, total: 20, level, lang, isShared: true };
  }

  // Helper: rounded rectangle
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Helper: wrap text centered
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  }

  return {
    saveImage,
    copyLink,
    getShareLink,
    parseShareParams
  };
})();
