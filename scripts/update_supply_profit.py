#!/usr/bin/env python3
"""
Atualiza a serie "% do supply de Bitcoin em lucro/prejuizo" usada em letabuild.com/btc/.

Por que este script existe
--------------------------
A pagina lia direto o arquivo estatico https://charts.bgeometrics.com/files/profit_loss.json.
Esse arquivo parou de receber valores em 2026-04-26 (todos os pontos seguintes vem como null),
e o front-end convertia null em 0, o que travou o card em 0,00% em lucro / 100,00% em prejuizo.

A solucao e buscar o dado da API mantida pela propria BGeometrics (api.bitcoin-data.com),
calcular a porcentagem e gravar um JSON estatico no proprio repositorio. A pagina passa a ler
esse arquivo local, sem depender de rate limit de API no navegador do visitante.

Fontes
------
- supply em lucro (BTC):   https://api.bitcoin-data.com/v1/supply-profit
- supply circulante (BTC): https://api.bitcoin-data.com/v1/supply-current
- preco do BTC (USD):      Coin Metrics Community API, metrica PriceUSD

Porcentagem = 100 * supply_em_lucro / supply_circulante

Cobertura
---------
A API sem chave devolve uma janela movel de 4 anos. O trecho anterior (2016-01-01 ate
2022-07-27) vem da serie historica estatica da BGeometrics e so e carregado no bootstrap,
ficando congelado no arquivo. Na emenda (2022-07-28) a diferenca entre as duas metodologias
e de 1,24 ponto percentual. O JSON registra isso no campo "legacy_until".

Uso
---
    python scripts/update_supply_profit.py                    # atualizacao diaria
    python scripts/update_supply_profit.py --bootstrap-legacy # inclui historico 2016-2022
    python scripts/update_supply_profit.py --raw-dir DIR      # le JSONs ja baixados (teste)
"""

import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(REPO_ROOT, "btc", "data", "supply-profit.json")

BITCOIN_DATA_BASE = "https://api.bitcoin-data.com/v1"
COINMETRICS_URL = "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics"
LEGACY_PROFIT_URL = "https://charts.bgeometrics.com/files/profit_loss.json"

LEGACY_START = "2016-01-01"
LEGACY_UNTIL = "2022-07-27"
API_START = "2022-07-28"

USER_AGENT = "letabuild-btc-dashboard/1.0 (+https://letabuild.com/btc/)"


def fetch_json(url, tries=4, pause=5):
    """A API sem chave permite 10 requisicoes por hora por IP. O runner do GitHub usa IP
    compartilhado, entao uma resposta 429 e tratada com espera longa antes de desistir."""
    last_error = None
    for attempt in range(tries):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code == 429 and attempt < tries - 1:
                print("  rate limit atingido, aguardando 90s (tentativa %d)" % (attempt + 1))
                time.sleep(90)
                continue
            if attempt < tries - 1:
                time.sleep(pause * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            last_error = error
            if attempt < tries - 1:
                time.sleep(pause * (attempt + 1))
    raise RuntimeError("falha ao buscar %s: %s" % (url, last_error))


def to_ms(day):
    return int(dt.datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=dt.timezone.utc).timestamp() * 1000)


def from_ms(ms):
    return dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).strftime("%Y-%m-%d")


def read_raw(raw_dir, name):
    with open(os.path.join(raw_dir, name + ".json"), encoding="utf-8") as handle:
        return json.load(handle)


def fetch_bitcoin_data_series(endpoint, value_key, startday, endday, raw_dir=None):
    """Devolve {'YYYY-MM-DD': float} para um endpoint do api.bitcoin-data.com."""
    if raw_dir:
        rows = read_raw(raw_dir, endpoint)
    else:
        url = "%s/%s?startday=%s&endday=%s&size=20000" % (BITCOIN_DATA_BASE, endpoint, startday, endday)
        rows = fetch_json(url)
    if not isinstance(rows, list):
        raise RuntimeError("resposta inesperada de %s: %s" % (endpoint, str(rows)[:200]))
    series = {}
    for row in rows:
        day = row.get("d")
        value = row.get(value_key)
        if not day or value is None:
            continue
        try:
            series[day] = float(value)
        except (TypeError, ValueError):
            continue
    return series


def fetch_prices(start_day, end_day):
    """Preco diario do BTC em USD pela Coin Metrics Community API."""
    prices = {}
    url = (
        "%s?assets=btc&metrics=PriceUSD&frequency=1d&page_size=10000"
        "&start_time=%s&end_time=%s" % (COINMETRICS_URL, start_day, end_day)
    )
    while url:
        payload = fetch_json(url)
        for row in payload.get("data", []):
            day = row.get("time", "")[:10]
            value = row.get("PriceUSD")
            if not day or value is None:
                continue
            try:
                prices[day] = float(value)
            except (TypeError, ValueError):
                continue
        url = payload.get("next_page_url")
    return prices


