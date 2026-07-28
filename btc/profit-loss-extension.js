(function () {
  const current = {
    profit: "...",
    loss: "..."
  };
  const SUPPLY_PROFIT_URL = "./data/supply-profit.json";
  let profitLossMeta = null;
  let profitLossDataPromise = null;
  let realizedPriceDataPromise = null;
  let profitLossRange = "max";
  let realizedPriceRange = "max";

  function isEnglish() {
    const root = document.querySelector(".btc-dashboard");
    return root?.dataset.locale === "en";
  }

  function text(pt, en) {
    return isEnglish() ? en : pt;
  }

  function updateCardLanguage() {
    const title = document.querySelector("#bd-card-profit_loss_supply .bd-card-title");
    const nextTitle = text("% Supply em Lucro", "% Supply in Profit");
    if (title && title.textContent !== nextTitle) title.textContent = nextTitle;
  }

  function markCard() {
    const card = document.getElementById("bd-card-profit_loss_supply");
    if (!card) return;
    card.classList.add("bd-card-profit-loss");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", text("Abrir gráfico de supply em lucro e prejuízo", "Open supply in profit and loss chart"));
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

  function formatUsd(value) {
    if (!Number.isFinite(value)) return "N/A";
    return "$" + Math.round(value).toLocaleString("pt-BR");
  }

  function getRealizedPriceSignal(ratio) {
    if (!Number.isFinite(ratio)) return { label: "N/A", className: "neutral" };
    if (ratio < 1) return { label: text("COMPRA FORTE", "STRONG BUY"), className: "buy-strong" };
    if (ratio < 1.5) return { label: text("COMPRA", "BUY"), className: "buy" };
    if (ratio < 2.5) return { label: text("NEUTRO", "NEUTRAL"), className: "neutral" };
    if (ratio < 3.5) return { label: text("VENDA", "SELL"), className: "sell" };
    return { label: text("VENDA FORTE", "STRONG SELL"), className: "sell-strong" };
  }

  async function loadRealizedPriceData() {
    if (!realizedPriceDataPromise) {
      realizedPriceDataPromise = (async () => {
        let url = "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics";
        let params = {
          assets: "btc",
          metrics: "PriceUSD,CapMVRVCur",
          frequency: "1d",
          start_time: "2012-01-01",
          page_size: "10000"
        };
        const rows = [];
        while (url) {
          const suffix = params ? "?" + new URLSearchParams(params).toString() : "";
          const response = await fetch(url + suffix);
          if (!response.ok) throw new Error("Coin Metrics API error");
          const payload = await response.json();
          for (const row of payload.data || []) {
            const price = Number(row.PriceUSD);
            const ratio = Number(row.CapMVRVCur);
            if (!Number.isFinite(price) || !Number.isFinite(ratio) || ratio <= 0) continue;
            rows.push({
              d: row.time.slice(0, 10),
              t: new Date(row.time).getTime(),
              price,
              ratio,
              realizedPrice: price / ratio
            });
          }
          url = payload.next_page_url || null;
          params = null;
        }
        return rows;
      })();
    }
    return realizedPriceDataPromise;
  }

  function setLatestRealizedPriceValues(data) {
    const latest = data[data.length - 1];
    if (!latest) return;
    const value = document.getElementById("bd-card-value-realized_price");
    const signal = document.getElementById("bd-card-signal-realized_price");
    const current = document.getElementById("bd-realized-current");
    const market = document.getElementById("bd-realized-market-current");
    const ratio = document.getElementById("bd-realized-ratio-current");
    const nextSignal = getRealizedPriceSignal(latest.ratio);

    if (value) value.textContent = formatUsd(latest.realizedPrice);
    if (signal) {
      signal.textContent = nextSignal.label;
      signal.dataset.signal = nextSignal.className;
    }
    if (current) current.textContent = formatUsd(latest.realizedPrice);
    if (market) market.textContent = formatUsd(latest.price);
    if (ratio) ratio.textContent = latest.ratio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "x";
  }

  function buildRow(timestamp, profitPct, price) {
    const parsedProfitPct = Number(profitPct);
    // Atencao: Number(null) devolve 0. Sem este teste explicito, dias sem dado na fonte
    // viram "0% em lucro / 100% em prejuizo" e derrubam o grafico ate zero.
    if (profitPct === null || profitPct === undefined || profitPct === "" || !Number.isFinite(parsedProfitPct)) return null;
    if (parsedProfitPct < 0 || parsedProfitPct > 100) return null;
    const parsedPrice = Number(price);
    return {
      d: new Date(timestamp).toISOString().slice(0, 10),
      t: timestamp,
      price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined,
      profitPct: parsedProfitPct,
      lossPct: 100 - parsedProfitPct
    };
  }

  function dropIsolatedOutliers(rows) {
    return rows.filter((row, index) => {
      const prev = rows[index - 1];
      const next = rows[index + 1];
      if (!prev || !next) return true;
      const isolatedZero = row.profitPct <= 1 && prev.profitPct >= 20 && next.profitPct >= 20;
      const isolatedHundred = row.profitPct >= 99 && prev.profitPct <= 80 && next.profitPct <= 80;
      return !isolatedZero && !isolatedHundred;
    });
  }

  // Fonte primaria: JSON gerado todo dia por scripts/update_supply_profit.py (GitHub Actions)
  // a partir da API da BGeometrics em api.bitcoin-data.com. Servido pelo proprio dominio,
  // sem rate limit no navegador do visitante.
  async function loadLocalProfitLossData() {
    const response = await fetch(SUPPLY_PROFIT_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error("supply-profit.json indisponivel");
    const payload = await response.json();
    const rows = (payload.points || [])
      .map(([timestamp, profitPct, price]) => buildRow(timestamp, profitPct, price))
      .filter(Boolean);
    if (!rows.length) throw new Error("supply-profit.json sem pontos validos");
    profitLossMeta = {
      lastDate: payload.last_date || rows[rows.length - 1].d,
      updatedAt: payload.updated_at || null,
      legacyUntil: payload.legacy_until || null,
      origin: "local"
    };
    return dropIsolatedOutliers(rows);
  }

  // Reserva: serie estatica publica da BGeometrics. Ficou congelada em 2026-04-26,
  // por isso so entra se o arquivo local falhar.
  async function loadFallbackProfitLossData() {
    const [profitRows, priceRows] = await Promise.all([
      fetch("https://charts.bgeometrics.com/files/profit_loss.json").then((response) => response.json()),
      fetch("https://charts.bgeometrics.com/files/profit_loss_btc_price.json").then((response) => response.json())
    ]);
    const priceByTime = new Map(priceRows.map(([timestamp, price]) => [timestamp, Number(price)]));
    const rows = profitRows
      .map(([timestamp, profitPct]) => buildRow(timestamp, profitPct, priceByTime.get(timestamp)))
      .filter((row) => row && row.d >= "2016-01-01");
    if (!rows.length) throw new Error("serie de reserva sem pontos validos");
    profitLossMeta = {
      lastDate: rows[rows.length - 1].d,
      updatedAt: null,
      legacyUntil: null,
      origin: "fallback"
    };
    return dropIsolatedOutliers(rows);
  }

  async function loadProfitLossData() {
    if (!profitLossDataPromise) {
      profitLossDataPromise = loadLocalProfitLossData().catch(() => loadFallbackProfitLossData());
    }
    return profitLossDataPromise;
  }

  // Paleta identica a dos demais cards do painel (btc-dashboard).
  const SIGNAL_COLORS = {
    compra_forte: "#00C853",
    compra: "#69F0AE",
    neutro: "#FFD600",
    venda: "#FF6D00",
    venda_forte: "#FF1744"
  };

  function getProfitLossSignal(data) {
    const latest = data[data.length - 1];
    if (!latest) return { pt: "SEM DADOS", en: "NO DATA", color: "#8b949e" };

    // Cruzamento da linha de 50% nos ultimos 30 dias: o sinal que a metrica existe para dar.
    const window = data.slice(-31);
    const crossed = window.some((row, index) => {
      const prev = window[index - 1];
      if (!prev) return false;
      return (prev.profitPct - 50) * (row.profitPct - 50) < 0;
    });
    if (crossed) return { pt: "CRUZOU", en: "CROSSED", color: SIGNAL_COLORS.neutro };

    const pct = latest.profitPct;
    if (pct <= 50) return { pt: "COMPRA FORTE", en: "STRONG BUY", color: SIGNAL_COLORS.compra_forte };
    if (pct <= 70) return { pt: "COMPRA", en: "BUY", color: SIGNAL_COLORS.compra };
    if (pct <= 90) return { pt: "NEUTRO", en: "NEUTRAL", color: SIGNAL_COLORS.neutro };
    if (pct <= 95) return { pt: "VENDA", en: "SELL", color: SIGNAL_COLORS.venda };
    return { pt: "VENDA FORTE", en: "STRONG SELL", color: SIGNAL_COLORS.venda_forte };
  }

  function formatDay(day) {
    if (!day) return "";
    const parsed = new Date(day + "T00:00:00Z");
    if (Number.isNaN(parsed.getTime())) return day;
    return parsed.toLocaleDateString(isEnglish() ? "en-US" : "pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    });
  }

  function setLatestProfitLossValues(data) {
    const latest = data[data.length - 1];
    if (!latest) return;
    const value = document.getElementById("bd-card-value-profit_loss_supply");
    if (value) value.textContent = formatPct(latest.profitPct);

    const signalEl = document.getElementById("bd-card-signal-profit_loss_supply");
    if (signalEl) {
      const signal = getProfitLossSignal(data);
      // O lang-toggle.js troca textos pelos atributos data-pt/data-en. Atualizar os dois
      // impede que o rotulo volte a um valor fixo ao alternar o idioma.
      signalEl.dataset.pt = signal.pt;
      signalEl.dataset.en = signal.en;
      signalEl.textContent = text(signal.pt, signal.en);
      signalEl.style.backgroundColor = signal.color + "33";
      signalEl.style.color = signal.color;
    }

    const profitValue = document.getElementById("bd-profit-current");
    const lossValue = document.getElementById("bd-loss-current");
    const bar = document.querySelector(".bd-profit-loss-bar");
    if (profitValue) profitValue.textContent = formatPct(latest.profitPct);
    if (lossValue) lossValue.textContent = formatPct(latest.lossPct);
    if (bar) bar.style.gridTemplateColumns = `minmax(0, ${latest.profitPct}fr) minmax(0, ${latest.lossPct}fr)`;

    const updated = document.getElementById("bd-profit-loss-updated");
    if (updated) {
      const stale = profitLossMeta?.origin === "fallback";
      updated.textContent = text(
        "Último dado disponível: " + formatDay(latest.d),
        "Latest available data: " + formatDay(latest.d)
      ) + (stale ? text(" (série de reserva)", " (fallback series)") : "");
    }
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
        <svg class="bd-profit-loss-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${text("Gráfico interativo de supply em lucro e prejuízo", "Interactive supply in profit and loss chart")}">
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
        <span class="bd-profit">${text("Lucro", "Profit")}: ${formatPct(closest.profitPct)}</span>
        <span class="bd-loss">${text("Prejuízo", "Loss")}: ${formatPct(closest.lossPct)}</span>
        ${Number.isFinite(closest.price) ? `<span>${text("Preço BTC", "BTC price")}: ${formatUsd(closest.price)}</span>` : ""}
      `;
    });

    shell.addEventListener("mouseleave", () => {
      hover.style.display = "none";
      tooltip.hidden = true;
    });
  }

  function renderRealizedPriceChart(data) {
    const host = document.getElementById("bd-realized-price-chart");
    if (!host || !data.length) return;

    const visible = filterRange(data, realizedPriceRange);
    const width = 960;
    const height = 420;
    const pad = { top: 28, right: 60, bottom: 42, left: 70 };
    const xMin = visible[0].t;
    const xMax = visible[visible.length - 1].t;
    const allValues = visible.flatMap((row) => [row.price, row.realizedPrice]).filter((value) => value > 0);
    const yMin = Math.min(...allValues) * 0.82;
    const yMax = Math.max(...allValues) * 1.18;
    const logMin = Math.log10(yMin);
    const logMax = Math.log10(yMax);
    const x = (row) => pad.left + ((row.t - xMin) / (xMax - xMin || 1)) * (width - pad.left - pad.right);
    const y = (value) => pad.top + ((logMax - Math.log10(value)) / (logMax - logMin || 1)) * (height - pad.top - pad.bottom);
    const pricePath = buildPath(visible, x, y, "price");
    const realizedPath = buildPath(visible, x, y, "realizedPrice");
    const latest = visible[visible.length - 1];
    const ticks = [1000, 3000, 10000, 30000, 100000, 300000].filter((tick) => tick >= yMin && tick <= yMax);
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
        <svg class="bd-profit-loss-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${text("Gráfico de preço do Bitcoin contra realized price", "Bitcoin price versus realized price chart")}">
          ${ticks.map((tick) => `<line x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}" class="bd-pl-grid"></line><text x="${width - pad.right + 10}" y="${y(tick) + 4}" class="bd-pl-axis">$${(tick / 1000).toLocaleString("pt-BR")}k</text>`).join("")}
          ${yearTicks.map((row) => `<line x1="${x(row)}" y1="${pad.top}" x2="${x(row)}" y2="${height - pad.bottom}" class="bd-pl-grid-x"></line><text x="${x(row)}" y="${height - 14}" text-anchor="middle" class="bd-pl-axis">${row.d.slice(0, 4)}</text>`).join("")}
          <path d="${pricePath}" class="bd-pl-line bd-realized-market-line"></path>
          <path d="${realizedPath}" class="bd-pl-line bd-realized-line"></path>
          <circle cx="${x(latest)}" cy="${y(latest.realizedPrice)}" r="4.5" class="bd-realized-dot"></circle>
        </svg>
      </div>
    `;
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

  function setRealizedPriceRangeButtons() {
    document.querySelectorAll("[data-realized-price-range]").forEach((button) => {
      button.classList.toggle("active", button.dataset.realizedPriceRange === realizedPriceRange);
      button.addEventListener("click", async () => {
        realizedPriceRange = button.dataset.realizedPriceRange;
        const data = await loadRealizedPriceData();
        setRealizedPriceRangeButtons();
        renderRealizedPriceChart(data);
      }, { once: true });
    });
  }

  function openRealizedPriceDetail() {
    const detail = document.getElementById("bd-detail");
    const content = document.getElementById("bd-detail-content");
    if (!detail || !content) return;

    document.querySelectorAll(".bd-card.active").forEach((card) => card.classList.remove("active"));
    document.getElementById("bd-card-realized_price")?.classList.add("active");

    content.innerHTML = `
      <button class="bd-close-btn" id="bd-close-detail">x</button>
      <h3>${text("Realized Price do Bitcoin", "Bitcoin Realized Price")}</h3>
      <p class="bd-profit-loss-note">${text(
        "Realized Price e o preco medio de aquisicao on-chain do mercado. Ele e calculado aqui como Preco BTC dividido pelo MVRV Ratio da Coin Metrics. Quando o preco de mercado se aproxima dessa linha, o Bitcoin costuma estar em uma zona historicamente importante de acumulacao e capitulacao.",
        "Realized Price is the market's on-chain average acquisition price. It is calculated here as BTC Price divided by Coin Metrics MVRV Ratio. When market price approaches this line, Bitcoin is usually in a historically important accumulation and capitulation zone."
      )}</p>
      <div class="bd-profit-loss-current">
        <div class="bd-profit-loss-box">
          <div class="bd-profit-loss-label">${text("Realized Price", "Realized Price")}</div>
          <div class="bd-profit-loss-value bd-realized" id="bd-realized-current">...</div>
        </div>
        <div class="bd-profit-loss-box">
          <div class="bd-profit-loss-label">${text("Preço de mercado", "Market price")}</div>
          <div class="bd-profit-loss-value" id="bd-realized-market-current">...</div>
        </div>
      </div>
      <p class="bd-profit-loss-note">${text("MVRV atual", "Current MVRV")}: <strong id="bd-realized-ratio-current">...</strong></p>
      <div class="bd-profit-loss-toolbar">
        <button data-realized-price-range="1">1A</button>
        <button data-realized-price-range="2">2A</button>
        <button data-realized-price-range="4">4A</button>
        <button data-realized-price-range="max">MAX</button>
      </div>
      <div id="bd-realized-price-chart" class="bd-profit-loss-chart">
        <div class="bd-profit-loss-loading">${text("Carregando dados reais...", "Loading real data...")}</div>
      </div>
      <p class="bd-profit-loss-source">${text("Fonte", "Source")}: <a href="https://community-api.coinmetrics.io/v4/timeseries/asset-metrics" target="_blank" rel="noopener">Coin Metrics Community API</a>. ${text("Cálculo", "Calculation")}: PriceUSD / CapMVRVCur.</p>
    `;

    detail.classList.add("open");
    setRealizedPriceRangeButtons();
    loadRealizedPriceData()
      .then((data) => {
        setLatestRealizedPriceValues(data);
        renderRealizedPriceChart(data);
      })
      .catch(() => {
        const host = document.getElementById("bd-realized-price-chart");
        if (host) host.innerHTML = `<div class="bd-profit-loss-error">${text("Não foi possível carregar a API agora.", "Could not load the API right now.")}</div>`;
      });
    document.getElementById("bd-close-detail")?.addEventListener("click", () => {
      detail.classList.remove("open");
      document.getElementById("bd-card-realized_price")?.classList.remove("active");
    });
  }

  function openProfitLossDetail() {
    const detail = document.getElementById("bd-detail");
    const content = document.getElementById("bd-detail-content");
    if (!detail || !content) return;

    setActiveCard();

    content.innerHTML = `
      <button class="bd-close-btn" id="bd-close-detail">x</button>
      <h3>${text("Bitcoin % do Supply em Lucro/Prejuízo", "Bitcoin % of Supply in Profit/Loss")}</h3>
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
          <div class="bd-profit-loss-label">${text("Supply em prejuízo", "Supply in loss")}</div>
          <div class="bd-profit-loss-value bd-loss" id="bd-loss-current">${current.loss}</div>
        </div>
      </div>
      <div class="bd-profit-loss-bar" aria-hidden="true"><span></span><span></span></div>
      <p class="bd-profit-loss-updated" id="bd-profit-loss-updated"></p>
      <p class="bd-profit-loss-note">${text(
        "O grafico abaixo e plotado com valores diarios reais de percentual do supply em lucro/prejuizo, calculados como supply em lucro dividido pelo supply circulante. A serie e atualizada automaticamente todo dia. De 2016 ate 27/07/2022 os valores vem da serie historica da BGeometrics; de 28/07/2022 em diante vem da API da mesma casa, que segue publicando o dado. Na emenda a diferenca entre as duas metodologias e de 1,24 ponto percentual. Pontos isolados claramente invalidos sao removidos, sem interpolacao.",
        "The chart below is plotted with real daily percentage values for supply in profit/loss, computed as supply in profit divided by circulating supply. The series updates automatically every day. From 2016 to 2022-07-27 values come from BGeometrics' historical series; from 2022-07-28 onward they come from the same provider's API, which is still publishing. At the splice the gap between both methodologies is 1.24 percentage points. Clearly invalid isolated points are removed without interpolation."
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
      <p class="bd-profit-loss-source">${text("Fonte", "Source")}: <a href="https://api.bitcoin-data.com/v1/supply-profit" target="_blank" rel="noopener">BGeometrics / bitcoin-data.com</a> (supply-profit e supply-current). ${text("Preço", "Price")}: <a href="https://coinmetrics.io/community-network-data/" target="_blank" rel="noopener">Coin Metrics Community</a>. ${text("Definição metodológica", "Methodology")}: <a href="https://docs.glassnode.com/guides-and-tutorials/metric-guides/profit-loss-supply/percent-supply-in-profit" target="_blank" rel="noopener">Glassnode</a>.</p>
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
        if (host) host.innerHTML = `<div class="bd-profit-loss-error">${text("Não foi possível carregar a API agora.", "Could not load the API right now.")}</div>`;
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

  function addRealizedPriceHandlers() {
    const card = document.getElementById("bd-card-realized_price");
    if (!card || card.dataset.realizedPriceBound === "true") return;
    card.dataset.realizedPriceBound = "true";
    card.classList.add("bd-card-realized-price");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", text("Abrir gráfico de realized price", "Open realized price chart"));
    card.addEventListener("click", openRealizedPriceDetail);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openRealizedPriceDetail();
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
      <h4>${text("Leitura secundária: RSI Mensal BTC/XAU", "Secondary reading: RSI Monthly BTC/XAU")}</h4>
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
    addRealizedPriceHandlers();
    loadRealizedPriceData()
      .then(setLatestRealizedPriceValues)
      .catch(() => {
        const signal = document.getElementById("bd-card-signal-realized_price");
        if (signal) signal.textContent = text("SEM DADOS", "NO DATA");
      });
    // O card do supply em lucro precisa refletir o dado do dia sem depender de o
    // visitante abrir o detalhe. Antes o valor e o sinal ficavam fixos no HTML.
    loadProfitLossData()
      .then(setLatestProfitLossValues)
      .catch(() => {
        const value = document.getElementById("bd-card-value-profit_loss_supply");
        const signal = document.getElementById("bd-card-signal-profit_loss_supply");
        if (value) value.textContent = "N/A";
        if (signal) {
          signal.dataset.pt = "SEM DADOS";
          signal.dataset.en = "NO DATA";
          signal.textContent = text("SEM DADOS", "NO DATA");
        }
      });
    document.getElementById("langToggle")?.addEventListener("click", () => {
      window.setTimeout(() => {
        updateCardLanguage();
        loadRealizedPriceData().then(setLatestRealizedPriceValues).catch(() => {});
        loadProfitLossData().then(setLatestProfitLossValues).catch(() => {});
      }, 80);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
