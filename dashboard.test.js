const test = require("node:test");
const assert = require("node:assert/strict");
const { transactions, dashboard, linearForecast } = require("../server");

test("generated dataset contains realistic transaction coverage", () => {
  assert.ok(transactions.length > 5000);
  assert.equal(new Set(transactions.map((row) => row.category)).size, 4);
  assert.equal(new Set(transactions.map((row) => row.region)).size, 4);
});

test("dashboard returns complete analysis and forecast", () => {
  const result = dashboard(transactions);
  assert.ok(result.kpis.revenue > result.kpis.profit);
  assert.ok(result.kpis.orders > 0);
  assert.equal(result.monthly.length, 12);
  assert.equal(result.forecast.length, 6);
  assert.equal(result.insights.length, 3);
  assert.equal(result.categories.length, 4);
});

test("forecast extends the supplied monthly series", () => {
  const result = linearForecast([
    { month: "2026-01", revenue: 100 },
    { month: "2026-02", revenue: 120 },
    { month: "2026-03", revenue: 140 },
  ]);
  assert.equal(result.length, 6);
  assert.equal(result[0].month, "2026-04");
  assert.ok(result.every((item) => item.revenue >= 0));
});