def fetch_legacy_percentages():
    """Serie historica estatica da BGeometrics, congelada em 2026-04-26."""
    rows = fetch_json(LEGACY_PROFIT_URL)
    series = {}
    for entry in rows:
        if not isinstance(entry, list) or len(entry) < 2:
            continue
        timestamp, value = entry[0], entry[1]
        if value is None:
            continue
        day = from_ms(timestamp)
        if day < LEGACY_START or day > LEGACY_UNTIL:
            continue
        try:
            series[day] = float(value)
        except (TypeError, ValueError):
            continue
    return drop_isolated_outliers(series)


def drop_isolated_outliers(series):
    """Remove pontos isolados invalidos (0 ou 100 cercados de valores normais). Sem interpolacao."""
    days = sorted(series)
    keep = {}
    for index, day in enumerate(days):
        value = series[day]
        previous = series[days[index - 1]] if index > 0 else None
        following = series[days[index + 1]] if index < len(days) - 1 else None
        if previous is not None and following is not None:
            isolated_zero = value <= 1 and previous >= 20 and following >= 20
            isolated_hundred = value >= 99 and previous <= 80 and following <= 80
            if isolated_zero or isolated_hundred:
                continue
        keep[day] = value
    return keep


def load_existing():
    if not os.path.exists(OUTPUT_PATH):
        return {}
    try:
        with open(OUTPUT_PATH, encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, ValueError):
        return {}
    existing = {}
    for point in payload.get("points", []):
        if not isinstance(point, list) or len(point) < 2:
            continue
        day = from_ms(point[0])
        price = point[2] if len(point) > 2 and point[2] is not None else None
        existing[day] = (float(point[1]), price)
    return existing


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bootstrap-legacy", action="store_true", help="inclui o historico 2016-2022 da serie estatica")
    parser.add_argument("--raw-dir", help="le supply-profit.json e supply-current.json ja baixados nesse diretorio")
    parser.add_argument("--days", type=int, default=1500, help="janela em dias buscada na API (padrao: 1500)")
    args = parser.parse_args()

    today = dt.datetime.now(dt.timezone.utc).date()
    startday = (today - dt.timedelta(days=args.days)).strftime("%Y-%m-%d")
    endday = today.strftime("%Y-%m-%d")

    print("Buscando supply em lucro e supply circulante (%s a %s)..." % (startday, endday))
    profit = fetch_bitcoin_data_series("supply-profit", "supplyProfitBtc", startday, endday, args.raw_dir)
    time.sleep(1)
    current = fetch_bitcoin_data_series("supply-current", "supplyCurrent", startday, endday, args.raw_dir)

    fresh = {}
    for day, profit_btc in profit.items():
        supply = current.get(day)
        if not supply:
            continue
        percentage = 100.0 * profit_btc / supply
        if not 0.0 <= percentage <= 100.0:
            continue
        fresh[day] = round(percentage, 2)

    if not fresh:
        print("ERRO: a API nao devolveu nenhum ponto valido. Arquivo anterior mantido.", file=sys.stderr)
        return 1
    print("  %d dias validos da API (%s a %s)" % (len(fresh), min(fresh), max(fresh)))

    merged = load_existing()
    print("  %d dias ja gravados no repositorio" % len(merged))

    if args.bootstrap_legacy:
        legacy = fetch_legacy_percentages()
        print("  %d dias da serie historica estatica (%s a %s)" % (len(legacy), min(legacy), max(legacy)))
        for day, value in legacy.items():
            price = merged.get(day, (None, None))[1]
            merged[day] = (round(value, 2), price)

    for day, value in fresh.items():
        price = merged.get(day, (None, None))[1]
        merged[day] = (value, price)

    missing_price = sorted(day for day, (_, price) in merged.items() if price is None)
    if missing_price:
        print("Buscando preco do BTC para %d dias sem cotacao..." % len(missing_price))
        prices = fetch_prices(missing_price[0], max(merged))
        for day in missing_price:
            price = prices.get(day)
            if price is not None:
                merged[day] = (merged[day][0], round(price, 2))

    days = sorted(merged)
    points = []
    for day in days:
        percentage, price = merged[day]
        points.append([to_ms(day), percentage, price])

    payload = {
        "metric": "percent_supply_in_profit",
        "asset": "btc",
        "updated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "first_date": days[0],
        "last_date": days[-1],
        "legacy_until": LEGACY_UNTIL,
        "sources": {
            "api": "https://api.bitcoin-data.com/v1/supply-profit e /v1/supply-current (BGeometrics)",
            "legacy": "https://charts.bgeometrics.com/files/profit_loss.json (congelada em 2026-04-26)",
            "price": "Coin Metrics Community API, metrica PriceUSD",
        },
        "calculation": "100 * supply_em_lucro_btc / supply_circulante_btc",
        "points": points,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"))
        handle.write("\n")

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print("Gravado %s" % OUTPUT_PATH)
    print("  %d pontos, %s a %s, %.1f KB" % (len(points), days[0], days[-1], size_kb))
    print("  ultimo valor: %.2f%% em lucro (%s)" % (points[-1][1], days[-1]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
