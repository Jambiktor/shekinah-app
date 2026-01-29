import React from "react";
import renderer from "react-test-renderer";

import NotificationItem from "../components/NotificationItem";
import { NOTIFICATIONS } from "../data/mockEmails";

it("renders a notification item", () => {
  const tree = renderer
    .create(
      <NotificationItem email={NOTIFICATIONS[0]} isActive={false} onPress={() => {}} />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
