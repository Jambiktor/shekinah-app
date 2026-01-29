import React from "react";
import renderer from "react-test-renderer";

import Card from "../components/Card";

it("renders card content", () => {
  const tree = renderer.create(<Card><>{"Content"}</></Card>).toJSON();
  expect(tree).toMatchSnapshot();
});
