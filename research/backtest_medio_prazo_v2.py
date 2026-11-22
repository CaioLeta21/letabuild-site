#!/usr/bin/env python3
"""
Backtest v2 do termometro de medio prazo: historico longo, sinais por evento e
comparacao com o acaso.

Mudancas em relacao a v1 (research/backtest_medio_prazo.py)
-----------------------------------------------------------
- Historico longo. STH-MVRV do checkonchain (desde 2012) em vez da BGeometrics
  (so desde nov/2022); SOPR geral do checkonchain (desde 2011) no lugar do
  STH-SOPR, que nao tem historico longo gratuito; funding da Binance (desde
  set/2019). O score exige 5 dos 6 indicadores e por isso comeca em meados de 2018.
- Sinais por evento, nao por dia. Dias seguidos com o mesmo sinal nao contam
  como observacoes independentes.
- Regras fixadas antes de rodar, sem ajuste:
    NIVEL   compra quando o score cruza para >= +1; venda quando cruza para <= -1
    VIRADA  compra quando o score esteve >= +1 nos ultimos 14 dias e ja recuou
            0,5 a partir do maximo; venda espelhada
    Intervalo minimo de 30 dias entre eventos do mesmo tipo.
- Filtro de tendencia: cada evento e classificado pelo preco acima ou abaixo da
  media de 200 dias.
- Comparacao com o acaso: p-valor = fracao de 5.000 sorteios de N dias aleatorios
  do mesmo periodo com retorno medio tao bom quanto o dos eventos.
- Separacao 2018-2022 x 2023-2026.

Uso: python research/backtest_medio_prazo_v2.py
"""

import base64
import bisect
import datetime as dt
import json
import math
import os
import random
import ssl
import struct
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WINDOW, MIN_HISTORY = 365, 180
HORIZONS = (14, 30, 60, 90)
COOLDOWN, TURN_LOOKBACK, TURN_DROP = 30, 14, 0.5
SPLIT = "2023-01-01"
RANDOM_DRAWS = 5000
random.seed(42)

CTX = ssl.create_default_context()
if os.path.exists("/etc/ssl/cert.pem"):
    CTX.load_verify_locations("/etc/ssl/cert.pem")


def fetch(url, as_json=True):
    req = urllib.request.Request(url, headers={"User-Agent": "letabuild-backtest/1.0"})
    with urllib.request.urlopen(req, context=CTX, timeout=120) as r:
        body = r.read().decode("utf-8")
    return json.loads(body) if as_json else body


