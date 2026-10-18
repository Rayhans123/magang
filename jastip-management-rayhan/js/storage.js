const STORAGE_KEYS = {
  customers: "jastip_customers",
  batches: "jastip_batches",
  orders: "jastip_orders",
  settings: "jastip_settings",
  session: "jastip_session",
};
const Store = {
  get(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  clearApp() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
function isLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.session) === "admin";
}
