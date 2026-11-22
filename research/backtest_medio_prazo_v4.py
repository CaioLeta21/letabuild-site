#!/usr/bin/env python3
"""
Backtest v4: (A) DCA ponderado por estresse x DCA fixo; (B) sinais de medio prazo
filtrados pelo termometro de ciclo longo.

Tudo fixado antes de rodar, sem ajuste.

A) DCA semanal (segundas-feiras), desde 2014. Pesos por semana:
   W_STH    STH-MVRV (checkonchain): <0,8 -> 3 | <0,9 -> 2 | <1,2 -> 1 | <1,4 -> 0,5 | senao 0,25
   W_MAYER  preco / media de 200 dias (so preco, referencia sem on-chain):
            <0,8 -> 3 | <1,0 -> 2 | <1,5 -> 1 | <2,0 -> 0,5 | senao 0,25
   W_MEDIO  score de medio prazo da v2 (6 indicadores, percentil 365d): 2**score
   W_LONGO  score do termometro de ciclo longo (formula do site): 2**score
   Metricas:
   - custo medio por BTC com o mesmo total gasto (melhora % vs DCA fixo);
   - janelas moveis de 2 e 4 anos (inicio a cada 4 semanas): % em que o ponderado
     ganha e melhora mediana;
   - placebo: 1.000 embaralhamentos dos mesmos pesos no tempo; p-valor = fracao
     com melhora >= a observada;
   - versao realista: renda de 1 por semana, so gasta o que tem em caixa;
     compara o patrimonio final (BTC + caixa) com o DCA fixo.

B) Eventos de compra/venda de medio prazo (regras NIVEL e VIRADA da v2), mantendo
   so os que acontecem com o termometro de ciclo longo em zona de compra
   (score >= 0,5) ou de venda (<= -0,5). Comparacao com dias aleatorios do mesmo
   regime de ciclo longo, para separar o que o medio prazo acrescenta.

Termometro de ciclo longo: reproduz as faixas do site (200W MA, MVRV, Fear &
Greed, SOPR, RHODL, RSI mensal, CVDD; o RSI BTC/ouro ficou de fora por falta de
historico) e faz a media dos disponiveis.

Uso: python research/backtest_medio_prazo_v4.py
"""

import bisect
import datetime as dt
import json
import os
import random
import statistics as st
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backtest_medio_prazo_v2 import binance_funding, fetch, note, plotly_series, rolling_mean, rsi_last  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
random.seed(7)
DRAWS = 1000


def load():
    m = json.load(open(os.path.join(ROOT, "btc", "data", "market.json"), encoding="utf-8"))
    price = dict((d, p) for d, p in m["price"])
    days = sorted(d for d in price if d >= "2012-01-01")
    closes = [price[d] for d in days]
    data = {"days": days, "closes": closes, "price": price, "idx": {d: i for i, d in enumerate(days)},
            "mvrv": dict((d, v) for d, v in m["mvrv"]), "fng": dict((d, v) for d, v in m["fng"])}
    to_day = lambda ms: dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).date().isoformat()
    data["sopr"] = {to_day(ms): v for ms, v in json.load(open(os.path.join(ROOT, "btc", "data", "sopr.json")))}
    data["cvdd"] = {r["d"]: r["v"] for r in json.load(open(os.path.join(ROOT, "btc", "data", "cvdd.json")))}
    data["rhodl"] = {to_day(ms): v for ms, v in fetch("https://charts.bgeometrics.com/files/rhodl.json") if v is not None}
    data["sth_mvrv"] = plotly_series("https://charts-cdn.checkonchain.com/btconchain/unrealised/mvrv_sth/mvrv_sth_dark.html", "STH-MVRV")
    data["funding"] = binance_funding()
    return data


def long_term_score(D):
    """Faixas copiadas do painel (btc-dashboard: ua, fa, ga, pa, ma, Tn, Dg)."""
    days, closes, price = D["days"], D["closes"], D["price"]
    b200 = lambda r: 2 if r < 1 else 1 if r < 1.2 else 0 if r < 2.5 else -1 if r <= 3.5 else -2
    bmvrv = lambda r: 2 if r < 1 else 1 if r < 1.5 else 0 if r < 2.5 else -1 if r <= 3.5 else -2
    bfng = lambda v: 2 if v <= 10 else 1 if v <= 25 else 0 if v <= 74 else -1 if v <= 90 else -2
    bsopr = lambda v: 2 if v < .95 else 1 if v < .99 else 0 if v < 1.04 else -1 if v <= 1.08 else -2
    brhodl = lambda v: 2 if v <= 350 else 1 if v <= 1000 else 0 if v <= 10000 else -1 if v <= 50000 else -2
    brsi = lambda v: 2 if v < 30 else 1 if v < 40 else 0 if v < 60 else -1 if v < 70 else -2
    bcvdd = lambda r: 2 if r < 1.5 else 1 if r < 3 else 0 if r < 6 else -1 if r <= 10 else -2
    month_end = {}
    for d in days:
        month_end[d[:7]] = price[d]
    months = sorted(month_end)
    out = {}
    for i, d in enumerate(days):
        notes = []
        if i >= 1399:
            notes.append(b200(closes[i] / (sum(closes[i - 1399:i + 1:7]) / len(closes[i - 1399:i + 1:7]))))
        for key, fn in (("mvrv", bmvrv), ("fng", bfng), ("sopr", bsopr), ("rhodl", brhodl)):
            if d in D[key]:
                notes.append(fn(D[key][d]))
        if d in D["cvdd"] and D["cvdd"][d] > 0:
            notes.append(bcvdd(closes[i] / D["cvdd"][d]))
        mi = bisect.bisect_left(months, d[:7])
        series = [month_end[m] for m in months[max(0, mi - 60):mi]] + [closes[i]]
        r = rsi_last(series)
        if r is not None:
            notes.append(brsi(r))
        if len(notes) >= 5:
            out[d] = sum(notes) / len(notes)
    return out


