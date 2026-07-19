import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/[locale]/page";

describe("HomePage", () => {
  it("renders the Soccer Dads heading", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Soccer Dads" }),
    ).toBeInTheDocument();
  });
});
