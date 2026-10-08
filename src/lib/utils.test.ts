import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("knows the iOS text sizes, so a size never removes a color (or the other way round)", () => {
    expect(cn("text-caption-2 font-semibold", "text-muted-foreground")).toBe("text-caption-2 font-semibold text-muted-foreground");
    expect(cn("bg-primary text-primary-foreground", "h-12 text-body")).toBe("bg-primary text-primary-foreground h-12 text-body");
  });

  it("still lets a later size or shadow win", () => {
    expect(cn("text-body", "text-subhead")).toBe("text-subhead");
    expect(cn("shadow-card", "shadow-float")).toBe("shadow-float");
  });
});
