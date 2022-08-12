import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TooltipComponent from "../../components/Tooltip/Tooltip";

import hexToRgba from "hex-to-rgba";
import { ethers } from "ethers";

import { getWhitelistedTokens } from "../../data/Tokens";
import { getFeeHistory } from "../../data/Fees";

import {
  fetcher,
  formatAmount,
  formatKeyAmount,
  expandDecimals,
  bigNumberify,
  numberWithCommas,
  formatDate,
  getServerUrl,
  getChainName,
  useChainId,
  USD_DECIMALS,
  MYC_DECIMALS,
  MLP_DECIMALS,
  BASIS_POINTS_DIVISOR,
  ARBITRUM,
  AVALANCHE,
  getTotalVolumeSum,
  MLP_POOL_COLORS,
  DEFAULT_MAX_USDG_AMOUNT,
  getPageTitle,
  ARBITRUM_TESTNET,
} from "../../Helpers";
import { useTotalTCRInLiquidity, useTCRPrice, useTotalTCRSupply, useInfoTokens } from "../../Api";

import { getContract } from "../../Addresses";

import VaultV2 from "../../abis/VaultV2.json";
import ReaderV2 from "../../abis/ReaderV2.json";
import MlpManager from "../../abis/MlpManager.json";
import Footer from "../../Footer";

import "./DashboardV2.css";

import mycToken from "../../img/ic_myc.svg";
import mlp40Icon from "../../img/ic_mlp_40.svg";
import avalanche16Icon from "../../img/ic_avalanche_16.svg";
import arbitrum16Icon from "../../img/ic_arbitrum_16.svg";
import arbitrum24Icon from "../../img/ic_arbitrum_24.svg";
import avalanche24Icon from "../../img/ic_avalanche_24.svg";

import AssetDropdown from "./AssetDropdown";
import SEO from "../../components/Common/SEO";

const { AddressZero } = ethers.constants;

function getVolumeInfo(hourlyVolume) {
  if (!hourlyVolume || hourlyVolume.length === 0) {
    return {};
  }

  const secondsPerHour = 60 * 60;
  const minTime = parseInt(Date.now() / 1000 / secondsPerHour) * secondsPerHour - 24 * secondsPerHour;

  const info = {};
  let totalVolume = bigNumberify(0);
  for (let i = 0; i < hourlyVolume.length; i++) {
    const item = hourlyVolume[i].data;
    if (parseInt(item.timestamp) < minTime) {
      break;
    }

    if (!info[item.token]) {
      info[item.token] = bigNumberify(0);
    }

    info[item.token] = info[item.token].add(item.volume);
    totalVolume = totalVolume.add(item.volume);
  }

  info.totalVolume = totalVolume;

  return info;
}

function getCurrentFeesUsd(tokenAddresses, fees, infoTokens) {
  if (!fees || !infoTokens) {
    return bigNumberify(0);
  }

  let currentFeesUsd = bigNumberify(0);
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i];
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || !tokenInfo.contractMinPrice) {
      continue;
    }

    const feeUsd = fees[i].mul(tokenInfo.contractMinPrice).div(expandDecimals(1, tokenInfo.decimals));
    currentFeesUsd = currentFeesUsd.add(feeUsd);
  }

  return currentFeesUsd;
}

