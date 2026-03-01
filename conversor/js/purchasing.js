const Purchasing = (() => {
    const STORAGE_KEY = 'sat-converter-items';

    const DEFAULT_ITEMS = [
        { name: 'Cafezinho', priceBRL: 8 },
        { name: 'Almoço', priceBRL: 45 },
        { name: 'Cerveja', priceBRL: 12 },
        { name: 'Uber', priceBRL: 25 },
        { name: 'Aluguel', priceBRL: 2500 },
        { name: 'iPhone', priceBRL: 8000 }
    ];

    let items = [];

    function load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                items = JSON.parse(stored);
            } else {
                items = [...DEFAULT_ITEMS];
                save();
            }
        } catch {
            items = [...DEFAULT_ITEMS];
        }
        return items;
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // localStorage full or blocked
        }
    }

    function getItems() {
        return items;
    }

    function addItem(name, priceBRL) {
        const trimmed = name.trim();
        if (!trimmed || priceBRL <= 0) return false;
        items.push({ name: trimmed, priceBRL: priceBRL });
        save();
        return true;
    }

    function removeItem(index) {
        if (index < 0 || index >= items.length) return false;
        items.splice(index, 1);
        save();
        return true;
    }

    return { load, getItems, addItem, removeItem };
})();
