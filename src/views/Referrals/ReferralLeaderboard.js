import cx from "classnames";
import * as Styles from "./ReferralLeaderboard.styles";
import { getTierIdDisplay, numberToOrdinal, TIER_DISCOUNT_INFO, USD_DECIMALS, formatAmount } from "../../Helpers";
// import { getCodeByAccount } from "../../Api/referrals";
import liveIcon from "../../img/live.svg";
import { RoundDropdown } from "../../components/RewardsRoundSelect/RewardsRoundSelect";
import { decodeReferralCode } from "../../Api/referrals";

const TABLE_HEADINGS = [
  "Rank",
  "Referral Code",
  "Tier",
  "Traders Referred",
  "Number of Trades",
  "Total Volume Referred (USD)",
  "Rewards (USD)",
];

export default function ReferralLeaderboard(props) {
  const { allRoundsRewardsData, allUsersRoundData, setSelectedRound, rewardsMessage, trackAction, userRoundData } =
    props;

  return (
    <>
      {/* <Styles.CompetitionRewards /> */}
      <UserStatsRow userRoundData={userRoundData} />
      <Styles.FlexBetweenContainer>
        <Styles.LeaderboardTitle>
          <img src={liveIcon} alt="Live" /> <span className="green">Live&nbsp;</span> <span>Referrals Leaderboard</span>
        </Styles.LeaderboardTitle>
        <RoundDropdown
          allRoundsRewardsData={allRoundsRewardsData}
          setSelectedRound={setSelectedRound}
          rewardsMessage={rewardsMessage}
          trackAction={trackAction}
        />
      </Styles.FlexBetweenContainer>
      <Styles.RewardsTableContainer className="referrals-table">
        <Styles.RewardsTable>
          <thead>
            <tr>
              {TABLE_HEADINGS.map((heading) => (
                <Styles.RewardsTableHeading>{heading}</Styles.RewardsTableHeading>
              ))}
            </tr>
          </thead>
          <tbody>
            {allUsersRoundData?.map((row, index) => {
              if (row.volume.gt(0)) {
                return <TableRow key={index} row={row} isUserRow={row?.position === userRoundData?.position} isTable />;
              } else {
                return <></>;
              }
            })}
          </tbody>
        </Styles.RewardsTable>
      </Styles.RewardsTableContainer>
    </>
  );
}

const TableRow = ({ row, isUserRow, isTable }) => (
  <Styles.TableRow
    isUserRow={isUserRow}
    className={cx({
      highlight: isUserRow,
      "no-border": !isTable,
    })}
  >
    <Styles.TableCell>{numberToOrdinal(row.position)}</Styles.TableCell>
    <Styles.TableCell>{row.referralCode ? decodeReferralCode(row.referralCode) : `-`}</Styles.TableCell>
    <Styles.TableCell className="tier">
      <span>{`Tier ${getTierIdDisplay(row.tier)}`}</span> <span>{`${TIER_DISCOUNT_INFO[row.tier]}% discount`}</span>
    </Styles.TableCell>
    <Styles.TableCell>{row.tradersReferred}</Styles.TableCell>
    <Styles.TableCell>{row.numberOfTrades}</Styles.TableCell>
    <Styles.TableCell>${formatAmount(row.volume, USD_DECIMALS, 2, true, "0.00")}</Styles.TableCell>
    <Styles.TableCell>${formatAmount(row.totalRewardUsd, USD_DECIMALS, 2, true, "0.00")}</Styles.TableCell>
  </Styles.TableRow>
);

const UserStatsRow = ({ userRoundData }) => (
  <>
    <span>Your rewards</span>
    <Styles.RewardsTableContainer>
      {userRoundData?.position ? (
        <Styles.RewardsTable>
          <thead>
            <tr>
              {TABLE_HEADINGS.map((heading) => (
                <Styles.RewardsTableHeading>{heading}</Styles.RewardsTableHeading>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableRow row={userRoundData} isUserRow />
          </tbody>
        </Styles.RewardsTable>
      ) : (
        <Styles.NoData>No rewards data available</Styles.NoData>
      )}
    </Styles.RewardsTableContainer>
  </>
);
