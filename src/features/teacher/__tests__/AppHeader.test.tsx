import React from "react";
import renderer from "react-test-renderer";

import AppHeader from "../components/AppHeader";

it("renders header title", () => {
  const tree = renderer
    .create(<AppHeader title="Inbox" />)
    .toJSON();
  expect(tree).toMatchSnapshot();
});
