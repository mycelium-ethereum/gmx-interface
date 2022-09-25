import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import cx from "classnames";

import { createChart } from "krasulya-lightweight-charts";

import {
  USD_DECIMALS,
  SWAP,
  INCREASE,
  CHART_PERIODS,
  getTokenInfo,
  formatAmount,
  formatDateTime,
  usePrevious,
  getLiquidationPrice,
  useLocalStorageSerializeKey,
} from "../../Helpers";
import { useChartPrices, useMlpPrices } from "../../Api";
import Tab from "../../components/Tab/Tab";

import { getTokens, getToken } from "../../data/Tokens";

const PRICE_LINE_TEXT_WIDTH = 15;

const timezoneOffset = -new Date().getTimezoneOffset() * 60;

export function getChartToken(swapOption, fromToken, toToken, chainId) {
  if (!fromToken || !toToken) {
    return;
  }

  if (swapOption !== SWAP) {
    return toToken;
  }

  if (fromToken.isUsdg && toToken.isUsdg) {
    return getTokens(chainId).find((t) => t.isStable);
  }
  if (fromToken.isUsdg) {
    return toToken;
  }
  if (toToken.isUsdg) {
    return fromToken;
  }

  if (fromToken.isStable && toToken.isStable) {
    return toToken;
  }
  if (fromToken.isStable) {
    return toToken;
  }
  if (toToken.isStable) {
    return fromToken;
  }

  return toToken;
}

const DEFAULT_PERIOD = "4h";

const getSeriesOptions = () => ({
  // https://github.com/tradingview/lightweight-charts/blob/master/docs/area-series.md
  lineColor: "#4FE021",
  topColor: "rgba(49, 69, 131, 0.4)",
  bottomColor: "rgba(140, 198, 63, 0.2)",
  lineWidth: 2,
  priceLineColor: "rgba(0, 48, 0, 1)",
  downColor: "#FF5621",
  wickDownColor: "#FF5621",
  upColor: "#4FE021",
  wickUpColor: "#4FE021",
  borderVisible: false,

  // topColor: 'rgba(38, 198, 218, 0.56)',
  // bottomColor: 'rgba(38, 198, 218, 0.04)',
  // lineColor: 'rgba(38, 198, 218, 1)',
  // lineWidth: 2,
  // crossHairMarkerVisible: false,
});

const getChartOptions = (width, height) => ({
  width,
  height,
  layout: {
    backgroundColor: "rgba(255, 255, 255, 0)",
    textColor: "#ccc",
    fontFamily: "Inter",
  },
  localization: {
    // https://github.com/tradingview/lightweight-charts/blob/master/docs/customization.md#time-format
    timeFormatter: (businessDayOrTimestamp) => {
      return formatDateTime(businessDayOrTimestamp - timezoneOffset);
    },
  },
  grid: {
    vertLines: {
      visible: true,
      color: "rgba(0, 48, 0, 0.2)",
      style: 2,
    },
    horzLines: {
      visible: true,
      color: "rgba(0, 48, 0, 0.2)",
      style: 2,
    },
  },
  // https://github.com/tradingview/lightweight-charts/blob/master/docs/time-scale.md#time-scale
  timeScale: {
    rightOffset: 5,
    borderVisible: false,
    barSpacing: 5,
    timeVisible: true,
    fixLeftEdge: true,
  },
  // https://github.com/tradingview/lightweight-charts/blob/master/docs/customization.md#price-axis
  priceScale: {
    borderVisible: false,
    scaleMargins: {
        top: 0.6,
        bottom: 0,
    },
  },
  crosshair: {
    horzLine: {
      color: "#aaa",
    },
    vertLine: {
      color: "#aaa",
    },
    mode: 0,
  },
});

