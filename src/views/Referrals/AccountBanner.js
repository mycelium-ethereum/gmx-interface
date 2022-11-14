import React from "react";
import Davatar from "@davatar/react";
import * as Styles from "./Referrals.styles";
import {
  formatAmount,
  shortenAddress,
  USD_DECIMALS,
} from "../../Helpers";
import CopyIcon from "../../img/copy.svg";
import Tooltip from "../../components/Tooltip/Tooltip";
import { copyReferralCode, getTierIdDisplay } from "../../utils/referrals";
import { TIER_DISCOUNT_INFO } from "../../config/referrals";

export default function AccountBanner(props) {
  const {
    active,
    account,
    ensName,
    currentView,
    // rebates
    tradersTier,
    tradersRebates,
    tradersVolume,
    referralCodeInString,
    // commissions
    referrerTier,
    referrerRebates,
    referrerVolume,
  } = props;

  const getInfo = () => {
    if (!active) {
      return;
    } else if (currentView === "Rebates") {
      return (
        <>
          <div className="App-card-row">
            <div className="label">Total Volume Traded</div>
            <div>${formatAmount(tradersVolume, USD_DECIMALS, 2, true, "0.00")}</div>
          </div>
          <div className="App-card-row">
            <div className="label">Total Trading Fee Rebates</div>
            <div>${formatAmount(tradersRebates, USD_DECIMALS, 2, true, "0.00")}</div>
          </div>
          {referralCodeInString && (
            <div className="App-card-row">
              <div className="label">Active Code</div>
              <Styles.FlexContainer>
                <span>{referralCodeInString}</span>
                <Styles.CopyButton onClick={() => copyReferralCode(referralCodeInString)}>
                  <img src={CopyIcon} alt="Copy" />{" "}
                </Styles.CopyButton>
              </Styles.FlexContainer>
            </div>
          )}
          <div className="App-card-row">
            <div className="label">Tier Level</div>
            {tradersTier && (
              <div className="tier">
                <Tooltip
                  handle={`Tier ${getTierIdDisplay(tradersTier)} (${TIER_DISCOUNT_INFO[tradersTier]}% discount)`}
                  position="right-bottom"
                  renderContent={() =>
                    `You will receive a ${TIER_DISCOUNT_INFO[tradersTier]}% discount on your opening and closing fees, this discount will be claimable fortnightly.`
                  }
                />
              </div>
            )}
          </div>
        </>
      );
    }
    return (
      <>
        <div className="App-card-row">
          <div className="label">Total Volume Referred</div>
          <div>${formatAmount(referrerVolume, USD_DECIMALS, 2, true, "0.00")}</div>
        </div>
        <div className="App-card-row">
          <div className="label">Total Commissions</div>
          <div>${formatAmount(referrerRebates, USD_DECIMALS, 2, true, "0.00")}</div>
        </div>
        {referrerTier && (
          <div className="App-card-row">
            <div className="label">Tier Level</div>
            <div className="tier">
              <Tooltip
                handle={`Tier ${getTierIdDisplay(referrerTier)} (${TIER_DISCOUNT_INFO[referrerTier]}% commissions)`}
                position="right-bottom"
                renderContent={() =>
                  `You will receive a ${TIER_DISCOUNT_INFO[referrerTier]}% commission on referred opening and closing fees, this commission will be claimable fortnightly.`
                }
              />
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <Styles.AccountBanner className="App-card">
      {active && (
        <Styles.AccountBannerAddresses>
          <Davatar size={40} address={account} />
          <Styles.AppCardTitle>{ensName || shortenAddress(account, 13)}</Styles.AppCardTitle>
          <Styles.AccountBannerShortenedAddress> Wallet address </Styles.AccountBannerShortenedAddress>
        </Styles.AccountBannerAddresses>
      )}
      {!active && (
        <Styles.AccountBannerAddresses>
          <Styles.AppCardTitle>Connect Wallet </Styles.AppCardTitle>
          <Styles.AccountBannerShortenedAddress> Wallet not connected </Styles.AccountBannerShortenedAddress>
        </Styles.AccountBannerAddresses>
      )}
      <Styles.AccountBannerReferral>{getInfo()}</Styles.AccountBannerReferral>
    </Styles.AccountBanner>
  );
}
