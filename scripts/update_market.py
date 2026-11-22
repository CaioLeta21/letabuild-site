#!/usr/bin/env python3
"""
Grava btc/data/market.json: preco diario, MVRV e Fear & Greed usados no
Termometro do Bitcoin (letabuild.com/btc/).

Por que este script existe
--------------------------
A pagina buscava esses dados no navegador de cada visitante: cerca de 7
requisicoes paginadas a Coin Metrics Community API (preco desde 2010, MVRV e
realized price) mais o historico inteiro do alternative.me. A Coin Metrics
gratuita limita requisicoes por IP e chegou a levar 10 s numa unica chamada, e o
painel so desenha os cards quando a fonte mais lenta responde.

Agora a Action roda a cada 2 horas e a pagina le um arquivo do proprio dominio,
servido pela CDN da Cloudflare.

Formato
-------
{
  "updated_at": "...",
  "price": [["YYYY-MM-DD", preco], ...],     # Coin Metrics PriceUSD, desde 2010
  "mvrv":  [["YYYY-MM-DD", mvrv], ...],      # Coin Metrics CapMVRVCur, desde 2012
  "fng":   [["YYYY-MM-DD", valor], ...],     # alternative.me, ordem cronologica
  "fng_classification": "Extreme Fear"
}
Realized price = preco / MVRV (calculado na pagina).

Uso
---
    python scripts/update_market.py
"""

import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from update_supply_profit import COINMETRICS_URL, fetch_json  # noqa: E402

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(REPO_ROOT, "btc", "data", "market.json")
FNG_URL = "https://api.alternative.me/fng/?limit=0"
MAX_AGE_DAYS = 5


def today():
    return dt.datetime.now(dt.timezone.utc).date()


def check_fresh(name, last_day):
    age = (today() - dt.date.fromisoformat(last_day)).days
    if age > MAX_AGE_DAYS:
        raise RuntimeError("%s: ultimo dado e de %s (%d dias)" % (name, last_day, age))


def fetch_coinmetrics():
    url = ("%s?assets=btc&metrics=PriceUSD,CapMVRVCur&frequency=1d&page_size=10000"
           "&start_time=2010-01-01" % COINMETRICS_URL)
    price, mvrv = [], []
    while url:
        payload = fetch_json(url)
        for row in payload.get("data", []):
            day = row.get("time", "")[:10]
            if row.get("PriceUSD") is not None:
                price.append([day, round(float(row["PriceUSD"]), 2)])
            if row.get("CapMVRVCur") is not None and day >= "2012-01-01":
                mvrv.append([day, round(float(row["CapMVRVCur"]), 4)])
        url = payload.get("next_page_url")
    if len(price) < 5000 or len(mvrv) < 4000:
        raise RuntimeError("Coin Metrics: serie curta demais (%d precos, %d MVRV)" % (len(price), len(mvrv)))
    check_fresh("Coin Metrics", price[-1][0])
    return price, mvrv


def fetch_fng():
    rows = fetch_json(FNG_URL).get("data") or []
    if len(rows) < 1000:
        raise RuntimeError("Fear & Greed: resposta curta demais (%d pontos)" % len(rows))
    out = []
    for row in reversed(rows):  # a API devolve do mais novo para o mais velho
        day = dt.datetime.fromtimestamp(int(row["timestamp"]), dt.timezone.utc).date().isoformat()
        out.append([day, int(row["value"])])
    check_fresh("Fear & Greed", out[-1][0])
    return out, rows[0].get("value_classification", "")


def main():
    price, mvrv = fetch_coinmetrics()
    fng, classification = fetch_fng()
    data = {
        "updated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "price": price,
        "mvrv": mvrv,
        "fng": fng,
        "fng_classification": classification,
    }
    # So regrava se os dados mudaram, para nao gerar commit a cada 2 horas so pelo updated_at
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, encoding="utf-8") as handle:
            old = json.load(handle)
        if all(old.get(k) == data[k] for k in ("price", "mvrv", "fng", "fng_classification")):
            print("Sem dados novos.")
            return
    tmp = OUTPUT_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(data, handle, separators=(",", ":"))
    os.replace(tmp, OUTPUT_PATH)
    print("market.json: preco ate %s (%s), MVRV ate %s (%s), F&G ate %s (%s)" % (
        price[-1][0], price[-1][1], mvrv[-1][0], mvrv[-1][1], fng[-1][0], fng[-1][1]))


if __name__ == "__main__":
    main()
