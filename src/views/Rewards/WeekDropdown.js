import React from "react";
import { Menu } from "@headlessui/react";
import * as Styles from "./Rewards.styles";
import { FaChevronDown } from "react-icons/fa";
import cx from "classnames";

export default function WeekDropdown(props) {
  const { weeksRewardsData, setSelectedWeek, rewardsMessage, trackAction } = props;

  return (
    <Styles.RewardsWeekSelectMenu>
      <Menu>
        {({ open }) => (
          <>
            <Menu.Button as="div">
              <Styles.WeekSelectButton
                className={cx("App-cta transparent", {
                  "App-cta-selected": open,
                })}
                onClick={() =>
                  trackAction &&
                  trackAction("Button clicked", {
                    buttonName: "Rewards week dropdown",
                  })
                }
              >
                {rewardsMessage}
                <FaChevronDown />
              </Styles.WeekSelectButton>
            </Menu.Button>
            <div className="hide-overflow">
              <Menu.Items as="div" className="menu-items">
                {weeksRewardsData
                  .sort((a, b) => b.week - a.week)
                  .map((rewardWeek) => (
                    <Menu.Item>
                      <div
                        className="menu-item large"
                        onClick={() => {
                          const selectedWeek = parseFloat(rewardWeek.week) + 1;
                          setSelectedWeek(selectedWeek);
                          trackAction &&
                            trackAction("Button clicked", {
                              buttonName: "Select rewards week",
                              weekNo: selectedWeek,
                            });
                        }}
                      >
                        Week {parseFloat(rewardWeek.week) + 1}
                      </div>
                    </Menu.Item>
                  ))}
              </Menu.Items>
            </div>
          </>
        )}
      </Menu>
    </Styles.RewardsWeekSelectMenu>
  );
}
