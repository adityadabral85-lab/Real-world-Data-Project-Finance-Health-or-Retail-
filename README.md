# Lumina Retail Intelligence

A complete, dependency-free retail data science project with a polished dashboard, automated analysis, filters, CSV export, and six-month revenue forecasting.

![Lumina Retail Intelligence Dashboard](outputs/lumina-dashboard-final.png)

## Run

```powershell
node server.js
```

Open `http://localhost:3000`.

## Features

- Deterministic dataset with 5,000+ retail transactions
- Revenue, profit, orders, AOV, growth, and margin KPIs
- Category and region filtering
- Revenue trend visualization and category mix
- Linear-regression-based six-month sales forecast
- Actionable business insights, recent orders, and CSV export
- Responsive frontend and REST API

## API

- `GET /api/health`
- `GET /api/options`
- `GET /api/dashboard?category=All&region=All`
- `GET /api/export?category=All&region=All`
