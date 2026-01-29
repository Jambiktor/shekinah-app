import React from "react";
import renderer from "react-test-renderer";

import ReportsScreen from "../screens/ReportsScreen";

it("renders reports screen", () => {
  const tree = renderer
    .create(
      <ReportsScreen
        stats={{
          children: [
            {
              id: "1",
              fullName: "Edu Ramirez",
              email: "edu@example.com",
              studentId: "ST-01",
              grade: "Grade 2",
              lastLog: "in",
              lastLogAt: "2024-12-22T08:30:00Z",
              monthlyLogs: 25,
              monthlyIn: 18,
              monthlyOut: 7,
              presentDays: 2,
            },
          ],
          summary: {
            totalChildren: 1,
            monthlyLogCount: 25,
            totalPresentDays: 2,
            lastUpdate: "2024-12-22T08:30:00Z",
          },
        }}
        isLoading={false}
      />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
