// src/pages/Dashboard.jsx
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

export default function Dashboard() {
  const [date, setDate] = useState(todayISO());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .summaryDaily(date)
      .then(setSummary)
      .catch((e) => {
        console.error(e);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [date]);

  // Container variants (stagger children)
  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
        when: "beforeChildren",
      },
    },
    exit: { opacity: 0 },
  };

  // Smooth variants with easeOut and slightly longer duration
  const leftIn = {
    hidden: { opacity: 0, x: -40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };
  const rightIn = {
    hidden: { opacity: 0, x: 40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };
  const upIn = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header + Date */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
        <h1 className="text-xl font-bold text-gray-950">📅 Today's Statistics</h1>
        <div className="text-right">
          <div className="inline-block bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-semibold px-4 py-2 rounded-xl shadow-sm border border-blue-200">
            {(() => {
              const d = new Date(date);
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

      {/* Date Picker */}
      <div className="bg-white shadow rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-950">Date</label>
        <input
          type="date"
          className="mt-1 w-full rounded-lg border-gray-950 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {loading ? (
        // 🔹 Show the loader when data is being fetched
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="w-16 h-16 border-4 border-t-4 border-gray-200 rounded-full animate-spin border-t-blue-500"></div>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          key={date}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Morning (left) */}
          <motion.div
            variants={leftIn}
            whileHover={{ scale: 1.02 }}
            className=" bg-gradient-to-r from-cyan-50 to-cyan-200 shadow rounded-xl p-4 hover:shadow-lg transition"
          >
            <h2 className="text-lg font-bold text-gray-950 mb-2">Morning</h2>
            {["COW", "BUFFALO", "MIX"].map((type) => (
              <div key={type} className="flex justify-between font-semibold py-1 text-sm text-gray-950">
                <span>{type}</span>
                <span>
                  {(summary?.MORNING?.[type]?.liters || 0).toFixed(2)} L — ₹
                  {(summary?.MORNING?.[type]?.amount || 0).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 font-medium text-gray-950">
              Total: {(summary?.MORNING?.totalLiters || 0).toFixed(2)} L — ₹
              {(summary?.MORNING?.totalAmount || 0).toFixed(2)}
            </div>
            <p className="text-sm font-semibold text-gray-950 mt-1">
              🧑‍🌾 Customers: {summary?.MORNING?.count || 0}
            </p>
          </motion.div>

          {/* Evening (right) */}
          <motion.div
            variants={rightIn}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-r from-cyan-50 to-cyan-200 shadow rounded-xl p-4 hover:shadow-lg transition"
          >
            <h2 className="text-lg font-bold text-gray-950 mb-2">Evening</h2>
            {["COW", "BUFFALO", "MIX"].map((type) => (
              <div key={type} className="flex justify-between font-semibold py-1 text-sm text-gray-950">
                <span>{type}</span>
                <span>
                  {(summary?.EVENING?.[type]?.liters || 0).toFixed(2)} L — ₹
                  {(summary?.EVENING?.[type]?.amount || 0).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 font-medium text-gray-950">
              Total: {(summary?.EVENING?.totalLiters || 0).toFixed(2)} L — ₹
              {(summary?.EVENING?.totalAmount || 0).toFixed(2)}
            </div>
            <p className="text-sm font-semibold text-gray-950 mt-1">
              🧑‍🌾 Customers: {summary?.EVENING?.count || 0}
            </p>
          </motion.div>

          {/* Day Total (span full width on small screens; on md it will be second row full width) */}
          <motion.div
            variants={upIn}
            whileHover={{ scale: 1.01 }}
            className="md:col-span-2 rounded-xl border border-blue-500 bg-gradient-to-r from-blue-50 to-blue-300 p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold">Day Total</h2>
            <p className="text-xl font-bold">{(summary?.totalLiters || 0).toFixed(2)} L</p>
            <p className="text-lg">₹ {(summary?.totalAmount || 0).toFixed(2)}</p>
            <p className="text-sm text-gray-950 font-bold mt-1">
              🧑‍🌾 Total Entries: {summary?.totalCount || 0}
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}