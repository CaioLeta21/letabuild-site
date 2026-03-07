"""Análise de Ativos - Entrypoint principal."""

import streamlit as st

st.set_page_config(
    page_title="Análise de Ativos",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

from ui.theme import inject_theme
from config.constants import CURRENCIES, DEFAULT_CURRENCY

inject_theme()

st.markdown(
    '<a href="https://letabuild.com" class="back-to-home" target="_self">'
    '<span>← letabuild.com</span></a>',
    unsafe_allow_html=True,
)

# ── Sidebar ──────────────────────────────────────────────
with st.sidebar:
    st.markdown("# Análise de Ativos")
    st.markdown("---")

    currency = st.selectbox(
        "Moeda de exibição",
        CURRENCIES,
        index=CURRENCIES.index(DEFAULT_CURRENCY),
        key="global_currency",
    )

    st.markdown(
        '<div class="info-box">Valores convertidos pela cotação atual</div>',
        unsafe_allow_html=True,
    )

# ── Página principal ─────────────────────────────────────
from ui.pages.explorar import render_explorar
render_explorar()
