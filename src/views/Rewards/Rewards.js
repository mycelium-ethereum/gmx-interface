import React, { useState, useMemo, useEffect } from "react";

import useSWR from "swr";

import { getTokenInfo, useChainId, useENS } from "../../Helpers";
import { useWeb3React } from "@web3-react/core";
import { getTracerServerUrl } from "../../Api/rewards";
import { useInfoTokens } from "../../Api";
import { ethers } from "ethers";
import TraderRewards from "./TraderRewards";
import Leaderboard from "./Leaderboard";
import * as Styles from "./Rewards.styles";
import { LeaderboardSwitch } from "./ViewSwitch";
import Footer from "../../Footer";

const PersonalHeader = () => (
  <div className="Page-title-section mt-0">
    <div className="Page-title">Trader Rewards</div>
    <div className="Page-description">Be in the top 50 % of traders to earn weekly rewards.</div>
  </div>
);

const LeaderboardHeader = () => (
  <div className="Page-title-section mt-0">
    <div className="Page-title">Rewards Leaderboard</div>
    <div className="Page-description">Weekly user rankings by volume.</div>
  </div>
);

export default function Rewards(props) {
  const { connectWallet, trackPageWithTraits, trackAction, analytics } = props;
  const [currentView, setCurrentView] = useState("Personal");

  const { chainId } = useChainId();
  const { active, account, library } = useWeb3React();
  const { ensName } = useENS(account);

  const [selectedWeek, setSelectedWeek] = useState("latest");
  const [pageTracked, setPageTracked] = useState(false);
  const [nextRewards, setNextRewards] = useState(undefined);

  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);

  // Fetch all week data from server
  const { data: allWeeksRewardsData, error: failedFetchingRewards } = useSWR(
    [getTracerServerUrl(chainId, "/rewards")],
    {
      fetcher: (...args) => fetch(...args).then((res) => res.json()),
    }
  );
  console.log(allWeeksRewardsData);

  // Fetch only the latest week's data from server
  const { data: currentRewardWeek, error: failedFetchingWeekRewards } = useSWR(
    [getTracerServerUrl(chainId, "/rewards"), selectedWeek],
    {
      fetcher: (url, week) => fetch(`${url}&week=${week}`).then((res) => res.json()),
    }
  );

  // Get the data for the current user
  const userData = useMemo(
    () =>
      allWeeksRewardsData?.reduce(
        (totals, week) => {
          const trader = week.traders?.find((trader) => trader.user_address === account);
          if (!trader) {
            return totals;
          }
          return {
            totalTradingVolume: totals.totalTradingVolume.add(trader.volume),
            totalRewards: totals.totalRewards.add(trader.reward),
            unclaimedRewards: totals.unclaimedRewards.add(trader?.claimed ? trader.amount : 0),
          };
        },
        {
          totalTradingVolume: ethers.BigNumber.from(0),
          totalRewards: ethers.BigNumber.from(0),
          unclaimedRewards: ethers.BigNumber.from(0),
        }
      ),
    [allWeeksRewardsData, account]
  );

  // Extract week data from full API response
  const weekData = useMemo(() => {
    console.log("current", currentRewardWeek);
    if (!currentRewardWeek) {
      return undefined;
    }
    if (!!currentRewardWeek?.message) {
      return undefined;
    }
    const allWeeksRewardsData = currentRewardWeek;
    if (!allWeeksRewardsData) {
      return undefined;
    }
    allWeeksRewardsData.traders?.sort((a, b) => b.volume - a.volume); // Sort traders by highest to lowest in volume
    return allWeeksRewardsData;
  }, [currentRewardWeek]);

  // Get volume, position and reward from user week data
  const userWeekData = useMemo(() => {
    if (!currentRewardWeek) {
      return undefined;
    }
    const traderData = currentRewardWeek.traders?.find((trader) => trader.user_address === account);
    const leaderboardPosition = currentRewardWeek.traders?.findIndex((trader) => trader.user_address === account);
    // trader's data found
    if (traderData) {
      traderData.position = leaderboardPosition;
      return traderData;
    } else {
      // trader not found but data exists so user has no rewards
      return {
        volume: ethers.BigNumber.from(0),
        reward: ethers.BigNumber.from(0),
      };
    }
  }, [account, currentRewardWeek]);

  const eth = getTokenInfo(infoTokens, ethers.constants.AddressZero);
  const ethPrice = eth?.maxPrimaryPrice;

  let rewardAmountEth = 0;
  if (ethPrice && userWeekData) {
    rewardAmountEth = ethPrice.mul(userWeekData.reward);
  }

  let unclaimedRewardsEth, totalRewardAmountEth;
  if (ethPrice && userData) {
    unclaimedRewardsEth = ethPrice.mul(userData.unclaimedRewards);
    totalRewardAmountEth = ethPrice.mul(userData.totalRewards);
  }

  let rewardsMessage = "";
  if (!currentRewardWeek) {
    rewardsMessage = "Fetching rewards";
  } else if (!!failedFetchingWeekRewards) {
    rewardsMessage = "Failed fetching current week rewards";
  } else if (!!failedFetchingRewards) {
    rewardsMessage = "Failed fetching rewards";
  } else {
    if (allWeeksRewardsData?.length === 0) {
      rewardsMessage = "No rewards for network";
    } else if (selectedWeek === "latest") {
      rewardsMessage = `Week ${currentRewardWeek.week}`;
    } else {
      rewardsMessage = `Week ${selectedWeek + 1}`;
    }
  }

  const switchView = () => {
    setCurrentView(currentView === "Personal" ? "Leaderboard" : "Personal");
  };

  useEffect(() => {
    if (!!currentRewardWeek && nextRewards === undefined) {
      // this will load latest first and set next rewards
      setNextRewards(currentRewardWeek.end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRewardWeek])


  // Segment Analytics Page tracking
  useEffect(() => {
    if (!pageTracked && currentRewardWeek && analytics) {
      const traits = {
        week: currentRewardWeek.key
      };
      trackPageWithTraits(traits);
      setPageTracked(true); // Prevent Page function being called twice
    }
  }, [currentRewardWeek, pageTracked, trackPageWithTraits, analytics]);

  return (
    <Styles.StyledRewardsPage className="default-container page-layout">
      {
        {
          Personal: <PersonalHeader />,
          Leaderboard: <LeaderboardHeader />,
        }[currentView]
      }
      <LeaderboardSwitch
        switchView={switchView}
        currentView={currentView}
        rewardsMessage={rewardsMessage}
        allWeeksRewardsData={allWeeksRewardsData}
        setSelectedWeek={setSelectedWeek}
        trackAction={trackAction}
      />
      <TraderRewards
        active={active}
        account={account}
        ensName={ensName}
        userData={userData}
        totalRewardAmountEth={totalRewardAmountEth}
        unclaimedRewardsEth={unclaimedRewardsEth}
        rewardsMessage={rewardsMessage}
        allWeeksRewardsData={allWeeksRewardsData}
        setSelectedWeek={setSelectedWeek}
        connectWallet={connectWallet}
        userWeekData={userWeekData}
        rewardAmountEth={rewardAmountEth}
        currentView={currentView}
        trackAction={trackAction}
        nextRewards={nextRewards}
      />
      <Leaderboard
        weekData={weekData}
        userWeekData={userWeekData}
        userAccount={account}
        ensName={ensName}
        currentView={currentView}
        selectedWeek={selectedWeek}
        connectWallet={connectWallet}
        trackAction={trackAction}
      />
      <Footer />
    </Styles.StyledRewardsPage>
  );
}
