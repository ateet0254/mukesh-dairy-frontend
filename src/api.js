const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// 🔹 Always include token in headers if available
function getHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, { method = "GET", data } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(),
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username, password) =>
    request("/auth/login", { method: "POST", data: { username, password } }),

  // Health check
  health: () => request("/health"),

  // Customers
  listCustomers: () => request("/customers"),
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (payload) =>
    request("/customers", { method: "POST", data: payload }),
  updateCustomer: (id, payload) =>
    request(`/customers/${id}`, { method: "PUT", data: payload }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: "DELETE" }),

  // Entries
  listEntries: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/entries${q ? `?${q}` : ""}`);
  },
  createEntry: (payload) =>
    request("/entries", { method: "POST", data: payload }),
  updateEntry: (id, payload) =>
    request(`/entries/${id}`, { method: "PUT", data: payload }), // 🔹 new
  deleteEntry: (id) =>
    request(`/entries/${id}`, { method: "DELETE" }), // <- ADD THIS LINE
  summaryDaily: (date) => request(`/entries/summary/daily?date=${date}`),

  // Payments
  listPayments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/payments${q ? `?${q}` : ""}`);
  },
  updatePayment: (id, payload) =>
    request(`/payments/${id}`, { method: "PUT", data: payload }),   // ✅ add this
  deletePayment: (id) =>
    request(`/payments/${id}`, { method: "DELETE" }),  

  createPayment: (payload) =>
    request("/payments", { method: "POST", data: payload }),

  // Rate lookup
  getRate: (milkType, fat, snf) =>
    request(`/entries/rate?milkType=${milkType}&fat=${fat}&snf=${snf}`),

  // ✅ New: Function to get a customer's monthly data
getCustomerMonthlyData: (customerId, from, to) =>
  request(`/entries/customer-summary?customerId=${customerId}&from=${from}&to=${to}`),
};
