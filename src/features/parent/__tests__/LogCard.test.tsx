import React from "react";
import renderer from "react-test-renderer";

import LogCard from "../components/LogCard";
import { LOGS } from "../data/mockLogs";

it("renders a log card", () => {
  const tree = renderer.create(<LogCard log={LOGS[0]} />).toJSON();
  expect(tree).toMatchSnapshot();
});