export default function DashboardV2() {
  const { active, library } = useWeb3React();
  const { chainId } = useChainId();

  const chainName = getChainName(chainId);

  const positionStatsUrl = getServerUrl(chainId, "/position_stats");
  const { data: positionStats } = useSWR([positionStatsUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const hourlyVolumeUrl = getServerUrl(chainId, "/hourly_volume");
  const { data: hourlyVolume } = useSWR([hourlyVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const totalVolumeUrl = getServerUrl(chainId, "/total_volume");
  const { data: totalVolume } = useSWR([totalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  let { total: totalTCRSupply } = useTotalTCRSupply();

  let totalLongPositionSizes;
  let totalShortPositionSizes;
  if (positionStats && positionStats.totalLongPositionSizes && positionStats.totalShortPositionSizes) {
    totalLongPositionSizes = bigNumberify(positionStats.totalLongPositionSizes);
    totalShortPositionSizes = bigNumberify(positionStats.totalShortPositionSizes);
  }

  const volumeInfo = getVolumeInfo(hourlyVolume);

  const totalVolumeSum = getTotalVolumeSum(totalVolume);

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);

  const readerAddress = getContract(chainId, "Reader");
  const vaultAddress = getContract(chainId, "Vault");
  const mlpManagerAddress = getContract(chainId, "MlpManager");

  const tcrAddress = getContract(chainId, "TCR");
  const mlpAddress = getContract(chainId, "MLP");
  const usdgAddress = getContract(chainId, "USDG");

  const tokensForSupplyQuery = [tcrAddress, mlpAddress, usdgAddress];

  const { data: aums } = useSWR([`Dashboard:getAums:${active}`, chainId, mlpManagerAddress, "getAums"], {
    fetcher: fetcher(library, MlpManager),
  });

  const { data: fees } = useSWR([`Dashboard:fees:${active}`, chainId, readerAddress, "getFees", vaultAddress], {
    fetcher: fetcher(library, ReaderV2, [whitelistedTokenAddresses]),
  });

  const { data: totalSupplies } = useSWR(
    [`Dashboard:totalSupplies:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", AddressZero],
    {
      fetcher: fetcher(library, ReaderV2, [tokensForSupplyQuery]),
    }
  );

  const { data: totalTokenWeights } = useSWR(
    [`MlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: fetcher(library, VaultV2),
    }
  );

  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);

  const currentFeesUsd = getCurrentFeesUsd(whitelistedTokenAddresses, fees, infoTokens);

  const feeHistory = getFeeHistory(chainId);
  const shouldIncludeCurrrentFees = feeHistory.length && parseInt(Date.now() / 1000) - feeHistory[0].to > 60 * 60;
  let totalFeesDistributed = shouldIncludeCurrrentFees
    ? parseFloat(bigNumberify(formatAmount(currentFeesUsd, USD_DECIMALS - 2, 0, false)).toNumber()) / 100
    : 0;
  for (let i = 0; i < feeHistory.length; i++) {
    totalFeesDistributed += parseFloat(feeHistory[i].feeUsd);
  }

  const { tcrPrice, tcrPriceFromMainnet, tcrPriceFromArbitrum } = useTCRPrice(
    chainId,
    { arbitrum: chainId === ARBITRUM ? library : undefined },
    active
  );

  let { mainnet: totalTCRInLiquidityMainnet, arbitrum: totalTCRInLiquidityArbitrum } = useTotalTCRInLiquidity(
    chainId,
    active
  );

  let mycMarketCap;
  if (tcrPrice && totalTCRSupply) {
    mycMarketCap = tcrPrice.mul(totalTCRSupply).div(expandDecimals(1, MYC_DECIMALS));
  }

  let aum;
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2);
  }

  let mlpPrice;
  let mlpSupply;
  let mlpMarketCap;
  if (aum && totalSupplies && totalSupplies[3]) {
    mlpSupply = totalSupplies[3];
    mlpPrice =
      aum && aum.gt(0) && mlpSupply.gt(0)
        ? aum.mul(expandDecimals(1, MLP_DECIMALS)).div(mlpSupply)
        : expandDecimals(1, USD_DECIMALS);
    mlpMarketCap = mlpPrice.mul(mlpSupply).div(expandDecimals(1, MLP_DECIMALS));
  }

  let adjustedUsdgSupply = bigNumberify(0);

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount) {
      adjustedUsdgSupply = adjustedUsdgSupply.add(tokenInfo.usdgAmount);
    }
  }

  const getWeightText = (tokenInfo) => {
    if (
      !tokenInfo.weight ||
      !tokenInfo.usdgAmount ||
      !adjustedUsdgSupply ||
      adjustedUsdgSupply.eq(0) ||
      !totalTokenWeights
    ) {
      return "...";
    }

    const currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdgSupply);
    const targetWeightBps = tokenInfo.weight.mul(BASIS_POINTS_DIVISOR).div(totalTokenWeights);

    const weightText = `${formatAmount(currentWeightBps, 2, 2, false)}% / ${formatAmount(
      targetWeightBps,
      2,
      2,
      false
    )}%`;

    return (
      <TooltipComponent
        handle={weightText}
        position="right-bottom"
        renderContent={() => {
          return (
            <>
              Current Weight: {formatAmount(currentWeightBps, 2, 2, false)}%<br />
              Target Weight: {formatAmount(targetWeightBps, 2, 2, false)}%<br />
              <br />
              {currentWeightBps.lt(targetWeightBps) && (
                <div>
                  {tokenInfo.symbol} is below its target weight.
                  <br />
                  <br />
                  Get lower fees to{" "}
                  <Link to="/buy_mlp" target="_blank" rel="noopener noreferrer">
                    buy MLP
                  </Link>{" "}
                  with {tokenInfo.symbol},&nbsp; and to{" "}
                  <Link to="/" target="_blank" rel="noopener noreferrer">
                    swap
                  </Link>{" "}
                  {tokenInfo.symbol} for other tokens.
                </div>
              )}
              {currentWeightBps.gt(targetWeightBps) && (
                <div>
                  {tokenInfo.symbol} is above its target weight.
                  <br />
                  <br />
                  Get lower fees to{" "}
                  <Link to="/" target="_blank" rel="noopener noreferrer">
                    swap
                  </Link>{" "}
                  tokens for {tokenInfo.symbol}.
                </div>
              )}
              <br />
              <div>
                <a
                  href="https://tracer-1.gitbook.io/tracer-perpetual-swaps/6VOYVKGbCCw0I8cj7vdF/protocol-design/shared-liquidity-pool/mlp-token-pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  More Info
                </a>
              </div>
            </>
          );
        }}
      />
    );
  };

  // TODO change this to TCR liquidity
  // let stakedPercent = 0;
  // if (totalTCRSupply && !totalTCRSupply.isZero() && !totalStakedMyc.isZero()) {
  // stakedPercent = totalStakedMyc.mul(100).div(totalTCRSupply).toNumber();
  // }

  let arbitrumLiquidityPercent = 0;
  if (totalTCRSupply && !totalTCRSupply.isZero() && totalTCRInLiquidityArbitrum) {
    arbitrumLiquidityPercent = totalTCRInLiquidityArbitrum.mul(100).div(totalTCRSupply).toNumber();
  }

  let mainnetLiquidityPercent = 0;
  if (totalTCRSupply && !totalTCRSupply.isZero() && totalTCRInLiquidityMainnet) {
    mainnetLiquidityPercent = totalTCRInLiquidityMainnet.mul(100).div(totalTCRSupply).toNumber();
  }

  let notStakedPercent = 100 - arbitrumLiquidityPercent - mainnetLiquidityPercent; // - stakedPercent;
  let mycDistributionData = [
    // {
    // name: "staked",
    // value: stakedPercent,
    // color: "#4353fa",
    // },
    {
      name: "in Arbitrum liquidity",
      value: arbitrumLiquidityPercent,
      color: "#0598fa",
    },
    {
      name: "in Mainnet liquidity",
      value: mainnetLiquidityPercent,
      color: "#4353fa",
    },
    {
      name: "in wallets",
      value: notStakedPercent,
      color: "#5c0af5",
    },
  ];

  const totalStatsStartDate = chainId === AVALANCHE ? "06 Jan 2022" : "01 Sep 2021";

  let stableMlp = 0;
  let totalMlp = 0;

  let mlpPool = tokenList.map((token) => {
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo.usdgAmount && adjustedUsdgSupply && !adjustedUsdgSupply.eq(0)) {
      const currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdgSupply);
      if (tokenInfo.isStable) {
        stableMlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      }
      totalMlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      return {
        fullname: token.name,
        name: token.symbol,
        value: parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`),
      };
    }
    return null;
  });

  let stablePercentage = totalMlp > 0 ? ((stableMlp * 100) / totalMlp).toFixed(2) : "0.0";

  mlpPool = mlpPool.filter(function (element) {
    return element !== null;
  });

  mlpPool = mlpPool.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  mycDistributionData = mycDistributionData.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  const [mycActiveIndex, setMYCActiveIndex] = useState(null);

  const onMYCDistributionChartEnter = (_, index) => {
    setMYCActiveIndex(index);
  };

  const onMYCDistributionChartLeave = (_, index) => {
    setMYCActiveIndex(null);
  };

  const [mlpActiveIndex, setMLPActiveIndex] = useState(null);

  const onMLPPoolChartEnter = (_, index) => {
    setMLPActiveIndex(index);
  };

  const onMLPPoolChartLeave = (_, index) => {
    setMLPActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="stats-label">
          <div className="stats-label-color" style={{ backgroundColor: payload[0].color }}></div>
          {payload[0].value}% {payload[0].name}
        </div>
      );
    }

    return null;
  };

  return (
    <SEO
      title={getPageTitle("Dashboard")}
      description="View stats on Mycelium Perpetual Swaps, the MYC token, the MLP token and the MLP liquidity pool."
    >
      <div className="default-container DashboardV2 page-layout">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              Stats {chainId === AVALANCHE && <img src={avalanche24Icon} alt="avalanche24Icon" />}
              {(chainId === ARBITRUM || chainId === ARBITRUM_TESTNET) && (
                <img src={arbitrum24Icon} alt="arbitrum24Icon" />
              )}
            </div>
            <div className="Page-description">
              {chainName} Total Stats start from {totalStatsStartDate}.<br />
            </div>
          </div>
        </div>
        <div className="DashboardV2-content">
          <div className="DashboardV2-cards">
            <div className="App-card">
              <div className="App-card-title">Overview</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                {/*<div className="App-card-row">
                  <div className="label">AUM</div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(tvl, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() => `Assets Under Management: MYC staked (All chains) + MLP pool (${chainName})`}
                    />
                  </div>
                </div>
                */}
                <div className="App-card-row">
                  <div className="label">MLP Pool</div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(aum, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() => `Total value of tokens in MLP pool (${chainName})`}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">24h Volume</div>
                  <div>${formatAmount(volumeInfo.totalVolume, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Long Positions</div>
                  <div>${formatAmount(totalLongPositionSizes, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Short Positions</div>
                  <div>${formatAmount(totalShortPositionSizes, USD_DECIMALS, 0, true)}</div>
                </div>
                {feeHistory.length ? (
                  <div className="App-card-row">
                    <div className="label">Fees since {formatDate(feeHistory[0].to)}</div>
                    <div>${formatAmount(currentFeesUsd, USD_DECIMALS, 2, true)}</div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">Total Stats</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Total Fees</div>
                  <div>${numberWithCommas(totalFeesDistributed.toFixed(0))}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Total Volume</div>
                  <div>${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">
              Tokens {chainId === AVALANCHE && <img src={avalanche24Icon} alt="avalanche24Icon" />}
              {chainId === ARBITRUM && <img src={arbitrum24Icon} alt="arbitrum24Icon" />}
            </div>
            <div className="Page-description">Platform and MLP index tokens.</div>
          </div>
          <div className="DashboardV2-token-cards">
            <div className="stats-wrapper stats-wrapper--myc">
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={mycToken} alt="mycToken" />
                      </div>
                      <div className="App-card-title-mark-info">
                        <div className="App-card-title-mark-title">MYC</div>
                        <div className="App-card-title-mark-subtitle">MYC</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol="TCR" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Price</div>
                      <div>
                        {!tcrPrice && "..."}
                        {tcrPrice && (
                          <TooltipComponent
                            position="right-bottom"
                            className="nowrap"
                            handle={`$${formatAmount(tcrPrice, USD_DECIMALS, 3, true)}`}
                            renderContent={() => (
                              <>
                                Price on Arbitrum: ${formatAmount(tcrPriceFromArbitrum, USD_DECIMALS, 4, true)}
                                <br />
                                Price on Mainnet: ${formatAmount(tcrPriceFromMainnet, USD_DECIMALS, 4, true)}
                              </>
                            )}
                          />
                        )}
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Supply</div>
                      <div>{formatAmount(totalTCRSupply, MYC_DECIMALS, 0, true)} MYC</div>
                    </div>
                    {/*<div className="App-card-row">
                      <div className="label">Total Staked</div>
                      <div>
                        {
                          <TooltipComponent
                            position="right-bottom"
                            className="nowrap"
                            handle={`$${formatAmount(stakedMycSupplyUsd, USD_DECIMALS, 0, true)}`}
                            renderContent={() => (
                              <>
                                Staked on Arbitrum: {formatAmount(arbitrumStakedMyc, MYC_DECIMALS, 0, true)} MYC
                                <br />
                                Staked on Avalanche: {formatAmount(avaxStakedMyc, MYC_DECIMALS, 0, true)} MYC
                              </>
                            )}
                          />
                        }
                      </div>
                    </div>*/}
                    <div className="App-card-row">
                      <div className="label">Market Cap</div>
                      <div>${formatAmount(mycMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                  </div>
                </div>
                <div className="stats-piechart" onMouseLeave={onMYCDistributionChartLeave}>
                  {mycDistributionData.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={mycDistributionData}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={2}
                        onMouseEnter={onMYCDistributionChartEnter}
                        onMouseOut={onMYCDistributionChartLeave}
                        onMouseLeave={onMYCDistributionChartLeave}
                      >
                        {mycDistributionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            style={{
                              filter:
                                mycActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(entry.color, 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={entry.color}
                            strokeWidth={mycActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        Distribution
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={mlp40Icon} alt="mlp40Icon" />
                      </div>
                      <div className="App-card-title-mark-info">
                        <div className="App-card-title-mark-title">MLP</div>
                        <div className="App-card-title-mark-subtitle">MLP</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol="MLP" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Price</div>
                      <div>${formatAmount(mlpPrice, USD_DECIMALS, 3, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Supply</div>
                      <div>{formatAmount(mlpSupply, MLP_DECIMALS, 0, true)} MLP</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Total Staked</div>
                      <div>${formatAmount(mlpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Market Cap</div>
                      <div>${formatAmount(mlpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Stablecoin Percentage</div>
                      <div>{stablePercentage}%</div>
                    </div>
                  </div>
                </div>
                <div className="stats-piechart" onMouseOut={onMLPPoolChartLeave}>
                  {mlpPool.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={mlpPool}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        onMouseEnter={onMLPPoolChartEnter}
                        onMouseOut={onMLPPoolChartLeave}
                        onMouseLeave={onMLPPoolChartLeave}
                        paddingAngle={2}
                      >
                        {mlpPool.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={MLP_POOL_COLORS[entry.name]}
                            style={{
                              filter:
                                mlpActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(MLP_POOL_COLORS[entry.name], 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={MLP_POOL_COLORS[entry.name]}
                            strokeWidth={mlpActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        MLP Pool
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
            </div>
            <div className="token-table-wrapper App-card">
              <div className="App-card-title">
                MLP Index Composition {chainId === AVALANCHE && <img src={avalanche16Icon} alt="avalanche16Icon" />}
                {chainId === ARBITRUM && <img src={arbitrum16Icon} alt="arbitrum16Icon" />}
              </div>
              <div className="App-card-divider"></div>
              <table className="token-table">
                <thead>
                  <tr>
                    <th>TOKEN</th>
                    <th>PRICE</th>
                    <th>POOL</th>
                    <th>WEIGHT</th>
                    <th>UTILIZATION</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenList.map((token) => {
                    const tokenInfo = infoTokens[token.address];
                    let utilization = bigNumberify(0);
                    if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                      utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                    }
                    let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                    if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                      maxUsdgAmount = tokenInfo.maxUsdgAmount;
                    }

                    var tokenImage = null;

                    try {
                      tokenImage = require("../../img/ic_" + token.symbol.toLowerCase() + "_40.svg");
                    } catch (error) {
                      console.error(error);
                    }

                    return (
                      <tr key={token.symbol}>
                        <td>
                          <div className="token-symbol-wrapper">
                            <div className="App-card-title-info">
                              <div className="App-card-title-info-icon">
                                <img src={tokenImage && tokenImage.default} alt={token.symbol} width="40px" />
                              </div>
                              <div className="App-card-title-info-text">
                                <div className="App-card-info-title">{token.name}</div>
                                <div className="App-card-info-subtitle">{token.symbol}</div>
                              </div>
                              <div>
                                <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</td>
                        <td>
                          <TooltipComponent
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            renderContent={() => {
                              return (
                                <>
                                  Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)}{" "}
                                  {token.symbol}
                                  <br />
                                  <br />
                                  Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdgAmount, 18, 0, true)}
                                </>
                              );
                            }}
                          />
                        </td>
                        <td>{getWeightText(tokenInfo)}</td>
                        <td>{formatAmount(utilization, 2, 2, false)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="token-grid">
              {tokenList.map((token) => {
                const tokenInfo = infoTokens[token.address];
                let utilization = bigNumberify(0);
                if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                  utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                }
                let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                  maxUsdgAmount = tokenInfo.maxUsdgAmount;
                }

                return (
                  <div className="App-card" key={token.symbol}>
                    <div className="App-card-title">
                      <div style={{ display: "flex" }}>
                        {token.symbol}
                        <div>
                          <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                        </div>
                      </div>
                    </div>
                    <div className="App-card-divider"></div>
                    <div className="App-card-content">
                      <div className="App-card-row">
                        <div className="label">Price</div>
                        <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Pool</div>
                        <div>
                          <TooltipComponent
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            renderContent={() => {
                              return (
                                <>
                                  Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)}{" "}
                                  {token.symbol}
                                  <br />
                                  <br />
                                  Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdgAmount, 18, 0, true)}
                                </>
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Weight</div>
                        <div>{getWeightText(tokenInfo)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Utilization</div>
                        <div>{formatAmount(utilization, 2, 2, false)}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
