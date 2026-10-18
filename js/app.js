if (!requireLogin()) throw new Error("not logged");
const page = document.body.dataset.page;
const customerData = () => Store.get(STORAGE_KEYS.customers, []);
const batchData = () => Store.get(STORAGE_KEYS.batches, []);
const orderData = () => Store.get(STORAGE_KEYS.orders, []);

/* ── Theme (dark / light) ──────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem("jastip_theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (saved === "dark" || (!saved && prefersDark)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
function toggleTheme() {
  const isNowDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("jastip_theme", isNowDark ? "dark" : "light");
  
  // Update theme toggle icon
  const icon = document.querySelector('.theme-toggle');
  if (icon) {
    icon.textContent = isNowDark ? "☀" : "☾";
  }
  
  // Re-render charts without resetting filters
  const currentPage = location.hash.slice(1) || "dashboard";
  if (currentPage === "dashboard") {
    // Re-render only the charts, not the entire dashboard
    const orders = orderData();
    const filterMonth = getParam("month") || "";
    const filterYear = getParam("year") || "";
    let filteredOrders = [...orders];
    if (filterMonth && filterYear) {
      filteredOrders = filterByMonth(filteredOrders, 'orderDate', filterMonth, filterYear);
    } else if (filterMonth && !filterYear) {
      filteredOrders = filterByMonth(filteredOrders, 'orderDate', filterMonth);
    } else if (filterYear && !filterMonth) {
      filteredOrders = filterByYear(filteredOrders, 'orderDate', filterYear);
    }
    
    // Wait for theme transition to complete and DOM to stabilize
    setTimeout(() => {
      renderDashboardCharts(filteredOrders);
    }, 0);
  }
}
initTheme();

// Pagination state
let paginationState = {
  customer: { page: 1, perPage: 10 },
  order: { page: 1, perPage: 10 },
  dashboard: { page: 1, perPage: 10 }
};
function shell(title, content) {
  const isDark = document.documentElement.classList.contains("dark");
  const themeIcon = isDark ? "☀" : "☾";
  const themeLabel = isDark ? "Ganti ke Light Mode" : "Ganti ke Dark Mode";
  return `<div class="layout"><aside class="sidebar" id="sidebar">
 <div class="brand"><div class="brand-mark">J</div><div><b>Jastip<span>PYTHA</span></b><small>Management System</small></div></div>
 <div class="nav-title">Menu Utama</div>
 <a class="nav-link ${page === "dashboard" ? "active" : ""}" href="dashboard.html" onclick="closeSidebar()">▦ <span>Dashboard</span></a>
 <a class="nav-link ${page === "customer" ? "active" : ""}" href="customer.html" onclick="closeSidebar()">♙ <span>Customer</span></a>
 <a class="nav-link ${page === "batch" ? "active" : ""}" href="batch.html" onclick="closeSidebar()">◫ <span>Batch Jastip</span></a>
 <a class="nav-link ${["order", "order-form", "order-detail"].includes(page) ? "active" : ""}" href="order.html" onclick="closeSidebar()">☷ <span>Order</span></a>
 <div class="nav-title">Sistem</div><a class="nav-link ${page === "settings" ? "active" : ""}" href="settings.html" onclick="closeSidebar()">⚙ <span>Pengaturan</span></a>
 <div class="sidebar-footer"><button class="btn btn-secondary btn-block" onclick="logout()">Keluar</button></div>
 </aside><div id="sidebarOverlay" class="sidebar-overlay" onclick="closeSidebar()"></div><main class="main"><header class="topbar"><button class="mobile-menu" onclick="toggleSidebar()">☰</button><h2>${title}</h2><div class="topbar-right"><button class="theme-toggle" id="themeToggleBtn" onclick="toggleTheme()" title="${themeLabel}" aria-label="${themeLabel}">${themeIcon}</button><div class="user-box">Admin · Demo</div></div></header><section class="content">${content}</section></main></div>`;
}
function logout() {
  localStorage.removeItem(STORAGE_KEYS.session);
  location.href = "landing.html";
}
function toggleSidebar() {
  const sidebar = qs("#sidebar");
  const overlay = qs("#sidebarOverlay");
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains("open");
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add("open");
    if (overlay) overlay.classList.add("show");
    document.body.classList.add("sidebar-open");
  }
}

function closeSidebar() {
  const sidebar = qs("#sidebar");
  const overlay = qs("#sidebarOverlay");
  if (!sidebar) return;
  sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
  document.body.classList.remove("sidebar-open");
}
function init() {
  if (page === "dashboard") renderDashboard();
  if (page === "customer") renderCustomers();
  if (page === "batch") renderBatches();
  if (page === "order") renderOrders();
  if (page === "order-form") renderOrderForm();
  if (page === "order-detail") renderOrderDetail();
  if (page === "settings") renderSettings();
}
function renderDashboard() {
  const orders = orderData(),
    customers = customerData(),
    batches = batchData();
  
  // Filter parameters - Only Month and Year
  const filterMonth = getParam("month") || "";
  const filterYear = getParam("year") || "";
  
  // Apply filters
  let filteredOrders = [...orders];
  if (filterMonth && filterYear) {
    // Filter by specific month and year
    filteredOrders = filterByMonth(filteredOrders, 'orderDate', filterMonth, filterYear);
  } else if (filterMonth && !filterYear) {
    // Filter by month across all years
    filteredOrders = filterByMonth(filteredOrders, 'orderDate', filterMonth);
  } else if (filterYear && !filterMonth) {
    // Filter by year across all months
    filteredOrders = filterByYear(filteredOrders, 'orderDate', filterYear);
  }
  
  // Calculate statistics from filtered data
  const totalOrders = filteredOrders.length;
  const active = filteredOrders.filter(
      (o) => !["Selesai", "Dibatalkan"].includes(o.orderStatus),
    ).length;
  const unpaid = filteredOrders.filter((o) => paymentStatus(o) !== "Lunas").length;
  const shipping = filteredOrders.filter(
      (o) => o.orderStatus === "Dalam Perjalanan",
    ).length;
  const done = filteredOrders.filter((o) => o.orderStatus === "Selesai").length;
  const transaction = filteredOrders.reduce((s, o) => s + orderTotal(o), 0);
  const fee = filteredOrders.reduce((s, o) => s + Number(o.fee || 0), 0);
  
  // Recent orders with pagination
  const recentOrders = [...filteredOrders]
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  const paginationData = createPagination(recentOrders, paginationState.dashboard.page, paginationState.dashboard.perPage);
  
  // Purchase items from filtered orders
  const purchasedItems = [];
  filteredOrders.forEach(order => {
    order.items.forEach(item => {
      purchasedItems.push({
        ...item,
        orderId: order.id,
        orderDate: order.orderDate,
        customer: customerName(order.customerId)
      });
    });
  });
  const recentPurchases = purchasedItems.sort((a, b) => b.orderDate.localeCompare(a.orderDate)).slice(0, 10);
  
  const statuses = [
    "Pesanan Masuk",
    "Barang Dibeli",
    "Dalam Perjalanan",
    "Barang Sampai",
    "Selesai",
    "Dibatalkan",
  ];
  
  // Current year range for year filter
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => currentYear - 2 + i);
  
  const content = `
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p>Ringkasan operasional jastip hari ini.</p>
      </div>
      <div class="actions">
        <a class="btn btn-primary" href="order-form.html">+ Buat Order</a>
      </div>
    </div>
    
    <!-- Dashboard Filters -->
    <div class="filter-panel">
      <div class="filter-grid">
        <label>
          Bulan
          <select id="filterMonth">
            <option value="">Semua Bulan</option>
            ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
              `<option value="${m}" ${filterMonth == m ? 'selected' : ''}>${getMonthName(m)}</option>`
            ).join('')}
          </select>
        </label>
        <label>
          Tahun
          <input type="number" id="filterYear" placeholder="Contoh: 2024" value="${filterYear}" min="2000" max="2100" />
        </label>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" onclick="applyDashboardFilter()">Terapkan Filter</button>
        <button class="btn btn-secondary" onclick="resetDashboardFilter()">Reset Filter</button>
      </div>
    </div>
    
    <!-- Statistics Cards with Sparklines (Top 3) -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:18px; margin-top:18px;">
      ${statWithSparkline("Total Order", totalOrders, 12.4, "sparkline1", "☷")}
      ${statWithSparkline("Order Aktif", active, 7.8, "sparkline2", "◷")}
      ${statWithSparkline("Order Selesai", done, 3.2, "sparkline3", "✓")}
    </div>

    <!-- Transaction & Fee Charts -->
    <div class="grid-2" style="margin-top:18px; gap:18px;">
      <div class="card trend-chart-card">
        <div class="trend-chart-header">
          <h3>Total Transaksi</h3>
        </div>
        <div class="trend-chart-body">
          <canvas id="transactionTrendChart"></canvas>
        </div>
      </div>
      <div class="card trend-chart-card">
        <div class="trend-chart-header">
          <h3>Estimasi Fee</h3>
        </div>
        <div class="trend-chart-body">
          <canvas id="feeTrendChart"></canvas>
        </div>
      </div>
    </div>
    
    <!-- Charts Row -->
    <div class="grid-2" style="margin-top:18px; gap:18px;" id="chartsRow">
      <div class="card" id="chartBarCard">
        <div class="card-head"><h3>Ringkasan Order</h3></div>
        <div style="padding:18px 12px 20px; overflow-x:auto;">
          <canvas id="orderBarChart" height="260"></canvas>
        </div>
      </div>
      <div class="card" id="chartDonutCard">
        <div class="card-head"><h3>Distribusi Status Order</h3></div>
        <div style="padding:18px 12px 20px; display:flex; flex-direction:column; align-items:center; gap:16px;">
          <canvas id="orderDonutChart" width="220" height="220"></canvas>
          <div id="donutLegend" style="width:100%; display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; font-size:12px;"></div>
        </div>
      </div>
    </div>

    
    <div class="grid-2">
      <!-- Recent Orders Table -->
      <div class="card table-card">
        <div class="card-head">
          <h3>Order Terbaru</h3>
          <a class="btn btn-secondary btn-sm" href="order.html">Lihat Semua</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Pembayaran</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${paginationData.items.length > 0 ? paginationData.items.map((o) => `
                <tr>
                  <td><a href="order-detail.html?id=${o.id}"><b>${dateId(o.orderDate)}</b></a></td>
                  <td>${esc(customerName(o.customerId))}</td>
                  <td>${money(orderTotal(o))}</td>
                  <td>${badge(paymentStatus(o))}</td>
                  <td>${badge(o.orderStatus)}</td>
                </tr>
              `).join("") : `
                <tr>
                  <td colspan="5">
                    <div class="empty-state">
                      <div class="empty-state-icon">📦</div>
                      <h3>Belum Ada Order</h3>
                      <p>Order akan muncul di sini</p>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
        ${paginationData.total > 0 ? renderPagination(paginationData, 'changeDashboardPage', 'changeDashboardPerPage') : ''}
      </div>
      
      <!-- Order Status Summary -->
      <div class="card">
        <div class="card-head">
          <h3>Ringkasan Status Order</h3>
        </div>
        <div class="detail-list">
          ${statuses.map((s) => `
            <div class="detail-row">
              <span>${s}</span>
              <b>${filteredOrders.filter((o) => o.orderStatus === s).length}</b>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
    
    <!-- Purchased Items Section -->
    ${recentPurchases.length > 0 ? `
      <div class="card" style="margin-top:18px">
        <div class="card-head">
          <h3>Produk yang Dibeli</h3>
        </div>
        <div style="padding: 18px;">
          <div class="purchased-items-grid">
            ${recentPurchases.map(item => `
              <div class="purchased-item">
                <div class="purchased-item-info">
                  <div class="purchased-item-name">${esc(item.productName)}</div>
                  <div class="purchased-item-details">
                    ${item.qty} pcs × ${money(item.unitPrice)} • Order: ${item.orderId} • ${dateId(item.orderDate)}
                  </div>
                </div>
                <div class="purchased-item-price">
                  ${money(itemSubtotal(item))}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    ` : ''}
    
    <!-- Batch Status -->
    <div class="card" style="margin-top:18px">
      <div class="card-head">
        <h3>Status Batch Jastip</h3>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Lokasi</th>
              <th>Status</th>
              <th>Quota</th>
              <th>Sisa</th>
            </tr>
          </thead>
          <tbody>
            ${batches.map((b) => `
              <tr>
                <td>${esc(b.name)}</td>
                <td>${esc(b.location)}</td>
                <td>${badge(b.status)}</td>
                <td>${b.quota}</td>
                <td><b>${batchRemaining(b)}</b></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  document.getElementById("app").innerHTML = shell("Dashboard", content);
  
  // Use setTimeout to ensure DOM is fully rendered and has correct dimensions
  setTimeout(() => {
    renderDashboardCharts(filteredOrders);
  }, 0);
}

function changeDashboardPage(page) {
  paginationState.dashboard.page = page;
  renderDashboard();
}

function changeDashboardPerPage(perPage) {
  paginationState.dashboard.perPage = parseInt(perPage);
  paginationState.dashboard.page = 1;
  renderDashboard();
}

function applyDashboardFilter() {
  const url = new URL(location.href);
  const month = qs('#filterMonth')?.value || '';
  const year = qs('#filterYear')?.value || '';
  
  month ? url.searchParams.set('month', month) : url.searchParams.delete('month');
  year ? url.searchParams.set('year', year) : url.searchParams.delete('year');
  
  // Remove other date filter params
  url.searchParams.delete('date');
  url.searchParams.delete('startDate');
  url.searchParams.delete('endDate');
  
  history.replaceState({}, '', url);
  paginationState.dashboard.page = 1;
  renderDashboard();
}

function resetDashboardFilter() {
  const url = new URL(location.href);
  url.searchParams.delete('month');
  url.searchParams.delete('year');
  // Also remove other date filter params
  url.searchParams.delete('date');
  url.searchParams.delete('startDate');
  url.searchParams.delete('endDate');
  history.replaceState({}, '', url);
  paginationState.dashboard.page = 1;
  renderDashboard();
}

function renderDashboardCharts(filteredOrders) {
  // Force reflow to ensure parent elements have correct dimensions
  const transactionCanvas = document.getElementById("transactionTrendChart");
  const feeCanvas = document.getElementById("feeTrendChart");
  const barCanvas = document.getElementById("orderBarChart");
  const donutCanvas = document.getElementById("orderDonutChart");
  
  // Trigger reflow by reading offsetHeight
  if (transactionCanvas) transactionCanvas.parentElement.offsetHeight;
  if (feeCanvas) feeCanvas.parentElement.offsetHeight;
  if (barCanvas) barCanvas.parentElement.offsetHeight;
  if (donutCanvas) donutCanvas.parentElement.offsetHeight;
  
  _renderOrderBarChart(filteredOrders);
  _renderOrderDonutChart(filteredOrders);
  _renderTransactionTrendChart(filteredOrders);
  _renderFeeTrendChart(filteredOrders);
  
  // Render sparklines with sample data (last 7 days trend)
  const last7Days = Array.from({length: 7}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });
  
  const sparklineData1 = last7Days.map(date => 
    filteredOrders.filter(o => o.orderDate === date).length
  );
  
  const sparklineData2 = last7Days.map(date => 
    filteredOrders.filter(o => o.orderDate === date && !["Selesai", "Dibatalkan"].includes(o.orderStatus)).length
  );
  
  const sparklineData3 = last7Days.map(date => 
    filteredOrders.filter(o => o.orderDate === date && o.orderStatus === "Selesai").length
  );
  
  const isDark = document.documentElement.classList.contains("dark");
  const color1 = isDark ? "#22d3ee" : "#06b6d4";
  const color2 = isDark ? "#4ade80" : "#16a34a";
  const color3 = isDark ? "#fbbf24" : "#d97706";
  
  _renderSparkline("sparkline1", sparklineData1, color1);
  _renderSparkline("sparkline2", sparklineData2, color2);
  _renderSparkline("sparkline3", sparklineData3, color3);
}

/* ── Bar chart: Order summary metrics ─────────────────────────────── */
function _renderOrderBarChart(orders) {
  const canvas = document.getElementById("orderBarChart");
  if (!canvas) return;

  const isDark = document.documentElement.classList.contains("dark");

  const active   = orders.filter(o => !["Selesai","Dibatalkan"].includes(o.orderStatus)).length;
  const unpaid   = orders.filter(o => paymentStatus(o) !== "Lunas").length;
  const shipping = orders.filter(o => o.orderStatus === "Dalam Perjalanan").length;
  const done     = orders.filter(o => o.orderStatus === "Selesai").length;

  // Color palette — same hues, darker variant used in dark mode for bar fill
  const bars = [
    { label: "Total Order",    short: "Total",      value: orders.length, light: "#06b6d4", dark: "#22d3ee" },
    { label: "Order Aktif",    short: "Aktif",       value: active,        light: "#0891b2", dark: "#67e8f9" },
    { label: "Belum Lunas",    short: "Blm Lunas",  value: unpaid,        light: "#d97706", dark: "#fbbf24" },
    { label: "Dlm Perjalanan", short: "Perjalanan",  value: shipping,      light: "#0ea5e9", dark: "#38bdf8" },
    { label: "Selesai",        short: "Selesai",     value: done,          light: "#16a34a", dark: "#4ade80" },
  ].map(b => ({ ...b, color: isDark ? b.dark : b.light }));

  // Theme-aware neutral colors
  const clrGrid    = isDark ? "#1e293b" : "#e2e8f0";
  const clrTick    = isDark ? "#475569" : "#94a3b8";
  const clrValText = isDark ? "#e2e8f0" : "#334155";
  const clrLbl     = isDark ? "#64748b" : "#64748b";

  const dpr    = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  const cssW   = Math.max(260, parent.clientWidth - 24);

  const isMobile = cssW < 440;
  const cssH  = isMobile ? 200 : 260;
  const padL  = isMobile ? 28  : 40;
  const padR  = isMobile ? 10  : 18;
  const padT  = isMobile ? 32  : 36;
  const padB  = isMobile ? 44  : 52;
  const fAxis = isMobile ? 9   : 11;
  const fVal  = isMobile ? 10  : 12;
  const fLbl  = isMobile ? 9   : 11;

  const cW     = cssW - padL - padR;
  const cH     = cssH - padT - padB;
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  // Round maxVal up to a "nice" ceiling so bars never touch the top
  const gridCount = 4;
  const rawStep   = maxVal / gridCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep) || 0));
  const niceStep  = Math.ceil(rawStep / magnitude) * magnitude || 1;
  const niceMax   = niceStep * gridCount;

  const n      = bars.length;
  const groupW = cW / n;
  const barW   = Math.min(groupW * 0.55, isMobile ? 32 : 48);

  canvas.width        = cssW * dpr;
  canvas.height       = cssH * dpr;
  canvas.style.width  = cssW + "px";
  canvas.style.height = cssH + "px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  // Grid lines + y-axis ticks
  for (let i = 0; i <= gridCount; i++) {
    const y = padT + cH - (cH / gridCount) * i;
    ctx.strokeStyle = clrGrid;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + cW, y);
    ctx.stroke();

    const tickVal = niceStep * i;
    ctx.fillStyle = clrTick;
    ctx.font      = `${fAxis}px Inter, Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(tickVal, padL - 6, y + 4);
  }

  // Bars
  bars.forEach((b, idx) => {
    const bH = niceMax === 0 ? 0 : Math.max(0, (b.value / niceMax) * cH);
    const x  = padL + groupW * idx + (groupW - barW) / 2;
    const y  = padT + cH - bH;
    const r  = Math.min(5, barW / 2, bH || 999);

    if (bH > 0) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, padT + cH);
      ctx.lineTo(x, padT + cH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      // Value label above bar (always outside, never inside)
      ctx.fillStyle = clrValText;
      ctx.font      = `600 ${fVal}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      const labelY = Math.max(padT + 2, y - 8);
      ctx.fillText(b.value, x + barW / 2, labelY);
    } else {
      // Zero bar — draw a thin baseline stroke
      ctx.strokeStyle = clrGrid;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(x, padT + cH);
      ctx.lineTo(x + barW, padT + cH);
      ctx.stroke();
    }

    // X-axis label
    ctx.fillStyle = clrLbl;
    ctx.font      = `${fLbl}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    if (isMobile) {
      ctx.fillText(b.short, x + barW / 2, padT + cH + fLbl + 5);
    } else {
      const words = b.label.split(" ");
      const mid   = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(" "), x + barW / 2, padT + cH + fLbl + 5);
      if (words.length > 1) {
        ctx.fillText(words.slice(mid).join(" "), x + barW / 2, padT + cH + fLbl * 2 + 7);
      }
    }
  });
}

/* ── Donut chart: Order status distribution ────────────────────────── */
function _renderOrderDonutChart(orders) {
  const canvas = document.getElementById("orderDonutChart");
  const legend = document.getElementById("donutLegend");
  if (!canvas || !legend) return;

  const isDark = document.documentElement.classList.contains("dark");

  // Status colors — match badge colors; each has a light + dark variant
  const statusDefs = [
    { key: "Pesanan Masuk",    light: "#22d3ee", dark: "#67e8f9" },
    { key: "Barang Dibeli",    light: "#06b6d4", dark: "#22d3ee" },
    { key: "Dalam Perjalanan", light: "#0ea5e9", dark: "#38bdf8" },
    { key: "Barang Sampai",    light: "#0891b2", dark: "#7dd3fc" },
    { key: "Selesai",          light: "#16a34a", dark: "#4ade80" },
    { key: "Dibatalkan",       light: "#dc2626", dark: "#f87171" },
  ].map(s => ({ ...s, color: isDark ? s.dark : s.light }));

  const clrHole    = isDark ? "#111827" : "#ffffff";
  const clrEmpty   = isDark ? "#475569" : "#94a3b8";
  const clrTotal   = isDark ? "#f1f5f9" : "#0f172a";
  const clrSubText = isDark ? "#64748b" : "#64748b";
  const clrLegend  = isDark ? "#cbd5e1" : "#334155";

  const slices = statusDefs
    .map(s => ({ ...s, value: orders.filter(o => o.orderStatus === s.key).length }))
    .filter(s => s.value > 0);

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  const cardW  = canvas.parentElement.clientWidth || 260;
  const size   = Math.min(196, Math.max(140, cardW - 40));
  const dpr    = window.devicePixelRatio || 1;

  canvas.width        = size * dpr;
  canvas.height       = size * dpr;
  canvas.style.width  = size + "px";
  canvas.style.height = size + "px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  if (total === 0) {
    ctx.fillStyle = clrEmpty;
    ctx.font      = "12px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Belum ada data", size / 2, size / 2);
    ctx.textBaseline = "alphabetic";
    legend.innerHTML = "";
    return;
  }

  const cx     = size / 2;
  const cy     = size / 2;
  const outerR = size / 2 - 6;
  const innerR = outerR * 0.58;
  const gap    = 0.018; // small gap between slices
  let   angle  = -Math.PI / 2;

  slices.forEach(s => {
    const sweep = (s.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, angle + gap / 2, angle + sweep - gap / 2);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    angle += sweep;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = clrHole;
  ctx.fill();

  // Centre text
  const fTotal = Math.round(size * 0.115);
  const fLabel = Math.round(size * 0.055);
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = clrTotal;
  ctx.font      = `700 ${fTotal}px Inter, Arial, sans-serif`;
  ctx.fillText(total, cx, cy - fLabel * 0.5);
  ctx.fillStyle = clrSubText;
  ctx.font      = `${fLabel}px Inter, Arial, sans-serif`;
  ctx.fillText("Total Order", cx, cy + fTotal * 0.62);
  ctx.textBaseline = "alphabetic";

  // Legend
  legend.innerHTML = slices.map(s => `
    <div style="display:flex;align-items:center;gap:6px;min-width:0;">
      <span style="flex-shrink:0;width:10px;height:10px;border-radius:3px;background:${s.color};"></span>
      <span style="color:${clrLegend};font-size:12px;word-break:break-word;line-height:1.4;">${esc(s.key)} <b>(${s.value})</b></span>
    </div>
  `).join("");
}

function stat(label, value, icon) {
  return `<div class="card"><span class="stat-icon">${icon}</span><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
}

