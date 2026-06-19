"""
Data providers: abstract base + YFinanceDataProvider + MockDataProvider.
"""

from __future__ import annotations

import warnings
from abc import ABC, abstractmethod
from datetime import datetime, timedelta

import numpy as np
import pandas as pd


class DataProvider(ABC):
    @abstractmethod
    def get_ohlcv(self, symbol: str, start: str, end: str) -> pd.DataFrame:
        """Return DataFrame with columns: Open, High, Low, Close, Volume."""

    def get_close(self, symbol: str, start: str, end: str) -> pd.Series:
        return self.get_ohlcv(symbol, start, end)["Close"]


class YFinanceDataProvider(DataProvider):
    def get_ohlcv(self, symbol: str, start: str, end: str) -> pd.DataFrame:
        try:
            import yfinance as yf
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                df = yf.download(
                    symbol, start=start, end=end,
                    auto_adjust=True, progress=False, threads=False,
                )
            if df.empty:
                raise ValueError(f"No data for {symbol}")
            df = df[["Open", "High", "Low", "Close", "Volume"]]
            df.columns = ["Open", "High", "Low", "Close", "Volume"]
            df.index = pd.to_datetime(df.index).tz_localize(None)
            return df.dropna()
        except Exception as exc:
            raise RuntimeError(f"yfinance fetch failed for {symbol}: {exc}") from exc


class MockDataProvider(DataProvider):
    """Synthetic GBM price data — works without any API key."""

    def get_ohlcv(self, symbol: str, start: str, end: str) -> pd.DataFrame:
        np.random.seed(hash(symbol) % (2**31))
        dates = pd.bdate_range(start=start, end=end)
        n = len(dates)

        # Geometric Brownian Motion (~10% annual drift, realistic vol)
        mu, sigma = 0.00042, 0.011
        log_returns = np.random.normal(mu - 0.5 * sigma**2, sigma, n)
        # Add occasional drawdown days for realism
        log_returns[np.random.choice(n, n // 20, replace=False)] -= 0.018
        close = 100.0 * np.exp(np.cumsum(log_returns))

        noise = lambda s: close * np.random.uniform(-s, s, n)
        high   = close + np.abs(noise(0.008))
        low    = close - np.abs(noise(0.008))
        open_  = close * np.exp(np.random.normal(0, 0.003, n))
        volume = np.random.lognormal(mean=15, sigma=0.5, size=n)

        return pd.DataFrame(
            {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": volume},
            index=dates,
        )


def make_provider(source: str) -> DataProvider:
    if source == "yfinance":
        return YFinanceDataProvider()
    return MockDataProvider()
