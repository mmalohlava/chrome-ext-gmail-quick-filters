/*
 *   Copyright (c) 2023 R3BL LLC
 *   All rights reserved.
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *   SOFTWARE.
 */

import {
  getTodayDate,
  getYesterdayDate,
  formatDate,
  parseRgb,
  relativeLuminance,
  isDarkColor,
} from "../utils";

test("getTodayDate matches formatted today", () => {
  expect(getTodayDate()).toBe(formatDate(new Date()));
});

test("getYesterdayDate matches formatted yesterday", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  expect(getYesterdayDate()).toBe(formatDate(yesterday));
});

describe("formatDate", () => {
  // Gmail's date `title` attribute uses a non-zero-padded day ("Jul 8", not
  // "Jul 08"). The highlight selector matches that title as a substring, so
  // formatDate must NOT zero-pad single-digit days or highlighting silently
  // breaks for the first 9 days of every month.
  test("does not zero-pad single-digit days", () => {
    expect(formatDate(new Date(2026, 6, 8))).toBe("Wed, Jul 8, 2026");
  });

  test("formats double-digit days", () => {
    expect(formatDate(new Date(2024, 11, 24))).toBe("Tue, Dec 24, 2024");
  });
});

describe("parseRgb", () => {
  test("parses rgb()", () => {
    expect(parseRgb("rgb(255, 253, 231)")).toEqual({ r: 255, g: 253, b: 231 });
  });

  test("parses rgba() ignoring alpha", () => {
    expect(parseRgb("rgba(31, 31, 31, 1)")).toEqual({ r: 31, g: 31, b: 31 });
    expect(parseRgb("rgba(0, 0, 0, 0.5)")).toEqual({ r: 0, g: 0, b: 0 });
  });

  test("returns null for transparent/empty/unparseable", () => {
    expect(parseRgb("transparent")).toBeNull();
    expect(parseRgb("")).toBeNull();
    expect(parseRgb("not a color")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  test("white is near 1, black is near 0", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 2);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 2);
  });
});

describe("isDarkColor", () => {
  test("Gmail dark background is dark", () => {
    expect(isDarkColor({ r: 31, g: 31, b: 31 })).toBe(true);
  });

  test("white background is not dark", () => {
    expect(isDarkColor({ r: 255, g: 255, b: 255 })).toBe(false);
  });
});