def plotly_series(url, trace_name):
    html = fetch(url, as_json=False)
    traces, _ = json.JSONDecoder().raw_decode(html, html.index("[", html.index("Plotly.newPlot(")))
    t = next(t for t in traces if t.get("name") == trace_name)

    def dec(v):
        if isinstance(v, dict) and "bdata" in v:
            raw = base64.b64decode(v["bdata"])
            f = {"f8": "d", "f4": "f"}[v["dtype"]]
            return list(struct.unpack("<%d%s" % (len(raw) // struct.calcsize(f), f), raw))
        return v
    return {str(x)[:10]: float(y) for x, y in zip(dec(t["x"]), dec(t["y"])) if y is not None and y == y}


def binance_funding():
    out, start = {}, 1567296000000
    while True:
        rows = fetch("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1000&startTime=%d" % start)
        if not rows:
            break
        for r in rows:
            d = dt.datetime.fromtimestamp(r["fundingTime"] / 1000, dt.timezone.utc).date().isoformat()
            out.setdefault(d, []).append(float(r["fundingRate"]))
        if len(rows) < 1000:
            break
        start = rows[-1]["fundingTime"] + 1
    return {d: sum(v) / len(v) for d, v in out.items()}


def rolling_mean(days, s, n):
    out, buf = {}, []
    for d in days:
        if d in s:
            buf = (buf + [s[d]])[-n:]
            if len(buf) == n:
                out[d] = sum(buf) / n
    return out


def rsi_last(c, n=14):
    if len(c) < n + 1:
        return None
    g = [max(c[i] - c[i - 1], 0) for i in range(1, len(c))]
    l = [max(c[i - 1] - c[i], 0) for i in range(1, len(c))]
    ag, al = sum(g[:n]) / n, sum(l[:n]) / n
    for a, b in zip(g[n:], l[n:]):
        ag, al = (ag * (n - 1) + a) / n, (al * (n - 1) + b) / n
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)


def note(p):
    return 2 if p < .10 else 1 if p < .25 else 0 if p < .75 else -1 if p < .90 else -2


def main():
    market = json.load(open(os.path.join(ROOT, "btc", "data", "market.json"), encoding="utf-8"))
    price = dict((d, p) for d, p in market["price"])
    days = sorted(d for d in price if d >= "2014-01-01")
    closes = [price[d] for d in days]
    idx = {d: i for i, d in enumerate(days)}

    sopr = {dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).date().isoformat(): v
            for ms, v in json.load(open(os.path.join(ROOT, "btc", "data", "sopr.json")))}
    raw = {
        "sopr": rolling_mean(days, sopr, 7),
        "sth_mvrv": plotly_series("https://charts-cdn.checkonchain.com/btconchain/unrealised/mvrv_sth/mvrv_sth_dark.html", "STH-MVRV"),
        "funding": rolling_mean(days, binance_funding(), 7),
        "fng": dict((d, v) for d, v in market["fng"]),
    }
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
    ma200 = {d: sum(closes[i - 199:i + 1]) / 200 for i, d in enumerate(days) if i >= 199}

    names = list(raw)
    notes = {}
    for n in names:
        hd = [d for d in days if d in raw[n]]
        notes[n] = {}
        for i, d in enumerate(hd):
            w = sorted(raw[n][x] for x in hd[max(0, i - WINDOW + 1):i + 1])
            if len(w) >= MIN_HISTORY:
                notes[n][d] = note(bisect.bisect_left(w, raw[n][d]) / len(w))

    score = {}
    for d in days:
        v = [notes[n][d] for n in names if d in notes[n]]
        if len(v) >= len(names) - 1:
            score[d] = sum(v) / len(v)
    sdays = [d for d in days if d in score]
    print("Score de %s a %s (%d dias). Inicio de cada serie: %s" % (
        sdays[0], sdays[-1], len(sdays), ", ".join("%s %s" % (n, min(notes[n])) for n in names)))

    def fwd(d, h):
        j = idx[d] + h
        return closes[j] / closes[idx[d]] - 1 if j < len(days) else None

    def events(kind):
        out, last = {"buy": [], "sell": []}, {"buy": None, "sell": None}
        for i, d in enumerate(sdays):
            s, prev = score[d], score[sdays[i - 1]] if i else None
            recent = [score[x] for x in sdays[max(0, i - TURN_LOOKBACK):i + 1]]
            if kind == "NIVEL":
                buy = prev is not None and prev < 1 <= s
                sell = prev is not None and prev > -1 >= s
            else:
                buy = max(recent) >= 1 and s <= max(recent) - TURN_DROP
                sell = min(recent) <= -1 and s >= min(recent) + TURN_DROP
            for side, hit in (("buy", buy), ("sell", sell)):
                if hit and (last[side] is None or idx[d] - idx[last[side]] >= COOLDOWN):
                    out[side].append(d)
                    last[side] = d
        return out

    def pval(evs, h, side, pool):
        obs = [x for d in evs if (x := fwd(d, h)) is not None]
        if not obs:
            return None, None, None
        pool_r = [x for d in pool if (x := fwd(d, h)) is not None]
        m = sum(obs) / len(obs)
        better = 0
        for _ in range(RANDOM_DRAWS):
            sample = random.sample(pool_r, len(obs))
            rm = sum(sample) / len(sample)
            better += (rm >= m) if side == "buy" else (rm <= m)
        hit = sum((x > 0) if side == "buy" else (x < 0) for x in obs) / len(obs)
        return m, better / RANDOM_DRAWS, hit

    def report(label, evs, side, pool):
        if not evs:
            print("  %-34s sem eventos" % label)
            return
        cells = []
        for h in HORIZONS:
            m, p, hit = pval(evs, h, side, pool)
            cells.append("%+6.1f%% p=%.2f" % (m * 100, p) if m is not None else "      -       ")
        _, _, hit90 = pval(evs, 90, side, pool)
        print("  %-34s n=%-3d %s  acerto90 %s" % (label, len(evs), "  ".join(cells),
              "%d%%" % (hit90 * 100) if hit90 is not None else "-"))

    for kind in ("NIVEL", "VIRADA"):
        ev = events(kind)
        print("\n=========== %s ===========" % kind)
        print("  %-34s %-5s %s" % ("", "", "  ".join("%-14s" % ("%dd" % h) for h in HORIZONS)))
        for side, nome in (("buy", "COMPRA"), ("sell", "VENDA")):
            pool = sdays
            report("%s tudo" % nome, ev[side], side, pool)
            report("%s 2018-2022" % nome, [d for d in ev[side] if d < SPLIT], side, [d for d in pool if d < SPLIT])
            report("%s 2023-2026" % nome, [d for d in ev[side] if d >= SPLIT], side, [d for d in pool if d >= SPLIT])
            report("%s acima da MM200" % nome, [d for d in ev[side] if d in ma200 and price[d] > ma200[d]], side, pool)
            report("%s abaixo da MM200" % nome, [d for d in ev[side] if d in ma200 and price[d] <= ma200[d]], side, pool)
        for side, nome in (("buy", "COMPRA"), ("sell", "VENDA")):
            print("  eventos de %s:" % nome)
            for d in ev[side]:
                r = [fwd(d, h) for h in (30, 90)]
                low = min(closes[idx[d]:idx[d] + 31]) / closes[idx[d]] - 1
                trend = "acima" if d in ma200 and price[d] > ma200[d] else "abaixo"
                print("    %s  preco %7.0f  score %+.2f  MM200 %-6s  30d %s  90d %s  pior queda em 30d %+.0f%%" % (
                    d, price[d], score[d], trend,
                    "%+5.0f%%" % (r[0] * 100) if r[0] is not None else "   - ",
                    "%+5.0f%%" % (r[1] * 100) if r[1] is not None else "   - ", low * 100))

    print("\nUltimos 10 dias:")
    for d in sdays[-10:]:
        print("  %s preco %6.0f score %+.2f  %s" % (d, price[d], score[d],
              " ".join("%s=%+d" % (n, notes[n][d]) for n in names if d in notes[n])))


if __name__ == "__main__":
    main()
