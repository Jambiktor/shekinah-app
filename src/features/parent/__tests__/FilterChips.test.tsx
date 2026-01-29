import React from "react";
import renderer from "react-test-renderer";

import FilterChips from "../components/FilterChips";

it("renders filter chips", () => {
  const tree = renderer
    .create(
      <FilterChips
        options={[
          { id: "all", label: "All Children" },
          { id: "child-1", label: "Ava D." },
        ]}
        selectedId="all"
        onSelect={() => {}}
      />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
