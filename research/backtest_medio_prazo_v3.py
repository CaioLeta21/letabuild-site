#!/usr/bin/env python3
"""
Backtest v3: sinais de CONFIRMACAO DE TENDENCIA (em vez de contrarios).

Motivacao: na v2, os sinais contrarios de venda ("medio prazo esticado") foram
seguidos de alta acima de 98% dos sorteios aleatorios, ou seja, esticado no
medio prazo indica momentum. Aqui testamos duas regras classicas, fixadas antes
de rodar, sem ajuste:

  STH   preco recupera o custo medio do holder de curto prazo (STH-MVRV cruza
        para > 1) depois de >= 14 dias abaixo; perda e o espelho.
  BMSB  preco recupera a Bull Market Support Band (media da SMA 20s e EMA 21s)
        depois de >= 14 dias abaixo; perda e o espelho.

Mesma avaliacao da v2: retorno 14/30/60/90 dias, p-valor contra 5.000 sorteios
de dias aleatorios, separacao 2018-2022 x 2023-2026. Periodo: 2016 em diante
(as duas regras nao dependem de Fear & Greed nem de funding).

Uso: python research/backtest_medio_prazo_v3.py
"""

import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backtest_medio_prazo_v2 import RANDOM_DRAWS, plotly_series  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
START, SPLIT, MIN_SIDE = "2016-01-01", "2023-01-01", 14
HORIZONS = (14, 30, 60, 90)
random.seed(42)


def main():
    market = json.load(open(os.path.join(ROOT, "btc", "data", "market.json"), encoding="utf-8"))
    price = dict((d, p) for d, p in market["price"])
    days = sorted(d for d in price if d >= "2014-01-01")
    closes = [price[d] for d in days]
    idx = {d: i for i, d in enumerate(days)}

    sth = plotly_series("https://charts-cdn.checkonchain.com/btconchain/unrealised/mvrv_sth/mvrv_sth_dark.html", "STH-MVRV")
    bmsb, ema, k = {}, None, 2 / 148
    for i, d in enumerate(days):
        ema = closes[i] if ema is None else closes[i] * k + ema * (1 - k)
        if i >= 146:
            bmsb[d] = closes[i] / ((sum(closes[i - 139:i + 1]) / 140 + ema) / 2)
    ratios = {"STH": sth, "BMSB": bmsb}

    def fwd(d, h):
        j = idx[d] + h
        return closes[j] / closes[idx[d]] - 1 if j < len(days) else None

    test_days = [d for d in days if d >= START]

    def crosses(series):
        ev = {"up": [], "down": []}
        run_side, run_len = None, 0
        for d in test_days:
            if d not in series:
                continue
            side = "above" if series[d] > 1 else "below"
            if side != run_side:
                if run_side is not None and run_len >= MIN_SIDE:
                    ev["up" if side == "above" else "down"].append(d)
                run_side, run_len = side, 1
            else:
                run_len += 1
        return ev

    def stats(evs, side, pool):
        out = []
        for h in HORIZONS:
            obs = [x for d in evs if (x := fwd(d, h)) is not None]
            if not obs:
                out.append("      -       ")
                continue
            m = sum(obs) / len(obs)
            pr = [x for d in pool if (x := fwd(d, h)) is not None]
            better = sum((sum(s) / len(s) >= m) if side == "up" else (sum(s) / len(s) <= m)
                         for s in (random.sample(pr, len(obs)) for _ in range(RANDOM_DRAWS)))
            out.append("%+6.1f%% p=%.2f" % (m * 100, better / RANDOM_DRAWS))
        o90 = [x for d in evs if (x := fwd(d, 90)) is not None]
        hit = sum((x > 0) if side == "up" else (x < 0) for x in o90) / len(o90) if o90 else None
        return "  ".join(out) + "  acerto90 %s" % ("%d%%" % (hit * 100) if hit is not None else "-")

    for name, series in ratios.items():
        ev = crosses(series)
        print("\n=========== %s ===========" % name)
        print("  %-26s %-5s %s" % ("", "", "  ".join("%-14s" % ("%dd" % h) for h in HORIZONS)))
        for side, label in (("up", "RECUPERA (compra)"), ("down", "PERDE (venda)")):
            for per, sel, pool in (("tudo", lambda d: True, test_days),
                                   ("2016-2022", lambda d: d < SPLIT, [d for d in test_days if d < SPLIT]),
                                   ("2023-2026", lambda d: d >= SPLIT, [d for d in test_days if d >= SPLIT])):
                e = [d for d in ev[side] if sel(d)]
                print("  %-26s n=%-3d %s" % ("%s %s" % (label, per), len(e), stats(e, side, pool) if e else "sem eventos"))
        for side, label in (("up", "RECUPERA"), ("down", "PERDE")):
            print("  eventos %s:" % label)
            for d in ev[side]:
                r30, r90 = fwd(d, 30), fwd(d, 90)
                print("    %s  preco %7.0f  30d %s  90d %s" % (d, price[d],
                      "%+5.0f%%" % (r30 * 100) if r30 is not None else "   - ",
                      "%+5.0f%%" % (r90 * 100) if r90 is not None else "   - "))
        last = max(d for d in series if d in price)
        print("  hoje (%s): razao %.3f -> preco %s da linha" % (last, series[last], "acima" if series[last] > 1 else "abaixo"))


if __name__ == "__main__":
    main()
