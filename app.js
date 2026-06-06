const state = { data: null, options: null, filter: { category: "All", region: "All" } };
const colors = ["#1e7255", "#e89a50", "#6855c9", "#508fb8"];
const money = (value, compact = false) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: compact ? "compact" : "standard", maximumFractionDigits: 0 }).format(value);
const number = (value) => new Intl.NumberFormat("en-US").format(value);

async function loadOptions() {
  state.options = window.__LUMINA_BOOTSTRAP__?.options || await fetch("/api/options").then((res) => res.json());
  for (const key of ["category", "region"]) {
    const select = document.querySelector(`#${key}Filter`);
    state.options[`${key}s`].forEach((item) => select.add(new Option(item, item)));
    select.addEventListener("change", () => { state.filter[key] = select.value; loadDashboard(); });
  }
}

async function loadDashboard() {
  const params = new URLSearchParams(state.filter);
  state.data = await fetch(`/api/dashboard?${params}`).then((res) => res.json());
  document.querySelector("#exportBtn").href = `/api/export?${params}`;
  render();
}

function render() {
  const { kpis, meta, monthly, forecast, categories, insights, recent } = state.data;
  setText("revenue", money(kpis.revenue, true));
  setText("profit", money(kpis.profit, true));
  setText("orders", number(kpis.orders));
  setText("aov", money(kpis.averageOrderValue));
  setText("growth", `${kpis.growth >= 0 ? "+" : ""}${kpis.growth}%`);
  setText("margin", `${kpis.margin}%`);
  setText("recordCount", `${number(meta.records)} transactions analyzed`);
  setText("updatedAt", "Updated moments ago");
  document.querySelector("#marginBar").style.width = `${Math.min(kpis.margin * 2, 100)}%`;
  const forecastTotal = forecast.reduce((sum, item) => sum + item.revenue, 0);
  setText("forecastTotal", money(forecastTotal, true));
  setText("donutTotal", money(kpis.revenue, true));
  renderChart(monthly, forecast);
  renderForecast(forecast);
  renderCategories(categories);
  renderInsights(insights);
  renderOrders(recent);
}

function setText(id, text) { document.querySelector(`#${id}`).textContent = text; }

function renderChart(actual, forecast) {
  const canvas = document.querySelector("#revenueChart");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
  const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio);
  const w = rect.width, h = rect.height, pad = { t: 15, r: 15, b: 25, l: 42 };
  const all = [...actual, ...forecast], max = Math.max(...all.map((x) => x.revenue)) * 1.12;
  const x = (i) => pad.l + (i / (all.length - 1)) * (w - pad.l - pad.r);
  const y = (v) => h - pad.b - (v / max) * (h - pad.t - pad.b);
  ctx.font = "9px DM Sans"; ctx.fillStyle = "#9aa39e";
  for (let i = 0; i <= 4; i++) { const gy = pad.t + ((h - pad.t - pad.b) / 4) * i; ctx.strokeStyle = "#edf0ed"; ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w-pad.r, gy); ctx.stroke(); ctx.fillText(money(max * (1-i/4), true), 0, gy+3); }
  const gradient = ctx.createLinearGradient(0, pad.t, 0, h-pad.b); gradient.addColorStop(0, "#3a997350"); gradient.addColorStop(1, "#3a997300");
  ctx.beginPath(); actual.forEach((d,i)=> i ? ctx.lineTo(x(i),y(d.revenue)) : ctx.moveTo(x(i),y(d.revenue))); ctx.lineTo(x(actual.length-1),h-pad.b);ctx.lineTo(x(0),h-pad.b);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
  drawLine(ctx, actual, 0, x, y, "#1e7255", false);
  drawLine(ctx, forecast, actual.length-1, x, y, "#86bda6", true, actual.at(-1));
  all.forEach((d,i)=>{if(i%3===0){ctx.fillStyle="#9aa39e";ctx.fillText(new Date(`${d.month}-02`).toLocaleDateString("en-US",{month:"short"}),x(i)-10,h-5)}});
}

function drawLine(ctx, data, offset, x, y, color, dashed, previous) {
  ctx.beginPath(); ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.lineJoin="round";ctx.setLineDash(dashed?[5,5]:[]);
  if(previous) ctx.moveTo(x(offset), y(previous.revenue));
  data.forEach((d,i)=>{ const px=x(i+offset),py=y(d.revenue); if(i||previous)ctx.lineTo(px,py);else ctx.moveTo(px,py);});
  ctx.stroke();ctx.setLineDash([]);
}

function renderForecast(items) {
  const max = Math.max(...items.map((x) => x.revenue));
  document.querySelector("#forecastList").innerHTML = items.map((item) => `<div class="forecast-row"><span>${new Date(`${item.month}-02`).toLocaleDateString("en-US",{month:"short",year:"2-digit"})}</span><div class="track"><i style="width:${item.revenue/max*100}%"></i></div><strong>${money(item.revenue,true)}</strong></div>`).join("");
}
function renderCategories(items) {
  const total = items.reduce((s,x)=>s+x.value,0);
  let cursor=0; const stops=items.map((item,i)=>{const start=cursor;cursor+=item.value/total*100;return `${colors[i]} ${start}% ${cursor}%`}).join(",");
  document.querySelector("#donut").style.background=`conic-gradient(${stops})`;
  document.querySelector("#categoryLegend").innerHTML=items.map((item,i)=>`<div class="category-item"><i style="background:${colors[i]}"></i><span>${item.name}</span><strong>${Math.round(item.value/total*100)}%</strong></div>`).join("");
}
function renderInsights(items) { document.querySelector("#insightList").innerHTML=items.map((x,i)=>`<div class="insight"><i>${["↗","✦","◎"][i]}</i><span>${x}</span></div>`).join(""); }
function renderOrders(items) { document.querySelector("#ordersBody").innerHTML=items.map(x=>`<tr><td class="order-id">${x.id}</td><td><strong>${x.customer}</strong></td><td>${x.product}</td><td>${x.region}</td><td><strong>${money(x.revenue)}</strong></td><td><span class="complete">${x.status}</span></td></tr>`).join(""); }

document.querySelector(".menu-btn").addEventListener("click",()=>document.querySelector(".sidebar").classList.toggle("open"));
window.addEventListener("resize",()=>state.data&&renderChart(state.data.monthly,state.data.forecast));
if (window.__LUMINA_BOOTSTRAP__?.dashboard) {
  state.data = window.__LUMINA_BOOTSTRAP__.dashboard;
  render();
}
loadOptions().then(() => state.data || loadDashboard());
