(() => {
    // DOM refs
    const satsInput = document.getElementById('satsInput');
    const brlInput = document.getElementById('brlInput');
    const usdInput = document.getElementById('usdInput');
    const btcBrlEl = document.getElementById('btcBrl');
    const btcUsdEl = document.getElementById('btcUsd');
    const btcBrlChangeEl = document.getElementById('btcBrlChange');
    const btcUsdChangeEl = document.getElementById('btcUsdChange');
    const marketCapEl = document.getElementById('marketCap');
    const marketInfoEl = document.getElementById('marketInfo');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const lastUpdateEl = document.getElementById('lastUpdate');
    const purchasingList = document.getElementById('purchasingList');
    const newItemName = document.getElementById('newItemName');
    const newItemPrice = document.getElementById('newItemPrice');
    const addItemBtn = document.getElementById('addItemBtn');

    let priceData = null;
    let activeField = null;
    let refreshTimer = null;

    // ===== Init =====
    function init() {
        Purchasing.load();
        bindEvents();
        fetchAndUpdate();
        refreshTimer = setInterval(fetchAndUpdate, 30000);
        renderPurchasingList();
    }

    // ===== Fetch price data =====
    async function fetchAndUpdate() {
        try {
            marketInfoEl.classList.add('loading');
            const data = await API.fetchPrice();
            const prevData = priceData;
            priceData = data;
            updateMarketDisplay(data, prevData);
            updateConverterFromActive();
            renderPurchasingList();
            setStatus('online', 'Ao vivo');
            marketInfoEl.classList.remove('loading');
        } catch (err) {
            marketInfoEl.classList.remove('loading');
            if (err.message === 'RATE_LIMIT') {
                setStatus('error', 'Rate limit');
            } else {
                setStatus('error', 'Sem conexão');
            }
        }
    }

    // ===== Status indicator =====
    function setStatus(state, text) {
        statusDot.className = 'status-dot ' + state;
        statusText.textContent = text;
    }

    // ===== Market display =====
    function updateMarketDisplay(data, prevData) {
        btcBrlEl.textContent = 'R$ ' + Converter.formatBrl(data.brl);
        btcUsdEl.textContent = '$ ' + Converter.formatUsd(data.usd);
        marketCapEl.textContent = '$ ' + Converter.formatCompact(data.marketCapUsd);

        applyChange(btcBrlChangeEl, data.brlChange24h);
        applyChange(btcUsdChangeEl, data.usdChange24h);

        // Flash market cards on price change
        if (prevData) {
            if (data.brl !== prevData.brl) {
                flashElement(btcBrlEl, data.brl > prevData.brl ? 'up' : 'down');
            }
            if (data.usd !== prevData.usd) {
                flashElement(btcUsdEl, data.usd > prevData.usd ? 'up' : 'down');
            }
        }

        const date = new Date(data.timestamp);
        lastUpdateEl.textContent = date.toLocaleTimeString('pt-BR');
    }

    function applyChange(el, pct) {
        const sign = pct >= 0 ? '+' : '';
        el.textContent = sign + pct.toFixed(2) + '%';
        el.className = 'market-change ' + (pct >= 0 ? 'up' : 'down');
    }

    function flashElement(el, direction) {
        el.style.transition = 'color 0.15s';
        el.style.color = direction === 'up'
            ? 'var(--green)'
            : 'var(--red)';
        setTimeout(() => {
            el.style.color = '';
        }, 600);
    }

    // ===== Converter logic =====
    function bindEvents() {
        satsInput.addEventListener('input', () => {
            activeField = 'sats';
            convertFrom('sats');
        });
        brlInput.addEventListener('input', () => {
            activeField = 'brl';
            convertFrom('brl');
        });
        usdInput.addEventListener('input', () => {
            activeField = 'usd';
            convertFrom('usd');
        });

        satsInput.addEventListener('focus', () => activeField = 'sats');
        brlInput.addEventListener('focus', () => activeField = 'brl');
        usdInput.addEventListener('focus', () => activeField = 'usd');

        // Add item
        addItemBtn.addEventListener('click', handleAddItem);
        newItemName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAddItem();
        });
        newItemPrice.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAddItem();
        });
    }

    function convertFrom(source) {
        if (!priceData) return;

        if (source === 'sats') {
            const sats = Converter.parseSats(satsInput.value);
            const brl = Converter.satsToBrl(sats, priceData.brl);
            const usd = Converter.satsToUsd(sats, priceData.usd);
            brlInput.value = sats === 0 ? '' : Converter.formatBrl(brl);
            usdInput.value = sats === 0 ? '' : Converter.formatUsd(usd);
        } else if (source === 'brl') {
            const brl = Converter.parseBrl(brlInput.value);
            const sats = Converter.brlToSats(brl, priceData.brl);
            const usd = Converter.brlToUsd(brl, priceData.brl, priceData.usd);
            satsInput.value = brl === 0 ? '' : Converter.formatSats(sats);
            usdInput.value = brl === 0 ? '' : Converter.formatUsd(usd);
        } else if (source === 'usd') {
            const usd = Converter.parseUsd(usdInput.value);
            const sats = Converter.usdToSats(usd, priceData.usd);
            const brl = Converter.usdToBrl(usd, priceData.brl, priceData.usd);
            satsInput.value = usd === 0 ? '' : Converter.formatSats(sats);
            brlInput.value = usd === 0 ? '' : Converter.formatBrl(brl);
        }
    }

    function updateConverterFromActive() {
        if (!activeField) return;
        convertFrom(activeField);
    }

    // ===== Purchasing list =====
    function renderPurchasingList() {
        const items = Purchasing.getItems();
        purchasingList.innerHTML = '';

        if (items.length === 0) {
            purchasingList.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;padding:12px 0;">Nenhum item. Adicione abaixo!</p>';
            return;
        }

        items.forEach((item, i) => {
            const row = document.createElement('div');
            row.className = 'purchasing-item';

            const sats = priceData
                ? Converter.brlToSats(item.priceBRL, priceData.brl)
                : 0;

            row.innerHTML =
                '<span class="item-name">' + escapeHtml(item.name) + '</span>' +
                '<span class="item-brl">R$ ' + Converter.formatBrl(item.priceBRL) + '</span>' +
                '<span class="item-sats">' + (priceData ? Converter.formatSats(sats) + ' sats' : '...') + '</span>' +
                '<button class="item-remove" data-index="' + i + '" title="Remover">&times;</button>';

            purchasingList.appendChild(row);
        });

        // Bind remove buttons
        purchasingList.querySelectorAll('.item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                Purchasing.removeItem(idx);
                renderPurchasingList();
            });
        });
    }

    function handleAddItem() {
        const name = newItemName.value.trim();
        const price = Converter.parseBrl(newItemPrice.value);

        if (!name) {
            newItemName.focus();
            return;
        }
        if (price <= 0) {
            newItemPrice.focus();
            return;
        }

        Purchasing.addItem(name, price);
        newItemName.value = '';
        newItemPrice.value = '';
        newItemName.focus();
        renderPurchasingList();
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ===== Start =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
