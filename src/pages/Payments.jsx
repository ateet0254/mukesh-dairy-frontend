// src/pages/Payments.jsx
import { useEffect, useState } from "react";
import Select from "react-select";
import { api } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoOf(dateLike) {
  if (!dateLike) return "";
  try {
    const d = new Date(dateLike);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return "";
  }
}

const formatSL = (sl) => (sl || sl === 0 ? String(sl).padStart(3, "0") : "");

export default function Payments() {
  const [customers, setCustomers] = useState([]);
  const [list, setList] = useState([]);
  const [allPayments, setAllPayments] = useState([]); // Store all payments for finding previous records
  const [form, setForm] = useState({
    customerId: "",
    date: todayISO(),
    amount: "",
    mode: "Cash",
    note: ""
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const getVariants = (index) =>
    index % 2 === 0
      ? { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0 } }
      : { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } };

  const customerOptions = customers
    .slice()
    .sort((a, b) => {
      const slNoA = parseInt(a.slNo, 10);
      const slNoB = parseInt(b.slNo, 10);
      return slNoA - slNoB;
    })
    .map((c) => ({
      value: c.id.toString(),
      label: `[${formatSL(c.slNo)}] ${c.name}`,
      slNo: String(c.slNo ?? "").padStart(3, "0"),
      name: (c.name || "").toLowerCase(),
    }));

  async function loadAllPaymentsAndFilter() {
    setLoading(true);
    try {
      const payments = await api.listPayments(); // Fetch all payments
      setAllPayments(payments); // Store all for finding previous records
      const filtered = payments.filter(p => isoOf(p.date) === isoOf(selectedDate));
      setList(filtered);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to load payments");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      const allCust = await api.listCustomers();
      setCustomers(allCust || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    loadAllPaymentsAndFilter();
  }, [selectedDate]);

  function goToPreviousRecord() {
    const allPaymentDates = [...new Set(allPayments.map(p => isoOf(p.date)))]
      .sort()
      .reverse();

    // ✅ Fix: Create a new date object for yesterday to start the search
    const yesterday = new Date(selectedDate);
    yesterday.setDate(selectedDate.getDate() - 1);

    // Find the closest previous date in the sorted array
    const previousDate = allPaymentDates.find(date => new Date(date) <= yesterday);

    if (previousDate) {
      setSelectedDate(new Date(previousDate));
    } else {
      alert("No more previous records found.");
    }
  }

  const paymentsFilteredBySearch = list.filter(p => {
    const s = (paymentsSearch || "").toLowerCase().trim();
    if (!s) return true;
    const custName = (p.customer?.name || "").toLowerCase();
    const custSl = formatSL(p.customer?.slNo).toLowerCase();
    return custName.includes(s) || custSl.includes(s);
  });

  const totalAmount = paymentsFilteredBySearch.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalCustomersPaid = new Set(paymentsFilteredBySearch.map(p => p.customerId)).size;

  function clearForm() {
    setForm({
      customerId: "",
      date: todayISO(),
      amount: "",
      mode: "Cash",
      note: ""
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!form.customerId) {
        alert("Select a customer first");
        return;
      }
      await api.createPayment({
        customerId: form.customerId,
        date: form.date,
        amount: form.amount,
        mode: form.mode || undefined,
        note: form.note || undefined
      });
      setSuccessMsg("✅ Payment recorded");
      setTimeout(() => setSuccessMsg(""), 2500);
      setForm({ ...form, amount: "", note: "" });
      loadAllPaymentsAndFilter();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to record payment");
    } finally {
      setIsSaving(false);
    }
  }

  const startEdit = (p) => {
    setEditingId(p.id.toString());
    setEditForm({
      customerId: p.customerId.toString(),
      date: isoOf(p.date),
      amount: p.amount.toString(),
      mode: p.mode || "Cash",
      note: p.note || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  async function saveEdit(id) {
    setIsUpdating(true);
    try {
      await api.updatePayment(id, {
        customerId: editForm.customerId,
        date: editForm.date,
        amount: editForm.amount,
        mode: editForm.mode || undefined,
        note: editForm.note || undefined
      });
      setSuccessMsg("✅ Payment updated");
      setTimeout(() => setSuccessMsg(""), 2500);
      setEditingId(null);
      setEditForm({});
      loadAllPaymentsAndFilter();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Update failed");
    } finally {
      setIsUpdating(false);
    }
  }

  async function deletePayment(id) {
    const ok = window.confirm("Are you sure you want to delete this payment permanently?");
    if (!ok) return;
    try {
      setLoading(true);
      await api.deletePayment(id.toString());
      setSuccessMsg("✅ Payment deleted");
      setTimeout(() => setSuccessMsg(""), 2500);
      loadAllPaymentsAndFilter();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg shadow-lg">
          {successMsg}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-950">Payments Record</h1>

      <form onSubmit={onSubmit} className="bg-gradient-to-r from-pink-50 to-pink-200 p-4 rounded-xl shadow space-y-3">
        <Select
          options={customerOptions}
          value={form.customerId ? customerOptions.find(opt => opt.value === form.customerId) : null}
          onChange={(opt) => setForm({ ...form, customerId: opt ? opt.value : "" })}
          placeholder="🔍 Select or search customer..."
          isSearchable
          filterOption={(opt, input) => {
            const i = (input || "").toLowerCase().trim();
            if (!i) return true;
            return (opt.data.slNo || "").includes(i.padStart(3, "0")) || (opt.data.name || "").includes(i);
          }}
          className="w-full"
        />

        <div className="flex flex-col sm:flex-row sm:grid sm:grid-cols-2 gap-3">
          <input
            type="date"
            className="rounded-lg border px-3 py-2"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount (₹)"
            className="rounded-lg border px-3 py-2"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <select
            className="rounded-lg border px-3 py-2"
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>

          </select>
          <input
            placeholder="Note (optional)"
            className="rounded-lg border px-3 py-2"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-medium"
          >
            {isSaving ? "Recording..." : "Record Payment"}
          </button>
          <button
            type="button"
            onClick={clearForm}
            className="flex-1 h-11 rounded-xl border border-gray-950 bg-white"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="md:col-span-2 bg-white p-4 rounded-xl shadow space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <label className="text-lg font-semibold text-gray-950 mr-3">Pick date</label>
            <input
              type="date"
              className="rounded-lg border px-3 py-2"
              value={isoOf(selectedDate)}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedDate(new Date())} className="text-lg font-semibold text-blue-600 ">Today</button>
            <button onClick={goToPreviousRecord} className="text-lg font-semibold text-blue-600">Previous Record</button>
          </div>

          <div className="flex-1">
            <input
              placeholder="Search payments (name or sl no e.g. 031)"
              className="w-full rounded-lg border px-3 py-2"
              value={paymentsSearch}
              onChange={(e) => setPaymentsSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Payments on {isoOf(selectedDate)}</h3>
          <div className="text-lg font-semibold text-gray-950">Total: ₹ {totalAmount.toFixed(2)} | Customers: {totalCustomersPaid}</div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        ) : paymentsFilteredBySearch.length === 0 ? (
          <div className="text-sm text-gray-950 p-4 bg-red-50 rounded-lg border border-red-100">No payments on this date.</div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {paymentsFilteredBySearch.map((p, idx) => (
                <motion.li
                  key={p.id.toString()}
                  layout
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={getVariants(idx)}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="p-3 bg-gradient-to-r from-emerald-50 to-emerald-300 rounded-lg border shadow-sm flex justify-between items-start"
                >
                  {editingId === p.id.toString() ? (
                    <div className="w-full space-y-2">
                      <div className="text-sm font-medium text-gray-950">
                        [{formatSL(p.customer?.slNo)}] {p.customer?.name || 'Unknown'}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="rounded-lg border px-2 py-1" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                        <input type="number" step="0.01" placeholder="Amount" className="rounded-lg border px-2 py-1" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                        <select className="rounded-lg border px-2 py-1" value={editForm.mode} onChange={e => setEditForm({...editForm, mode: e.target.value})}>
                          <option>Cash</option>
                          <option>UPI</option>
                        
                        </select>
                        <input placeholder="Note" className="rounded-lg border px-2 py-1" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveEdit(p.id.toString())}
                          disabled={isUpdating}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg"
                        >
                          {isUpdating ? "Saving..." : "Save"}
                        </button>
                        <button onClick={cancelEdit} className="bg-red-100 border px-3 py-1 rounded-lg">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="text-sm font-semibold">
                          [{formatSL(p.customer?.slNo)}] {p.customer?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-950 mt-1">
                          {isoOf(p.date)} · {p.mode || "—"}
                        </div>
                        {p.note && <div className="text-sm italic text-gray-950 mt-1">📝 {p.note}</div>}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="font-medium">₹ {Number(p.amount || 0).toFixed(2)}</div>
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(p)} className="text-gray-950 border bg-white px-3 py-1 rounded-lg hover:bg-green-100 transition">Edit</button>
                          <button onClick={() => deletePayment(p.id.toString())} className="text-white bg-red-600 px-3 py-1 rounded-lg hover:bg-red-700 transition">Delete</button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}