def mid_term_score(D):
    days, closes = D["days"], D["closes"]
    raw = {"sopr": rolling_mean(days, D["sopr"], 7), "sth_mvrv": D["sth_mvrv"],
           "funding": rolling_mean(days, D["funding"], 7), "fng": D["fng"]}
    bmsb, ema, k = {}, None, 2 / 148
    for i, d in enumerate(days):
        ema = closes[i] if ema is None else closes[i] * k + ema * (1 - k)
        if i >= 146:
            bmsb[d] = closes[i] / ((sum(closes[i - 139:i + 1]) / 140 + ema) / 2)
    raw["bmsb"] = bmsb
    raw["rsi"] = {}
    for i, d in enumerate(days):
        a, b = rsi_last(closes[max(0, i - 300):i + 1]), rsi_last(closes[i::-7][:120][::-1])
        if a is not None and b is not None:
            raw["rsi"][d] = (a + b) / 2
    notes = {}
    for n, s in raw.items():
        hd = [d for d in days if d in s]
        notes[n] = {}
        for i, d in enumerate(hd):
            w = sorted(s[x] for x in hd[max(0, i - 364):i + 1])
            if len(w) >= 180:
                notes[n][d] = note(bisect.bisect_left(w, s[d]) / len(w))
    out = {}
    for d in days:
        v = [notes[n][d] for n in notes if d in notes[n]]
        if len(v) >= 5:
            out[d] = sum(v) / len(v)
    return out


# ---------------- A) DCA ----------------

def dca_cost(weeks, prices, weights):
    spent = sum(weights)
    btc = sum(w / p for w, p in zip(weights, prices))
    return spent / btc


def improvement(prices, weights):
    return 1 - dca_cost(None, prices, weights) / dca_cost(None, prices, [1] * len(prices))


def part_a(D, lt, mt):
    days, price, ma = D["days"], D["price"], {}
    for i, d in enumerate(days):
        if i >= 199:
            ma[d] = sum(D["closes"][i - 199:i + 1]) / 200
    def w_sth(d):
        v = D["sth_mvrv"].get(d)
        return None if v is None else 3 if v < .8 else 2 if v < .9 else 1 if v < 1.2 else .5 if v < 1.4 else .25
    def w_mayer(d):
        if d not in ma:
            return None
        v = price[d] / ma[d]
        return 3 if v < .8 else 2 if v < 1 else 1 if v < 1.5 else .5 if v < 2 else .25
    schemes = {"W_STH": w_sth, "W_MAYER": w_mayer,
               "W_MEDIO": lambda d: 2 ** mt[d] if d in mt else None,
               "W_LONGO": lambda d: 2 ** lt[d] if d in lt else None}
    mondays = [d for d in days if dt.date.fromisoformat(d).weekday() == 0]

    for start in ("2014-01-06", "2018-08-06"):
        weeks = [d for d in mondays if d >= start and all(f(d) is not None for f in schemes.values())] \
            if start != "2014-01-06" else [d for d in mondays if d >= start]
        print("\n== A) DCA semanal de %s a %s (%d semanas) ==" % (weeks[0], weeks[-1], len(weeks)))
        print("%-9s %9s %9s %16s %16s %10s %14s" % ("esquema", "melhora", "placebo p", "janelas 2a ganha", "janelas 4a ganha",
                                                    "% investido", "patrim. real"))
        for name, f in schemes.items():
            wk = [d for d in weeks if f(d) is not None]
            if wk and wk[0] > weeks[0][:4] + "-12-31":
                print("%-9s so tem dados a partir de %s; ver a tabela seguinte" % (name, wk[0]))
                continue
            if len(wk) < 200:
                print("%-9s sem historico suficiente neste periodo" % name)
                continue
            pr = [price[d] for d in wk]
            ws = [f(d) for d in wk]
            imp = improvement(pr, ws)
            better = 0
            for _ in range(DRAWS):
                sh = ws[:]
                random.shuffle(sh)
                better += improvement(pr, sh) >= imp
            wins = {}
            for L in (104, 208):
                res = [improvement(pr[s:s + L], ws[s:s + L]) for s in range(0, len(wk) - L, 4)]
                wins[L] = (sum(r > 0 for r in res) / len(res), st.median(res)) if res else (None, None)
            cash, btc, fixed_btc = 0.0, 0.0, 0.0
            for p, w in zip(pr, ws):
                cash += 1
                spend = min(w, cash)
                cash -= spend
                btc += spend / p
                fixed_btc += 1 / p
            final = pr[-1]
            real = (btc * final + cash) / (fixed_btc * final) - 1
            deployed = 1 - cash / len(pr)
            fmt = lambda t: "%3.0f%% (med %+.1f%%)" % (t[0] * 100, t[1] * 100) if t[0] is not None else "-"
            print("%-9s %+8.1f%% %9.3f %16s %16s %9.0f%% %+13.1f%%" % (
                name, imp * 100, better / DRAWS, fmt(wins[104]), fmt(wins[208]), deployed * 100, real * 100))


