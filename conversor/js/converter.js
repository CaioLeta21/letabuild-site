const Converter = (() => {
    const SATS_PER_BTC = 100_000_000;

    function satsToBrl(sats, btcPriceBrl) {
        return (sats / SATS_PER_BTC) * btcPriceBrl;
    }

    function satsToUsd(sats, btcPriceUsd) {
        return (sats / SATS_PER_BTC) * btcPriceUsd;
    }

    function brlToSats(brl, btcPriceBrl) {
        if (btcPriceBrl === 0) return 0;
        return Math.round((brl / btcPriceBrl) * SATS_PER_BTC);
    }

    function usdToSats(usd, btcPriceUsd) {
        if (btcPriceUsd === 0) return 0;
        return Math.round((usd / btcPriceUsd) * SATS_PER_BTC);
    }

    function brlToUsd(brl, btcPriceBrl, btcPriceUsd) {
        if (btcPriceBrl === 0) return 0;
        return brl * (btcPriceUsd / btcPriceBrl);
    }

    function usdToBrl(usd, btcPriceBrl, btcPriceUsd) {
        if (btcPriceUsd === 0) return 0;
        return usd * (btcPriceBrl / btcPriceUsd);
    }

    // Format number as BRL: R$ 1.234,56
    function formatBrl(value) {
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Format number as USD: 1,234.56
    function formatUsd(value) {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Format sats: 1.234.567
    function formatSats(value) {
        return Math.round(value).toLocaleString('pt-BR', {
            maximumFractionDigits: 0
        });
    }

    // Format large numbers: 1.2T, 345B, etc.
    function formatCompact(value) {
        if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
        if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
        if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
        return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    // Parse BRL formatted input: "1.234,56" → 1234.56
    function parseBrl(str) {
        if (!str) return 0;
        const clean = str.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }

    // Parse USD formatted input: "1,234.56" → 1234.56
    function parseUsd(str) {
        if (!str) return 0;
        const clean = str.replace(/,/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }

    // Parse sats input: "1.234.567" → 1234567
    function parseSats(str) {
        if (!str) return 0;
        const clean = str.replace(/\./g, '').replace(/,/g, '');
        const num = parseInt(clean, 10);
        return isNaN(num) ? 0 : num;
    }

    return {
        SATS_PER_BTC,
        satsToBrl, satsToUsd,
        brlToSats, usdToSats,
        brlToUsd, usdToBrl,
        formatBrl, formatUsd, formatSats, formatCompact,
        parseBrl, parseUsd, parseSats
    };
})();
