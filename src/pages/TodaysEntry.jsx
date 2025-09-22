import { useEffect, useState } from "react";
import { api } from "../api";
import { motion } from "framer-motion";

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ✅ New: Helper function to format any date string to YYYY-MM-DD
function formatDateForInput(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return '';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Failed to format date for input:", e);
    return '';
  }
}

export default function TodaysEntry() {
  const [customers, setCustomers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [entrySearch, setEntrySearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editAutoRate, setEditAutoRate] = useState(null);
  const [editUserOverride, setEditUserOverride] = useState(false);
  const [showMorningList, setShowMorningList] = useState(false);
  const [showEveningList, setShowEveningList] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const leftIn = {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0, transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] } }
  };
  const rightIn = {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] } }
  };
  const listContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, when: "beforeChildren" } }
  };

  const sortedEntries = entries.sort((a, b) => {
    if (a.shift === 'MORNING' && b.shift === 'EVENING') return -1;
    if (a.shift === 'EVENING' && b.shift === 'MORNING') return 1;

    if (a.customer?.slNo && b.customer?.slNo) {
      return Number(a.customer.slNo) - Number(b.customer.slNo);
    }
    return 0;
  });

  async function loadEntriesAndCustomers() {
    setIsLoading(true);
    try {
        const customersList = await api.listCustomers();
        setCustomers(customersList);

        const currentDate = todayISO();
        const entriesList = await api.listEntries({ from: currentDate, to: currentDate});
        const summaryData = await api.summaryDaily(currentDate);

        setEntries(entriesList);
        setSummary(summaryData);
    } catch (e) {
        console.error("Failed to load initial data:", e);
    } finally {
        setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEntriesAndCustomers();

    const timeUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(now.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    };

    const timeoutId = setTimeout(() => {
      const newDate = todayISO();
      loadEntriesAndCustomers();

      setInterval(() => {
        const newDate = todayISO();
        loadEntriesAndCustomers();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight());

    return () => clearTimeout(timeoutId);
  }, []);

  // Auto fetch rate for EDIT form
  useEffect(() => {
    async function fetchRate() {
      if (!editForm?.fat || !editForm?.snf) {
        setEditAutoRate(null);
        if (!editUserOverride) setEditForm((p) => ({ ...p, rate: "" }));
        return;
      }
      try {
        const res = await api.getRate(editForm.milkType, editForm.fat, editForm.snf);
        setEditAutoRate(res.rate);
        if (!editUserOverride) {
          setEditForm((p) => ({ ...p, rate: res.rate }));
        }
      } catch (err) {
        console.error("Rate fetch failed:", err.message);
        setEditAutoRate(null);
        if (!editUserOverride) setEditForm((p) => ({ ...p, rate: "" }));
      }
    }
    if (editingId) fetchRate();
  }, [editForm.milkType, editForm.fat, editForm.snf, editUserOverride, editingId]);

  // --- Editing Logic ---
  const handleEdit = (entry) => {
    setEditingId(entry.id.toString());
    setEditForm({
      customerId: entry.customerId?.toString() || '',
      date: formatDateForInput(entry.date),
      shift: entry.shift || '',
      milkType: entry.milkType || '',
      quantityL: entry.quantityL?.toString() || '',
      fat: entry.fat ? Number(entry.fat).toFixed(1) : '',
      snf: entry.snf ? Number(entry.snf).toFixed(1) : '',
      rate: entry.rate ? Number(entry.rate).toFixed(2) : '',
      note: entry.note || '',
    });
    setEditAutoRate(null);
    setEditUserOverride(false);
  };

  const handleUpdate = async (id) => {
    setIsUpdating(true);
    try {
      const updated = await api.updateEntry(id, {
        customerId: editForm.customerId,
        date: editForm.date,
        shift: editForm.shift,
        milkType: editForm.milkType,
        quantityL: editForm.quantityL,
        fat: editForm.fat ? editForm.fat : undefined,
        snf: editForm.snf ? editForm.snf : undefined,
        rate: editForm.rate ? editForm.rate : undefined,
        note: editForm.note || undefined,
      });
      setEntries((prev) => prev.map((e) => (e.id.toString() === id ? { ...e, ...updated } : e)));
      setEditingId(null);
      loadEntriesAndCustomers();
      setSuccessMsg("✅ Entry updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditAutoRate(null);
    setEditUserOverride(false);
  };

  // --- Customer Lists ---
  function getCustomerStatus(shift) {
    const doneIds = new Set(
      entries.filter((e) => e.shift === shift).map((e) => e.customerId.toString())
    );
    const notDone = customers
      .filter((c) => !doneIds.has(c.id.toString()))
      .sort((a, b) => (a.slNo ?? 0) - (b.slNo ?? 0));
    const done = customers
      .filter((c) => doneIds.has(c.id.toString()))
      .sort((a, b) => (a.slNo ?? 0) - (b.slNo ?? 0));
    return [...notDone, ...done];
  }

  // --- Search Filter ---
  const filteredEntries = sortedEntries.filter((e) => {
    const search = entrySearch.toLowerCase();
    return (
      e.customer?.name.toLowerCase().includes(search) ||
      String(e.customer?.slNo ?? "").padStart(3, "0").includes(search)
    );
  });

  // --- Totals ---
  const totalL =
    (summary?.MORNING?.totalLiters || 0) +
    (summary?.EVENING?.totalLiters || 0);
  const totalAmt =
    (summary?.MORNING?.totalAmount || 0) +
    (summary?.EVENING?.totalAmount || 0);
  const editAmount =
    editForm.quantityL && editForm.rate
      ? (Number(editForm.quantityL) * Number(editForm.rate)).toFixed(2)
      : "";

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2 rounded-lg shadow-lg font-medium animate-fade-in-out bg-green-100 border border-green-300 text-green-700">
          {successMsg}
        </div>
      )}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">📅 Today's Entries</h1>
        <div className="text-right">
          <div className="inline-block bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-semibold px-4 py-2 rounded-xl shadow-sm border border-blue-200">
            {(() => {
              const d = new Date();
              const weekday = d.toLocaleDateString("en-IN", { weekday: "long" });
              const datePart = d.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
              return `${weekday}, ${datePart}`;
            })()}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="w-16 h-16 border-4 border-t-4 border-gray-200 rounded-full animate-spin border-t-blue-500"></div>
        </div>
      ) : (
        <>
          {entries.length > 0 && (
            <motion.ul
              variants={listContainer}
              initial="hidden"
              animate="visible"
              className="bg-white p-4 rounded-xl shadow space-y-3"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-gray-900">Entries</h2>
                <button
                  type="button"
                  onClick={() => loadEntriesAndCustomers()}
                  className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
                >
                  🔄 Refresh
                </button>
              </div>
              <input
                type="text"
                placeholder="🔍 Search entries"
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
                className="rounded-lg w-full border p-2 mb-2"
              />
              {filteredEntries.map((entry, i) => {
                const isFirstOfShift = i > 0 && filteredEntries[i].shift !== filteredEntries[i - 1].shift;
                return (
                  <div key={entry.id.toString()}>
                    {isFirstOfShift && <hr className="my-6 border-gray-400" />}
                    <motion.li
                      variants={i % 2 === 0 ? leftIn : rightIn}
                      className={`p-3 border rounded-lg shadow-sm hover:shadow-md transition ${entry.shift === "MORNING" ? "bg-gradient-to-r from-indigo-50 to-indigo-300" : "bg-gradient-to-r from-amber-50 to-amber-300"}`}
                    >
                      {editingId === entry.id.toString() ? (
                        <div className="space-y-2">
                          <div className="p-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-950">
                            [{String(entry.customer?.slNo).padStart(3, "0")}] {entry.customer?.name}
                          </div>

                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="rounded-lg w-full border p-2"
                          />

                          <select
                            value={editForm.shift}
                            onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })}
                            className="rounded-lg w-full border p-2"
                          >
                            <option value="MORNING">Morning</option>
                            <option value="EVENING">Evening</option>
                          </select>

                          <select
                            value={editForm.milkType}
                            onChange={(e) => setEditForm({ ...editForm, milkType: e.target.value })}
                            className="rounded-lg w-full border p-2"
                          >
                            <option value="COW">Cow</option>
                            <option value="BUFFALO">Buffalo</option>
                            <option value="MIX">Mix</option>
                          </select>

                          <input
                            type="number"
                            step="0.01"
                            placeholder="Quantity (L)"
                            value={editForm.quantityL}
                            onChange={(e) => setEditForm({ ...editForm, quantityL: e.target.value })}
                            className="rounded-lg w-full border p-2"
                          />

                          <input
                            type="number"
                            step="0.1"
                            placeholder="FAT"
                            value={editForm.fat}
                            onChange={(e) => {
                              setEditForm({ ...editForm, fat: e.target.value });
                              setEditUserOverride(false);
                            }}
                            className="rounded-lg w-full border p-2"
                          />

                          <input
                            type="number"
                            step="0.1"
                            placeholder="SNF"
                            value={editForm.snf}
                            onChange={(e) => {
                              setEditForm({ ...editForm, snf: e.target.value });
                              setEditUserOverride(false);
                            }}
                            className="rounded-lg w-full border p-2"
                          />

                          <input
                            type="number"
                            step="0.01"
                            placeholder="Rate"
                            value={editForm.rate}
                            onChange={(e) => {
                              setEditForm({ ...editForm, rate: e.target.value });
                              setEditUserOverride(true);
                            }}
                            className="rounded-lg w-full border p-2"
                          />

                          {editAutoRate && (
                            <p className="text-sm text-gray-600">
                              Auto Rate: <strong>₹{Number(editAutoRate).toFixed(2)}/L</strong>
                            </p>
                          )}
                          {editAmount && (
                            <p className="text-sm text-gray-600">
                              Total Amount: <strong>₹{editAmount}</strong>
                            </p>
                          )}

                          <input
                            placeholder="Note"
                            value={editForm.note}
                            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                            className="rounded-lg w-full border p-2"
                          />

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(entry.id.toString())}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                              disabled={isUpdating}
                            >
                              {isUpdating ? "Updating..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="bg-red-100 border px-4 py-2 rounded-lg ml-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold">
                              [{String(entry.customer?.slNo).padStart(3, "0")}] {entry.customer?.name}{" "}
                              <span className="text-xs text-gray-500">({entry.shift === "MORNING" ? "🌅M" : "🌙E"})</span>
                            </p>
                            <p className="text-sm font-semibold text-gray-950">
                              {Number(entry.quantityL).toFixed(2)} L @ ₹{Number(entry.rate).toFixed(2)}/L → <span className="font-semibold">₹{Number(entry.amount).toFixed(2)}</span>
                            </p>
                            {entry.fat && entry.snf && <p className="text-xs font-semibold text-gray-950">{entry.milkType} | FAT: {Number(entry.fat).toFixed(1)} | SNF: {Number(entry.snf).toFixed(1)}</p>}
                            {entry.note && <p className="text-sm font-semibold italic text-gray-900">📝{entry.note}</p>}
                          </div>
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-gray-950 border bg-white border-blue-600 px-3 py-1 rounded-lg hover:bg-green-300 transition"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </motion.li>
                  </div>
                );
              })}
            </motion.ul>
          )}

          {summary && (
            <motion.div
              variants={listContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <motion.div variants={leftIn} initial="hidden" animate="visible" className="bg-gradient-to-r from-cyan-50 to-cyan-200 shadow rounded-xl p-4">
                <h2 className="text-md font-bold text-gray-900 mb-2">🌅 Morning</h2>
                {["COW", "BUFFALO", "MIX"].map((t) => (
                  <div key={t} className="flex justify-between font-semibold py-1 text-sm text-gray-900">
                    <span>{t}</span>
                    <span>
                      {(summary?.MORNING?.[t]?.liters || 0).toFixed(2)} L — ₹
                      {(summary?.MORNING?.[t]?.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2 font-medium text-gray-900">
                  Total: {(summary?.MORNING?.totalLiters || 0).toFixed(2)} L — ₹
                  {(summary?.MORNING?.totalAmount || 0).toFixed(2)}
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  🧑‍🌾 Entries: {summary?.MORNING?.count || 0}
                </p>
              </motion.div>

              <motion.div variants={leftIn} initial="hidden" animate="visible" className="bg-gradient-to-r from-cyan-50 to-cyan-200 shadow rounded-xl p-4">
                <h2 className="text-md font-bold text-gray-900 mb-2">🌙 Evening</h2>
                {["COW", "BUFFALO", "MIX"].map((t) => (
                  <div key={t} className="flex justify-between font-semibold py-1 text-sm text-gray-900">
                    <span>{t}</span>
                    <span>
                      {(summary?.EVENING?.[t]?.liters || 0).toFixed(2)} L — ₹
                      {(summary?.EVENING?.[t]?.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2 font-medium text-gray-900">
                  Total: {(summary?.EVENING?.totalLiters || 0).toFixed(2)} L — ₹
                  {(summary?.EVENING?.totalAmount || 0).toFixed(2)}
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  🧑‍🌾 Entries: {summary?.EVENING?.count || 0}
                </p>
              </motion.div>

              <motion.div variants={rightIn} initial="hidden" animate="visible" className="bg-gradient-to-r from-blue-50 to-blue-300 rounded-xl border border-blue-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold">Day Total</h2>
                <p className="text-xl font-bold">{(summary?.totalLiters || 0).toFixed(2)} L</p>
                <p className="text-lg">₹ {(summary?.totalAmount || 0).toFixed(2)}</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  🧑‍🌾 Total Entries: {summary?.totalCount || 0}
                </p>
              </motion.div>
            </motion.div>
          )}

          <div className="bg-white p-4 rounded-xl shadow space-y-4">
            <h2 className="font-semibold text-lg text-gray-900">Customer Lists</h2>

            <div>
              <button
                onClick={() => setShowMorningList((prev) => !prev)}
                className="bg-yellow-100 text-gray-950 font-bold px-4 py-2 rounded-lg shadow hover:scale-105 transition"
              >
                🌅 Morning Customers
              </button>
              {showMorningList && (
                <div className="space-y-2 mt-2">
                  {getCustomerStatus("MORNING").map((c) => {
                    const hasEntry = entries.some(
                      (e) => e.customerId.toString() === c.id.toString() && e.shift === "MORNING"
                    );
                    return (
                      <div
                        key={c.id.toString()}
                        className={`flex justify-between items-center p-2 border rounded-lg ${
                          hasEntry ? "bg-green-200" : "bg-red-50"
                        }`}
                      >
                        <div>
                          <p className="font-medium">
                            [{String(c.slNo).padStart(3, "0")}] {c.name}
                          </p>
                          <p className="text-xs text-gray-900">📞 {c.phone || "N/A"}</p>
                        </div>
                        {hasEntry && <span className="text-green-600 font-bold">✅</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => setShowEveningList((prev) => !prev)}
                className="bg-blue-100 text-gray-950 font-bold px-4 py-2 rounded-lg shadow hover:scale-105 transition"
              >
                🌙 Evening Customers
              </button>
              {showEveningList && (
                <div className="space-y-2 mt-2">
                  {getCustomerStatus("EVENING").map((c) => {
                    const hasEntry = entries.some(
                      (e) => e.customerId.toString() === c.id.toString() && e.shift === "EVENING"
                    );
                    return (
                      <div
                        key={c.id.toString()}
                        className={`flex justify-between items-center p-2 border rounded-lg ${
                          hasEntry ? "bg-green-200" : "bg-red-50"
                        }`}
                      >
                        <div>
                          <p className="font-medium">
                            [{String(c.slNo).padStart(3, "0")}] {c.name}
                          </p>
                          <p className="text-xs text-gray-900">📞 {c.phone || "N/A"}</p>
                        </div>
                        {hasEntry && <span className="text-green-600 font-bold">✅</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}