const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
const qs = (s) => document.querySelector(s);
function uid(prefix) {
  return (
    prefix +
    "-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}
function orderTotal(o) {
  return (
    (o.items || []).reduce(
      (s, i) => s + Number(i.qty) * Number(i.unitPrice),
      0,
    ) +
    Number(o.fee || 0) +
    Number(o.shippingCost || 0)
  );
}
function itemSubtotal(i) {
  return Number(i.qty || 0) * Number(i.unitPrice || 0);
}
function paymentStatus(o) {
  const t = orderTotal(o),
    p = Number(o.paidAmount || 0);
  return p <= 0 ? "Belum Bayar" : p < t ? "DP" : "Lunas";
}
function remaining(o) {
  return Math.max(0, orderTotal(o) - Number(o.paidAmount || 0));
}
function batchOrders(batchId) {
  return Store.get(STORAGE_KEYS.orders, []).filter(
    (o) => o.batchId === batchId && o.orderStatus !== "Dibatalkan",
  );
}
function batchCount(batchId) {
  return batchOrders(batchId).length;
}
function batchRemaining(b) {
  return Math.max(0, Number(b.quota) - batchCount(b.id));
}
function customerName(id) {
  return (
    Store.get(STORAGE_KEYS.customers, []).find((x) => x.id === id)?.name || "—"
  );
}
function batchName(id) {
  return (
    Store.get(STORAGE_KEYS.batches, []).find((x) => x.id === id)?.name || "—"
  );
}
function statusClass(s) {
  if (["Selesai", "Lunas", "Completed"].includes(s)) return "badge-green";
  if (["DP", "Barang Dibeli", "Open", "Shopping"].includes(s))
    return "badge-blue";
  if (["Belum Bayar", "Upcoming", "Dalam Perjalanan", "Shipping"].includes(s))
    return "badge-yellow";
  if (["Dibatalkan"].includes(s)) return "badge-red";
  return "badge-gray";
}
function badge(s) {
  return `<span class="badge ${statusClass(s)}">${esc(s)}</span>`;
}
function toast(msg) {
  let el = qs("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}
function getParam(k) {
  return new URLSearchParams(location.search).get(k);
}
function navTo(url) {
  location.href = url;
}
function saveAndNotify(key, data, msg) {
  Store.set(key, data);
  toast(msg);
  setTimeout(() => location.reload(), 300);
}
function orderNumber() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replaceAll("-", "");
  const count =
    Store.get(STORAGE_KEYS.orders, []).filter((o) =>
      o.id.startsWith("JS-" + date),
    ).length + 1;
  return `JS-${date}-${String(count).padStart(3, "0")}`;
}
function dateId(x) {
  return x ? new Date(x).toLocaleDateString("id-ID") : "—";
}
function requireLogin() {
  if (!isLoggedIn()) {
    location.href = "index.html";
    return false;
  }
  return true;
}

// Pagination utility
function createPagination(data, currentPage = 1, perPage = 10) {
  const total = data.length;
  const totalPages = Math.ceil(total / perPage);
  const page = Math.max(1, Math.min(currentPage, totalPages || 1));
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const items = data.slice(start, end);
  
  return {
    items,
    currentPage: page,
    perPage,
    total,
    totalPages,
    start: total > 0 ? start + 1 : 0,
    end: Math.min(end, total),
  };
}

function renderPagination(paginationData, onPageChange, onPerPageChange) {
  const { currentPage, perPage, total, totalPages, start, end } = paginationData;

  if (total === 0) return '';

  // Build the visible page number list with ellipsis
  function pageRange(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push('…');
    const lo = Math.max(2, current - 1);
    const hi = Math.min(total - 1, current + 1);
    for (let p = lo; p <= hi; p++) pages.push(p);
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  }

  const pages = pageRange(currentPage, totalPages);

  const pageButtons = pages.map(p => {
    if (p === '…') {
      return `<span class="pg-ellipsis">…</span>`;
    }
    const active = p === currentPage ? ' pg-active' : '';
    return `<button class="pg-chip${active}" onclick="${onPageChange}(${p})" aria-label="Halaman ${p}">${p}</button>`;
  }).join('');

  return `
    <div class="pagination">
      <div class="pagination-info">
        Menampilkan ${start}–${end} dari ${total} data
      </div>
      <div class="pagination-controls">
        <div class="pagination-select">
          <span>Tampilkan:</span>
          <select onchange="${onPerPageChange}(this.value)">
            <option value="10" ${perPage === 10 ? 'selected' : ''}>10</option>
            <option value="25" ${perPage === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${perPage === 50 ? 'selected' : ''}>50</option>
          </select>
        </div>
        <div class="pagination-buttons">
          <button class="pg-chip" onclick="${onPageChange}(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''} aria-label="Halaman sebelumnya">&#8592;</button>
          ${pageButtons}
          <button class="pg-chip" onclick="${onPageChange}(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="Halaman berikutnya">&#8594;</button>
        </div>
      </div>
    </div>
  `;
}

// Date filter utilities
function getMonthName(monthNumber) {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return months[monthNumber - 1] || '';
}

function filterByDateRange(data, dateField, startDate, endDate) {
  if (!startDate && !endDate) return data;
  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    if (startDate && itemDate < new Date(startDate)) return false;
    if (endDate && itemDate > new Date(endDate)) return false;
    return true;
  });
}

function filterByMonth(data, dateField, month, year) {
  if (!month) return data;
  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    const itemMonth = itemDate.getMonth() + 1;
    const itemYear = itemDate.getFullYear();
    if (year && itemYear !== parseInt(year)) return false;
    return itemMonth === parseInt(month);
  });
}

function filterByYear(data, dateField, year) {
  if (!year) return data;
  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    return itemDate.getFullYear() === parseInt(year);
  });
}
