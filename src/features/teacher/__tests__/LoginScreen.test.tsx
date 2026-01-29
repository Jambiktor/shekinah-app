import React from "react";
import renderer from "react-test-renderer";

import LoginScreen from "../../../shared/ui/LoginScreen";

it("renders login screen", () => {
  const tree = renderer
    .create(<LoginScreen onLogin={() => {}} isLoading={false} error={null} />)
    .toJSON();
  expect(tree).toMatchSnapshot();
});
