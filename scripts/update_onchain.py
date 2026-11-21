#!/usr/bin/env python3
"""
Atualiza SOPR e CVDD usados no Termometro do Bitcoin (letabuild.com/btc/).

Por que este script existe
--------------------------
Os dois indicadores vinham de arquivos estaticos no servidor Oracle
(btc.letabuild.com/api/sopr e /api/cvdd-history-v2) e ficaram congelados sem
ninguem perceber:

- SOPR parou em 2026-07-21. O fetch_sopr.sh do servidor procurava os dados
  embutidos no HTML da BGeometrics; a pagina passou a carrega-los de um JSON
  separado e o parse falhava em silencio.
- CVDD parou em 2026-04-02. O arquivo "v2" nao tinha script de atualizacao.

Agora os dados sao gravados no proprio repositorio, e o Cloudflare publica a
partir dele.

SOPR
----
Fonte: checkonchain (James Check), grafico Plotly em
https://charts-cdn.checkonchain.com/btconchain/realised/sopr/sopr_dark.html
Sai com D-1 (o dia corrente tambem aparece, mas ainda em formacao, e e
descartado). Historico desde 2011.

Antes era a BGeometrics (sopr_data.json e a API bitcoin-data.com, que sao a
mesma serie), mas ela publica com ~1 semana de atraso, o que esconde o SOPR
justamente nas quedas fortes. As duas series medem o mesmo conceito, mas a do
checkonchain oscila um pouco mais (mediana da diferenca 0,005; mesma nota de
score em 84% dos dias do ultimo ano). As faixas do score (0,95/0,99/1,04/1,08)
sao os niveis classicos de SOPR e valem para as duas.

CVDD
----
Ha duas series com o nome CVDD:

- a "v2" (a que o site sempre usou): 3.199 em 2018-12-15 e 15.602 em 2022-11-21,
  exatamente os fundos de ciclo. E o CVDD de Willy Woo, cuja razao de ser e
  marcar o piso historico do preco.
- a do api.bitcoin-data.com: 4.699 em 2022-11-21, com o preco 3,4x acima do
  "piso" no fundo do ciclo. Escala diferente, nao serve como piso.

A razao v2 / bitcoin-data e quase constante: oscilou entre 3,39 e 3,43 no ano
anterior a abr/2026 (3,32 em 2022), com picos isolados de ~3% quando as duas
series registram o mesmo salto com um dia de diferenca. Entao o historico v2
ate ANCHOR_UNTIL fica congelado no arquivo, e os dias seguintes sao a serie do
bitcoin-data multiplicada pela mediana da razao nos ultimos 90 dias de
sobreposicao. A incerteza fica em torno de 1-2%, irrelevante para as faixas
do score (1,5x / 3x / 6x / 10x).

Saidas
------
btc/data/sopr.json            [[ms, sopr], ...]
btc/data/cvdd.json            [{"d": "YYYY-MM-DD", "v": cvdd}, ...]
btc/data/cvdd-btc-merged.json [{"d": ..., "btc": preco, "cvdd": cvdd}, ...]

Se uma fonte falhar, o arquivo dela fica como estava e o script termina com
codigo 1. A Action fica vermelha e o GitHub manda e-mail. A pagina, por sua vez,
marca como DESATUALIZADO e tira da media qualquer indicador com mais de 10 dias.

Uso
---
    python scripts/update_onchain.py
"""

import base64
import datetime as dt
import json
import os
import struct
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from update_supply_profit import (  # noqa: E402
    USER_AGENT,
    fetch_bitcoin_data_series,
    fetch_prices,
    from_ms,
    to_ms,
)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO_ROOT, "btc", "data")
SOPR_PATH = os.path.join(DATA_DIR, "sopr.json")
CVDD_PATH = os.path.join(DATA_DIR, "cvdd.json")
MERGED_PATH = os.path.join(DATA_DIR, "cvdd-btc-merged.json")

SOPR_URL = "https://charts-cdn.checkonchain.com/btconchain/realised/sopr/sopr_dark.html"
SOPR_TRACE = "Spent Output Profit Ratio (SOPR)"

ANCHOR_UNTIL = "2026-04-02"   # ultimo dia da serie v2 original
CALIB_DAYS = 365              # janela de sobreposicao usada para checar estabilidade
RATIO_DAYS = 90               # a razao aplicada e a mediana dos ultimos N dias
MAX_RATIO_DEV = 0.03          # p95 do desvio da razao acima disso = falha
MAX_SOURCE_AGE_DAYS = 30      # fonte mais velha que isso = falha


def today():
    return dt.datetime.now(dt.timezone.utc).date()


