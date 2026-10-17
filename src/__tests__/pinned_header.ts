import { formatSender, pickCurrentMessage } from "../pinned_header";

describe("pickCurrentMessage", () => {
  test("returns null while every header is still below the pane top", () => {
    expect(pickCurrentMessage([120, 600], 100)).toBeNull();
    expect(pickCurrentMessage([], 100)).toBeNull();
  });

  test("returns the message whose header scrolled past the pane top", () => {
    expect(pickCurrentMessage([40, 600], 100)).toBe(0);
  });

  test("returns the last message scrolled past in a thread", () => {
    expect(pickCurrentMessage([-900, -300, 99, 800], 100)).toBe(2);
  });

  test("a header exactly at the pane top is not yet scrolled past", () => {
    expect(pickCurrentMessage([100], 100)).toBeNull();
  });
});

describe("formatSender", () => {
  test("combines name and address", () => {
    expect(formatSender("Jeff Doe", "jeff@h2o.ai")).toBe(
      "Jeff Doe <jeff@h2o.ai>"
    );
  });

  test("shows only the address when the name is missing or the same", () => {
    expect(formatSender("", "a@b.com")).toBe("a@b.com");
    expect(formatSender("  ", "a@b.com")).toBe("a@b.com");
    expect(formatSender("a@b.com", "a@b.com")).toBe("a@b.com");
  });

  test("shows only the name when the address is missing", () => {
    expect(formatSender("Jeff", null)).toBe("Jeff");
  });
});
