#!/usr/bin/env python3
"""
Backtest de um "termometro de medio prazo" para o Bitcoin (semanas a meses).

Indicadores (todos contrarios: valor baixo = compra):
  sth_sopr   SOPR dos holders de curto prazo, media de 7 dias   (BGeometrics)
  sth_mvrv   preco / realized price dos holders de curto prazo  (BGeometrics)
  funding    funding rate dos perpetuos, media de 7 dias         (BGeometrics)
  bmsb       preco / Bull Market Support Band (SMA 20s e EMA 21s)
  rsi        media do RSI(14) diario e do RSI(14) semanal
  fng        Fear & Greed                                         (alternative.me)
Open interest ficou de fora: nao ha historico gratuito (a Binance guarda 30 dias).

Nota de cada indicador: percentil do valor de hoje entre os ultimos 365 dias
(so passado, sem olhar o futuro). <10% = +2, <25% = +1, <75% = 0, <90% = -1,
senao -2. Score = media das notas.

Avaliacao: retorno do BTC 30/60/90 dias depois de cada dia, agrupado por faixa
de score; correlacao de cada indicador com o retorno futuro; nota nos fundos e
topos locais.

Uso: python research/backtest_medio_prazo.py
"""

import bisect
import datetime as dt
import json
import math
import os
import ssl
import statistics as st
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = "https://charts.bgeometrics.com/files/%s.json"
START = "2019-10-01"
WINDOW = 365
MIN_HISTORY = 180
FFILL_DAYS = 10
FOUR = ("sth_sopr", "sth_mvrv", "funding", "bmsb")


def get(url):
    ctx = ssl.create_default_context()
    if os.path.exists("/etc/ssl/cert.pem"):
        ctx.load_verify_locations("/etc/ssl/cert.pem")
    req = urllib.request.Request(url, headers={"User-Agent": "letabuild-backtest/1.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=120) as r:
        return json.load(r)


def day(ms):
    return dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).date().isoformat()


def bg_daily(name):
    sums = {}
    for ms, v in get(BG % name):
        if v is None:
            continue
        sums.setdefault(day(ms), []).append(float(v))
    return {d: sum(v) / len(v) for d, v in sums.items()}


def rolling_mean(days, series, n):
    out, buf = {}, []
    for d in days:
        if d in series:
            buf.append(series[d])
            buf = buf[-n:]
        if len(buf) == n:
            out[d] = sum(buf) / n
    return out


def rsi_last(closes, n=14):
    if len(closes) < n + 1:
        return None
    gains = [max(closes[i] - closes[i - 1], 0) for i in range(1, len(closes))]
    losses = [max(closes[i - 1] - closes[i], 0) for i in range(1, len(closes))]
    ag, al = sum(gains[:n]) / n, sum(losses[:n]) / n
    for g, l in zip(gains[n:], losses[n:]):
        ag, al = (ag * (n - 1) + g) / n, (al * (n - 1) + l) / n
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)


def ffill(days, series, limit):
    out, last, last_i = {}, None, None
    for i, d in enumerate(days):
        if d in series:
            last, last_i = series[d], i
        if last is not None and i - last_i <= limit:
            out[d] = last
    return out


def note(p):
    return 2 if p < .10 else 1 if p < .25 else 0 if p < .75 else -1 if p < .90 else -2


