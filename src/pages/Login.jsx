import { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // ✅ import context
import logo from "../assets/logo.png"; // <-- import logo

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const { setToken } = useAuth(); // ✅ use context

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await api.login(form.username, form.password);

      setToken(res.token); // ✅ update global context
      setMsg("✅ Login successful");

      navigate("/"); // redirect to dashboard
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-gradient-to-r from-green-300 to-blue-100 shadow-xl rounded-2xl p-8 space-y-6">
        {/* 🔹 Logo block */}
      <div className="flex flex-col items-center justify-center py-6">
        <img
          src={logo}
          alt="Amul Dairy Logo"
          className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-lg ring-4 ring-blue-200"
        />
        <h1 className="mt-4 text-2xl font-extrabold text-gray-800">
          Amul Dairy
        </h1>
        <p className="text-lg text-gray-600">
          मड़ावदा दुग्ध संकलन केंद्र
        </p>
      </div>
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Admin Login
        </h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Username
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {msg && (
          <div
            className={`text-sm text-center ${
              msg.startsWith("✅")
                ? "text-green-600"
                : msg.startsWith("❌")
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
