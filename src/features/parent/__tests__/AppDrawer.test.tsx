import React from "react";
import renderer from "react-test-renderer";

import AppDrawer from "../components/AppDrawer";

const menuItems = [
  { key: "inbox" as const, label: "Inbox", icon: "mail-outline" },
  { key: "logs" as const, label: "Children's Logs", icon: "clipboard-outline" },
];

it("renders drawer with menu items", () => {
  const tree = renderer
    .create(
      <AppDrawer
        isOpen
        menuItems={menuItems}
        activeKey="inbox"
        onSelect={() => {}}
        onClose={() => {}}
        onLogout={() => {}}
        onSimulateNotification={() => {}}
        profileName="Mia Santos"
        profileRole="Parent"
        profileId="PAR-001"
        childOptions={[
          { id: "all", label: "All Children" },
          { id: "child-1", label: "Ava D." },
        ]}
        selectedChildId="child-1"
        onSelectChild={() => {}}
      />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
