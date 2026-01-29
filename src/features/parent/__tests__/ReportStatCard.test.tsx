import React from "react";
import renderer from "react-test-renderer";

import ReportStatCard from "../components/ReportStatCard";

it("renders a report stat card", () => {
  const tree = renderer.create(<ReportStatCard label="Total Logs" value={12} />).toJSON();
  expect(tree).toMatchSnapshot();
});
