import React from "react";
import renderer from "react-test-renderer";

import LogsScreen from "../screens/LogsScreen";
import { LOGS } from "../data/mockLogs";

it("renders logs screen", () => {
  const tree = renderer
    .create(
      <LogsScreen
        logs={LOGS}
        childOptions={[
          { id: "all", label: "All Children" },
          { id: "child-1", label: "Ava D." },
        ]}
        selectedChildId="all"
        onSelectChild={() => {}}
        isLoading={false}
      />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
