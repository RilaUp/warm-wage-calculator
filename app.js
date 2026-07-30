import {
  buildMonthDays,
  calculateMonth,
  getDayPaidEquivalent
} from "./calc.mjs";

const monthNames = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月"
];
const weekdayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const typeLabels = {
  regular: "普通日",
  rest: "休息日",
  holiday: "其他法定日",
  spring: "春节法定日"
};

const elements = {
  year: document.querySelector("#year-select"),
  month: document.querySelector("#month-select"),
  salary: document.querySelector("#salary-input"),
  restDay: document.querySelector("#rest-day-select"),
  reset: document.querySelector("#reset-month"),
  calendar: document.querySelector("#calendar-days"),
  notice: document.querySelector("#year-notice"),
  amount: document.querySelector("#result-amount"),
  period: document.querySelector("#result-period"),
  dailyRate: document.querySelector("#daily-rate"),
  paidEquivalents: document.querySelector("#paid-equivalents"),
  premiumEquivalents: document.querySelector("#premium-equivalents"),
  selectedDate: document.querySelector("#selected-date"),
  adjustEmpty: document.querySelector("#adjust-empty"),
  adjustControls: document.querySelector("#adjust-controls"),
  adjustExplanation: document.querySelector("#adjust-explanation"),
  typeControls: document.querySelector("#day-type-controls"),
  fractionControls: document.querySelector("#work-fraction-controls"),
  dailyFormula: document.querySelector("#daily-formula"),
  equivalentFormula: document.querySelector("#equivalent-formula"),
  totalFormula: document.querySelector("#total-formula"),
  regularBreakdown: document.querySelector("#regular-breakdown"),
  leaveBreakdown: document.querySelector("#leave-breakdown"),
  holidayBreakdown: document.querySelector("#holiday-breakdown"),
  springBreakdown: document.querySelector("#spring-breakdown")
};

const current = new Date();
const state = {
  year: current.getFullYear() >= 2026 && current.getFullYear() <= 2030 ? current.getFullYear() : 2026,
  month: current.getFullYear() >= 2026 && current.getFullYear() <= 2030 ? current.getMonth() + 1 : 1,
  salary: 12000,
  restWeekday: 5,
  selectedISO: null,
  overrides: {}
};

function formatCurrency(value, compact = false) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2
  }).format(value);
}

function formatNumber(value) {
  return Number(value.toFixed(2)).toLocaleString("zh-CN", {
    maximumFractionDigits: 2
  });
}

function storageKey() {
  return `warm-wage:${state.year}-${String(state.month).padStart(2, "0")}`;
}

function loadOverrides() {
  try {
    state.overrides = JSON.parse(localStorage.getItem(storageKey()) || "{}");
  } catch {
    state.overrides = {};
  }
}

function saveOverrides() {
  localStorage.setItem(storageKey(), JSON.stringify(state.overrides));
}

function getDays() {
  return buildMonthDays(state.year, state.month, state.restWeekday, state.overrides);
}

function initSelectors() {
  monthNames.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1);
    option.textContent = name;
    elements.month.append(option);
  });
  elements.year.value = String(state.year);
  elements.month.value = String(state.month);
  elements.salary.value = String(state.salary);
  elements.restDay.value = String(state.restWeekday);
}

function renderCalendar(days) {
  const fragment = document.createDocumentFragment();
  const firstWeekday = new Date(state.year, state.month - 1, 1).getDay();
  const cells = Math.ceil((firstWeekday + days.length) / 7) * 7;

  for (let i = 0; i < cells; i += 1) {
    if (i < firstWeekday || i >= firstWeekday + days.length) {
      const blank = document.createElement("div");
      blank.className = "day-cell is-blank";
      blank.setAttribute("aria-hidden", "true");
      fragment.append(blank);
      continue;
    }

    const day = days[i - firstWeekday];
    const button = document.createElement("button");
    // A day's nature and its work arrangement are two separate dimensions.
    // A worked rest day should remain visually identifiable as a rest day.
    const visualType = day.type === "holiday" || day.type === "spring"
      ? "holiday"
      : day.type === "rest" ? "rest" : "work";
    button.type = "button";
    button.className = `day-cell is-${visualType}${state.selectedISO === day.iso ? " is-selected" : ""}`;
    button.dataset.iso = day.iso;
    button.setAttribute("role", "gridcell");
    button.setAttribute(
      "aria-label",
      `${state.month}月${day.day}日，${day.name}，${fractionLabel(day.workFraction)}`
    );

    const label = day.type === "spring" || day.type === "holiday"
      ? day.name
      : day.type === "rest" ? "休息" : "工作";
    const workBadge = day.workFraction === 0.5
      ? "工作半天"
      : day.workFraction === 1 && day.type !== "regular" ? "工作一天" : "";

    button.innerHTML = `
      <span class="day-number">${day.day}</span>
      <span class="day-label">${label}</span>
      ${workBadge ? `<span class="work-badge">${workBadge}</span>` : ""}
    `;
    button.addEventListener("click", () => selectDay(day.iso));
    fragment.append(button);
  }

  elements.calendar.replaceChildren(fragment);
}

function fractionLabel(fraction) {
  if (Number(fraction) === 0.5) return "工作半天";
  if (Number(fraction) === 1) return "工作一天";
  return "放假";
}

