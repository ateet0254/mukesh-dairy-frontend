import { useEffect, useState } from "react";
import { api } from "../api";
import { motion } from "framer-motion";
import CustomerInfoPopup from "../components/CustomerInfoPopup";

const DEFAULT_COUNTRY_CODE = "91"; // change if needed

function normalizePhoneForWhatsApp(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, ""); // keep only numbers

  // If number already has country code
  if (digits.length >= 11 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return digits;
  }

  // If 10 digits → assume local Indian number
  if (digits.length === 10) {
    return DEFAULT_COUNTRY_CODE + digits;
  }

  return digits;
}

export default function Customers() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ slNo: "", name: "", phone: "", village: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ slNo: "", name: "", phone: "", village: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [popup, setPopup] = useState(null);
  const [search, setSearch] = useState("");
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [infoCustomer, setInfoCustomer] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // animation variants
  const leftIn = {
    hidden: { opacity: 0, x: -40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const rightIn = {
    hidden: { opacity: 0, x: 40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1, // stagger effect like dashboard
        when: "beforeChildren",
      },
    },
  };

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api.listCustomers();
      setList(data);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function onAdd(e) {
    e.preventDefault();
    setAdding(true); 
    try {
      await api.createCustomer({
        slNo: form.slNo,
        name: form.name.trim(),
        phone: form.phone ? form.phone.trim() : null,
        village: form.village ? form.village.trim() : null,
      });
      setForm({ slNo: "", name: "", phone: "", village: "" });
      setPopup({ type: "success", text: "Customer added successfully!" });
      setTimeout(() => setPopup(null), 3000);
      load();
    } catch (e) {
      setPopup({ type: "error", text: e.message || "Failed to add customer" });
      setTimeout(() => setPopup(null), 4000);
    } finally {
    setAdding(false); // Set adding state back to false
  }
  }

  async function onUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCustomer(editingId, {
        slNo: editForm.slNo,
        name: editForm.name.trim(),
        phone: editForm.phone ? editForm.phone.trim() : null,
        village: editForm.village ? editForm.village.trim() : null,
      });
      setEditingId(null);
      setEditForm({ slNo: "", name: "", phone: "", village: "" });
      setPopup({ type: "success", text: "Customer updated successfully!" });
      setTimeout(() => setPopup(null), 3000);
      load();
    } catch (e) {
      setPopup({ type: "error", text: e.message || "Failed to update customer" });
      setTimeout(() => setPopup(null), 4000);
    } finally {
      setSaving(false); // Set saving state back to false
    }
  }

  const filtered = list.filter((c) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;

    const nameMatch = c.name.toLowerCase().includes(term);

    const slNoStr = c.slNo.toString();
    const slNoPadded = slNoStr.padStart(3, "0");

    const slNoMatch = slNoStr.includes(term) || slNoPadded.includes(term);

    return nameMatch || slNoMatch;
  });

  return (
    <div className="space-y-4">
      {popup && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg shadow-md ${
            popup.type === "success"
              ? "bg-green-100 border border-green-300 text-green-800"
              : "bg-red-100 border border-red-300 text-red-800"
          }`}
        >
          {popup.text}
        </div>
      )}

      <form onSubmit={onAdd} className="bg-gradient-to-r from-sky-50 to-sky-200 shadow rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:grid sm:grid-cols-2 gap-3">
          <input
            className="rounded-lg border p-2"
            placeholder="Serial No."
            type="number"
            required
            value={form.slNo}
            onChange={(e) => setForm({ ...form, slNo: e.target.value })}
          />
          <input
            className="rounded-lg border p-2"
            placeholder="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="rounded-lg border p-2"
            placeholder="Phone (10 digits or +91...)"
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="rounded-lg border p-2"
            placeholder="Village (optional)"
            value={form.village}
            onChange={(e) => setForm({ ...form, village: e.target.value })}
          />
        </div>  
        <button
          className="w-full h-11 rounded-xl bg-blue-600 text-white disabled:bg-blue-400 disabled:cursor-not-allowed transition"
          type="submit"
          disabled={adding}
        >
          {adding ? "Adding..." : "Add Customer"}
        </button>
      </form>
      
      {/* 🔹 Loader section below the form */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[50px]">
          <div className="w-8 h-8 border-4 border-t-4 border-gray-200 rounded-full animate-spin border-t-blue-500"></div>
        </div>
      ) : (
        <>
          {err && <div className="bg-red-50 text-red-700 p-3 rounded-lg">{err}</div>}

          {/* Search Bar */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-300 bg- shadow rounded-xl p-3">
            <input
              type="text"
              placeholder="🔍 Search by Serial No. or Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white rounded-lg border p-2"
            />
          </div>

          {/* Customer list with animations */}
          <motion.ul
            variants={container}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {filtered.map((c, i) => {
              const waNumber = normalizePhoneForWhatsApp(c.phone);
              const variant = i % 2 === 0 ? leftIn : rightIn;

              return (
                <motion.li
                  key={c.id.toString()}
                  variants={variant}
                  className="bg-gradient-to-r from-fuchsia-50 to-fuchsia-200 shadow rounded-xl p-4"
                >
                  {editingId === c.id.toString() ? (
                    <form onSubmit={onUpdate} className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          className="rounded-lg border p-2"
                          type="number"
                          value={editForm.slNo}
                          onChange={(e) => setEditForm({ ...editForm, slNo: e.target.value })}
                        />
                        <input
                          className="rounded-lg border p-2"
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                        <input
                          className="rounded-lg border p-2"
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                        <input
                          className="rounded-lg border p-2"
                          type="text"
                          value={editForm.village}
                          onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-blue-400 disabled:cursor-not-allowed transition"
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="bg-gray-200 px-4 py-2 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div>
                        <div className="font-bold text-bg">
                          [{String(c.slNo).padStart(3, "0")}] {c.name}
                        </div>
                        <div className="text-sm text-gray-950">
                          {c.phone ? (
                            <span>📞 {c.phone}</span>
                          ) : (
                            <span className="italic text-gray-400">No phone</span>
                          )}
                          {c.village ? <span className="ml-4 text-sm">📍 {c.village}</span> : null}
                        </div>
                      </div>

                      <div className="flex items-start gap-3 flex-wrap">
                        <a
                          href={waNumber ? `https://wa.me/${waNumber}` : "#"}
                          target="_blank"
                          rel="noreferrer"
                          className={`text-sm bg-white px-3 py-1 rounded-lg border ${
                            waNumber
                              ? "text-green-700 border-green-300 hover:bg-green-50"
                              : "text-gray-400 border-gray-200 pointer-events-none"
                          }`}
                        >
                          Message
                        </a>
                        <button
                          onClick={() => {
                            setEditingId(c.id.toString());
                            setEditForm({
                              slNo: c.slNo.toString(),
                              name: c.name,
                              phone: c.phone?.toString() || "",
                              village: c.village || "",
                            });
                          }}
                          className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg hover:bg-yellow-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setInfoCustomer(c);
                            setShowInfoPopup(true);
                          }}
                          className="bg-teal-100 text-slate-800 px-3 py-1 rounded-lg hover:bg-teal-50 transition"
                        >
                          Info
                        </button>
                      </div>
                    </div>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        </>
      )}
      {showInfoPopup && (
        <CustomerInfoPopup
          customer={infoCustomer}
          onClose={() => {
            setShowInfoPopup(false);
            setInfoCustomer(null);
          }}
        />
      )}
    </div>  
  );
}