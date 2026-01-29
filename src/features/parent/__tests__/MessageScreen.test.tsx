import React from "react";
import renderer from "react-test-renderer";

import MessageScreen from "../screens/MessageScreen";
import { NOTIFICATIONS } from "../data/mockEmails";

it("renders message screen", () => {
  const tree = renderer
    .create(<MessageScreen email={NOTIFICATIONS[0]} onBack={() => {}} />)
    .toJSON();
  expect(tree).toMatchSnapshot();
});