function selectDay(iso) {
  state.selectedISO = iso;
  render();
  requestAnimationFrame(() => {
    const isNarrow = window.matchMedia("(max-width: 720px)").matches;
    if (isNarrow) document.querySelector("#adjust-card").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderAdjust(days) {
  const selected = days.find((day) => day.iso === state.selectedISO);
  if (!selected) {
    elements.selectedDate.textContent = "请先点选月历日期";
    elements.adjustEmpty.hidden = false;
    elements.adjustControls.hidden = true;
    return;
  }

  elements.adjustEmpty.hidden = true;
  elements.adjustControls.hidden = false;
  elements.selectedDate.textContent = `${state.month} 月 ${selected.day} 日 · ${weekdayNames[selected.weekday]}`;

  elements.typeControls.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.type === selected.type);
    button.setAttribute("aria-pressed", String(button.dataset.type === selected.type));
  });
  elements.fractionControls.querySelectorAll("button").forEach((button) => {
    const active = Number(button.dataset.fraction) === Number(selected.workFraction);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const equivalent = getDayPaidEquivalent(selected);
  if (selected.type === "holiday") {
    elements.adjustExplanation.textContent = `法定带薪 1 份 + 工作增量 ${formatNumber(selected.workFraction)} 份 = 当天共 ${formatNumber(equivalent)} 份。`;
  } else if (selected.type === "spring") {
    elements.adjustExplanation.textContent = `春节带薪 1 份 + 工作增量 ${formatNumber(selected.workFraction)} ×2 = 当天共 ${formatNumber(equivalent)} 份。`;
  } else {
    elements.adjustExplanation.textContent = `${typeLabels[selected.type]}按实际工作份额计算：当天共 ${formatNumber(equivalent)} 份。`;
  }
}

function updateSelected(patch) {
  if (!state.selectedISO) return;
  const currentDay = getDays().find((day) => day.iso === state.selectedISO);
  if (!currentDay) return;
  const next = { ...currentDay, ...patch };
  state.overrides[state.selectedISO] = {
    type: next.type,
    name: next.type === "spring"
      ? "春节法定日"
      : next.type === "holiday"
        ? "法定节日"
        : next.type === "rest"
          ? "休息日"
          : "工作日",
    workFraction: Number(next.workFraction)
  };
  saveOverrides();
  render();
}

function renderResult(days) {
  const result = calculateMonth({ salary: state.salary, days });
  elements.period.textContent = `${state.year} 年 ${state.month} 月建议支付`;
  elements.amount.textContent = formatCurrency(result.total);
  elements.dailyRate.textContent = formatCurrency(result.dailyRate);
  elements.paidEquivalents.textContent = `${formatNumber(result.paidEquivalents)} 天`;
  elements.premiumEquivalents.textContent = `${formatNumber(result.premiumEquivalents)} 天`;
  elements.dailyFormula.textContent = `${formatCurrency(state.salary, true)} ÷ 26 = ${formatCurrency(result.dailyRate)}`;
  elements.equivalentFormula.textContent = `${formatNumber(result.paidEquivalents)} 天`;
  elements.totalFormula.textContent = formatCurrency(result.total);
  elements.regularBreakdown.textContent = `${formatNumber(result.regularWorked)} ×1 = ${formatNumber(result.regularWorked)} 天`;
  elements.leaveBreakdown.textContent = `${formatNumber(result.statutoryDays)} ×1 = ${formatNumber(result.statutoryDays)} 天`;
  elements.holidayBreakdown.textContent = `${formatNumber(result.holidayPremium)} ×1 = ${formatNumber(result.holidayPremium)} 天`;
  elements.springBreakdown.textContent = `${formatNumber(result.springWorked)} ×2 = ${formatNumber(result.springPremium)} 天`;
}

function renderNotice() {
  if (state.year === 2026) {
    elements.notice.hidden = true;
    return;
  }
  elements.notice.hidden = false;
  elements.notice.innerHTML = `<strong>${state.year} 年提示</strong>　农历法定日已按历法预置；年度调休通知尚未作为计薪依据，您可以逐日调整。`;
}

function render() {
  const days = getDays();
  renderCalendar(days);
  renderAdjust(days);
  renderResult(days);
  renderNotice();
}

elements.year.addEventListener("change", (event) => {
  state.year = Number(event.target.value);
  state.selectedISO = null;
  loadOverrides();
  render();
});

elements.month.addEventListener("change", (event) => {
  state.month = Number(event.target.value);
  state.selectedISO = null;
  loadOverrides();
  render();
});

elements.salary.addEventListener("input", (event) => {
  state.salary = Math.max(0, Number(event.target.value) || 0);
  renderResult(getDays());
});

elements.restDay.addEventListener("change", (event) => {
  state.restWeekday = Number(event.target.value);
  state.selectedISO = null;
  render();
});

elements.reset.addEventListener("click", () => {
  state.overrides = {};
  state.selectedISO = null;
  localStorage.removeItem(storageKey());
  render();
});

elements.typeControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-type]");
  if (button) updateSelected({ type: button.dataset.type });
});

elements.fractionControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-fraction]");
  if (button) updateSelected({ workFraction: Number(button.dataset.fraction) });
});

initSelectors();
loadOverrides();
render();
