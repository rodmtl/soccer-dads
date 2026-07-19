import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TabList } from "@/components/TabList";

const tabs = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

function renderTabList(props: Partial<React.ComponentProps<typeof TabList<string>>> = {}) {
  const defaultProps: React.ComponentProps<typeof TabList<string>> = {
    tabs,
    activeTab: "upcoming",
    onTabChange: vi.fn(),
    ariaLabel: "Games",
  };
  return render(<TabList {...defaultProps} {...props} />);
}

// Wraps TabList with real activeTab state so keyboard navigation can be
// exercised end-to-end (arrow key -> onTabChange -> re-render with the new
// activeTab -> focus lands on the newly active tab), rather than asserting
// only on the onTabChange call in isolation.
function ControlledTabList() {
  const [activeTab, setActiveTab] = useState("upcoming");
  return <TabList tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} ariaLabel="Games" />;
}

describe("TabList", () => {
  it("renders a labeled tablist with one tab per item, reflecting the active tab", () => {
    renderTabList({ activeTab: "upcoming" });

    expect(screen.getByRole("tablist", { name: "Games" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute("aria-selected", "false");
  });

  it("only the active tab is in the natural tab order (roving tabindex)", () => {
    renderTabList({ activeTab: "upcoming" });

    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute("tabIndex", "0");
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute("tabIndex", "-1");
  });

  it("calls onTabChange when an inactive tab is clicked", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderTabList({ activeTab: "upcoming", onTabChange });

    await user.click(screen.getByRole("tab", { name: "Past" }));

    expect(onTabChange).toHaveBeenCalledWith("past");
  });

  it("moves to and activates the next tab on ArrowRight, wrapping around at the end", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderTabList({ activeTab: "past", onTabChange });

    screen.getByRole("tab", { name: "Past" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onTabChange).toHaveBeenCalledWith("upcoming");
  });

  it("moves to and activates the previous tab on ArrowLeft, wrapping around at the start", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderTabList({ activeTab: "upcoming", onTabChange });

    screen.getByRole("tab", { name: "Upcoming" }).focus();
    await user.keyboard("{ArrowLeft}");

    expect(onTabChange).toHaveBeenCalledWith("past");
  });

  it("moves keyboard focus onto the newly active tab after an arrow key press", async () => {
    const user = userEvent.setup();
    render(<ControlledTabList />);

    screen.getByRole("tab", { name: "Upcoming" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Past" })).toHaveFocus();
  });
});
