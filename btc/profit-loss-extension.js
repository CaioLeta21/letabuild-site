(function () {
  const current = {
    profit: "50,43%",
    loss: "49,56%",
    date: "8 jun 2026"
  };

  function isEnglish() {
    const root = document.querySelector(".btc-dashboard");
    return root?.dataset.locale === "en";
  }

  function text(pt, en) {
    return isEnglish() ? en : pt;
  }

  function updateCardLanguage() {
    const title = document.querySelector("#bd-card-profit_loss_supply .bd-card-title");
    const signal = document.querySelector("#bd-card-signal-profit_loss_supply");
    const nextTitle = text("% Supply em Lucro", "% Supply in Profit");
    const nextSignal = text("CRUZOU", "CROSSED");
    if (title && title.textContent !== nextTitle) title.textContent = nextTitle;
    if (signal && signal.textContent !== nextSignal) signal.textContent = nextSignal;
  }

  function markCard() {
    const card = document.getElementById("bd-card-profit_loss_supply");
    if (!card) return;
    card.classList.add("bd-card-profit-loss");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", text("Abrir grafico de supply em lucro e prejuizo", "Open supply in profit and loss chart"));
  }

  function setActiveCard() {
    document.querySelectorAll(".bd-card.active").forEach((card) => card.classList.remove("active"));
    document.getElementById("bd-card-profit_loss_supply")?.classList.add("active");
  }

  function openProfitLossDetail() {
    const detail = document.getElementById("bd-detail");
    const content = document.getElementById("bd-detail-content");
    if (!detail || !content) return;

    setActiveCard();

    content.innerHTML = `
      <button class="bd-close-btn" id="bd-close-detail">x</button>
      <h3>${text("Bitcoin % do Supply em Lucro/Prejuizo", "Bitcoin % of Supply in Profit/Loss")}</h3>
      <p class="bd-profit-loss-note">${text(
        "A metrica mostra a porcentagem do supply circulante que esta acima ou abaixo do seu custo de aquisicao on-chain. A leitura mais importante aqui e o cruzamento entre lucro e prejuizo, porque ele costuma aparecer depois da capitulacao e ajuda a confirmar mudanca de regime.",
        "This metric shows the percentage of circulating supply above or below its on-chain cost basis. The key reading is the cross between profit and loss, because it usually appears after capitulation and helps confirm a regime change."
      )}</p>
      <div class="bd-profit-loss-current">
        <div class="bd-profit-loss-box">
          <div class="bd-profit-loss-label">${text("Supply em lucro", "Supply in profit")}</div>
          <div class="bd-profit-loss-value bd-profit">${current.profit}</div>
        </div>
        <div class="bd-profit-loss-box">
          <div class="bd-profit-loss-label">${text("Supply em prejuizo", "Supply in loss")}</div>
          <div class="bd-profit-loss-value bd-loss">${current.loss}</div>
        </div>
      </div>
      <div class="bd-profit-loss-bar" aria-hidden="true"><span></span><span></span></div>
      <p class="bd-profit-loss-note">${text(
        `Valor de referencia da captura mais recente: ${current.date}. O grafico abaixo usa a captura real da serie historica, sem depender de embed externo.`,
        `Reference value from the latest screenshot: ${current.date}. The chart below uses the real historical-series screenshot, without depending on an external embed.`
      )}</p>
      <img class="bd-profit-loss-chart" src="./profit-loss-chart.png" alt="${text("Grafico Bitcoin Percentage Of Supply In Profit And Loss", "Bitcoin Percentage Of Supply In Profit And Loss chart")}">
      <p class="bd-profit-loss-source">${text("Fonte", "Source")}: <a href="https://chartinspect.com/charts/profit-loss" target="_blank" rel="noopener">ChartInspect</a>. ${text("Definicao metodologica", "Methodology")}: <a href="https://docs.glassnode.com/guides-and-tutorials/metric-guides/profit-loss-supply/percent-supply-in-profit" target="_blank" rel="noopener">Glassnode</a>.</p>
    `;

    detail.classList.add("open");
    document.getElementById("bd-close-detail")?.addEventListener("click", () => {
      detail.classList.remove("open");
      document.getElementById("bd-card-profit_loss_supply")?.classList.remove("active");
    });
  }

  function addProfitLossHandlers() {
    const card = document.getElementById("bd-card-profit_loss_supply");
    if (!card || card.dataset.profitLossBound === "true") return;
    card.dataset.profitLossBound = "true";
    card.addEventListener("click", openProfitLossDetail);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openProfitLossDetail();
      }
    });
  }

  function injectRsiSecondaryDetail() {
    const detail = document.getElementById("bd-detail");
    const content = document.getElementById("bd-detail-content");
    if (!detail?.classList.contains("open") || !content) return;
    if (!content.textContent.includes("RSI") || content.querySelector(".bd-rsi-secondary")) return;

    const secondary = document.createElement("div");
    secondary.className = "bd-rsi-secondary";
    secondary.innerHTML = `
      <h4>${text("Leitura secundaria: RSI Mensal BTC/XAU", "Secondary reading: RSI Monthly BTC/XAU")}</h4>
      <p class="bd-rsi-secondary-note">${text(
        "O BTC/XAU continua no calculo e na lista de indicadores, mas saiu da grade principal para preservar 4 colunas por 2 linhas. Ele mede a forca do Bitcoin contra o ouro e ajuda a separar valorizacao real de simples fraqueza do dolar.",
        "BTC/XAU remains in the calculation and indicator list, but it left the main grid to preserve 4 columns by 2 rows. It measures Bitcoin strength against gold and helps separate real appreciation from dollar weakness."
      )}</p>
    `;
    content.appendChild(secondary);
  }

  function boot() {
    markCard();
    updateCardLanguage();
    addProfitLossHandlers();
    document.getElementById("bd-card-rsi_monthly")?.addEventListener("click", () => {
      window.setTimeout(injectRsiSecondaryDetail, 80);
    });
    document.getElementById("langToggle")?.addEventListener("click", () => {
      window.setTimeout(() => {
        updateCardLanguage();
        injectRsiSecondaryDetail();
      }, 80);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