def days_between(a, b):
    return (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days


def write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(data, handle, separators=(",", ":"))
    os.replace(tmp, path)


def check_fresh(name, last_day):
    age = days_between(last_day, today().isoformat())
    if age > MAX_SOURCE_AGE_DAYS:
        raise RuntimeError("%s: ultimo dado e de %s (%d dias)" % (name, last_day, age))


def fetch_text(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read().decode("utf-8")


def decode_plotly(values):
    """Plotly guarda arrays numericos como {"dtype": "f8", "bdata": base64}."""
    if isinstance(values, dict) and "bdata" in values:
        raw = base64.b64decode(values["bdata"])
        fmt = {"f8": "d", "f4": "f"}[values["dtype"]]
        return list(struct.unpack("<%d%s" % (len(raw) // struct.calcsize(fmt), fmt), raw))
    return values


def update_sopr():
    html = fetch_text(SOPR_URL)
    pos = html.find("Plotly.newPlot(")
    if pos < 0:
        raise RuntimeError("SOPR: grafico Plotly nao encontrado em %s" % SOPR_URL)
    traces, _ = json.JSONDecoder().raw_decode(html, html.index("[", pos))
    trace = next((t for t in traces if t.get("name") == SOPR_TRACE), None)
    if trace is None:
        raise RuntimeError("SOPR: serie '%s' nao encontrada (o checkonchain mudou o grafico?)" % SOPR_TRACE)
    xs, ys = decode_plotly(trace["x"]), decode_plotly(trace["y"])
    # o dia corrente ainda esta em formacao: so entram dias fechados
    yesterday = (today() - dt.timedelta(days=1)).isoformat()
    out = []
    for x, y in zip(xs, ys):
        day = str(x)[:10]
        if y is None or y != y or day > yesterday:  # y != y -> NaN
            continue
        out.append([to_ms(day), round(float(y), 4)])
    out.sort(key=lambda r: r[0])
    if len(out) < 3000 or not all(0.5 < v < 2 for _, v in out[-400:]):
        raise RuntimeError("SOPR: serie com formato inesperado (%d pontos)" % len(out))
    check_fresh("SOPR", from_ms(out[-1][0]))
    write_json(SOPR_PATH, out)
    print("SOPR: %d pontos, ultimo %s = %s" % (len(out), from_ms(out[-1][0]), out[-1][1]))


def update_cvdd():
    with open(CVDD_PATH, encoding="utf-8") as handle:
        current = json.load(handle)
    anchor = {r["d"]: r["v"] for r in current if r["d"] <= ANCHOR_UNTIL}
    if ANCHOR_UNTIL not in anchor:
        raise RuntimeError("CVDD: historico v2 ate %s ausente em %s" % (ANCHOR_UNTIL, CVDD_PATH))

    calib_start = (dt.date.fromisoformat(ANCHOR_UNTIL) - dt.timedelta(days=CALIB_DAYS)).isoformat()
    upstream = fetch_bitcoin_data_series("cvdd", "cvdd", calib_start, today().isoformat())
    if not upstream:
        raise RuntimeError("CVDD: bitcoin-data nao devolveu dados")

    overlap = sorted(d for d in upstream if d in anchor and upstream[d] > 0)
    if len(overlap) < 200:
        raise RuntimeError("CVDD: sobreposicao insuficiente para calibrar (%d dias)" % len(overlap))
    ratios = [anchor[d] / upstream[d] for d in overlap]
    recent = sorted(ratios[-RATIO_DAYS:])
    ratio = recent[len(recent) // 2]
    devs = sorted(abs(r - ratio) / ratio for r in ratios)
    p95 = devs[int(len(devs) * 0.95)]
    print("CVDD: razao v2/bitcoin-data = %.4f (mediana dos ultimos %d dias); desvio no ultimo ano: p95 %.2f%%, max %.2f%%"
          % (ratio, RATIO_DAYS, p95 * 100, devs[-1] * 100))
    if p95 > MAX_RATIO_DEV:
        raise RuntimeError("CVDD: razao entre as series deixou de ser estavel (p95 %.1f%%)" % (p95 * 100))

    series = dict(anchor)
    for d, v in upstream.items():
        if d > ANCHOR_UNTIL and v > 0:
            series[d] = round(v * ratio, 2)
    days = sorted(series)
    check_fresh("CVDD", days[-1])
    write_json(CVDD_PATH, [{"d": d, "v": series[d]} for d in days])
    print("CVDD: %d pontos, ultimo %s = %.0f" % (len(days), days[-1], series[days[-1]]))

    prices = fetch_prices(days[0], today().isoformat())
    merged, last_price = [], None
    for d in days:
        last_price = prices.get(d, last_price)
        if last_price is not None:
            merged.append({"d": d, "btc": round(last_price, 2), "cvdd": series[d]})
    write_json(MERGED_PATH, merged)
    print("CVDD+preco: %d pontos" % len(merged))


def main():
    jobs = (("SOPR", update_sopr), ("CVDD", update_cvdd))
    only = set(sys.argv[1:])
    failures = []
    for name, job in jobs:
        if only and name.lower() not in only:
            continue
        try:
            job()
        except Exception as error:  # noqa: BLE001
            failures.append("%s: %s" % (name, error))
            print("FALHA %s: %s" % (name, error), file=sys.stderr)
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
