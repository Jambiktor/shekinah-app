import React from "react";
import renderer from "react-test-renderer";

import NotificationList from "../components/NotificationList";
import { NOTIFICATIONS } from "../data/mockEmails";

it("renders notification list", () => {
  const tree = renderer
    .create(
      <NotificationList
        emails={NOTIFICATIONS}
        activeEmailId={NOTIFICATIONS[0].id}
        onSelectEmail={() => {}}
      />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
