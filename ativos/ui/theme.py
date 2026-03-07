"""CSS custom dark mode para o Portfolio Analyzer."""

CUSTOM_CSS = """
<style>
    /* Remove Streamlit default padding */
    .block-container {
        padding-top: 1rem;
        padding-bottom: 1rem;
    }

    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: #0a0a0a;
        border-right: 1px solid #2a2218;
    }

    [data-testid="stSidebar"] .stMarkdown h1 {
        color: #e08a3a;
        font-size: 1.4rem;
        font-weight: 700;
        letter-spacing: -0.5px;
    }

    /* Metric cards */
    .metric-card {
        background: linear-gradient(135deg, #1a1610 0%, #241e16 100%);
        border: 1px solid #2a2218;
        border-radius: 12px;
        padding: 1.2rem;
        margin-bottom: 0.8rem;
        transition: border-color 0.2s;
    }

    .metric-card:hover {
        border-color: #e08a3a;
    }

    .metric-label {
        color: #d0b898;
        font-size: 0.78rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 0.3rem;
    }

    .metric-value {
        color: #FAFAFA;
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1.2;
    }

    .metric-value.positive {
        color: #3fb950;
    }

    .metric-value.negative {
        color: #FF6B6B;
    }

    .metric-delta {
        font-size: 0.8rem;
        margin-top: 0.2rem;
    }

    /* Section headers */
    .section-header {
        color: #FAFAFA;
        font-size: 1.1rem;
        font-weight: 600;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
        border-bottom: 2px solid #e08a3a;
        display: inline-block;
    }

    /* Info box */
    .info-box {
        background: #1a1610;
        border-left: 3px solid #6C63FF;
        border-radius: 0 8px 8px 0;
        padding: 0.8rem 1rem;
        margin: 0.8rem 0;
        color: #d0b898;
        font-size: 0.85rem;
    }

    /* Warning box */
    .warning-box {
        background: #1a1610;
        border-left: 3px solid #FFD93D;
        border-radius: 0 8px 8px 0;
        padding: 0.8rem 1rem;
        margin: 0.8rem 0;
        color: #d0b898;
        font-size: 0.85rem;
    }

    /* Custom table */
    .dataframe {
        border: none !important;
    }

    .dataframe th {
        background-color: #1a1610 !important;
        color: #d0b898 !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        font-size: 0.75rem !important;
        letter-spacing: 0.5px !important;
        border-bottom: 2px solid #2a2218 !important;
    }

    .dataframe td {
        background-color: #0a0a0a !important;
        color: #FAFAFA !important;
        border-bottom: 1px solid #1a1610 !important;
    }

    /* Tabs */
    .stTabs [data-baseweb="tab-list"] {
        gap: 2px;
        background-color: #1a1610;
        border-radius: 10px;
        padding: 4px;
    }

    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        color: #d0b898;
        font-weight: 500;
    }

    .stTabs [aria-selected="true"] {
        background-color: #e08a3a !important;
        color: #0a0a0a !important;
    }

    /* Selectbox */
    [data-baseweb="select"] {
        border-radius: 8px;
    }

    /* Buttons */
    .stButton > button {
        border-radius: 8px;
        font-weight: 600;
        border: 1px solid #2a2218;
        transition: all 0.2s;
    }

    .stButton > button:hover {
        border-color: #e08a3a;
        color: #e08a3a;
    }

    /* Number input */
    .stNumberInput > div > div > input {
        border-radius: 8px;
    }

    /* Divider */
    hr {
        border-color: #2a2218;
    }

    /* Back to letabuild button */
    .back-to-home {
        position: fixed;
        top: 12px;
        left: 12px;
        z-index: 999999;
        background: #1a1610;
        border: 1px solid #2a2218;
        border-radius: 8px;
        padding: 6px 14px;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .back-to-home:hover {
        border-color: #e08a3a;
        background: #241e16;
    }
    .back-to-home span {
        color: #d0b898;
        font-size: 0.85rem;
        font-weight: 500;
    }
    .back-to-home:hover span {
        color: #e08a3a;
    }

    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* Scrollbar */
    ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }
    ::-webkit-scrollbar-track {
        background: #0a0a0a;
    }
    ::-webkit-scrollbar-thumb {
        background: #2a2218;
        border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #3a3028;
    }
</style>
"""


def inject_theme():
    """Injeta o CSS custom no app Streamlit."""
    import streamlit as st
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)
