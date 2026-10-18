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
