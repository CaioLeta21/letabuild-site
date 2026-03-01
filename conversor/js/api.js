const API = (() => {
    const ENDPOINT = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl,usd&include_24hr_change=true&include_market_cap=true';

    let lastData = null;
    let lastFetch = 0;
    const MIN_INTERVAL = 10000; // 10s minimum between requests

    async function fetchPrice() {
        const now = Date.now();
        if (now - lastFetch < MIN_INTERVAL && lastData) {
            return lastData;
        }

        const response = await fetch(ENDPOINT);

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('RATE_LIMIT');
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const btc = json.bitcoin;

        lastData = {
            brl: btc.brl,
            usd: btc.usd,
            brlChange24h: btc.brl_24h_change,
            usdChange24h: btc.usd_24h_change,
            marketCapUsd: btc.usd_market_cap,
            timestamp: Date.now()
        };

        lastFetch = now;
        return lastData;
    }

    function getLastData() {
        return lastData;
    }

    return { fetchPrice, getLastData };
})();
