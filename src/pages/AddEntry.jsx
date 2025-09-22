import { useEffect, useState } from "react";
import Select from "react-select";
import { api } from "../api";

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // "YYYY-MM-DD"
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

export default function AddEntry() {
  const [customers, setCustomers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    customerId: "",
    date: todayISO(),
    shift: "MORNING",
    milkType: "COW",
    quantityL: "",
    fat: "",
    snf: "",
    rate: "",
    note: "",
  });
  const [autoRate, setAutoRate] = useState(null);
  const [userOverride, setUserOverride] = useState(false);
  const [entrySearch, setEntrySearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editAutoRate, setEditAutoRate] = useState(null);
  const [editUserOverride, setEditUserOverride] = useState(false);
  const [summary, setSummary] = useState(null);
  const [showMorningList, setShowMorningList] = useState(false);
  const [showEveningList, setShowEveningList] = useState(false);
  const [popupMsg, setPopupMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ New: Combined useEffect for initial data loading and midnight updates
  useEffect(() => {
    async function loadInitialData() {
      try {
        const customersList = await api.listCustomers();
        setCustomers(customersList);

        const currentDate = todayISO();
        setForm((prev) => ({ ...prev, date: currentDate }));
        await loadEntries(currentDate);
      } catch (e) {
        console.error("Failed to load initial data:", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();

    // Calculate time until next midnight.
    const timeUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(now.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    };

    const timeoutId = setTimeout(() => {
      const newDate = todayISO();
      setForm((prev) => ({ ...prev, date: newDate }));
      loadEntries(newDate);

      setInterval(() => {
        const newDate = todayISO();
        setForm((prev) => ({ ...prev, date: newDate }));
        loadEntries(newDate);
      }, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight());

    return () => clearTimeout(timeoutId);
  }, []);

  // 🔹 CHANGE: Reusable function to load entries and summary for a given date.
  async function loadEntries(date) {
    try {
      const list = await api.listEntries({
        from: date,
        to: date,
        sort: 'creation',
      });
      const sum = await api.summaryDaily(date);
      setEntries(list);
      setSummary(sum);
    } catch (e) {
      console.error("Failed to load entries:", e);
    }
  }

  // Auto-fetch rate for NEW form
  useEffect(() => {
    async function fetchRate() {
      if (!form.fat || !form.snf) {
        setAutoRate(null);
        if (!userOverride) setForm((p) => ({ ...p, rate: "" }));
        return;
      }
      try {
        const res = await api.getRate(form.milkType, form.fat, form.snf);
        setAutoRate(res.rate);
        if (!userOverride) setForm((p) => ({ ...p, rate: res.rate }));
      } catch {
        setAutoRate(null);
        if (!userOverride) setForm((p) => ({ ...p, rate: "" }));
      }
    }
    fetchRate();
  }, [form.milkType, form.fat, form.snf, userOverride]);

  // Auto-fetch rate for EDIT form
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
        if (!editUserOverride) setEditForm((p) => ({ ...p, rate: res.rate }));
      } catch {
        setEditAutoRate(null);
        if (!editUserOverride) setEditForm((p) => ({ ...p, rate: "" }));
      }
    }
    if (editingId) fetchRate();
  }, [editForm.milkType, editForm.fat, editForm.snf, editUserOverride, editingId]);

  async function onSubmit(e) {
    e.preventDefault();
    setPopupMsg(null);
    if (!form.customerId) {
      setPopupMsg({ text: "❌ Please select a customer first", type: "error" });
      setTimeout(() => setPopupMsg(null), 3000);
      return;
    }
    if (!form.rate) {
      setPopupMsg({ text: "⚠️ Cannot save entry without rate", type: "error" });
      setTimeout(() => setPopupMsg(null), 3000);
      return;
    }
    setIsSaving(true);
    try {
      await api.createEntry({
        customerId: form.customerId,
        date: form.date,
        shift: form.shift,
        milkType: form.milkType,
        quantityL: form.quantityL,
        fat: form.fat ? form.fat : undefined,
        snf: form.snf ? form.snf : undefined,
        rate: form.rate ? form.rate : undefined,
        note: form.note || undefined,
      });
      resetForm();
      loadEntries(todayISO());
      setPopupMsg({ text: "✅ Entry saved successfully!", type: "success" });
      setTimeout(() => setPopupMsg(null), 3000);
    } catch (e) {
      if (e.message.includes("already exists")) {
        setPopupMsg({ text: "❌ Entry already exists for this customer, date and shift", type: "error" });
      } else {
        setPopupMsg({ text: `❌ ${e.message}`, type: "error" });
      }
      setTimeout(() => setPopupMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }

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

  const resetForm = () => {
    setForm((prev) => ({
      customerId: "",
      date: todayISO(),
      shift: prev.shift,
      milkType: "COW",
      quantityL: "",
      fat: "",
      snf: "",
      rate: "",
      note: "",
    }));
    setAutoRate(null);
    setUserOverride(false);
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id.toString());
    setEditForm({
      customerId: entry.customerId?.toString() || '',
      date: formatDateForInput(entry.date),
      shift: entry.shift || '',
      quantityL: entry.quantityL?.toString() || '',
      fat: entry.fat ? Number(entry.fat).toFixed(1) : '',
      snf: entry.snf ? Number(entry.snf).toFixed(1) : '',
      rate: entry.rate ? Number(entry.rate).toFixed(2) : '',
      milkType: entry.milkType || '',
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
      loadEntries(todayISO());
      setPopupMsg({ text: "✅ Entry updated successfully!", type: "success" });
      setTimeout(() => setPopupMsg(null), 3000);
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

  const amount =
    form.quantityL && form.rate
      ? (Number(form.quantityL) * Number(form.rate)).toFixed(2)
      : "";

  const editAmount =
    editForm.quantityL && editForm.rate
      ? (Number(editForm.quantityL) * Number(editForm.rate)).toFixed(2)
      : "";

  const customerOptions = customers
    .slice()
    .sort((a, b) => (a.slNo ?? 0) - (b.slNo ?? 0))
    .map((c) => ({
      value: c.id.toString(),
      label: `[${String(c.slNo).padStart(3, "0")}] ${c.name}`,
      slNo: String(c.slNo).padStart(3, "0"),
      name: c.name.toLowerCase(),
    }));

  function customerFilter(option, rawInput) {
    const input = rawInput.toLowerCase().trim();
    if (!input) return true;
    const normalizedInput = input.padStart(3, "0");
    if (option.data.slNo.includes(normalizedInput)) return true;
    if (option.data.name.includes(input)) return true;
    return false;
  }

  const filteredEntries = entries.filter((e) => {
    const search = entrySearch.toLowerCase();
    return (
      e.customer?.name.toLowerCase().includes(search) ||
      String(e.customer?.slNo ?? "").padStart(3, "0").includes(search)
    );
  });

  const totalL =
    (summary?.MORNING?.totalLiters || 0) +
    (summary?.EVENING?.totalLiters || 0);
  const totalAmt =
    (summary?.MORNING?.totalAmount || 0) +
    (summary?.EVENING?.totalAmount || 0);

  return (
    <div className="space-y-6">
      {popupMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg shadow-lg font-medium animate-fade-in-out ${
            popupMsg.type === "error"
              ? "bg-red-100 border border-red-300 text-red-700"
              : "bg-green-100 border border-green-300 text-green-700"
          }`}
        >
          {popupMsg.text}
        </div>
      )}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Add New Entries</h1>
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
      <form onSubmit={onSubmit} className="bg-gradient-to-r from-pink-50 to-pink-200 shadow rounded-xl p-4 space-y-3">
        <Select
          options={customerOptions}
          value={
            form.customerId
              ? customerOptions.find((opt) => opt.value === form.customerId)
              : null
          }
          onChange={(opt) => setForm({ ...form, customerId: opt.value })}
          placeholder="🔍 Select or search customer..."
          isSearchable
          filterOption={customerFilter}
          className="w-full"
        />
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="rounded-lg" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select className="rounded-lg" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
            <option value="MORNING">Morning</option>
            <option value="EVENING">Evening</option>
          </select>
          <select className="rounded-lg" value={form.milkType} onChange={(e) => setForm({ ...form, milkType: e.target.value })}>
            <option value="COW">Cow</option>
            <option value="BUFFALO">Buffalo</option>
            <option value="MIX">Mix</option>
          </select>
          <input className="rounded-lg" placeholder="Quantity (L)" type="number" step="0.01" required value={form.quantityL} onChange={(e) => setForm({ ...form, quantityL: e.target.value })} />
          <input className="rounded-lg" placeholder="FAT %" type="number" step="0.1" value={form.fat} onChange={(e) => { setForm({ ...form, fat: e.target.value }); setUserOverride(false); }} />
          <input className="rounded-lg" placeholder="SNF %" type="number" step="0.1" value={form.snf} onChange={(e) => { setForm({ ...form, snf: e.target.value }); setUserOverride(false); }} />
          <input className="rounded-lg" placeholder="Rate (₹/L, override)" type="number" step="0.01" value={form.rate} onChange={(e) => { setForm({ ...form, rate: e.target.value }); setUserOverride(true); }} />
          <input className="rounded-lg col-span-2" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        {autoRate && <p className="text-sm text-gray-600">Auto Rate: <strong>₹{Number(autoRate).toFixed(2)}/L</strong></p>}
        {amount && <p className="text-sm text-gray-600">Total Amount: <strong>₹{amount}</strong></p>}
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Entry"}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="bg-teal-400 border px-4 py-2 rounded-lg ml-2"
        >
          Cancel
        </button>
      </form>
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="w-16 h-16 border-4 border-t-4 border-gray-200 rounded-full animate-spin border-t-blue-500"></div>
        </div>
      ) : (
        <>
          {entries.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-lg text-gray-900">Today's Entries</h2>
                <button
                  type="button"
                  onClick={() => loadEntries(todayISO())}
                  className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
                >
                  🔄 Refresh
                </button>
              </div>
              <input type="text" placeholder="🔍 Search entries" value={entrySearch} onChange={(e) => setEntrySearch(e.target.value)} className="rounded-lg w-full border p-2 mb-2" />
              {filteredEntries.map((entry, i) => {
                // Check if the current entry's shift is different from the previous one
                const isFirstOfShift = i > 0 && filteredEntries[i].shift !== filteredEntries[i - 1].shift;
                return (
                  <div key={entry.id.toString()}>
                    {/* Add a small gap when the shift changes */}
                    {isFirstOfShift && <hr className="my-6 border-gray-400" />}
                    <div className={`p-3 border rounded-lg shadow-sm hover:shadow-md transition ${entry.shift === "MORNING" ? 'bg-gradient-to-r from-indigo-50 to-indigo-300' : 'bg-gradient-to-r from-amber-50 to-amber-300'}`}>
                      {editingId === entry.id.toString() ? (
                        <div className="space-y-2 bg-rose-100">
                          <div className="p-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-950">
                            [{String(entry.customer?.slNo).padStart(3, "0")}] {entry.customer?.name}
                          </div>
                          <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="rounded-lg w-full border p-2" />
                          <select value={editForm.shift} onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })} className="rounded-lg w-full border p-2">
                            <option value="MORNING">Morning</option>
                            <option value="EVENING">Evening</option>
                          </select>
                          <select value={editForm.milkType} onChange={(e) => setEditForm({ ...editForm, milkType: e.target.value })} className="rounded-lg w-full border p-2">
                            <option value="COW">Cow</option>
                            <option value="BUFFALO">Buffalo</option>
                            <option value="MIX">Mix</option>
                          </select>
                          <input type="number" step="0.01" placeholder="Quantity (L)" value={editForm.quantityL} onChange={(e) => setEditForm({ ...editForm, quantityL: e.target.value })} className="rounded-lg w-full border p-2" />
                          <input type="number" step="0.1" placeholder="FAT" value={editForm.fat} onChange={(e) => { setEditForm({ ...editForm, fat: e.target.value }); setEditUserOverride(false); }} className="rounded-lg w-full border p-2" />
                          <input type="number" step="0.1" placeholder="SNF" value={editForm.snf} onChange={(e) => { setEditForm({ ...editForm, snf: e.target.value }); setEditUserOverride(false); }} className="rounded-lg w-full border p-2" />
                          <input type="number" step="0.01" placeholder="Rate" value={editForm.rate} onChange={(e) => { setEditForm({ ...editForm, rate: e.target.value }); setEditUserOverride(true); }} className="rounded-lg w-full border p-2" />
                          {editAutoRate && <p className="text-sm text-gray-600">Auto Rate: <strong>₹{editAutoRate}/L</strong></p>}
                          {editAmount && <p className="text-sm text-gray-600">Total Amount: <strong>₹{editAmount}</strong></p>}
                          <input placeholder="Note" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="rounded-lg w-full border p-2" />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(entry.id.toString())}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                              disabled={isUpdating}
                            >
                              {isUpdating ? "Updating..." : "Save"}
                            </button>
                            <button onClick={cancelEdit} className="bg-teal-400 text-gray-950 border px-4 py-2 rounded-lg ml-2">Cancel</button>
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
                          <button onClick={() => handleEdit(entry)} className="text-gray-950 border bg-white border-blue-600 px-3 py-1 rounded-lg hover:bg-green-300 transition">Edit</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-cyan-50 to-cyan-200 shadow rounded-xl p-4">
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
                  🧑‍🌾 Customers: {summary?.MORNING?.count || 0}
                </p>
              </div>
              <div className="bg-gradient-to-r from-cyan-50 to-cyan-200 shadow rounded-xl p-4">
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
                  🧑‍🌾 Customers: {summary?.EVENING?.count || 0}
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-300 rounded-xl border border-blue-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold">Day Total</h2>
                <p className="text-xl font-bold">{totalL.toFixed(2)} L</p>
                <p className="text-lg">₹ {totalAmt.toFixed(2)}</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  🧑‍🌾 Total Entries: {summary?.totalCount || 0}
                </p>
              </div>
            </div>
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