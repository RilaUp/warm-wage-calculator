const COLORS = {
  page: "#f7f7f7",
  card: "#ffffff",
  ink: "#222222",
  muted: "#717171",
  line: "#dddddd",
  coral: "#ff385c",
  coralSoft: "#fff0f3",
  work: "#e8f3ee",
  workInk: "#24543f",
  rest: "#e8f1f5",
  restInk: "#456878",
  holiday: "#fff0cf",
  holidayInk: "#835c13"
};

function roundedRect(ctx, x, y, width, height, radius, fill, stroke = null) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawText(ctx, text, x, y, options = {}) {
  const {
    size = 24,
    weight = 400,
    color = COLORS.ink,
    align = "left",
    family = '"Noto Sans SC", "PingFang SC", sans-serif'
  } = options;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(text), x, y);
}

function formatCurrency(value, digits = 2) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function formatNumber(value) {
  return Number(Number(value).toFixed(2)).toLocaleString("zh-CN", {
    maximumFractionDigits: 2
  });
}

function dayPresentation(day) {
  if (day.type === "holiday" || day.type === "spring") {
    return {
      fill: COLORS.holiday,
      ink: COLORS.holidayInk,
      label: day.name,
      badge: day.workFraction === 0.5 ? "工作半天" : day.workFraction === 1 ? "工作一天" : ""
    };
  }
  if (Number(day.workFraction) === 0) {
    return { fill: COLORS.rest, ink: COLORS.restInk, label: "休息", badge: "" };
  }
  return {
    fill: COLORS.work,
    ink: COLORS.workInk,
    label: "工作",
    badge: Number(day.workFraction) === 0.5 ? "半天" : ""
  };
}

export function renderShareImage({ canvas, year, month, salary, days, result }) {
  const width = 1200;
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const rowCount = Math.ceil((firstWeekday + days.length) / 7);
  const calendarHeight = 48 + rowCount * 106;
  const formulaHeight = 292;
  const height = 368 + calendarHeight + formulaHeight + 88;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = COLORS.page;
  ctx.fillRect(0, 0, width, height);

  drawText(ctx, "暖薪", 64, 74, { size: 28, weight: 700, color: COLORS.coral });
  drawText(ctx, "工资确认", 142, 74, { size: 28, weight: 700 });
  drawText(ctx, `${year} 年 ${month} 月`, width - 64, 74, {
    size: 20,
    weight: 600,
    color: COLORS.muted,
    align: "right"
  });

  roundedRect(ctx, 64, 112, width - 128, 190, 24, COLORS.card, COLORS.line);
  drawText(ctx, "本月实际支付", 96, 158, { size: 18, weight: 600, color: COLORS.muted });
  drawText(ctx, formatCurrency(result.total), 96, 226, {
    size: 54,
    weight: 700,
    color: COLORS.ink,
    family: '"DM Mono", "SFMono-Regular", monospace'
  });

  const metricX = [650, 824, 998];
  const metricLabels = ["日劳务报酬", "计薪份额", "法定日增量"];
  const metricValues = [
    formatCurrency(result.dailyRate),
    `${formatNumber(result.paidEquivalents)} 天`,
    `${formatNumber(result.premiumEquivalents)} 天`
  ];
  metricX.forEach((x, index) => {
    drawText(ctx, metricLabels[index], x, 172, { size: 15, color: COLORS.muted });
    drawText(ctx, metricValues[index], x, 213, {
      size: 22,
      weight: 700,
      family: '"DM Mono", "SFMono-Regular", monospace'
    });
  });

  const calendarTop = 356;
  drawText(ctx, "本月月历", 64, calendarTop, { size: 28, weight: 700 });
  const legendItems = [
    [COLORS.work, "工作日"],
    [COLORS.holiday, "法定节日"],
    [COLORS.rest, "休息日"]
  ];
  let legendX = 820;
  legendItems.forEach(([fill, label]) => {
    roundedRect(ctx, legendX, calendarTop - 17, 18, 18, 5, fill);
    drawText(ctx, label, legendX + 28, calendarTop, { size: 15, color: COLORS.muted });
    legendX += 118;
  });

  const gridX = 64;
  const gridY = calendarTop + 32;
  const gridWidth = width - 128;
  const gap = 10;
  const cellWidth = (gridWidth - gap * 6) / 7;
  const cellHeight = 94;
  const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
  weekdayLabels.forEach((label, index) => {
    drawText(ctx, label, gridX + index * (cellWidth + gap) + cellWidth / 2, gridY + 20, {
      size: 14,
      weight: 600,
      color: COLORS.muted,
      align: "center"
    });
  });

  days.forEach((day) => {
    const position = firstWeekday + day.day - 1;
    const column = position % 7;
    const row = Math.floor(position / 7);
    const x = gridX + column * (cellWidth + gap);
    const y = gridY + 36 + row * (cellHeight + 12);
    const presentation = dayPresentation(day);
    roundedRect(ctx, x, y, cellWidth, cellHeight, 14, presentation.fill);
    drawText(ctx, day.day, x + 14, y + 28, {
      size: 20,
      weight: 600,
      color: presentation.ink,
      family: '"DM Mono", "SFMono-Regular", monospace'
    });
    drawText(ctx, presentation.label, x + 14, y + 75, {
      size: 14,
      weight: 600,
      color: presentation.ink
    });
    if (presentation.badge) {
      drawText(ctx, presentation.badge, x + cellWidth - 12, y + 26, {
        size: 12,
        weight: 600,
        color: presentation.ink,
        align: "right"
      });
    }
  });

  const formulaTop = gridY + calendarHeight + 22;
  roundedRect(ctx, 64, formulaTop, width - 128, formulaHeight - 24, 24, COLORS.card, COLORS.line);
  drawText(ctx, "这笔报酬怎么计算", 96, formulaTop + 48, { size: 26, weight: 700 });
  drawText(
    ctx,
    `${formatCurrency(salary, 0)} ÷ 26 × ${formatNumber(result.paidEquivalents)} 天 = ${formatCurrency(result.total)}`,
    96,
    formulaTop + 100,
    {
      size: 26,
      weight: 700,
      color: COLORS.coral,
      family: '"DM Mono", "SFMono-Regular", monospace'
    }
  );

  const breakdowns = [
    ["普通日实际工作", `${formatNumber(result.regularWorked)} ×1 = ${formatNumber(result.regularWorked)} 天`],
    ["法定节日带薪放假", `${formatNumber(result.statutoryDays)} ×1 = ${formatNumber(result.statutoryDays)} 天`],
    ["其他法定日工作增量", `${formatNumber(result.holidayPremium)} ×1 = ${formatNumber(result.holidayPremium)} 天`],
    ["春节法定日工作增量", `${formatNumber(result.springWorked)} ×2 = ${formatNumber(result.springPremium)} 天`]
  ];
  breakdowns.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 96 + column * 520;
    const y = formulaTop + 157 + row * 54;
    drawText(ctx, label, x, y, { size: 15, color: COLORS.muted });
    drawText(ctx, value, x + 470, y, {
      size: 16,
      weight: 600,
      align: "right",
      family: '"DM Mono", "SFMono-Regular", monospace'
    });
  });

  drawText(ctx, "普通日工作共 ×1 · 其他法定日工作共 ×2 · 春节法定日工作共 ×3", 64, height - 45, {
    size: 15,
    color: COLORS.muted
  });
  drawText(ctx, "暖薪 · 工资计算器", width - 64, height - 45, {
    size: 15,
    weight: 600,
    color: COLORS.coral,
    align: "right"
  });

  return canvas;
}
