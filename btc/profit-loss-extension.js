(function () {
  const current = {
    profit: "50,43%",
    loss: "49,56%",
    date: "8 jun 2026"
  };
  let profitLossDataPromise = null;
  let profitLossRange = "max";

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

  function formatPct(value) {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  }

  function formatBtc(value) {
    return Math.round(value).toLocaleString("pt-BR") + " BTC";
  }

  async function loadProfitLossData() {
    if (!profitLossDataPromise) {
      profitLossDataPromise = Promise.all([
        fetch("https://api.bitcoin-data.com/v1/supply-profit").then((response) => response.json()),
        fetch("https://api.bitcoin-data.com/v1/supply-loss").then((response) => response.json())
      ]).then(([profitRows, lossRows]) => {
        const lossByDate = new Map(lossRows.map((row) => [row.d, row.supplyLossBtc]));
        return profitRows
          .map((row) => {
            const profitBtc = Number(row.supplyProfitBtc);
            const lossBtc = Number(lossByDate.get(row.d));
            const total = profitBtc + lossBtc;
            if (!Number.isFinite(total) || total <= 0) return null;
            return {
              d: row.d,
              t: row.unixTs * 1000,
              profitBtc,
              lossBtc,
              profitPct: (profitBtc / total) * 100,
              lossPct: (lossBtc / total) * 100
            };
          })
          .filter(Boolean);
      });
    }
    return profitLossDataPromise;
  }

  function setLatestProfitLossValues(data) {
    const latest = data[data.length - 1];
    if (!latest) return;
    const value = document.getElementById("bd-card-value-profit_loss_supply");
    if (value) value.textContent = formatPct(latest.profitPct);
    const profitValue = document.getElementById("bd-profit-current");
    const lossValue = document.getElementById("bd-loss-current");
    if (profitValue) profitValue.textContent = formatPct(latest.profitPct);
    if (lossValue) lossValue.textContent = formatPct(latest.lossPct);
  }

  function filterRange(data, range) {
    if (range === "max") return data;
    const years = Number(range);
    const latest = data[data.length - 1];
    if (!latest) return data;
    const cutoff = new Date(latest.t);
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
    return data.filter((row) => row.t >= cutoff.getTime());
  }

  function buildPath(data, getX, getY, key) {
    return data.map((row, index) => `${index === 0 ? "M" : "L"}${getX(row).toFixed(2)},${getY(row[key]).toFixed(2)}`).join(" ");
  }

  function renderProfitLossChart(data) {
    const host = document.getElementById("bd-profit-loss-chart");
    if (!host || !data.length) return;

    const visible = filterRange(data, profitLossRange);
    const width = 960;
    const height = 420;
    const pad = { top: 28, right: 54, bottom: 42, left: 54 };
    const xMin = visible[0].t;
    const xMax = visible[visible.length - 1].t;
    const yMin = 0;
    const yMax = 100;
    const x = (row) => pad.left + ((row.t - xMin) / (xMax - xMin || 1)) * (width - pad.left - pad.right);
    const y = (value) => pad.top + ((yMax - value) / (yMax - yMin)) * (height - pad.top - pad.bottom);
    const profitPath = buildPath(visible, x, y, "profitPct");
    const lossPath = buildPath(visible, x, y, "lossPct");
    const ticks = [0, 20, 40, 50, 60, 80, 100];
    const yearTicks = [];
    let lastYear = "";
    for (const row of visible) {
      const year = row.d.slice(0, 4);
      if (year !== lastYear) {
        yearTicks.push(row);
        lastYear = year;
      }
    }

    host.innerHTML = `
      <div class="bd-profit-loss-chart-shell">
        <svg class="bd-profit-loss-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${text("Grafico interativo de supply em lucro e prejuizo", "Interactive supply in profit and loss chart")}">
          ${ticks.map((tick) => `<line x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}" class="bd-pl-grid ${tick === 50 ? "bd-pl-midline" : ""}"></line><text x="${width - pad.right + 10}" y="${y(tick) + 4}" class="bd-pl-axis">${tick}%</text>`).join("")}
          ${yearTicks.map((row) => `<line x1="${x(row)}" y1="${pad.top}" x2="${x(row)}" y2="${height - pad.bottom}" class="bd-pl-grid-x"></line><text x="${x(row)}" y="${height - 14}" text-anchor="middle" class="bd-pl-axis">${row.d.slice(0, 4)}</text>`).join("")}
          <path d="${profitPath}" class="bd-pl-line bd-pl-profit"></path>
          <path d="${lossPath}" class="bd-pl-line bd-pl-loss"></path>
          <g id="bd-pl-hover" style="display:none">
            <line id="bd-pl-hover-line" y1="${pad.top}" y2="${height - pad.bottom}" class="bd-pl-hover-line"></line>
            <circle id="bd-pl-hover-profit" r="4.5" class="bd-pl-profit-dot"></circle>
            <circle id="bd-pl-hover-loss" r="4.5" class="bd-pl-loss-dot"></circle>
          </g>
        </svg>
        <div id="bd-pl-tooltip" class="bd-pl-tooltip" hidden></div>
      </div>
    `;

    const shell = host.querySelector(".bd-profit-loss-chart-shell");
    const hover = host.querySelector("#bd-pl-hover");
    const hoverLine = host.querySelector("#bd-pl-hover-line");
    const hoverProfit = host.querySelector("#bd-pl-hover-profit");
    const hoverLoss = host.querySelector("#bd-pl-hover-loss");
    const tooltip = host.querySelector("#bd-pl-tooltip");

    shell.addEventListener("mousemove", (event) => {
      const rect = shell.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const targetT = xMin + ratio * (xMax - xMin);
      let closest = visible[0];
      let closestDistance = Math.abs(closest.t - targetT);
      for (const row of visible) {
        const distance = Math.abs(row.t - targetT);
        if (distance < closestDistance) {
          closest = row;
          closestDistance = distance;
        }
      }
      const px = x(closest);
      hover.style.display = "block";
      hoverLine.setAttribute("x1", px);
      hoverLine.setAttribute("x2", px);
      hoverProfit.setAttribute("cx", px);
      hoverProfit.setAttribute("cy", y(closest.profitPct));
      hoverLoss.setAttribute("cx", px);
      hoverLoss.setAttribute("cy", y(closest.lossPct));
      tooltip.hidden = false;
      tooltip.style.left = `${Math.min(rect.width - 220, Math.max(10, event.clientX - rect.left + 12))}px`;
      tooltip.style.top = `${Math.max(10, event.clientY - rect.top - 80)}px`;
      tooltip.innerHTML = `
        <strong>${closest.d}</strong>
        <span class="bd-profit">${text("Lucro", "Profit")}: ${formatPct(closest.profitPct)} <small>${formatBtc(closest.profitBtc)}</small></span>
        <span class="bd-loss">${text("Prejuizo", "Loss")}: ${formatPct(closest.lossPct)} <small>${formatBtc(closest.lossBtc)}</small></span>
      `;
    });

    shell.addEventListener("mouseleave", () => {
      hover.style.display = "none";
      tooltip.hidden = true;
    });
  }

  function setRangeButtons() {
    document.querySelectorAll("[data-profit-loss-range]").forEach((button) => {
      button.classList.toggle("active", button.dataset.profitLossRange === profitLossRange);
      button.addEventListener("click", async () => {
        profitLossRange = button.dataset.profitLossRange;
        const data = await loadProfitLossData();
        setRangeButtons();
        renderProfitLossChart(data);
      }, { once: true });
    });
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
          <div class="bd-profit-loss-value bd-profit" id="bd-profit-current">${current.profit}</div>
        </div>
        <div class="bd-profit-loss-box">
          <div class="bd-profit-loss-label">${text("Supply em prejuizo", "Supply in loss")}</div>
          <div class="bd-profit-loss-value bd-loss" id="bd-loss-current">${current.loss}</div>
        </div>
      </div>
      <div class="bd-profit-loss-bar" aria-hidden="true"><span></span><span></span></div>
      <p class="bd-profit-loss-note">${text(
        "O grafico abaixo e plotado com valores diarios reais de supply em lucro e supply em prejuizo, carregados da API Bitcoin Data/BGeometrics.",
        "The chart below is plotted with real daily values for supply in profit and supply in loss, loaded from the Bitcoin Data/BGeometrics API."
      )}</p>
      <div class="bd-profit-loss-toolbar">
        <button data-profit-loss-range="1">1A</button>
        <button data-profit-loss-range="2">2A</button>
        <button data-profit-loss-range="4">4A</button>
        <button data-profit-loss-range="max">MAX</button>
      </div>
      <div id="bd-profit-loss-chart" class="bd-profit-loss-chart">
        <div class="bd-profit-loss-loading">${text("Carregando dados reais...", "Loading real data...")}</div>
      </div>
      <p class="bd-profit-loss-source">${text("Fonte", "Source")}: <a href="https://api.bitcoin-data.com/scalar.html" target="_blank" rel="noopener">Bitcoin Data API/BGeometrics</a>. ${text("Definicao metodologica", "Methodology")}: <a href="https://docs.glassnode.com/guides-and-tutorials/metric-guides/profit-loss-supply/percent-supply-in-profit" target="_blank" rel="noopener">Glassnode</a>.</p>
    `;

    detail.classList.add("open");
    setRangeButtons();
    loadProfitLossData()
      .then((data) => {
        setLatestProfitLossValues(data);
        renderProfitLossChart(data);
      })
      .catch(() => {
        const host = document.getElementById("bd-profit-loss-chart");
        if (host) host.innerHTML = `<div class="bd-profit-loss-error">${text("Nao foi possivel carregar a API agora.", "Could not load the API right now.")}</div>`;
      });
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
