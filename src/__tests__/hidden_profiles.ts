import {
  applyProfile,
  DEFAULT_HIDDEN_PROFILES,
  HIDDEN_PROFILES_KEY,
  isActiveProfile,
  loadHiddenProfiles,
  removeProfile,
  saveHiddenProfiles,
  upsertProfile,
} from "../hidden_profiles";
import { installChromeStub } from "../test_support/chrome_stub";

const focus = { name: "Focus", selectors: ["#a", "#b"] };

describe("upsertProfile", () => {
  test("appends a new profile with a trimmed name and copied selectors", () => {
    const selectors = ["#x"];
    const next = upsertProfile({ profiles: [focus] }, "  Minimal ", selectors);
    expect(next.profiles).toEqual([
      focus,
      { name: "Minimal", selectors: ["#x"] },
    ]);
    selectors.push("#y");
    expect(next.profiles[1].selectors).toEqual(["#x"]);
  });

  test("replaces a profile with the same name in place", () => {
    const next = upsertProfile(
      { profiles: [focus, { name: "Other", selectors: [] }] },
      "Focus",
      ["#z"]
    );
    expect(next.profiles.map((p) => p.name)).toEqual(["Focus", "Other"]);
    expect(next.profiles[0].selectors).toEqual(["#z"]);
  });
});

test("removeProfile drops the named profile", () => {
  expect(removeProfile({ profiles: [focus] }, "Focus")).toEqual({
    profiles: [],
  });
});

test("applyProfile turns a profile into enabled hidden items", () => {
  const items = applyProfile(focus);
  expect(items).toEqual({ selectors: ["#a", "#b"], enabled: true });
  items.selectors.push("#c");
  expect(focus.selectors).toEqual(["#a", "#b"]);
});

describe("isActiveProfile", () => {
  test("matches the same selectors in any order", () => {
    expect(
      isActiveProfile(focus, { selectors: ["#b", "#a"], enabled: true })
    ).toBe(true);
  });

  test("does not match different selectors or disabled hiding", () => {
    expect(isActiveProfile(focus, { selectors: ["#a"], enabled: true })).toBe(
      false
    );
    expect(
      isActiveProfile(focus, { selectors: ["#a", "#b"], enabled: false })
    ).toBe(false);
  });
});

test("profiles round-trip through sync storage", async () => {
  const stub = installChromeStub();
  expect(await loadHiddenProfiles()).toEqual(DEFAULT_HIDDEN_PROFILES);
  await saveHiddenProfiles({ profiles: [focus] });
  expect(stub.store[HIDDEN_PROFILES_KEY]).toEqual({ profiles: [focus] });
  expect(await loadHiddenProfiles()).toEqual({ profiles: [focus] });
});
