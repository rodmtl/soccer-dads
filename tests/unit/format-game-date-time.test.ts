import { describe, expect, it } from "vitest";
import { formatDateOnly } from "@/server/services/formatGameDateTime";

describe("formatDateOnly", () => {
  it("formats a Date as a yyyy-mm-dd ISO date string", () => {
    expect(formatDateOnly(new Date("2026-08-01T00:00:00.000Z"))).toBe("2026-08-01");
  });
});
