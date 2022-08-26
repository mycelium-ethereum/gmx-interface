import React from "react";
import Tooltip from "../../components/Tooltip/Tooltip";
import {getTierIdDisplay, TIER_DISCOUNT_INFO} from "../../Helpers";
import * as Styles from "./Referrals.styles";

export default function TraderRebateStats(props) {
  const {
    active,
    connectWallet,
    setIsEnterCodeModalVisible,
    setIsEditCodeModalVisible,
    referralCodeInString,
    traderTier,
    hidden
  } = props;

  return (
    <Styles.ReferralData className="App-card" hidden={hidden}>
      {referralCodeInString ? (
        <Styles.InputCodeText>
          <Styles.AppCardTitle>Active code: {referralCodeInString}</Styles.AppCardTitle>
          {traderTier && (
            <div className="tier">
              <Tooltip
                handle={`Tier ${getTierIdDisplay(traderTier)} (${TIER_DISCOUNT_INFO[traderTier]}% discount)`}
                position="right-bottom"
                renderContent={() =>
                  `You will receive a ${TIER_DISCOUNT_INFO[traderTier]}% discount on your opening and closing fees, this discount will be airdropped to your account every Wednesday`
                }
              />
            </div>
          )}
          {!active ? (
            <Styles.ReferralButton className="App-cta large" onClick={() => connectWallet()}>
              Connect Wallet
            </Styles.ReferralButton>
          ) : (
            <Styles.ReferralButton className="App-cta large" onClick={() => setIsEditCodeModalVisible(true)}>
              Edit Code
            </Styles.ReferralButton>
          )}
        </Styles.InputCodeText>
      ) : (
        <Styles.InputCodeText>
          <Styles.AppCardTitle>Enter Referral Code</Styles.AppCardTitle>
          <p>Add a referral code below to receive fee discounts.</p>
          {!active ? (
            <Styles.ReferralButton className="App-cta large" onClick={() => connectWallet()}>
              Connect Wallet
            </Styles.ReferralButton>
          ) : (
            <Styles.ReferralButton className="App-cta large" onClick={() => setIsEnterCodeModalVisible(true)}>
              Enter Code
            </Styles.ReferralButton>
          )}
        </Styles.InputCodeText>
      )}
    </Styles.ReferralData>
  );
}
