const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const categories = ["Electronics", "Fashion", "Home & Living", "Beauty"];
const regions = ["North", "South", "East", "West"];
const products = {
  Electronics: ["Nova Earbuds", "Pulse Watch", "Aura Speaker", "Arc Keyboard"],
  Fashion: ["Linen Shirt", "Metro Sneakers", "Canvas Tote", "Cloud Jacket"],
  "Home & Living": ["Halo Lamp", "Ceramic Set", "Nest Cushion", "Aroma Diffuser"],
  Beauty: ["Glow Serum", "Velvet Tint", "Mineral SPF", "Calm Cleanser"],
};

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function generateTransactions() {
  const random = seededRandom(20260604);
  const rows = [];
  const start = new Date("2025-01-01T00:00:00Z");
  for (let day = 0; day < 516; day += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + day);
    const seasonality = 1 + Math.sin((day / 365) * Math.PI * 2) * 0.16;
    const trend = 1 + day * 0.00075;
    const orderCount = 8 + Math.floor(random() * 8);
    for (let n = 0; n < orderCount; n += 1) {
      const category = categories[Math.floor(random() * categories.length)];
      const region = regions[Math.floor(random() * regions.length)];
      const product = products[category][Math.floor(random() * products[category].length)];
      const base = { Electronics: 180, Fashion: 82, "Home & Living": 112, Beauty: 54 }[category];
      const quantity = 1 + Math.floor(random() * 4);
      const revenue = Math.round(base * quantity * seasonality * trend * (0.78 + random() * 0.48));
      const marginRate = 0.21 + random() * 0.26;
      rows.push({
        id: `LM-${String(rows.length + 1).padStart(5, "0")}`,
        date: date.toISOString().slice(0, 10),
        category,
        region,
        product,
        quantity,
        revenue,
        profit: Math.round(revenue * marginRate),
        customer: `Customer ${1000 + Math.floor(random() * 9000)}`,
        status: random() > 0.07 ? "Completed" : "Returned",
      });
    }
  }
  return rows;
}

const transactions = generateTransactions();

function filterRows(searchParams) {
  const category = searchParams.get("category") || "All";
  const region = searchParams.get("region") || "All";
  return transactions.filter(
    (row) =>
      (category === "All" || row.category === category) &&
      (region === "All" || row.region === region)
  );
}

function groupSum(rows, key, valueKey = "revenue") {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + row[valueKey];
    return acc;
  }, {});
}

function monthlySeries(rows) {
  const totals = {};
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    totals[month] = (totals[month] || 0) + row.revenue;
  }
  return Object.entries(totals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }));
}

function linearForecast(series, count = 6) {
  const values = series.slice(-12).map((item) => item.revenue);
  const n = values.length;
  if (!n) return [];
  const sumX = ((n - 1) * n) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = values.reduce((sum, _, x) => sum + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  const last = new Date(`${series.at(-1).month}-01T00:00:00Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(last);
    date.setUTCMonth(last.getUTCMonth() + index + 1);
    const seasonBoost = 1 + Math.sin(((date.getUTCMonth() + 1) / 12) * Math.PI * 2) * 0.04;
    return {
      month: date.toISOString().slice(0, 7),
      revenue: Math.round(Math.max(0, (intercept + slope * (n + index)) * seasonBoost)),
    };
  });
}

function dashboard(rows) {
  const completed = rows.filter((row) => row.status === "Completed");
  const revenue = completed.reduce((sum, row) => sum + row.revenue, 0);
  const profit = completed.reduce((sum, row) => sum + row.profit, 0);
  const series = monthlySeries(completed);
  const latest = series.slice(-3).reduce((sum, x) => sum + x.revenue, 0);
  const previous = series.slice(-6, -3).reduce((sum, x) => sum + x.revenue, 0);
  const growth = previous ? ((latest - previous) / previous) * 100 : 0;
  const categoryRevenue = groupSum(completed, "category");
  const bestCategory = Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1])[0];
  const regionRevenue = groupSum(completed, "region");

  return {
    meta: { records: rows.length, updatedAt: "2026-06-04T09:30:00Z" },
    kpis: {
      revenue,
      profit,
      orders: completed.length,
      averageOrderValue: Math.round(revenue / completed.length),
      growth: Number(growth.toFixed(1)),
      margin: Number(((profit / revenue) * 100).toFixed(1)),
    },
    monthly: series.slice(-12),
    forecast: linearForecast(series),
    categories: Object.entries(categoryRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    regions: Object.entries(regionRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    insights: [
      `${bestCategory?.[0] || "Top category"} leads revenue with ${Math.round(
        ((bestCategory?.[1] || 0) / revenue) * 100
      )}% contribution.`,
      `The next six months are forecast to generate ${linearForecast(series)
        .reduce((sum, x) => sum + x.revenue, 0)
        .toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.`,
      `${growth >= 0 ? "Momentum is positive" : "Revenue softened"} with ${Math.abs(growth).toFixed(
        1
      )}% movement versus the previous quarter.`,
    ],
    recent: completed.slice(-6).reverse(),
  };
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendStatic(res, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(PUBLIC_DIR, requested);
  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath)) {
    sendJson(res, { error: "Not found" }, 404);
    return;
  }
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
  res.writeHead(200, { "Content-Type": `${types[path.extname(filePath)] || "application/octet-stream"}; charset=utf-8` });
  if (requested === "index.html") {
    const bootstrap = JSON.stringify({ options: { categories, regions }, dashboard: dashboard(transactions) })
      .replaceAll("<", "\\u003c");
    const html = fs.readFileSync(filePath, "utf8").replace(
      "</head>",
      `<script>window.__LUMINA_BOOTSTRAP__=${bootstrap}</script></head>`
    );
    return res.end(html);
  }
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/dashboard") return sendJson(res, dashboard(filterRows(url.searchParams)));
  if (url.pathname === "/api/options") return sendJson(res, { categories, regions });
  if (url.pathname === "/api/health") return sendJson(res, { status: "ok", records: transactions.length });
  if (url.pathname === "/api/export") {
    const rows = filterRows(url.searchParams);
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => `"${row[h]}"`).join(","))].join("\n");
    res.writeHead(200, { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=lumina-sales.csv" });
    return res.end(csv);
  }
  return sendStatic(res, url.pathname);
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Lumina dashboard running at http://localhost:${PORT}`));
}

module.exports = { server, transactions, dashboard, linearForecast };