export default function MlpPriceChart(props) {
  const {
    swapOption,
    fromTokenAddress,
    toTokenAddress,
    infoTokens,
    chainId,
    sidebarVisible,
    trackAction,
  } = props;

  const priceData = useMlpPrices(chainId);

  const [currentChart, setCurrentChart] = useState();
  const [currentSeries, setCurrentSeries] = useState();

  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD);
  if (!(period in CHART_PERIODS)) {
    period = DEFAULT_PERIOD;
  }

  const [hoveredPoint, setHoveredPoint] = useState();

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  const toToken = getTokenInfo(infoTokens, toTokenAddress);

  const [chartToken, setChartToken] = useState({
    maxPrice: null,
    minPrice: null,
  });
  useEffect(() => {
    const tmp = getChartToken(swapOption, fromToken, toToken, chainId);
    setChartToken(tmp);
  }, [swapOption, fromToken, toToken, chainId]);

  const symbol = chartToken ? (chartToken.isWrapped ? chartToken.baseSymbol : chartToken.symbol) : undefined;
  const marketName = chartToken ? symbol + "_USD" : undefined;
  const previousMarketName = usePrevious(marketName);

  const ref = useRef(null);
  const chartRef = useRef(null);

  const currentAveragePrice =
    chartToken.maxPrice && chartToken.minPrice ? chartToken.maxPrice.add(chartToken.minPrice).div(2) : null;

  const [chartInited, setChartInited] = useState(false);
  useEffect(() => {
    if (marketName !== previousMarketName) {
      setChartInited(false);
    }
  }, [marketName, previousMarketName]);

  const scaleChart = useCallback(() => {
    const from = Date.now() / 1000 - (7 * 24 * CHART_PERIODS[period]) / 2 + timezoneOffset;
    const to = Date.now() / 1000 + timezoneOffset;
    currentChart.timeScale().setVisibleRange({ from, to });
  }, [currentChart, period]);

  const onCrosshairMove = useCallback(
    (evt) => {
      if (!evt.time) {
        setHoveredPoint(null);
        return;
      }
      const priceDataById = priceData.reduce((o, stat) => ({
        ...o,
        [stat.time]: {
          ...stat
        }
      }), {})

      const hoveredPoint = priceDataById[evt.time];
      if (!hoveredPoint) {
        return
      }
      
      setHoveredPoint(hoveredPoint);
    },
    [setHoveredPoint, priceData]
  );

  useEffect(() => {
    if (!ref.current || !priceData || !priceData.length || currentChart) {
      return;
    }

    const chart = createChart(
      chartRef.current,
      getChartOptions(chartRef.current.offsetWidth, chartRef.current.offsetHeight)
    );

    chart.subscribeCrosshairMove(onCrosshairMove);

    const series = chart.addAreaSeries(getSeriesOptions());

    setCurrentChart(chart);
    setCurrentSeries(series);
  }, [ref, priceData, currentChart, onCrosshairMove]);

  // useEffect(() => {
    // const interval = setInterval(() => {
      // updatePriceData(undefined, true);
    // }, 60 * 1000);
    // return () => clearInterval(interval);
  // }, [updatePriceData]);

  useEffect(() => {
    if (!currentChart) {
      return;
    }
    const resizeChart = () => {
      currentChart.resize(chartRef.current.offsetWidth, chartRef.current.offsetHeight);
    };
    window.addEventListener("resize", resizeChart);
    return () => window.removeEventListener("resize", resizeChart);
  }, [currentChart]);

  useEffect(() => {
    if (!currentChart) {
      return;
    }
    const resizeChart = () => {
      currentChart.resize(chartRef.current.offsetWidth, chartRef.current.offsetHeight);
    };
    let timeout = setTimeout(() => {
      resizeChart();
    }, 500);
    return () => clearTimeout(timeout);
  }, [currentChart, sidebarVisible]);

  useEffect(() => {
    if (currentSeries && priceData && priceData.length) {

      currentSeries.setData(priceData);
      currentChart.timeScale().fitContent();

      if (!chartInited) {
        scaleChart();
        setChartInited(true);
      }
    }
  }, [priceData, currentSeries, chartInited, scaleChart]);

  const candleStatsHtml = useMemo(() => {
    if (!priceData) {
      return null;
    }
    const candlestick = hoveredPoint || priceData[priceData.length - 1];
    if (!candlestick) {
      return null;
    }

    const className = cx({
      "ExchangeChart-bottom-stats": true,
      // positive: candlestick.open <= candlestick.close,
      // negative: candlestick.open > candlestick.close,
      // [`length-${String(parseInt(candlestick.close)).length}`]: true,
    });

    const toFixedNumbers = 3;

    return (
      <div className={className}>
        <span className="ExchangeChart-bottom-stats-label">p</span>
        <span className="ExchangeChart-bottom-stats-value">{candlestick.mlpPrice.toFixed(toFixedNumbers)}</span>
        <span className="ExchangeChart-bottom-stats-label">w/fees</span>
        <span className="ExchangeChart-bottom-stats-value">{candlestick.value.toFixed(toFixedNumbers)}</span>
        {/*
        <span className="ExchangeChart-bottom-stats-label">L</span>
        <span className="ExchangeChart-bottom-stats-value">{candlestick.low.toFixed(toFixedNumbers)}</span>
        <span className="ExchangeChart-bottom-stats-label">C</span>
        <span className="ExchangeChart-bottom-stats-value">{candlestick.close.toFixed(toFixedNumbers)}</span>
        */}
      </div>
    );
  }, [hoveredPoint, priceData]);

  let high;
  let low;
  let deltaPrice;
  let delta;
  let deltaPercentage;
  let deltaPercentageStr;

  const now = parseInt(Date.now() / 1000);
  const timeThreshold = now - 24 * 60 * 60;

  if (priceData) {
    for (let i = priceData.length - 1; i > 0; i--) {
      const price = priceData[i];
      if (price.time < timeThreshold) {
        break;
      }
      if (!low) {
        low = price.low;
      }
      if (!high) {
        high = price.high;
      }

      if (price.high > high) {
        high = price.high;
      }
      if (price.low < low) {
        low = price.low;
      }

      deltaPrice = price.open;
    }
  }

  if (deltaPrice && currentAveragePrice) {
    const average = parseFloat(formatAmount(currentAveragePrice, USD_DECIMALS, 2));
    delta = average - deltaPrice;
    deltaPercentage = (delta * 100) / average;
    if (deltaPercentage > 0) {
      deltaPercentageStr = `+${deltaPercentage.toFixed(2)}%`;
    } else {
      deltaPercentageStr = `${deltaPercentage.toFixed(2)}%`;
    }
    if (deltaPercentage === 0) {
      deltaPercentageStr = "0.00";
    }
  }

  if (!chartToken) {
    return null;
  }

  return (
    <div className="Mlp-price-chart ExchangeChart tv" ref={ref}>
      <div className="ExchangeChart-bottom App-box App-box-border">
        <div className="ExchangeChart-bottom-header">
          {/*
          <div className="ExchangeChart-bottom-controls">
            <Tab options={Object.keys(CHART_PERIODS)} option={period} setOption={setPeriod} trackAction={trackAction} />
          </div>
          */}
          {candleStatsHtml}
        </div>
        <div className="ExchangeChart-bottom-content" ref={chartRef}></div>
      </div>
    </div>
  );
}
