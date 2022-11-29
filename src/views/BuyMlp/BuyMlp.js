import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import MlpSwap from "../../components/Mlp/MlpSwap";

import "./BuyMlp.css";

import { getPageTitle, useChainId } from "../../Helpers";
import { getNativeToken } from "../../data/Tokens";
import SEO from "../../components/Common/SEO";
import { Text } from "../../components/Translation/Text";

export default function BuyMlp(props) {
  const { chainId } = useChainId();
  const history = useHistory();
  const [isBuying, setIsBuying] = useState(true);
  const nativeTokenSymbol = getNativeToken(chainId).symbol;

  useEffect(() => {
    const hash = history.location.hash.replace("#", "");
    const buying = hash === "redeem" ? false : true;
    setIsBuying(buying);
  }, [history.location.hash]);

  return (
    <>
      <SEO
        title={getPageTitle("Buy")}
        description="Buy MLP tokens to provide liquidity to Mycelium’s Perpetual Swaps. MLP tokens represent a share in a yield bearing diversified pool of blue-chip crypto assets."
      />
      <div className="default-container buy-tlp-content page-layout">
        <div className="section-title-block">
          {/*
            <div className="section-title-icon">
              <img src={buyMLPIcon} alt="buyMLPIcon" />
            </div>
          */}
          <div className="section-title-content">
            <div className="Page-title">
              <Text>Buy / Sell</Text> MLP
            </div>
            <div className="Page-description">
              <Text>Purchase MLP tokens to earn {nativeTokenSymbol} fees from swaps and leverages trading.</Text>
              <br />
              <Text>Note that there is a minimum holding time of 15 minutes after a purchase.</Text>
              <br />
              <Link to="/earn">
                <Text>View staking page.</Text>
              </Link>{" "}
              <a href="https://mycelium.xyz/rewards-terms-of-use" target="_blank" rel="noopener noreferrer">
                <Text>Terms of Use here.</Text>
              </a>
            </div>
          </div>
        </div>
        <MlpSwap {...props} isBuying={isBuying} setIsBuying={setIsBuying} />
      </div>
    </>
  );
}
