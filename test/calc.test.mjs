import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHolidayMap,
  buildMonthDays,
  calculateMonth,
  getDayPaidEquivalent
} from "../calc.mjs";

test("2026 statutory map contains 13 contract holidays", () => {
  const holidays = buildHolidayMap(2026);
  assert.equal(Object.keys(holidays).length, 13);
  assert.deepEqual(holidays["2026-02-16"], { type: "spring", name: "除夕" });
  assert.deepEqual(holidays["2026-02-17"], { type: "spring", name: "春节·初一" });
  assert.deepEqual(holidays["2026-05-02"], { type: "holiday", name: "劳动节" });
});

test("Friday is the default rest day while any other weekday can work", () => {
  const days = buildMonthDays(2026, 7, 5);
  const friday = days.find((day) => day.iso === "2026-07-03");
  const saturday = days.find((day) => day.iso === "2026-07-04");
  assert.equal(friday.type, "rest");
  assert.equal(friday.workFraction, 0);
  assert.equal(saturday.type, "regular");
  assert.equal(saturday.workFraction, 1);
});

test("total multipliers follow x1, x2 and x3 rule", () => {
  assert.equal(getDayPaidEquivalent({ type: "rest", workFraction: 1 }), 1);
  assert.equal(getDayPaidEquivalent({ type: "holiday", workFraction: 1 }), 2);
  assert.equal(getDayPaidEquivalent({ type: "spring", workFraction: 1 }), 3);
});

test("half-day holiday work only adds a half premium", () => {
  assert.equal(getDayPaidEquivalent({ type: "holiday", workFraction: 0.5 }), 1.5);
  assert.equal(getDayPaidEquivalent({ type: "spring", workFraction: 0.5 }), 2);
});

test("monthly calculation separates paid leave from work premiums", () => {
  const result = calculateMonth({
    salary: 12000,
    days: [
      { type: "regular", workFraction: 1 },
      { type: "rest", workFraction: 1 },
      { type: "holiday", workFraction: 0 },
      { type: "holiday", workFraction: 0.5 },
      { type: "spring", workFraction: 1 }
    ]
  });

  assert.equal(result.dailyRate, 12000 / 26);
  assert.equal(result.regularWorked, 2);
  assert.equal(result.statutoryDays, 3);
  assert.equal(result.holidayPremium, 0.5);
  assert.equal(result.springPremium, 2);
  assert.equal(result.paidEquivalents, 7.5);
  assert.equal(result.total, (12000 / 26) * 7.5);
});
