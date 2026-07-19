import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchableList } from "@/components/SearchableList";

const items = [
  { id: "1", label: "Alice" },
  { id: "2", label: "Bob" },
  { id: "3", label: "Alicia" },
];

describe("SearchableList", () => {
  it("renders a labeled search input and a button per item", () => {
    render(
      <SearchableList
        items={items}
        searchLabel="Search your name"
        noResultsMessage="No matches"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByLabelText("Search your name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bob" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alicia" })).toBeInTheDocument();
  });

  it("calls onSelect with the item id when a row is activated", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SearchableList
        items={items}
        searchLabel="Search your name"
        noResultsMessage="No matches"
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Bob" }));

    expect(onSelect).toHaveBeenCalledWith("2");
  });

  it("filters items case-insensitively as the user types", async () => {
    const user = userEvent.setup();
    render(
      <SearchableList
        items={items}
        searchLabel="Search your name"
        noResultsMessage="No matches"
        onSelect={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("Search your name"), "ali");

    expect(screen.getByRole("button", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alicia" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bob" })).not.toBeInTheDocument();
  });

  it("shows the no-results message when the search matches nothing", async () => {
    const user = userEvent.setup();
    render(
      <SearchableList
        items={items}
        searchLabel="Search your name"
        noResultsMessage="No matches"
        onSelect={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("Search your name"), "zzz");

    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alice" })).not.toBeInTheDocument();
  });

  it("substitutes a {query} placeholder in the no-results message with the search term", async () => {
    const user = userEvent.setup();
    render(
      <SearchableList
        items={items}
        searchLabel="Search your name"
        noResultsMessage="No players match '{query}'"
        onSelect={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("Search your name"), "zzz");

    expect(screen.getByText("No players match 'zzz'")).toBeInTheDocument();
  });

  it("keeps focus on the search input while typing", async () => {
    const user = userEvent.setup();
    render(
      <SearchableList
        items={items}
        searchLabel="Search your name"
        noResultsMessage="No matches"
        onSelect={() => {}}
      />,
    );

    const input = screen.getByLabelText("Search your name");
    input.focus();

    await user.type(input, "ali");

    expect(input).toHaveFocus();
  });

  it("moves focus from the search input into each visible list button in list order via Tab", async () => {
    const user = userEvent.setup();
    render(
      <SearchableList
        items={items}
        searchLabel="Search your name"
        noResultsMessage="No matches"
        onSelect={() => {}}
      />,
    );

    const input = screen.getByLabelText("Search your name");
    input.focus();
    expect(input).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Alice" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Bob" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Alicia" })).toHaveFocus();
  });
});
