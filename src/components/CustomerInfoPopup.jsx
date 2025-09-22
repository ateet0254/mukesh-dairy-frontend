import React, { useState, useEffect } from "react";
import { api } from "../api";
import { motion, AnimatePresence } from "framer-motion";

function getMonthOptions() {
  const months = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  for (let i = currentMonth; i >= 0; i--) {
    const d = new Date(currentYear, i, 1);
    const monthName = d.toLocaleString('en-IN', { month: 'long' });
    const year = d.getFullYear();
    const isoStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const isoEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    months.push({
      label: `${monthName} ${year}`,
      value: { isoStart, isoEnd }
    });
  }
  return months;
}

function formatDateDisplay(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return "Invalid Date";
  }
}

export default function CustomerInfoPopup({ customer, onClose }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthOptions()[0].value);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!customer) return;
      setIsLoading(true);
      try {
        const result = await api.getCustomerMonthlyData(
          customer.id,
          selectedMonth.isoStart,
          selectedMonth.isoEnd
        );
        setData(result);
      } catch (e) {
        console.error("Failed to fetch customer data:", e);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [customer, selectedMonth]);

  const toggleEntries = () => {
    setShowEntries(prev => !prev);
    setShowTransactions(false);
  };
  const toggleTransactions = () => {
    setShowTransactions(prev => !prev);
    setShowEntries(false);
  };

  const monthOptions = getMonthOptions();

  const showNum = (v, decimals = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(decimals) : '0.00';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <h2 className="text-xl font-bold mb-4">Customer's This Month Information</h2>

        {/* Month Dropdown */}
        <div className="mb-4 flex items-center gap-2 relative">
          <label className="font-semibold text-gray-900">Month:</label>
          <select
            value={JSON.stringify(selectedMonth)}
            onChange={(e) => setSelectedMonth(JSON.parse(e.target.value))}
            className="rounded-lg border p-2 appearance-none pr-8 bg-white"
          >
            {monthOptions.map((opt) => (
              <option key={opt.label} value={JSON.stringify(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
        
        {/* Customer Details */}
        {customer && (
          <div className="mb-4 p-4 border rounded-lg bg-gradient-to-r from-fuchsia-50 to-fuchsia-100">
            <h3 className="font-bold">[{customer.slNo}] {customer.name}</h3>
            <p className="text-sm text-gray-950">Phone: {customer.phone || 'N/A'}</p>
            <p className="text-sm text-gray-950">Village: {customer.village || 'N/A'}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-6">
            <div className="w-10 h-10 border-4 border-t-4 border-gray-200 rounded-full animate-spin border-t-blue-500"></div>
          </div>
        ) : (
          <div>
            {/* Total Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded-lg shadow bg-orange-100">
                <h3 className="font-semibold text-sm">Total Milk Quantity</h3>
                <p className="text-lg font-bold">{data?.totals?.totalMilkQuantity || '0.00'} L</p>
              </div>
              <div className="p-4 rounded-lg shadow bg-cyan-100">
                <h3 className="font-semibold text-sm">Total Milk Amount</h3>
                <p className="text-lg font-bold">₹ {data?.totals?.totalMilkAmount || '0.00'}</p>
              </div>
              <div className="p-4 rounded-lg shadow bg-green-100">
                <h3 className="font-semibold text-sm">Amount Paid</h3>
                <p className="text-lg font-bold">₹ {data?.totals?.totalPaidAmount || '0.00'}</p>
              </div>
              <div className="p-4 rounded-lg shadow bg-red-100">
                <h3 className="font-semibold text-sm">Current Amount</h3>
                <p className="text-lg font-bold">₹ {data?.totals?.unpaidAmount || '0.00'}</p>
              </div>
            </div>

            {/* View Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={toggleEntries}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                  showEntries ? 'bg-blue-600 text-white' : 'bg-rose-200 text-gray-950'
                }`}
              >
                View Recent Entries
              </button>
              <button
                onClick={toggleTransactions}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                  showTransactions ? 'bg-blue-600 text-white' : 'bg-amber-200 text-gray-950'
                }`}
              >
                View Recent Transactions
              </button>
            </div>

            {/* Entries/Transactions Lists */}
            <AnimatePresence mode="wait">
              {showEntries && (
                <motion.div
                  key="entries"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-gray-50 p-4 rounded-lg shadow">
                    <h3 className="font-semibold mb-2 flex justify-between items-center">
                      Entries
                      <button onClick={toggleEntries} className="text-sm text-red-600 font-medium">Close </button>
                    </h3>
                    {data?.entries?.length > 0 ? (
                      <ul className="space-y-2">
                        {data.entries.slice().reverse().map((entry) => (
                          <li key={entry.id.toString()} className="p-3 bg-gray-100 rounded-lg shadow-sm">
                            <p className="font-semibold">
                              {formatDateDisplay(entry.date)} · {entry.shift}
                            </p>
                            <p className="text-sm font-semibold">
                              {Number(entry.quantityL).toFixed(2)} L @ ₹{Number(entry.rate).toFixed(2)}/L → ₹{Number(entry.amount).toFixed(2)}
                            </p>
                            {entry.fat && entry.snf && <p className="text-xs font-semibold text-gray-900">FAT: {Number(entry.fat).toFixed(1)} | SNF: {Number(entry.snf).toFixed(1)}</p>}
                            {entry.note && <p className="text-sm italic text-gray-900 mt-1">📝 {entry.note}</p>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-900">No entries for this period.</p>
                    )}
                  </div>
                </motion.div>
              )}
              {showTransactions && (
                <motion.div
                  key="transactions"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-gray-50 p-4 rounded-lg shadow">
                    <h3 className="font-semibold mb-2 flex justify-between items-center">
                      Transactions
                      <button onClick={toggleTransactions} className="text-sm text-red-600 font-medium">Close</button>
                    </h3>
                    {data?.payments?.length > 0 ? (
                      <ul className="space-y-2">
                        {data.payments.slice().reverse().map((payment) => (
                          <li key={payment.id.toString()} className="p-3 bg-gray-100 rounded-lg shadow-sm">
                            <p className="font-semibold">{formatDateDisplay(payment.date)} · ₹{Number(payment.amount).toFixed(2)}</p>
                            <p className="text-sm text-gray-900 font-semibold">Mode: {payment.mode} {payment.note && `· Note: ${payment.note}`}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No transactions for this period.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}