// New: Stat card with sparkline
function statWithSparkline(label, value, change, canvasId, icon) {
  const changeClass = change >= 0 ? 'positive' : 'negative';
  const changeSymbol = change >= 0 ? '+' : '';
  const changeText = `${changeSymbol}${change.toFixed(1)}%`;
  
  return `
    <div class="card stat-with-sparkline">
      <div class="stat-main">
        <div class="stat-info">
          <div class="stat-label">${label}</div>
          <div class="stat-value-row">
            <div class="stat-value">${value}</div>
            <span class="stat-change ${changeClass}">${changeText}</span>
          </div>
        </div>
        <span class="stat-icon">${icon}</span>
      </div>
      <canvas id="${canvasId}" class="stat-sparkline-canvas"></canvas>
    </div>
  `;
}

// Render mini sparkline chart in stat card
function _renderSparkline(canvasId, dataPoints, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || dataPoints.length === 0) return;

  const isDark = document.documentElement.classList.contains("dark");
  const dpr = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  const cssW = parent.clientWidth;
  const cssH = 40;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const padL = 0;
  const padR = 0;
  const padT = 4;
  const padB = 4;
  const cW = cssW - padL - padR;
  const cH = cssH - padT - padB;

  const maxVal = Math.max(...dataPoints, 1);
  const minVal = Math.min(...dataPoints, 0);
  const range = maxVal - minVal || 1;

  const points = dataPoints.map((val, i) => ({
    x: padL + (i / (dataPoints.length - 1 || 1)) * cW,
    y: padT + cH - ((val - minVal) / range) * cH,
    value: val
  }));

  // Draw smooth curve with better bezier
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    // Calculate control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // Area fill with gradient
  const gradient = ctx.createLinearGradient(0, padT, 0, padT + cH);
  gradient.addColorStop(0, color + "40");
  gradient.addColorStop(1, color + "08");
  
  ctx.lineTo(padL + cW, padT + cH);
  ctx.lineTo(padL, padT + cH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

// Render transaction trend line chart
function _renderTransactionTrendChart(orders) {
  const canvas = document.getElementById("transactionTrendChart");
  if (!canvas) return;

  const isDark = document.documentElement.classList.contains("dark");

  // Group orders by date and sum transaction amounts
  const dateMap = {};
  orders.forEach(o => {
    const date = o.orderDate;
    const total = orderTotal(o);
    dateMap[date] = (dateMap[date] || 0) + total;
  });

  // Sort dates and get last 30 days
  const sortedDates = Object.keys(dateMap).sort();
  const recentDates = sortedDates.slice(-30);
  
  // Fill in missing dates with 0
  if (recentDates.length > 0) {
    const firstDate = new Date(recentDates[0]);
    const lastDate = new Date(recentDates[recentDates.length - 1]);
    const allDates = [];
    const currentDate = new Date(firstDate);
    
    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      allDates.push(dateStr);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const dataPoints = allDates.map(date => ({
      date: date,
      value: dateMap[date] || 0
    }));

    renderSmoothTrendChart(canvas, dataPoints, isDark, "#06b6d4", "#22d3ee", true);
  }
}

// Render fee trend line chart
function _renderFeeTrendChart(orders) {
  const canvas = document.getElementById("feeTrendChart");
  if (!canvas) return;

  const isDark = document.documentElement.classList.contains("dark");

  // Group orders by date and sum fees
  const dateMap = {};
  orders.forEach(o => {
    const date = o.orderDate;
    const fee = Number(o.fee || 0);
    dateMap[date] = (dateMap[date] || 0) + fee;
  });

  // Sort dates and get last 30 days
  const sortedDates = Object.keys(dateMap).sort();
  const recentDates = sortedDates.slice(-30);
  
  // Fill in missing dates with 0
  if (recentDates.length > 0) {
    const firstDate = new Date(recentDates[0]);
    const lastDate = new Date(recentDates[recentDates.length - 1]);
    const allDates = [];
    const currentDate = new Date(firstDate);
    
    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      allDates.push(dateStr);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const dataPoints = allDates.map(date => ({
      date: date,
      value: dateMap[date] || 0
    }));

    renderSmoothTrendChart(canvas, dataPoints, isDark, "#16a34a", "#4ade80", false);
  }
}

function renderSmoothTrendChart(canvas, dataPoints, isDark, lightColor, darkColor, isRupiah) {
  const dpr = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  const cssW = parent.clientWidth;
  const cssH = 240;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const padL = 70;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const cW = cssW - padL - padR;
  const cH = cssH - padT - padB;

  const clrGrid = isDark ? "#1e293b" : "#f1f5f9";
  const clrTick = isDark ? "#64748b" : "#94a3b8";
  const clrLine = isDark ? darkColor : lightColor;
  const clrText = isDark ? "#94a3b8" : "#64748b";

  if (dataPoints.length === 0) {
    ctx.fillStyle = clrTick;
    ctx.font = "14px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Belum ada data", cssW / 2, cssH / 2);
    return;
  }

  const maxVal = Math.max(...dataPoints.map(d => d.value), 1);
  const gridCount = 4;
  const niceMax = Math.ceil(maxVal / gridCount) * gridCount || 100;

  // Draw grid
  for (let i = 0; i <= gridCount; i++) {
    const y = padT + (cH / gridCount) * i;
    ctx.strokeStyle = clrGrid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + cW, y);
    ctx.stroke();

    const tickVal = niceMax - (niceMax / gridCount) * i;
    ctx.fillStyle = clrTick;
    ctx.font = "12px Inter, Arial, sans-serif";
    ctx.textAlign = "right";
    
    if (tickVal >= 1000000) {
      ctx.fillText("Rp " + (tickVal / 1000000).toFixed(1) + "jt", padL - 8, y + 4);
    } else if (tickVal >= 1000) {
      ctx.fillText("Rp " + (tickVal / 1000).toFixed(0) + "k", padL - 8, y + 4);
    } else if (tickVal > 0) {
      ctx.fillText("Rp " + tickVal, padL - 8, y + 4);
    } else {
      ctx.fillText("0", padL - 8, y + 4);
    }
  }

  // Calculate points
  const points = dataPoints.map((d, i) => ({
    x: padL + (i / (dataPoints.length - 1 || 1)) * cW,
    y: padT + cH - (d.value / niceMax) * cH,
    value: d.value,
    date: d.date
  }));

  // Draw smooth curve - first draw the area fill
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  // Use better bezier curve calculation
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    // Calculate control points for smoother curve
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  ctx.strokeStyle = clrLine;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // Area fill with gradient
  const gradient = ctx.createLinearGradient(0, padT, 0, padT + cH);
  gradient.addColorStop(0, clrLine + "35");
  gradient.addColorStop(1, clrLine + "08");
  
  ctx.lineTo(padL + cW, padT + cH);
  ctx.lineTo(padL, padT + cH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw dots exactly on the curve
  points.forEach((point, i) => {
    // Only draw dots on every few points to keep it clean
    if (i % Math.max(1, Math.floor(points.length / 10)) === 0 || i === 0 || i === points.length - 1) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = clrLine;
      ctx.fill();
      ctx.strokeStyle = isDark ? "#111827" : "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  });

  // X-axis labels
  const labelInterval = Math.ceil(dataPoints.length / 6);
  ctx.fillStyle = clrText;
  ctx.font = "11px Inter, Arial, sans-serif";
  ctx.textAlign = "center";

  dataPoints.forEach((d, i) => {
    if (i % labelInterval === 0 || i === dataPoints.length - 1) {
      const x = points[i].x;
      const dateObj = new Date(d.date);
      const label = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
      ctx.fillText(label, x, padT + cH + 22);
    }
  });

  // Add tooltip on hover
  addChartTooltip(canvas, points, isRupiah);
}

// Add interactive tooltip to chart
function addChartTooltip(canvas, points, isRupiah) {
  let tooltip = canvas.parentElement.querySelector('.chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    canvas.parentElement.style.position = 'relative';
    canvas.parentElement.appendChild(tooltip);
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find nearest point
    let nearest = null;
    let minDist = Infinity;

    points.forEach(point => {
      const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
      if (dist < minDist && dist < 30) {
        minDist = dist;
        nearest = point;
      }
    });

    if (nearest) {
      const dateObj = new Date(nearest.date);
      const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
      
      let valueStr = "Rp " + money(nearest.value);

      tooltip.textContent = `${dateStr}: ${valueStr}`;
      tooltip.style.left = nearest.x + 'px';
      tooltip.style.top = nearest.y + 'px';
      tooltip.classList.add('visible');
    } else {
      tooltip.classList.remove('visible');
    }
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.classList.remove('visible');
  });
}
function renderCustomers() {
  const data = customerData();
  const q = getParam("q") || "";
  const rows = data.filter((c) =>
    (c.name + c.whatsapp + c.city).toLowerCase().includes(q.toLowerCase()),
  );
  
  // Pagination
  const paginationData = createPagination(rows, paginationState.customer.page, paginationState.customer.perPage);
  
  const content = `
    <div class="page-head">
      <div>
        <h1>Data Customer</h1>
        <p>Kelola data pelanggan jastip Anda.</p>
      </div>
      <button class="btn btn-primary" onclick="openCustomerModal()">+ Tambah Customer</button>
    </div>
    
    <div class="toolbar">
      <input id="customerSearch" value="${esc(q)}" placeholder=" Cari nama, nomor telepon, kota...">
    </div>
    
    <div class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Nomor Telepon</th>
              <th>Kota</th>
              <th>Alamat</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${paginationData.items.length ? paginationData.items.map((c) => `
              <tr>
                <td><b>${esc(c.name)}</b></td>
                <td>${esc(c.whatsapp)}</td>
                <td>${esc(c.city)}</td>
                <td>${esc(c.address)}</td>
                <td>${esc(c.note || "—")}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-secondary btn-sm" onclick="openCustomerModal('${c.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Hapus</button>
                  </div>
                </td>
              </tr>
            `).join("") : `
              <tr>
                <td colspan="6">
                  <div class="empty-state">
                    <div class="empty-state-icon">👤</div>
                    <h3>Customer Tidak Ditemukan</h3>
                    <p>${q ? 'Coba kata kunci lain atau tambah customer baru' : 'Belum ada data customer'}</p>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
      ${paginationData.total > 0 ? renderPagination(paginationData, 'changeCustomerPage', 'changeCustomerPerPage') : ''}
    </div>
    ${modalHTML()}
  `;
  
  document.getElementById("app").innerHTML = shell("Customer", content);
  
  // Add event listener after render
  const searchInput = document.getElementById("customerSearch");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", function(e) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        paginationState.customer.page = 1;
        updateCustomerTableOnly(e.target.value);
      }, 500);
    });
  }
}

function changeCustomerPage(page) {
  paginationState.customer.page = page;
  updateCustomerTableOnly(getParam("q") || "");
}

function changeCustomerPerPage(perPage) {
  paginationState.customer.perPage = parseInt(perPage);
  paginationState.customer.page = 1;
  renderCustomers();
}

function filterCustomer(q) {
  const url = new URL(location.href);
  q ? url.searchParams.set("q", q) : url.searchParams.delete("q");
  history.replaceState({}, "", url);
  renderCustomers();
}

function updateCustomerTableOnly(q) {
  const data = customerData();
  const rows = data.filter((c) =>
    (c.name + c.whatsapp + c.city).toLowerCase().includes(q.toLowerCase()),
  );
  
  // Pagination for filtered rows
  const paginationData = createPagination(rows, paginationState.customer.page, paginationState.customer.perPage);
  
  // Update only the table content
  const tableBody = document.querySelector(".table-card tbody");
  if (tableBody) {
    tableBody.innerHTML = paginationData.items.length ? paginationData.items.map((c) => `
      <tr>
        <td><b>${esc(c.name)}</b></td>
        <td>${esc(c.whatsapp)}</td>
        <td>${esc(c.city)}</td>
        <td>${esc(c.address)}</td>
        <td>${esc(c.note || "—")}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm" onclick="openCustomerModal('${c.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Hapus</button>
          </div>
        </td>
      </tr>
    `).join("") : `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">👤</div>
            <h3>Customer Tidak Ditemukan</h3>
            <p>${q ? 'Coba kata kunci lain atau tambah customer baru' : 'Belum ada data customer'}</p>
          </div>
        </td>
      </tr>
    `;
    
    // Update pagination
    const paginationContainer = document.querySelector(".pagination");
    if (paginationContainer) {
      if (paginationData.total > 0) {
        paginationContainer.outerHTML = renderPagination(paginationData, 'changeCustomerPage', 'changeCustomerPerPage');
      } else {
        paginationContainer.remove();
      }
    } else if (paginationData.total > 0) {
      // Add pagination if it doesn't exist
      const card = document.querySelector(".table-card");
      if (card) {
        card.insertAdjacentHTML('beforeend', renderPagination(paginationData, 'changeCustomerPage', 'changeCustomerPerPage'));
      }
    }
  }
  
  // Update URL without re-rendering
  const url = new URL(location.href);
  q ? url.searchParams.set("q", q) : url.searchParams.delete("q");
  history.replaceState({}, "", url);
}
function modalHTML() {
  return `<div id="modal" class="modal-backdrop"><div class="modal"><div id="modalContent"></div></div></div>`;
}
function openModal(html) {
  const modalRoot = qs("#modal");
  if (!modalRoot) return;
  // Keep the overlay outside the scrolling content so it is centered in the viewport.
  if (modalRoot.parentElement !== document.body) document.body.appendChild(modalRoot);
  qs("#modalContent").innerHTML = html;
  modalRoot.classList.add("show");
}
function closeModal() {
  qs("#modal")?.classList.remove("show");
}
function openCustomerModal(id = "") {
  const c = customerData().find((x) => x.id === id) || {
    name: "",
    whatsapp: "",
    address: "",
    city: "",
    note: "",
  };
  openModal(
    `<div class="modal-head">
      <h3>${id ? "Edit" : "Tambah"} Customer</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <form onsubmit="saveCustomer(event,'${id}')">
      <div class="form-grid">
        <label>
          Nama Customer
          <input name="name" required value="${esc(c.name)}" placeholder="Masukkan nama lengkap">
        </label>
        <label>
          Nomor Telepon
          <input name="whatsapp" required value="${esc(c.whatsapp)}" placeholder="contoh: 081234567890">
        </label>
        <label>
          Kota
          <input name="city" required value="${esc(c.city)}" placeholder="contoh: Surabaya">
        </label>
        <label>
          Alamat Lengkap
          <input name="address" required value="${esc(c.address)}" placeholder="Jalan, nomor, RT/RW">
        </label>
        <label class="full">
          Catatan (Opsional)
          <textarea name="note" placeholder="Tambahkan catatan khusus untuk customer ini">${esc(c.note)}</textarea>
        </label>
      </div>
      <br>
      <div class="btn-group">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button class="btn btn-primary" style="flex: 1;">Simpan Customer</button>
      </div>
    </form>`,
  );
}
function saveCustomer(e, id) {
  e.preventDefault();
  const f = new FormData(e.target),
    arr = customerData();
  const obj = {
    id: id || uid("CUST"),
    name: f.get("name").trim(),
    whatsapp: f.get("whatsapp").trim(),
    address: f.get("address").trim(),
    city: f.get("city").trim(),
    note: f.get("note").trim(),
  };
  if (id) {
    const i = arr.findIndex((x) => x.id === id);
    arr[i] = obj;
  } else arr.push(obj);
  Store.set(STORAGE_KEYS.customers, arr);
  closeModal();
  toast("Customer berhasil disimpan");
  setTimeout(renderCustomers, 300);
}
function deleteCustomer(id) {
  const has = orderData().some((o) => o.customerId === id);
  if (has) {
    alert(
      "Customer tidak dapat dihapus karena masih memiliki order. Hapus/ubah order terkait terlebih dahulu.",
    );
    return;
  }
  if (confirm("Hapus customer ini?")) {
    Store.set(
      STORAGE_KEYS.customers,
      customerData().filter((x) => x.id !== id),
    );
    toast("Customer dihapus");
    setTimeout(renderCustomers, 300);
  }
}
function renderBatches() {
  const data = batchData();
  const q = getParam("q") || "",
    status = getParam("status") || "";
  const rows = data.filter(
    (b) =>
      (b.name + b.location).toLowerCase().includes(q.toLowerCase()) &&
      (!status || b.status === status),
  );
  const statuses = [
    "Upcoming",
    "Open",
    "Closed",
    "Shopping",
    "Shipping",
    "Completed",
  ];
  const content = `<div class="page-head"><div><h1>Batch Jastip</h1><p>Kelola perjalanan, quota, dan status batch.</p></div><button class="btn btn-primary" onclick="openBatchModal()">+ Tambah Batch</button></div>
 <div class="toolbar"><input id="batchSearch" value="${esc(q)}" placeholder="Cari batch/lokasi..."><select id="batchStatus" onchange="filterBatchStatus(this.value)"><option value="">Semua Status</option>${statuses.map((s) => `<option ${s === status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
 <div class="card table-card"><div class="table-wrap"><table><thead><tr><th>Batch</th><th>Lokasi</th><th>Deadline</th><th>Status</th><th>Quota</th><th>Terpakai</th><th>Sisa</th><th>Aksi</th></tr></thead><tbody>${rows.length ? rows.map((b) => `<tr><td><b>${esc(b.name)}</b></td><td>${esc(b.location)}</td><td>${dateId(b.deadline)}</td><td>${badge(b.status)}</td><td>${b.quota}</td><td>${batchCount(b.id)}</td><td><b>${batchRemaining(b)}</b></td><td><button class="btn btn-secondary btn-sm" onclick="openBatchModal('${b.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteBatch('${b.id}')">Hapus</button></td></tr>`).join("") : `<tr><td colspan="8"><div class="empty">Batch tidak ditemukan.</div></td></tr>`}</tbody></table></div></div>${modalHTML()}`;
  document.getElementById("app").innerHTML = shell("Batch Jastip", content);
  
  // Add event listener after render
  const searchInput = document.getElementById("batchSearch");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", function(e) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterBatch(e.target.value);
      }, 500);
    });
  }
}
function filterBatch(q) {
  const u = new URL(location.href);
  q ? u.searchParams.set("q", q) : u.searchParams.delete("q");
  history.replaceState({}, "", u);
  
  // Update table only, not entire page
  const data = batchData();
  const status = getParam("status") || "";
  const rows = data.filter(
    (b) =>
      (b.name + b.location).toLowerCase().includes(q.toLowerCase()) &&
      (!status || b.status === status),
  );
  
  const tableBody = document.querySelector(".table-card tbody");
  if (tableBody) {
    tableBody.innerHTML = rows.length ? rows.map((b) => `<tr><td><b>${esc(b.name)}</b></td><td>${esc(b.location)}</td><td>${dateId(b.deadline)}</td><td>${badge(b.status)}</td><td>${b.quota}</td><td>${batchCount(b.id)}</td><td><b>${batchRemaining(b)}</b></td><td><button class="btn btn-secondary btn-sm" onclick="openBatchModal('${b.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteBatch('${b.id}')">Hapus</button></td></tr>`).join("") : `<tr><td colspan="8"><div class="empty">Batch tidak ditemukan.</div></td></tr>`;
  }
}
function filterBatchStatus(s) {
  const u = new URL(location.href);
  s ? u.searchParams.set("status", s) : u.searchParams.delete("status");
  history.replaceState({}, "", u);
  renderBatches();
}
function openBatchModal(id = "") {
  const b = batchData().find((x) => x.id === id) || {
    name: "",
    location: "",
    openDate: "",
    deadline: "",
    estimatedArrival: "",
    quota: 10,
    status: "Upcoming",
  };
  const statuses = [
    "Upcoming",
    "Open",
    "Closed",
    "Shopping",
    "Shipping",
    "Completed",
  ];
  openModal(
    `<div class="modal-head"><h3>${id ? "Edit" : "Tambah"} Batch</h3><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveBatch(event,'${id}')"><div class="form-grid"><label>Nama Batch<input name="name" required value="${esc(b.name)}"></label><label>Lokasi<input name="location" required value="${esc(b.location)}"></label><label>Tanggal Buka<input type="date" name="openDate" required value="${b.openDate}"></label><label>Deadline<input type="date" name="deadline" required value="${b.deadline}"></label><label>Estimasi Tiba<input type="date" name="estimatedArrival" required value="${b.estimatedArrival}"></label><label>Quota<input type="number" min="1" name="quota" required value="${b.quota}"></label><label>Status<select name="status">${statuses.map((s) => `<option ${s === b.status ? "selected" : ""}>${s}</option>`).join("")}</select></label></div><br><button class="btn btn-primary btn-block">Simpan</button></form>`,
  );
}
function saveBatch(e, id) {
  e.preventDefault();
  const f = new FormData(e.target),
    arr = batchData();
  const old = arr.find((x) => x.id === id);
  const quota = Number(f.get("quota"));
  if (quota < (old ? batchCount(id) : 0)) {
    alert("Quota tidak boleh lebih kecil dari jumlah order aktif.");
    return;
  }
  const obj = {
    id: id || uid("BATCH"),
    name: f.get("name").trim(),
    location: f.get("location").trim(),
    openDate: f.get("openDate"),
    deadline: f.get("deadline"),
    estimatedArrival: f.get("estimatedArrival"),
    quota,
    status: f.get("status"),
  };
  if (id) arr[arr.findIndex((x) => x.id === id)] = obj;
  else arr.push(obj);
  Store.set(STORAGE_KEYS.batches, arr);
  closeModal();
  toast("Batch berhasil disimpan");
  setTimeout(renderBatches, 300);
}
function deleteBatch(id) {
  if (orderData().some((o) => o.batchId === id)) {
    alert("Batch tidak dapat dihapus karena sudah memiliki order.");
    return;
  }
  if (confirm("Hapus batch ini?")) {
    Store.set(
      STORAGE_KEYS.batches,
      batchData().filter((x) => x.id !== id),
    );
    toast("Batch dihapus");
    setTimeout(renderBatches, 300);
  }
}
function renderOrders() {
  const orders = orderData();
  const q = getParam("q") || "";
  const os = getParam("os") || "";
  const ps = getParam("ps") || "";
  const filterMonth = getParam("month") || "";
  const filterYear = getParam("year") || "";
  
  // Apply all filters
  let rows = orders.filter((o) => {
    const text = (
      o.id +
      " " +
      customerName(o.customerId) +
      " " +
      batchName(o.batchId)
    ).toLowerCase();
    
    // Text search
    if (q && !text.includes(q.toLowerCase())) return false;
    
    // Status filters
    if (os && o.orderStatus !== os) return false;
    if (ps && paymentStatus(o) !== ps) return false;
    
    return true;
  });
  
  // Month and Year filters
  if (filterMonth && filterYear) {
    rows = filterByMonth(rows, 'orderDate', filterMonth, filterYear);
  } else if (filterMonth && !filterYear) {
    rows = filterByMonth(rows, 'orderDate', filterMonth);
  } else if (filterYear && !filterMonth) {
    rows = filterByYear(rows, 'orderDate', filterYear);
  }

  // Urutkan dari tanggal terbaru (descending)
  rows.sort((a, b) => b.orderDate.localeCompare(a.orderDate));

  // Pagination
  const paginationData = createPagination(rows, paginationState.order.page, paginationState.order.perPage);
  
  const orderStatuses = [
    "Pesanan Masuk",
    "Barang Dibeli",
    "Dalam Perjalanan",
    "Barang Sampai",
    "Selesai",
    "Dibatalkan",
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => currentYear - 2 + i);
  
  const content = `
    <div class="page-head">
      <div>
        <h1>Data Order</h1>
        <p>Kelola pesanan, status, dan pembayaran.</p>
      </div>
      <a class="btn btn-primary" href="order-form.html">+ Buat Order</a>
    </div>
    
    <!-- Order Filters -->
    <div class="filter-panel">
      <div class="filter-grid">
        <label>
          Cari Order / Customer / Batch
          <input type="text" id="orderSearch" value="${esc(q)}" placeholder="Cari nomor order, nama customer, atau batch...">
        </label>
        <label>
          Status Order
          <select id="orderStatusFilter">
            <option value="">Semua Status Order</option>
            ${orderStatuses.map((s) => 
              `<option ${s === os ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
        </label>
        <label>
          Status Pembayaran
          <select id="paymentStatusFilter">
            <option value="">Semua Status Pembayaran</option>
            ${["Belum Bayar", "DP", "Lunas"].map((s) => 
              `<option ${s === ps ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
        </label>
      </div>
      
      <div class="filter-grid">
        <label>
          Bulan
          <select id="filterMonth">
            <option value="">Semua Bulan</option>
            ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
              `<option value="${m}" ${filterMonth == m ? 'selected' : ''}>${getMonthName(m)}</option>`
            ).join('')}
          </select>
        </label>
        <label>
          Tahun
          <select id="filterYear">
            <option value="">Semua Tahun</option>
            ${years.map(y => 
              `<option value="${y}" ${filterYear == y ? 'selected' : ''}>${y}</option>`
            ).join('')}
          </select>
        </label>
      </div>
      
      <div class="filter-actions">
        <button class="btn btn-primary" onclick="applyOrderFilter()">Terapkan Filter</button>
        <button class="btn btn-secondary" onclick="resetOrderFilter()">Reset Semua Filter</button>
      </div>
    </div>
    
    <div class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nomor Order</th>
              <th>Customer</th>
              <th>Batch</th>
              <th>Tanggal</th>
              <th>Total</th>
              <th>Pembayaran</th>
              <th>Status Order</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${paginationData.items.length ? paginationData.items.map((o) => `
              <tr>
                <td><b>${o.id}</b></td>
                <td>${esc(customerName(o.customerId))}</td>
                <td>${esc(batchName(o.batchId))}</td>
                <td>${dateId(o.orderDate)}</td>
                <td><b>${money(orderTotal(o))}</b></td>
                <td>${badge(paymentStatus(o))}</td>
                <td>${badge(o.orderStatus)}</td>
                <td>
                  <a class="btn btn-secondary btn-sm" href="order-detail.html?id=${o.id}">Lihat Detail</a>
                </td>
              </tr>
            `).join("") : `
              <tr>
                <td colspan="8">
                  <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h3>Order Tidak Ditemukan</h3>
                    <p>${q || os || ps || filterMonth || filterYear ? 'Tidak ada order yang sesuai dengan filter' : 'Belum ada order'}</p>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
      ${paginationData.total > 0 ? renderPagination(paginationData, 'changeOrderPage', 'changeOrderPerPage') : ''}
    </div>
  `;
  
  document.getElementById("app").innerHTML = shell("Order Jastip", content);
  
  // Add event listener for search
  const searchInput = document.getElementById("orderSearch");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", function(e) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        paginationState.order.page = 1;
        updateOrderTableOnly(e.target.value);
      }, 500);
    });
  }
}

function changeOrderPage(page) {
  paginationState.order.page = page;
  updateOrderTableOnly(getParam("q") || "");
}

function updateOrderTableOnly(q) {
  const orders = orderData();
  const os = getParam("os") || "";
  const ps = getParam("ps") || "";
  const filterMonth = getParam("month") || "";
  const filterYear = getParam("year") || "";
  
  // Apply all filters
  let rows = orders.filter((o) => {
    const text = (
      o.id +
      " " +
      customerName(o.customerId) +
      " " +
      batchName(o.batchId)
    ).toLowerCase();
    
    // Text search
    if (q && !text.includes(q.toLowerCase())) return false;
    
    // Status filters
    if (os && o.orderStatus !== os) return false;
    if (ps && paymentStatus(o) !== ps) return false;
    
    return true;
  });
  
  // Month and Year filters
  if (filterMonth && filterYear) {
    rows = filterByMonth(rows, 'orderDate', filterMonth, filterYear);
  } else if (filterMonth && !filterYear) {
    rows = filterByMonth(rows, 'orderDate', filterMonth);
  } else if (filterYear && !filterMonth) {
    rows = filterByYear(rows, 'orderDate', filterYear);
  }

  // Urutkan dari tanggal terbaru (descending)
  rows.sort((a, b) => b.orderDate.localeCompare(a.orderDate));

  // Pagination
  const paginationData = createPagination(rows, paginationState.order.page, paginationState.order.perPage);
  
  // Update only the table content
  const tableBody = document.querySelector(".table-card tbody");
  if (tableBody) {
    tableBody.innerHTML = paginationData.items.length ? paginationData.items.map((o) => `
      <tr>
        <td><b>${o.id}</b></td>
        <td>${esc(customerName(o.customerId))}</td>
        <td>${esc(batchName(o.batchId))}</td>
        <td>${dateId(o.orderDate)}</td>
        <td><b>${money(orderTotal(o))}</b></td>
        <td>${badge(paymentStatus(o))}</td>
        <td>${badge(o.orderStatus)}</td>
        <td>
          <a class="btn btn-secondary btn-sm" href="order-detail.html?id=${o.id}">Lihat Detail</a>
        </td>
      </tr>
    `).join("") : `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <h3>Order Tidak Ditemukan</h3>
            <p>${q || os || ps || filterMonth || filterYear ? 'Tidak ada order yang sesuai dengan filter' : 'Belum ada order'}</p>
          </div>
        </td>
      </tr>
    `;
    
    // Update pagination
    const paginationContainer = document.querySelector(".pagination");
    if (paginationContainer) {
      if (paginationData.total > 0) {
        paginationContainer.outerHTML = renderPagination(paginationData, 'changeOrderPage', 'changeOrderPerPage');
      } else {
        paginationContainer.remove();
      }
    } else if (paginationData.total > 0) {
      // Add pagination if it doesn't exist
      const card = document.querySelector(".table-card");
      if (card) {
        card.insertAdjacentHTML('beforeend', renderPagination(paginationData, 'changeOrderPage', 'changeOrderPerPage'));
      }
    }
  }
  
  // Update URL for text search only
  const url = new URL(location.href);
  q ? url.searchParams.set("q", q) : url.searchParams.delete("q");
  history.replaceState({}, "", url);
}

function changeOrderPerPage(perPage) {
  paginationState.order.perPage = parseInt(perPage);
  paginationState.order.page = 1;
  renderOrders();
}

function applyOrderFilter() {
  const url = new URL(location.href);
  const month = qs('#filterMonth')?.value || '';
  const year = qs('#filterYear')?.value || '';
  const os = qs('#orderStatusFilter')?.value || '';
  const ps = qs('#paymentStatusFilter')?.value || '';
  
  month ? url.searchParams.set('month', month) : url.searchParams.delete('month');
  year ? url.searchParams.set('year', year) : url.searchParams.delete('year');
  os ? url.searchParams.set('os', os) : url.searchParams.delete('os');
  ps ? url.searchParams.set('ps', ps) : url.searchParams.delete('ps');
  
  // Remove other date filter params
  url.searchParams.delete('date');
  url.searchParams.delete('startDate');
  url.searchParams.delete('endDate');
  
  history.replaceState({}, '', url);
  paginationState.order.page = 1;
  renderOrders();
}

function resetOrderFilter() {
  const url = new URL(location.href);
  url.searchParams.delete('q');
  url.searchParams.delete('os');
  url.searchParams.delete('ps');
  url.searchParams.delete('month');
  url.searchParams.delete('year');
  // Also remove other date filter params
  url.searchParams.delete('date');
  url.searchParams.delete('startDate');
  url.searchParams.delete('endDate');
  history.replaceState({}, '', url);
  paginationState.order.page = 1;
  renderOrders();
}

function setOrderFilter(key, val) {
  const u = new URL(location.href);
  val ? u.searchParams.set(key, val) : u.searchParams.delete(key);
  // Remove other date filter params when setting search or status filters
  if (key === 'q' || key === 'os' || key === 'ps') {
    u.searchParams.delete('date');
    u.searchParams.delete('startDate');
    u.searchParams.delete('endDate');
  }
  history.replaceState({}, "", u);
  
  // For text search, use table-only update to preserve focus
  if (key === 'q') {
    paginationState.order.page = 1;
    updateOrderTableOnly(val || "");
  } else {
    renderOrders();
  }
}
function renderOrderForm() {
  const id = getParam("id"),
    old = orderData().find((o) => o.id === id),
    customers = customerData(),
    batches = batchData();
  const o = old || {
    customerId: "",
    batchId: "",
    orderDate: new Date().toISOString().slice(0, 10),
    items: [{ productName: "", qty: 1, unitPrice: 0 }],
    fee: 0,
    shippingCost: 0,
    paidAmount: 0,
    note: "",
  };
  const content = `<div class="page-head"><div><h1>${id ? "Edit" : "Buat"} Order</h1><p>Order hanya dapat dibuat pada batch Open dan quota masih tersedia.</p></div></div>
 <form id="orderForm" class="card form-card" onsubmit="saveOrder(event,'${id || ""}')">
 <div class="form-grid"><label>Customer<select name="customerId" required><option value="">Pilih customer</option>${customers.map((c) => `<option value="${c.id}" ${c.id === o.customerId ? "selected" : ""}>${esc(c.name)} — ${esc(c.whatsapp)}</option>`).join("")}</select></label>
 <label>Batch Jastip<select name="batchId" required><option value="">Pilih batch</option>${batches
   .map((b) => {
     const allowed =
       b.status === "Open" && (batchRemaining(b) > 0 || b.id === o.batchId);
     return `<option value="${b.id}" ${b.id === o.batchId ? "selected" : ""} ${allowed ? "" : "disabled"}>${esc(b.name)} — sisa ${batchRemaining(b)}</option>`;
   })
   .join("")}</select></label>
 <label>Tanggal Order<input type="date" name="orderDate" required value="${o.orderDate}"></label><label>Catatan Order (Opsional)<textarea name="note" placeholder="Tambahkan catatan khusus untuk order ini">${esc(o.note || "")}</textarea></label></div>
 <div class="section-title">Daftar Produk</div><div id="items">${o.items.map((i, n) => itemRow(i, n)).join("")}</div>
 <button type="button" class="btn btn-secondary btn-sm" onclick="addItem()">+ Tambah Item Produk</button>
 <div class="section-title">Biaya & Pembayaran</div><div class="form-grid"><label>Fee Jastip (Rp)<input id="fee" type="number" min="0" value="${o.fee}" oninput="updateCalc()" placeholder="0"></label><label>Ongkos Kirim (Rp)<input id="shipping" type="number" min="0" value="${o.shippingCost}" oninput="updateCalc()" placeholder="0"></label><label>Pembayaran Saat Ini (Rp)<input id="paid" type="number" min="0" value="${id ? 0 : o.paidAmount}" ${id ? "" : "required"} placeholder="0"><small class="muted">${id ? "Untuk edit pembayaran, gunakan tombol Catat Pembayaran di halaman detail order." : "Masukkan jumlah yang sudah dibayar (bisa 0 jika belum ada pembayaran)"}</small></label></div>
 <div class="summary" style="margin-top:15px"><div class="summary-line"><span>Subtotal Produk</span><b id="subtotal">Rp0</b></div><div class="summary-line"><span>Fee Jastip</span><b id="feeShow">Rp0</b></div><div class="summary-line"><span>Ongkos Kirim</span><b id="shipShow">Rp0</b></div><div class="summary-line total"><span>Total Tagihan</span><b id="total">Rp0</b></div></div>
 <br><div class="btn-group"><a href="order.html" class="btn btn-secondary">Batal</a><button class="btn btn-primary" style="flex: 1;">Simpan Order</button></div></form>`;
  document.getElementById("app").innerHTML = shell("Form Order", content);
  updateCalc();
}
function itemRow(i, n) {
  return `<div class="item-row"><label>Nama Produk<input name="productName" required value="${esc(i.productName)}" oninput="updateCalc()"></label><label>Qty<input name="qty" type="number" min="1" required value="${i.qty}" oninput="updateCalc()"></label><label>Harga Satuan<input name="unitPrice" type="number" min="1" required value="${i.unitPrice}" oninput="updateCalc()"></label><div><small class="muted">Subtotal</small><div class="money item-subtotal">${money(itemSubtotal(i))}</div></div><button type="button" class="btn btn-danger" onclick="removeItem(this)">×</button></div>`;
}
function addItem() {
  qs("#items").insertAdjacentHTML(
    "beforeend",
    itemRow({ productName: "", qty: 1, unitPrice: 0 }, Date.now()),
  );
  updateCalc();
}
function removeItem(btn) {
  if (document.querySelectorAll("#items .item-row").length <= 1) {
    alert("Minimal 1 item.");
    return;
  }
  btn.closest(".item-row").remove();
  updateCalc();
}
function readItems() {
  return [...document.querySelectorAll("#items .item-row")].map((r) => ({
    productName: r.querySelector('[name="productName"]').value.trim(),
    qty: Number(r.querySelector('[name="qty"]').value),
    unitPrice: Number(r.querySelector('[name="unitPrice"]').value),
  }));
}
function updateCalc() {
  const items = readItems();
  const sub = items.reduce((s, i) => s + itemSubtotal(i), 0),
    fee = Number(qs("#fee")?.value || 0),
    ship = Number(qs("#shipping")?.value || 0);
  document
    .querySelectorAll(".item-subtotal")
    .forEach((x, n) => (x.textContent = money(itemSubtotal(items[n]))));
  if (qs("#subtotal")) qs("#subtotal").textContent = money(sub);
  if (qs("#feeShow")) qs("#feeShow").textContent = money(fee);
  if (qs("#shipShow")) qs("#shipShow").textContent = money(ship);
  if (qs("#total")) qs("#total").textContent = money(sub + fee + ship);
}
function saveOrder(e, id) {
  e.preventDefault();
  const f = new FormData(e.target),
    items = readItems(),
    b = batchData().find((x) => x.id === f.get("batchId"));
  if (
    !items.length ||
    items.some((i) => !i.productName || i.qty < 1 || i.unitPrice <= 0)
  ) {
    alert("Minimal 1 item, quantity minimal 1, harga harus lebih dari 0.");
    return;
  }
  if (!b) {
    alert("Batch tidak valid.");
    return;
  }
  if (!id && (b.status !== "Open" || batchRemaining(b) <= 0)) {
    alert(
      "Order hanya boleh dibuat pada batch Open yang masih memiliki quota.",
    );
    return;
  }
  const arr = orderData(),
    old = arr.find((x) => x.id === id);
  const base = {
    id: id || orderNumber(),
    customerId: f.get("customerId"),
    batchId: f.get("batchId"),
    orderDate: f.get("orderDate"),
    items,
    fee: Number(qs("#fee").value || 0),
    shippingCost: Number(qs("#shipping").value || 0),
    paidAmount: id ? old.paidAmount : Number(qs("#paid").value || 0),
    orderStatus: old?.orderStatus || "Pesanan Masuk",
    note: f.get("note"),
  };
  const total = orderTotal(base);
  if (base.paidAmount < 0 || base.paidAmount > total) {
    alert("Pembayaran tidak boleh negatif atau melebihi total.");
    return;
  }
  if (id) arr[arr.findIndex((x) => x.id === id)] = base;
  else arr.push(base);
  Store.set(STORAGE_KEYS.orders, arr);
  toast("Order berhasil disimpan");
  location.href = `order-detail.html?id=${base.id}`;
}
function renderOrderDetail() {
  const id = getParam("id"),
    o = orderData().find((x) => x.id === id);
  if (!o) {
    document.getElementById("app").innerHTML = shell(
      "Order",
      '<div class="card"><div class="empty-state"><div class="empty-state-icon">📦</div><h3>Order Tidak Ditemukan</h3><p>Order yang Anda cari tidak ada atau telah dihapus</p></div></div>',
    );
    return;
  }
  const total = orderTotal(o),
    pay = paymentStatus(o),
    statuses = [
      "Pesanan Masuk",
      "Barang Dibeli",
      "Dalam Perjalanan",
      "Barang Sampai",
      "Selesai",
    ];
  const next = statuses.indexOf(o.orderStatus);
  const canAdvance =
      next >= 0 &&
      next < statuses.length - 1 &&
      !["Selesai", "Dibatalkan"].includes(o.orderStatus);
  
  // Status button labels
  const statusButtonLabels = {
    "Pesanan Masuk": "Konfirmasi & Tandai Barang Dibeli",
    "Barang Dibeli": "Tandai Dalam Perjalanan",
    "Dalam Perjalanan": "Tandai Barang Sudah Sampai",
    "Barang Sampai": "Tandai Order Selesai"
  };
  
  const nextButtonLabel = canAdvance ? statusButtonLabels[o.orderStatus] || `Lanjut ke ${statuses[next + 1]}` : '';
  
  const content = `
    <div class="page-head">
      <div>
        <h1>Detail Order</h1>
        <p>${o.id}</p>
      </div>
      <div class="actions">
        <a class="btn btn-secondary" href="order.html">← Kembali ke Daftar Order</a>
        ${!["Selesai", "Dibatalkan"].includes(o.orderStatus) ? `
          <a class="btn btn-secondary" href="order-form.html?id=${o.id}"> Edit Order</a>
        ` : ""}
      </div>
    </div>
    
    <div class="detail-grid">
      <!-- Order Information -->
      <div class="card">
        <div class="card-head">
          <h3>📋 Informasi Order</h3>
        </div>
        <div class="detail-list">
          <div class="detail-row">
            <span>Nomor Order</span>
            <b>${o.id}</b>
          </div>
          <div class="detail-row">
            <span>Nama Customer</span>
            <b>${esc(customerName(o.customerId))}</b>
          </div>
          <div class="detail-row">
            <span>Batch Jastip</span>
            <b>${esc(batchName(o.batchId))}</b>
          </div>
          <div class="detail-row">
            <span>Tanggal Order</span>
            <b>${dateId(o.orderDate)}</b>
          </div>
          <div class="detail-row">
            <span>Status Order</span>
            <b>${badge(o.orderStatus)}</b>
          </div>
          <div class="detail-row">
            <span>Status Pembayaran</span>
            <b>${badge(pay)}</b>
          </div>
          ${o.note ? `
            <div class="detail-row">
              <span>Catatan</span>
              <b>${esc(o.note)}</b>
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Payment Summary -->
      <div class="card">
        <div class="card-head">
          <h3> Ringkasan Pembayaran</h3>
        </div>
        <div class="summary">
          <div class="summary-line">
            <span>Subtotal Produk</span>
            <b>${money(total - o.fee - o.shippingCost)}</b>
          </div>
          <div class="summary-line">
            <span>Fee Jastip</span>
            <b>${money(o.fee)}</b>
          </div>
          <div class="summary-line">
            <span>Ongkos Kirim</span>
            <b>${money(o.shippingCost)}</b>
          </div>
          <div class="summary-line total">
            <span>Total Tagihan</span>
            <b>${money(total)}</b>
          </div>
          <div class="summary-line">
            <span>Sudah Dibayar</span>
            <b style="color: var(--success);">${money(o.paidAmount)}</b>
          </div>
          <div class="summary-line">
            <span>Sisa Pembayaran</span>
            <b style="color: ${remaining(o) > 0 ? 'var(--danger)' : 'var(--success)'};">${money(remaining(o))}</b>
          </div>
        </div>
        <br>
        ${pay !== "Lunas" ? `
          <button class="btn btn-primary btn-block" onclick="openPaymentModal('${o.id}')">
            💳 Catat Pembayaran
          </button>
        ` : `
          <div style="text-align: center; color: var(--success); padding: 10px;">
            <b>✓ Pembayaran Lunas</b>
          </div>
        `}
      </div>
    </div>
    
    <!-- Product Items -->
    <div class="card" style="margin-top:18px">
      <div class="card-head">
        <h3> Daftar Produk yang Dipesan</h3>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama Produk</th>
              <th>Jumlah</th>
              <th>Harga Satuan</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${o.items.map((i) => `
              <tr>
                <td><b>${esc(i.productName)}</b></td>
                <td>${i.qty} pcs</td>
                <td>${money(i.unitPrice)}</td>
                <td><b>${money(itemSubtotal(i))}</b></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Status Workflow -->
    <div class="card" style="margin-top:18px">
      <div class="card-head">
        <h3> Kelola Status Order</h3>
      </div>
      <div style="padding: 18px;">
        ${!["Selesai", "Dibatalkan"].includes(o.orderStatus) ? `
          <div class="status-label">Status Saat Ini: ${badge(o.orderStatus)}</div>
          <div class="status-action">
            ${canAdvance ? `
              <button class="btn btn-primary" onclick="advanceOrder('${o.id}')">
                ${nextButtonLabel}
              </button>
            ` : ""}
            <button class="btn btn-danger" onclick="cancelOrder('${o.id}')">
              ✕ Batalkan Order
            </button>
          </div>
        ` : `
          <div style="text-align: center; padding: 20px;">
            ${badge(o.orderStatus)}
            <p class="muted" style="margin-top: 10px;">
              ${o.orderStatus === "Selesai" ? "Order ini telah diselesaikan" : "Order ini telah dibatalkan"}
            </p>
          </div>
        `}
      </div>
    </div>
    ${modalHTML()}
  `;
  
  document.getElementById("app").innerHTML = shell("Detail Order", content);
}

function advanceOrder(id) {
  const arr = orderData(),
    o = arr.find((x) => x.id === id),
    steps = [
      "Pesanan Masuk",
      "Barang Dibeli",
      "Dalam Perjalanan",
      "Barang Sampai",
      "Selesai",
    ],
    i = steps.indexOf(o.orderStatus);
  if (i < 0 || i >= steps.length - 1) return;
  
  const nextStatus = steps[i + 1];
  const confirmMessages = {
    "Barang Dibeli": "Apakah barang sudah dibeli?",
    "Dalam Perjalanan": "Apakah barang sudah dalam perjalanan?",
    "Barang Sampai": "Apakah barang sudah sampai?",
    "Selesai": "Tandai order ini sebagai selesai?"
  };
  
  if (confirm(confirmMessages[nextStatus] || `Lanjutkan ke status ${nextStatus}?`)) {
    o.orderStatus = nextStatus;
    Store.set(STORAGE_KEYS.orders, arr);
    toast(`✓ Status order diperbarui menjadi: ${nextStatus}`);
    setTimeout(renderOrderDetail, 300);
  }
}

function cancelOrder(id) {
  if (!confirm("⚠️ Batalkan order ini?\n\nStatus Dibatalkan bersifat permanen dan tidak dapat diubah kembali.")) return;
  const arr = orderData(),
    o = arr.find((x) => x.id === id);
  o.orderStatus = "Dibatalkan";
  Store.set(STORAGE_KEYS.orders, arr);
  toast("Order dibatalkan");
  setTimeout(renderOrderDetail, 300);
}
function openPaymentModal(id) {
  const o = orderData().find((x) => x.id === id);
  const rem = remaining(o);
  openModal(
    `<div class="modal-head">
      <h3>Catat Pembayaran</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: var(--muted);">Total Tagihan:</span>
        <b>${money(orderTotal(o))}</b>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: var(--muted);">Sudah Dibayar:</span>
        <b style="color: var(--success);">${money(o.paidAmount)}</b>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border);">
        <span style="color: var(--muted);"><b>Sisa yang Harus Dibayar:</b></span>
        <b style="color: var(--danger); font-size: 18px;">${money(rem)}</b>
      </div>
    </div>
    <form onsubmit="savePayment(event,'${id}')">
      <label>
        Nominal Pembayaran (Rp)
        <input name="amount" type="number" min="1" max="${rem}" required autofocus placeholder="Masukkan jumlah pembayaran">
        <small class="muted">Maksimal: ${money(rem)}</small>
      </label>
      <br>
      <div class="btn-group">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button class="btn btn-primary" style="flex: 1;">Simpan Pembayaran</button>
      </div>
    </form>`,
  );
}

function savePayment(e, id) {
  e.preventDefault();
  const amount = Number(new FormData(e.target).get("amount")),
    arr = orderData(),
    o = arr.find((x) => x.id === id),
    rem = remaining(o);
  if (amount <= 0 || amount > rem) {
    alert("⚠️ Nominal pembayaran harus lebih dari 0 dan tidak melebihi sisa tagihan.");
    return;
  }
  o.paidAmount += amount;
  Store.set(STORAGE_KEYS.orders, arr);
  closeModal();
  toast(`✓ Pembayaran ${money(amount)} berhasil dicatat`);
  setTimeout(renderOrderDetail, 300);
}
function renderSettings() {
  const content = `<div class="page-head"><div><h1>Pengaturan</h1><p>Pengaturan demo dan data aplikasi.</p></div></div>
 <div class="card settings-list"><div><h3>Reset Demo Data</h3><p class="muted">Menghapus data aplikasi lalu mengembalikan customer, batch, dan order ke kondisi awal demo.</p><div class="danger-box"><b>Perhatian</b><p>Data yang kamu buat sendiri akan hilang dari browser ini.</p><button class="btn btn-danger" onclick="resetDemo()">Reset Demo Data</button></div></div>
 <div><h3>Informasi LocalStorage</h3><p class="muted">Key aplikasi: <code>jastip_customers</code>, <code>jastip_batches</code>, <code>jastip_orders</code>, <code>jastip_settings</code>, dan sesi demo.</p></div>
 <div><h3>Login Demo</h3><p class="muted">Username: <b>admin</b> · Password: <b>admin123</b>. Ini hanya demo login, bukan authentication production.</p></div></div>`;
  document.getElementById("app").innerHTML = shell("Pengaturan", content);
}
function resetDemo() {
  if (!confirm("Reset semua data demo?")) return;
  Store.clearApp();
  seedDemoData(true);
  localStorage.setItem(STORAGE_KEYS.session, "admin");
  toast("Demo data berhasil direset");
  setTimeout(() => (location.href = "dashboard.html"), 500);
}
init();