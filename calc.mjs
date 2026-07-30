export const SUPPORTED_YEARS = [2026, 2027, 2028, 2029, 2030];

export const HOLIDAY_DATES = {
  2026: {
    lunarNewYear: "2026-02-17",
    qingming: "2026-04-05",
    dragonBoat: "2026-06-19",
    midAutumn: "2026-09-25"
  },
  2027: {
    lunarNewYear: "2027-02-07",
    qingming: "2027-04-05",
    dragonBoat: "2027-06-09",
    midAutumn: "2027-09-15"
  },
  2028: {
    lunarNewYear: "2028-01-26",
    qingming: "2028-04-04",
    dragonBoat: "2028-05-28",
    midAutumn: "2028-10-03"
  },
  2029: {
    lunarNewYear: "2029-02-13",
    qingming: "2029-04-04",
    dragonBoat: "2029-06-16",
    midAutumn: "2029-09-22"
  },
  2030: {
    lunarNewYear: "2030-02-02",
    qingming: "2030-04-05",
    dragonBoat: "2030-06-05",
    midAutumn: "2030-09-12"
  }
};

export function toISO(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDays(iso, amount) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function buildHolidayMap(year) {
  const dates = HOLIDAY_DATES[year];
  if (!dates) return {};

  const holidays = {
    [toISO(year, 1, 1)]: { type: "holiday", name: "元旦" },
    [dates.qingming]: { type: "holiday", name: "清明节" },
    [toISO(year, 5, 1)]: { type: "holiday", name: "劳动节" },
    [toISO(year, 5, 2)]: { type: "holiday", name: "劳动节" },
    [dates.dragonBoat]: { type: "holiday", name: "端午节" },
    [dates.midAutumn]: { type: "holiday", name: "中秋节" },
    [toISO(year, 10, 1)]: { type: "holiday", name: "国庆节" },
    [toISO(year, 10, 2)]: { type: "holiday", name: "国庆节" },
    [toISO(year, 10, 3)]: { type: "holiday", name: "国庆节" }
  };

  for (let offset = -1; offset <= 2; offset += 1) {
    const name = offset === -1 ? "除夕" : offset === 0 ? "春节·初一" : `春节·初${offset + 1}`;
    holidays[addDays(dates.lunarNewYear, offset)] = { type: "spring", name };
  }

  return holidays;
}

export function buildMonthDays(year, month, restWeekday = 5, overrides = {}) {
  const holidayMap = buildHolidayMap(year);
  const totalDays = new Date(year, month, 0).getDate();
  const days = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const iso = toISO(year, month, day);
    const weekday = new Date(year, month - 1, day).getDay();
    const holiday = holidayMap[iso];
    const initial = holiday
      ? { type: holiday.type, name: holiday.name, workFraction: 0 }
      : weekday === Number(restWeekday)
        ? { type: "rest", name: "每周休息", workFraction: 0 }
        : { type: "regular", name: "工作日", workFraction: 1 };
    const override = overrides[iso] || {};

    days.push({
      iso,
      day,
      weekday,
      ...initial,
      ...override
    });
  }

  return days;
}

export function getDayPaidEquivalent(day) {
  const fraction = Number(day.workFraction);
  if (day.type === "holiday") return 1 + fraction;
  if (day.type === "spring") return 1 + fraction * 2;
  return fraction;
}

export function calculateMonth({ salary, days }) {
  const safeSalary = Math.max(0, Number(salary) || 0);
  const dailyRate = safeSalary / 26;
  const regularWorked = days
    .filter((day) => day.type === "regular" || day.type === "rest")
    .reduce((sum, day) => sum + Number(day.workFraction), 0);
  const statutoryDays = days.filter((day) => day.type === "holiday" || day.type === "spring").length;
  const holidayPremium = days
    .filter((day) => day.type === "holiday")
    .reduce((sum, day) => sum + Number(day.workFraction), 0);
  const springWorked = days
    .filter((day) => day.type === "spring")
    .reduce((sum, day) => sum + Number(day.workFraction), 0);
  const springPremium = springWorked * 2;
  const paidEquivalents = regularWorked + statutoryDays + holidayPremium + springPremium;

  return {
    dailyRate,
    regularWorked,
    statutoryDays,
    holidayPremium,
    springWorked,
    springPremium,
    premiumEquivalents: holidayPremium + springPremium,
    paidEquivalents,
    total: dailyRate * paidEquivalents
  };
}
