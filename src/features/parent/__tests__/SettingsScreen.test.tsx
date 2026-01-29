import React from "react";
import renderer from "react-test-renderer";

import SettingsScreen from "../screens/SettingsScreen";

it("renders settings screen", () => {
  const tree = renderer
    .create(
      <SettingsScreen
        emailNotifications={true}
        onToggleEmailNotifications={() => {}}
        onUpdatePassword={async () => ({ success: true })}
      />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