def main():
    market = json.load(open(os.path.join(ROOT, "btc", "data", "market.json"), encoding="utf-8"))
    price = {d: p for d, p in market["price"]}
    days = sorted(d for d in price if d >= "2018-01-01")
    closes = [price[d] for d in days]

    raw = {}
    sopr = bg_daily("sth_sopr")
    raw["sth_sopr"] = rolling_mean(days, ffill(days, sopr, FFILL_DAYS), 7)
    srp = ffill(days, bg_daily("sth_realized_price"), FFILL_DAYS)
    raw["sth_mvrv"] = {d: price[d] / srp[d] for d in days if d in srp and srp[d] > 0}
    raw["funding"] = rolling_mean(days, ffill(days, bg_daily("funding_rate"), FFILL_DAYS), 7)

    bmsb, ema, k = {}, None, 2 / (147 + 1)
    for i, d in enumerate(days):
        ema = closes[i] if ema is None else closes[i] * k + ema * (1 - k)
        if i >= 146:
            sma = sum(closes[i - 139:i + 1]) / 140
            bmsb[d] = closes[i] / ((sma + ema) / 2)
    raw["bmsb"] = bmsb

    rsi = {}
    for i, d in enumerate(days):
        daily = rsi_last(closes[max(0, i - 300):i + 1])
        weekly = rsi_last(closes[i::-7][:120][::-1])
        if daily is not None and weekly is not None:
            rsi[d] = (daily + weekly) / 2
    raw["rsi"] = rsi
    raw["fng"] = ffill(days, {d: v for d, v in market["fng"]}, 3)

    names = list(raw)
    notes = {n: {} for n in names}
    for n in names:
        hist_days = [d for d in days if d in raw[n]]
        for i, d in enumerate(hist_days):
            window = [raw[n][x] for x in hist_days[max(0, i - WINDOW + 1):i + 1]]
            if len(window) < MIN_HISTORY:
                continue
            ordered = sorted(window)
            notes[n][d] = note(bisect.bisect_left(ordered, raw[n][d]) / len(ordered))

    test_days = [d for d in days if d >= START]
    idx = {d: i for i, d in enumerate(days)}

    def fwd(d, h):
        j = idx[d] + h
        return math.log(closes[j] / closes[idx[d]]) if j < len(days) else None

    def score(d, subset):
        vals = [notes[n][d] for n in subset if d in notes[n]]
        return sum(vals) / len(vals) if len(vals) >= len(subset) - 1 else None

    print("Periodo: %s a %s (%d dias). Indicadores: %s" % (test_days[0], test_days[-1], len(test_days), ", ".join(names)))
    print("Ultimo dado: " + ", ".join("%s %s" % (n, max(raw[n])) for n in names))

    def bucket_table(subset, label):
        print("\n== %s: retorno medio do BTC depois de cada faixa de score ==" % label)
        print("%-22s %6s %10s %10s %10s %8s" % ("faixa", "dias", "30d", "60d", "90d", "90d>0"))
        buckets = [("compra forte (>=1)", lambda s: s >= 1), ("compra (0,5 a 1)", lambda s: .5 <= s < 1),
                   ("neutro", lambda s: -.5 < s < .5), ("venda (-1 a -0,5)", lambda s: -1 < s <= -.5),
                   ("venda forte (<=-1)", lambda s: s <= -1)]
        for name, test in buckets:
            rows = [d for d in test_days if (s := score(d, subset)) is not None and test(s)]
            r = {h: [x for d in rows if (x := fwd(d, h)) is not None] for h in (30, 60, 90)}
            pct = lambda xs: "%+.1f%%" % ((math.exp(st.mean(xs)) - 1) * 100) if xs else "-"
            pos = "%d%%" % (100 * sum(x > 0 for x in r[90]) / len(r[90])) if r[90] else "-"
            print("%-22s %6d %10s %10s %10s %8s" % (name, len(rows), pct(r[30]), pct(r[60]), pct(r[90]), pos))
        base = {h: [x for d in test_days if (x := fwd(d, h)) is not None] for h in (30, 60, 90)}
        print("%-22s %6d %10s %10s %10s %8s" % ("(todos os dias)", len(test_days),
              *["%+.1f%%" % ((math.exp(st.mean(base[h])) - 1) * 100) for h in (30, 60, 90)],
              "%d%%" % (100 * sum(x > 0 for x in base[90]) / len(base[90]))))

    bucket_table(names, "6 indicadores")
    bucket_table(FOUR, "4 indicadores (sth_sopr, sth_mvrv, funding, bmsb)")

    print("\n== Correlacao (Spearman) entre a nota e o retorno 60d seguinte ==")
    def spearman(a, b):
        ra = {v: i for i, v in enumerate(sorted(set(a)))}
        def rank(xs):
            order = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0] * len(xs); i = 0
            while i < len(order):
                j = i
                while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
                    j += 1
                for k in range(i, j + 1):
                    r[order[k]] = (i + j) / 2
                i = j + 1
            return r
        return st.correlation(rank(a), rank(b))
    for n in names + ["SCORE 6", "SCORE 4"]:
        pairs = []
        for d in test_days:
            s = notes[n].get(d) if n in notes else score(d, names if n == "SCORE 6" else FOUR)
            f = fwd(d, 60)
            if s is not None and f is not None:
                pairs.append((s, f))
        print("%-10s %+.3f  (%d dias)" % (n, spearman([p[0] for p in pairs], [p[1] for p in pairs]), len(pairs)))

    print("\n== Fundos e topos locais (extremo de +-30 dias, movimento >= 20%/30%) ==")
    for i, d in enumerate(days):
        if d < START or i < 60 or i + 30 >= len(days):
            continue
        seg = closes[i - 30:i + 31]
        prev = closes[i - 60:i]
        if closes[i] == min(seg) and closes[i] <= 0.8 * max(prev):
            kind = "FUNDO"
        elif closes[i] == max(seg) and closes[i] >= 1.3 * min(prev):
            kind = "TOPO "
        else:
            continue
        s6, s4 = score(d, names), score(d, FOUR)
        near = [score(x, names) for x in days[max(0, i - 7):i + 8] if score(x, names) is not None]
        best = (max(near) if kind == "FUNDO" else min(near)) if near else None
        fmt = lambda v: "%+.2f" % v if v is not None else "  - "
        print("%s %s  preco %8.0f  score6 %s  score4 %s  melhor em +-7d %s" % (kind, d, closes[i], fmt(s6), fmt(s4), fmt(best)))

    print("\n== Ultimos 30 dias ==")
    for d in days[-30:]:
        parts = " ".join("%s=%+d" % (n, notes[n][d]) for n in names if d in notes[n])
        s = score(d, names)
        print("%s  preco %6.0f  score6 %s  %s" % (d, price[d], "%+.2f" % s if s is not None else "  -  ", parts))


if __name__ == "__main__":
    main()
