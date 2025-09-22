// src/pages/PreviousEntries.jsx
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { api } from "../api";
import { motion } from "framer-motion";

function formatDateISO(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return "";
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

// Small rotating loader using simple tailwind borders
function Loader() {
  return (
    <div className="flex justify-center items-center py-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"
      />
    </div>
  );
}

export default function PreviousEntries() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [autoRate, setAutoRate] = useState(null);
  const [userOverride, setUserOverride] = useState(false);
  const [showMorningList, setShowMorningList] = useState(false);
  const [showEveningList, setShowEveningList] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Framer motion animation presets (optional)
  const leftIn = { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6 } } };
  const rightIn = { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6 } } };
  const listContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.05, when: "beforeChildren" } } };

  // Load entries + summary for a date
  async function loadEntries(date = selectedDate) {
    setLoading(true);
    try {
      const iso = formatDateISO(date);
      const list = await api.listEntries({ from: iso, to: iso});
      const sum = await api.summaryDaily(iso);
      setEntries(Array.isArray(list) ? list : []);
      setSummary(sum || null);
    } catch (err) {
      console.error("Load entries failed:", err);
      setEntries([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  // Load customers once, then fetch entries when selectedDate changes
  useEffect(() => {
    let mounted = true;
    api
      .listCustomers()
      .then((res) => {
        if (mounted) setCustomers(res || []);
      })
      .catch((e) => {
        console.error("Failed to load customers:", e);
        alert("Failed to load customers: " + (e.message || e));
      });
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    loadEntries(selectedDate);
  }, [selectedDate]);

  // Auto fetch rate when editing rate inputs change
  useEffect(() => {
    async function fetchRate() {
      if (!editingId) return;
      const fatVal = Number(editForm?.fat);
      const snfVal = Number(editForm?.snf);
      if (!Number.isFinite(fatVal) || !Number.isFinite(snfVal)) {
        setAutoRate(null);
        if (!userOverride) setEditForm((p) => ({ ...p, rate: "" }));
        return;
      }

      try {
        const res = await api.getRate(editForm.milkType, fatVal, snfVal);
        setAutoRate(res?.rate ?? null);
        if (!userOverride) setEditForm((p) => ({ ...p, rate: res?.rate ?? "" }));
      } catch (err) {
        console.error("Rate fetch failed:", err);
        setAutoRate(null);
        if (!userOverride) setEditForm((p) => ({ ...p, rate: "" }));
      }
    }

    fetchRate();
  }, [editForm?.milkType, editForm?.fat, editForm?.snf, editingId, userOverride]);

  // apply search filter

  const sortedEntries = entries.sort((a, b) => {
    if (a.shift === 'MORNING' && b.shift === 'EVENING') return -1;
    if (a.shift === 'EVENING' && b.shift === 'MORNING') return 1;

    if (a.customer?.slNo && b.customer?.slNo) {
      return Number(a.customer.slNo) - Number(b.customer.slNo);
    }
    return 0;
  });


  const filteredEntries = sortedEntries.filter((e) => {
    const s = globalSearch.trim().toLowerCase();
    if (!s) return true;
    const custName = (e.customer?.name || "").toLowerCase();
    const sl = String(e.customer?.slNo ?? "").padStart(3, "0");
    const note = (e.note || "").toLowerCase();
    const fat = String(e.fat?.toString() ?? "");
    const snf = String(e.snf?.toString() ?? "");
    return custName.includes(s) || sl.includes(s) || note.includes(s) || fat.includes(s) || snf.includes(s);
  });

  function getShiftCustomers(shift) {
    const doneIds = new Set(entries.filter((en) => en.shift === shift).map((en) => String(en.customerId)));
    return [
      ...customers.filter((c) => !doneIds.has(String(c.id))).map((c) => ({ ...c, done: false })),
      ...customers.filter((c) => doneIds.has(String(c.id))).map((c) => ({ ...c, done: true })),
    ];
  }

  // Edit handlers
  const handleEdit = (entry) => {
    setEditingId(entry.id.toString());
    setEditForm({
      customerId: entry.customerId.toString(),
      date: formatDateISO(entry.date),
      shift: entry.shift || "MORNING",
      milkType: entry.milkType || "COW",
      quantityL: entry.quantityL?.toString() ?? "",
      fat: entry.fat?.toString() ?? "",
      snf: entry.snf?.toString() ?? "",
      rate: entry.rate?.toString() ?? "",
      note: entry.note || "",
    });
    setAutoRate(null);
    setUserOverride(false);
  };

  const handleUpdate = async (id) => {
    setIsUpdating(true);
    try {
      const q = Number(editForm.quantityL) || 0;
      const r = Number(editForm.rate) || 0;
      const amount = Number((q * r).toFixed(2));

      const payload = {
        customerId: editForm.customerId,
        date: editForm.date,
        shift: editForm.shift,
        milkType: editForm.milkType,
        quantityL: editForm.quantityL,
        fat: editForm.fat !== "" ? editForm.fat : undefined,
        snf: editForm.snf !== "" ? editForm.snf : undefined,
        rate: editForm.rate !== "" ? editForm.rate : undefined,
        amount,
        note: editForm.note || undefined,
      };

      const updated = await api.updateEntry(id.toString(), payload);
      setEntries((prev) => prev.map((e) => (e.id.toString() === id ? { ...e, ...updated } : e)));
      setEditingId(null);
      await loadEntries(selectedDate);
      setSuccessMsg("✅ Entry updated successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Update failed: " + (err.message || err));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure? This will be deleted permanently.");
    if (!ok) return;
    try {
      setLoading(true);
      await api.deleteEntry(id.toString());
      setEntries((p) => p.filter((e) => e.id.toString() !== id.toString()));
      await loadEntries(selectedDate);
      setSuccessMsg("✅ Entry deleted");
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const totalL = (summary?.MORNING?.totalLiters || 0) + (summary?.EVENING?.totalLiters || 0);
  const totalAmt = (summary?.MORNING?.totalAmount || 0) + (summary?.EVENING?.totalAmount || 0);

  const showNum = (v, decimals = 2) => {
    if (v === null || v === undefined) return "-";
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(decimals) : "-";
  };

  const editAmount = editForm.quantityL && editForm.rate
    ? (Number(editForm.quantityL) * Number(editForm.rate)).toFixed(2)
    : "";

  return (
    <div className="space-y-6 px-4 md:px-8">
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 bg-green-100 border border-green-300 text-green-700 font-medium px-4 py-2 rounded-lg shadow-lg">
          {successMsg}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">📅 Previous Entries</h1>

      {/* Calendar */}
      <div className="bg-gradient-to-r from-pink-50 to-pink-200 p-4 rounded-xl shadow">
        <Calendar value={selectedDate} onChange={setSelectedDate} className="mx-auto border-none" />
      </div>

      {/* 🔹 The Loader goes here */}
      {loading ? (
        <Loader />
      ) : (
        <>
          {/* Summary cards */}
          {summary ? (
            <motion.div variants={listContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div variants={leftIn} className="bg-gradient-to-r from-cyan-50 to-cyan-200 shadow rounded-xl p-4">
                <h2 className="text-md font-bold text-gray-900 mb-2">🌅 Morning</h2>
                {["COW", "BUFFALO", "MIX"].map((t) => (
                  <div key={t} className="flex justify-between font-semibold py-1 text-sm text-gray-900">
                    <span>{t}</span>
                    <span>
                      {(summary?.MORNING?.[t]?.liters || 0).toFixed(2)} L — ₹{(summary?.MORNING?.[t]?.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2 font-medium text-gray-900">
                  Total: {(summary?.MORNING?.totalLiters || 0).toFixed(2)} L — ₹{(summary?.MORNING?.totalAmount || 0).toFixed(2)}
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1">🧑‍🌾 Entries: {summary?.MORNING?.count || 0}</p>
              </motion.div>

              <motion.div variants={leftIn} className="bg-gradient-to-r from-cyan-50 to-cyan-200 shadow rounded-xl p-4">
                <h2 className="text-md font-bold text-gray-900 mb-2">🌙 Evening</h2>
                {["COW", "BUFFALO", "MIX"].map((t) => (
                  <div key={t} className="flex justify-between font-semibold py-1 text-sm text-gray-900">
                    <span>{t}</span>
                    <span>
                      {(summary?.EVENING?.[t]?.liters || 0).toFixed(2)} L — ₹{(summary?.EVENING?.[t]?.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2 font-medium text-gray-900">
                  Total: {(summary?.EVENING?.totalLiters || 0).toFixed(2)} L — ₹{(summary?.EVENING?.totalAmount || 0).toFixed(2)}
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1">🧑‍🌾 Entries: {summary?.EVENING?.count || 0}</p>
              </motion.div>

              <motion.div variants={rightIn} className="bg-gradient-to-r from-blue-50 to-blue-300 rounded-xl border border-blue-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold">Day Total</h2>
                <p className="text-xl font-bold">{totalL.toFixed(2)} L</p>
                <p className="text-lg">₹ {totalAmt.toFixed(2)}</p>
                <p className="text-sm text-gray-900 font-bold mt-1">🧑‍🌾 Total Entries: {summary?.totalCount || 0}</p>
              </motion.div>
            </motion.div>
          ) : null}

          {/* Global search */}
          <div className="bg-white p-4 rounded-xl shadow">
            <input
              type="text"
              placeholder="🔍 Search all entries..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="rounded-lg w-full border p-2"
            />
          </div>

          {filteredEntries.length === 0 ? (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">❌ No data for {formatDateISO(selectedDate)}</div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((e, i) => {
                const isFirstOfShift = i > 0 && filteredEntries[i].shift !== filteredEntries[i - 1].shift;
                return (
                <div key={e.id.toString()}> 
                  {isFirstOfShift && <hr className="my-6 border-gray-400" />}
                    <div className={`p-3 border rounded-lg shadow-sm hover:shadow-md transition ${e.shift === "MORNING" ? 'bg-gradient-to-r from-indigo-50 to-indigo-300' : 'bg-gradient-to-r from-amber-50 to-amber-300'}`}>
                      {editingId === e.id.toString() ? (
                        <div className="space-y-2">
                          <div className="p-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                            [{String(e.customer?.slNo).padStart(3, "0")}] {e.customer?.name}
                          </div>

                          <input type="date" value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} className="rounded-lg w-full border p-2" />
                          <select value={editForm.shift} onChange={(ev) => setEditForm({ ...editForm, shift: ev.target.value })} className="rounded-lg w-full border p-2">
                            <option value="MORNING">Morning</option>
                            <option value="EVENING">Evening</option>
                          </select>
                          <select value={editForm.milkType} onChange={(ev) => setEditForm({ ...editForm, milkType: ev.target.value })} className="rounded-lg w-full border p-2">
                            <option value="COW">Cow</option>
                            <option value="BUFFALO">Buffalo</option>
                            <option value="MIX">Mix</option>
                          </select>
                          <input type="number" step="0.01" placeholder="Quantity (L)" value={editForm.quantityL} onChange={(ev) => setEditForm({ ...editForm, quantityL: ev.target.value })} className="rounded-lg w-full border p-2" />
                          <input type="number" step="0.1" placeholder="FAT" value={editForm.fat} onChange={(ev) => { setEditForm({ ...editForm, fat: ev.target.value }); setUserOverride(false); }} className="rounded-lg w-full border p-2" />
                          <input type="number" step="0.1" placeholder="SNF" value={editForm.snf} onChange={(ev) => { setEditForm({ ...editForm, snf: ev.target.value }); setUserOverride(false); }} className="rounded-lg w-full border p-2" />
                          <input type="number" step="0.01" placeholder="Rate" value={editForm.rate} onChange={(ev) => { setEditForm({ ...editForm, rate: ev.target.value }); setUserOverride(true); }} className="rounded-lg w-full border p-2" />
                          {autoRate && !userOverride && <p className="text-sm text-gray-600">Auto Rate: <strong>₹{Number(autoRate).toFixed(2)}/L</strong></p>}
                          {editAmount && <p className="text-sm text-gray-600">Total Amount: <strong>₹{editAmount}</strong></p>}
                          <input placeholder="Note" value={editForm.note} onChange={(ev) => setEditForm({ ...editForm, note: ev.target.value })} className="rounded-lg w-full border p-2" />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdate(e.id.toString())} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Save</button>
                            <button onClick={() => setEditingId(null)} className="bg-red-100 border px-4 py-2 rounded-lg ml-2">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold">[{String(e.customer?.slNo).padStart(3, "0")}] {e.customer?.name} <span className="text-xs text-gray-500">{e.shift === "MORNING" ? "🌅M" : "🌙E"}</span></p>
                            <p className="text-sm font-semibold text-gray-950">
                              {showNum(e.quantityL)} L @ ₹{showNum(e.rate)} /L → <span className="font-semibold">₹{showNum(e.amount)}</span>
                            </p>
                            <p className="text-xs font-semibold text-gray-950">
                              {e.milkType} | FAT: {showNum(e.fat, 1) ?? "-"} | SNF: {showNum(e.snf, 1) ?? "-"}
                            </p>
                            {e.note && <p className="text-sm font-semibold italic text-gray-900 mt-1">📝 {e.note}</p>}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button onClick={() => handleEdit(e)} className="text-gray-950 border bg-white border-blue-600 px-3 py-1 rounded-lg hover:bg-green-300 transition">Edit</button>
                            <button onClick={() => handleDelete(e.id.toString())} className="text-white bg-red-600 px-3 py-1 rounded-lg hover:bg-red-700 transition">Delete</button>
                          </div>
                        </div>
                      )}
                   </div>
                 </div>
                );
              })}
            </div>
          )}

          {/* Shift lists (collapsed by default) */}
          <div className="space-y-4">
            <div className="bg-white shadow rounded-xl">
              <button onClick={() => setShowMorningList((p) => !p)} className="bg-blue-100 text-gray-950 font-bold px-4 py-2 w-full rounded-lg shadow">
                🌅 Morning Customers {showMorningList ? "▲" : "▼"}
              </button>
              {showMorningList && (
                <div className="p-4 space-y-2">
                  {getShiftCustomers("MORNING").map((c) => (
                    <div key={c.id.toString()} className={`flex justify-between items-center p-2 rounded-lg ${c.done ? "bg-green-100" : "bg-red-50"}`}>
                      <div>
                        <p className="font-medium">
                          [{String(c.slNo).padStart(3, "0")}] {c.name}
                        </p>
                        <p className="text-xs text-gray-900">📞 {c.phone || "N/A"}</p>
                      </div>
                      {c.done ? <span className="text-green-600">✅</span> : <span className="text-red-600">❌</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white shadow rounded-xl">
              <button onClick={() => setShowEveningList((p) => !p)} className="w-full bg-yellow-100 text-gray-950 font-bold px-4 py-2 rounded-lg shadow">
                🌙 Evening Customers {showEveningList ? "▲" : "▼"}
              </button>
              {showEveningList && (
                <div className="p-4 space-y-2">
                  {getShiftCustomers("EVENING").map((c) => (
                    <div key={c.id.toString()} className={`flex justify-between items-center p-2 rounded-lg ${c.done ? "bg-green-100" : "bg-red-100"}`}>
                      <div>
                        <p className="font-medium">
                          [{String(c.slNo).padStart(3, "0")}] {c.name}
                        </p>
                        <p className="text-xs text-gray-900">📞 {c.phone || "N/A"}</p>
                      </div>
                      {c.done ? <span className="text-green-600">✅</span> : <span className="text-red-600">❌</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}