import React from "react";
import renderer from "react-test-renderer";

import InboxScreen from "../screens/InboxScreen";
import { NOTIFICATIONS } from "../data/mockEmails";

it("renders inbox screen", () => {
  const tree = renderer
    .create(
      <InboxScreen
        emails={NOTIFICATIONS}
        activeEmailId={NOTIFICATIONS[0].id}
        onSelectEmail={() => {}}
        isLoading={false}
      />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