# ---------------- B) filtro de ciclo longo ----------------

def part_b(D, lt, mt):
    days, closes, idx, price = D["days"], D["closes"], D["idx"], D["price"]
    sdays = [d for d in days if d in mt and d in lt]

    def fwd(d, h):
        j = idx[d] + h
        return closes[j] / closes[idx[d]] - 1 if j < len(days) else None

    def events(kind):
        out, last = {"buy": [], "sell": []}, {"buy": None, "sell": None}
        for i, d in enumerate(sdays):
            s, prev = mt[d], mt[sdays[i - 1]] if i else None
            recent = [mt[x] for x in sdays[max(0, i - 14):i + 1]]
            if kind == "NIVEL":
                buy, sell = prev is not None and prev < 1 <= s, prev is not None and prev > -1 >= s
            else:
                buy = max(recent) >= 1 and s <= max(recent) - .5
                sell = min(recent) <= -1 and s >= min(recent) + .5
            for side, hit in (("buy", buy), ("sell", sell)):
                if hit and (last[side] is None or idx[d] - idx[last[side]] >= 30):
                    out[side].append(d)
                    last[side] = d
        return out

    def line(label, evs, side, pool):
        if not evs:
            print("  %-44s sem eventos" % label)
            return
        cells = []
        for h in (30, 60, 90):
            obs = [x for d in evs if (x := fwd(d, h)) is not None]
            pr = [x for d in pool if (x := fwd(d, h)) is not None]
            if not obs or len(pr) < len(obs):
                cells.append("      -      ")
                continue
            m = sum(obs) / len(obs)
            b = sum((sum(s) / len(s) >= m) if side == "buy" else (sum(s) / len(s) <= m)
                    for s in (random.sample(pr, len(obs)) for _ in range(5000)))
            cells.append("%+6.1f%% p=%.2f" % (m * 100, b / 5000))
        print("  %-44s n=%-3d %s" % (label, len(evs), "  ".join(cells)))

    buy_regime = [d for d in sdays if lt[d] >= .5]
    sell_regime = [d for d in sdays if lt[d] <= -.5]
    print("\n== B) Medio prazo filtrado pelo ciclo longo (%s a %s) ==" % (sdays[0], sdays[-1]))
    print("  dias com ciclo longo em compra (>=0,5): %d | em venda (<=-0,5): %d" % (len(buy_regime), len(sell_regime)))
    print("  %-44s %-5s %-14s %-14s %-14s" % ("", "", "30d", "60d", "90d"))
    line("(referencia) dia aleatorio c/ ciclo longo em compra", buy_regime[::30], "buy", sdays)
    for kind in ("NIVEL", "VIRADA"):
        ev = events(kind)
        b = [d for d in ev["buy"] if lt[d] >= .5]
        s = [d for d in ev["sell"] if lt[d] <= -.5]
        line("%s compra, ciclo longo em compra vs todos" % kind, b, "buy", sdays)
        line("%s compra, ciclo longo em compra vs regime" % kind, b, "buy", buy_regime)
        line("%s venda, ciclo longo em venda vs todos" % kind, s, "sell", sdays)
        line("%s venda, ciclo longo em venda vs regime" % kind, s, "sell", sell_regime)
        for d in b:
            r = [fwd(d, h) for h in (30, 90)]
            print("      compra %s preco %7.0f  medio %+.2f  longo %+.2f  30d %s  90d %s" % (
                d, price[d], mt[d], lt[d], "%+4.0f%%" % (r[0] * 100) if r[0] is not None else "  - ",
                "%+4.0f%%" % (r[1] * 100) if r[1] is not None else "  - "))
    print("\n  Hoje (%s): ciclo longo %+.2f | medio prazo %+.2f | STH-MVRV %.3f" % (
        sdays[-1], lt[sdays[-1]], mt[sdays[-1]], D["sth_mvrv"].get(sdays[-1], float("nan"))))


def main():
    D = load()
    lt = long_term_score(D)
    mt = mid_term_score(D)
    print("Ciclo longo de %s; medio prazo de %s" % (min(lt), min(mt)))
    part_a(D, lt, mt)
    part_b(D, lt, mt)


if __name__ == "__main__":
    main()
