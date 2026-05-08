import { describe, expect, it } from "vitest";
import { avatarOptions } from "./avatar-options";

describe("avatar options", () => {
  it("ships the starter all-ages avatar set", () => {
    expect(avatarOptions().map((avatar) => avatar.id)).toEqual(["nova", "ember", "moss", "violet"]);
  });
});
