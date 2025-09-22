// src/pages/WeeklyData.jsx
import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import html2pdf from "html2pdf.js";
import logo from "../assets/logo.png";
import mission from "../assets/mission.jpg";
import { motion } from "framer-motion";

const getTodaysDate = () => {
  return new Date().toISOString().split("T")[0];
};

export default function WeeklyData() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState(""); 
  const [startDate, setStartDate] = useState(getTodaysDate());
  const [endDate, setEndDate] = useState(getTodaysDate());
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerData, setCustomerData] = useState([]);
  const [popup, setPopup] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false); // ✅ Add this
  const [isLoading, setIsLoading] = useState(true);
  const pdfRef = useRef(null);

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

   const loadCustomers = async () => {
    setIsLoading(true); // Start loading
    try {
      const data = await api.listCustomers();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false); // End loading
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const query = search.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(query) ||
      String(c.slNo).padStart(3, "0").includes(query)
    );
  });

  const fetchWeeklyData = async (customer) => {
    if (!startDate || !endDate) {
      setPopup({
        type: "error",
        message: "⚠️ Please select start and end dates first!",
      });
      setTimeout(() => setPopup(null), 3000);
      return;
    }
    setSelectedCustomer(customer);
    setIsFetchingData(true); // ✅ Start loading
    try {
      const data = await api.listEntries({
        from: startDate,
        to: endDate,
        customerId: customer.id.toString(), // ✅ Fix: Pass id as a string
      });
      setCustomerData(data || []);
    } catch (e) {
      console.error(e);
      setCustomerData([]);
    } finally {
      setIsFetchingData(false); // ✅ Stop loading
    }
  };

  const closeReport = () => {
    setSelectedCustomer(null);
    setCustomerData([]);
    setShowPdfPreview(false);
  };

  // Totals
  const totalLiters = customerData.reduce(
    (sum, e) => sum + Number(e.quantityL || 0),
    0
  );
  const totalAmount = customerData.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const totalDays =
    startDate && endDate
      ? Math.ceil(
          (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  // ✅ Fix: This is a robust and pure function to build dates
  const buildDates = () => {
    const dates = [];
    if (startDate && endDate) {
      let current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        dates.push(current.toISOString().split("T")[0]);
        current = new Date(current.setDate(current.getDate() + 1));
      }
    }
    return dates;
  };

  const trimExtraPdfPages = (pdf, el, scale = 2) => {
    try {
      const A4_HEIGHT_IN = 11.69;
      const DPI = 96;
      const pageHeightPx = A4_HEIGHT_IN * DPI * scale;
      const contentHeightPx = el.scrollHeight * scale;
      const expectedPages = Math.max(1, Math.ceil(contentHeightPx / pageHeightPx));
      let actualPages = pdf.internal.getNumberOfPages();
      while (actualPages > expectedPages) {
        pdf.deletePage(actualPages);
        actualPages = pdf.internal.getNumberOfPages();
      }
    } catch (e) {
      console.warn("trimExtraPdfPages failed:", e);
    }
  };

  const handleDownload = async () => {
    if (!startDate || !endDate || !selectedCustomer) {
      setPopup({ type: "error", message: "⚠️ Select dates and a customer first." });
      setTimeout(() => setPopup(null), 2500);
      return;
    }
    if (totalDays > 12) {
      setPopup({ type: "error", message: "⚠️ Max 12 days data can be downloaded or printed." });
      setTimeout(() => setPopup(null), 3000);
      return;
    }
    const el = document.getElementById("pdf-report");
    if (!el) {
      setPopup({ type: "error", message: "⚠️ Could not find PDF content." });
      setTimeout(() => setPopup(null), 2500);
      return;
    }

    const prevDisplay = el.style.display;
    const wasHidden = prevDisplay === "none" || !prevDisplay;
    if (wasHidden) el.style.display = "block";

    const scale = 2;

    try {
      const pdf = await html2pdf()
        .set({
          margin: 0.25,
          filename: `Weekly_Report_${selectedCustomer.name}_${startDate}_to_${endDate}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale, useCORS: true },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "thead", "tbody"], after: "#pdf-report" }
        })
        .from(el)
        .toPdf()
        .get("pdf");
      trimExtraPdfPages(pdf, el, scale);
      pdf.save(`Milk_Report_${selectedCustomer.name}_${startDate}_to_${endDate}.pdf`);
      setPopup({ type: "success", message: "✅ PDF downloaded successfully!" });
      setTimeout(() => setPopup(null), 3000);
    } catch (err) {
      console.error(err);
      setPopup({ type: "error", message: "❌ Failed to generate PDF." });
      setTimeout(() => setPopup(null), 3000);
    } finally {
      el.style.display = prevDisplay;
    }
  };

  const handlePrint = async () => {
    if (!startDate || !endDate || !selectedCustomer) {
      setPopup({ type: "error", message: "⚠️ Select dates and a customer first." });
      setTimeout(() => setPopup(null), 2500);
      return;
    }
    if (totalDays > 12) {
      setPopup({ type: "error", message: "⚠️ Max 12 days data can be downloaded or printed." });
      setTimeout(() => setPopup(null), 3000);
      return;
    }
    const el = document.getElementById("pdf-report");
    if (!el) {
      setPopup({ type: "error", message: "⚠️ Could not find PDF content." });
      setTimeout(() => setPopup(null), 2500);
      return;
    }

    const prevDisplay = el.style.display;
    const wasHidden = prevDisplay === "none" || !prevDisplay;
    if (wasHidden) el.style.display = "block";
    const scale = 2;
    try {
      const pdf = await html2pdf()
        .set({
          margin: 0.35,
          filename: `Weekly_Report_${selectedCustomer.name}_${startDate}_to_${endDate}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale, useCORS: true },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "thead", "tbody"], after: "#pdf-report" }
        })
        .from(el)
        .toPdf()
        .get("pdf");
      trimExtraPdfPages(pdf, el, scale);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank");
      if (newWindow) {
        newWindow.onload = () => {
          try {
            newWindow.focus();
            newWindow.print();
          } catch (err) {
            console.warn("Auto-print failed, user can manually print from new tab.", err);
          }
        };
      } else {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
        iframe.src = url;
        iframe.onload = () => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (err) {
            console.warn("Iframe print failed", err);
          } finally {
            setTimeout(() => {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
            }, 1000);
          }
        };
      }
    } catch (err) {
      console.error("Print failed:", err);
      setPopup({ type: "error", message: "❌ Failed to prepare print." });
      setTimeout(() => setPopup(null), 3000);
    } finally {
      el.style.display = prevDisplay;
    }
  };

  const showNum = (v, decimals = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(decimals) : "-";
  };
  
  return (
    <div className="space-y-6">
      {popup && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded-lg shadow-md animate-fade-in-out z-50
            ${popup.type === "success"
              ? "bg-green-100 border border-green-300 text-green-700"
              : "bg-red-100 border border-red-300 text-red-700"
            }`}
        >
          {popup.message}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">📊 Weekly Data</h1>

      <div className="flex flex-col sm:flex-row sm:grid sm:grid-cols-2 gap-3 bg-gradient-to-r from-pink-50 to-pink-200 p-4 rounded-lg shadow">
      <div className="flex flex-col">
        <label htmlFor="startDate" className="text-sm font-medium text-gray-700 mb-1">Start Date</label>
        <input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded-lg p-2"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="endDate" className="text-sm font-medium text-gray-700 mb-1">End Date</label>
        <input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded-lg p-2"
        />
      </div>
    </div>
    {isLoading ? (
      <div className="flex justify-center items-center min-h-[200px]">
          <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"
          />
      </div>
  ) : (

      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="visible"
        className="bg-white p-4 rounded-lg shadow"
      >
        <input
          type="text"
          placeholder="🔍 Search customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border p-2 rounded-lg mb-3"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {filteredCustomers.map((c) => (
            <motion.li
              key={c.id.toString()}
              variants={leftIn}
              className="p-4 border rounded-lg shadow-sm bg-gradient-to-r from-green-50 to-green-200 flex flex-col justify-between"
            >
              <p className="font-medium">
                [{String(c.slNo).padStart(3, "0")}] {c.name}
              </p>
              <p className="text-xs text-gray-500">📞 {c.phone?.toString() ?? ''}</p>
              <button
                onClick={() => fetchWeeklyData(c)}
                className={`mt-2 text-sm text-white px-3 py-1 rounded-lg transition
                  ${selectedCustomer?.id.toString() === c.id.toString()
                    ? "bg-gray-900 "
                    : "bg-blue-600 hover:bg-gray-900"}`
                }
              >
                {selectedCustomer?.id.toString() === c.id.toString() ? "✔ Showing Report" : "Show Report"}
              </button>
            </motion.li>
          ))}
        </div>
      </motion.div>
  )}

      {isFetchingData && (
        <div className="flex justify-center items-center py-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      )}

      {selectedCustomer && !isFetchingData && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-gray-700 mb-3">
            🧑‍🌾 {selectedCustomer.name} ({startDate} → {endDate})
          </h2>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Date</th>
                <th className="border p-2">Shift</th>
                <th className="border p-2">Milk Type</th>
                <th className="border p-2">Qty (L)</th>
                <th className="border p-2">FAT</th>
                <th className="border p-2">SNF</th>
                <th className="border p-2">Rate</th>
                <th className="border p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const dates = buildDates();
                return dates.flatMap((date) =>
                  ["MORNING", "EVENING"].map((shift) => {
                    const entry = customerData.find(
                      (e) =>
                        (e.date || "").split("T")[0] === date && e.shift === shift
                    );
                    if (entry) {
                      return (
                        <tr key={`pdf-${date}-${shift}`} className="text-center">
                          <td className="border p-2">{date}</td>
                          <td className="border p-2">{entry.shift}</td>
                          <td className="border p-2">{entry.milkType}</td>
                          <td className="border p-2">{showNum(entry.quantityL)}</td>
                          <td className="border p-2">{showNum(entry.fat, 1)}</td>
                          <td className="border p-2">{showNum(entry.snf, 1)}</td>
                          <td className="border p-2">{showNum(entry.rate)}</td>
                          <td className="border p-2 font-semibold">₹{showNum(entry.amount)}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={`pdf-${date}-${shift}`} className="text-center italic bg-red-50">
                        <td className="border p-2">{date}</td>
                        <td className="border p-2">{shift}</td>
                        <td className="border p-2" colSpan="6">Not Available</td>
                      </tr>
                    );
                  })
                );
              })()}

              <tr className="bg-gray-100 font-bold">
                <td colSpan="2" className="border p-2 text-right">TOTAL</td>
                <td className="border p-2">{totalDays} days</td>
                <td className="border p-2">{totalLiters.toFixed(2)} L</td>
                <td colSpan="3" className="border p-2"></td>
                <td className="border p-2">₹{totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 mb-10 flex gap-3">
            <button
              className="bg-indigo-600 text-gray-950 font-semibold px-3 py-2 rounded-lg hover:bg-indigo-700 transition"
              onClick={handlePrint}
            >
              🖨️ Print
            </button>

            <button
              className="bg-green-600 text-gray-950 font-semibold px-3 py-2 rounded-lg hover:bg-green-800 transition"
              onClick={handleDownload}
            >
              📥 Download PDF
            </button>

            <button
              onClick={() => setShowPdfPreview((prev) => !prev)}
              className="bg-yellow-500 text-gray-950 font-semibold px-3 py-2 rounded-lg hover:bg-yellow-600 transition"
            >
              {showPdfPreview ? "Hide PDF Report" : "Show PDF Report"}
            </button>

            <button
              onClick={closeReport}
              className="bg-red-500 text-gray-950 font-semibold px-3 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Close
            </button>
          </div>

          <div
            id="pdf-report"
            ref={pdfRef}
            className="bg-white border rounded-lg"
            style={{ display: showPdfPreview ? "block" : "none", paddingBottom: "0.15in" }}
          >
            <style>
              {`
                #pdf-report table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
                #pdf-report thead { display: table-header-group; }
                #pdf-report tfoot { display: table-footer-group; }
                #pdf-report tr,
                #pdf-report td,
                #pdf-report th {
                  page-break-inside: avoid;
                  break-inside: avoid;
                  -webkit-column-break-inside: avoid;
                }
                #pdf-report { page-break-after: auto; }
                #pdf-report { padding: 6px 8px 0 8px; }
                #pdf-report table {
                  table-layout: fixed;
                  width: 96%;
                  margin: 0 auto;
                  border-collapse: collapse;
                  font-size: 11px;
                }
                #pdf-report th, #pdf-report td {
                  padding: 5px 6px;
                  border: 1px solid #e5e7eb;
                  vertical-align: middle;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                #pdf-report th:nth-child(1), #pdf-report td:nth-child(1) { width: 12%; }
                #pdf-report th:nth-child(2), #pdf-report td:nth-child(2) { width: 8%; }
                #pdf-report th:nth-child(3), #pdf-report td:nth-child(3) { width: 14%; }
                #pdf-report th:nth-child(4), #pdf-report td:nth-child(4) { width: 8%; text-align:right; }
                #pdf-report th:nth-child(5), #pdf-report td:nth-child(5) { width: 9%; text-align:right; }
                #pdf-report th:nth-child(6), #pdf-report td:nth-child(6) { width: 9%; text-align:right; }
                #pdf-report th:nth-child(7), #pdf-report td:nth-child(7) { width: 12%; text-align:right; }
                #pdf-report th:nth-child(8), #pdf-report td:nth-child(8) { width: 18%; text-align:right; }
                #pdf-report > div:first-child img { max-height: 56px; }
                #pdf-report h1 { font-size: 18px; margin: 0; }
                #pdf-report h2 { font-size: 13px; margin: 0; }
              `}
            </style>

            <div className="flex items-center justify-between">
              <img src={logo} alt="Dairy Logo" className="h-24 w-auto" />
              <div className="text-center flex-1">
                <h1 className="text-2xl font-bold">Amul Dairy</h1>
                <h2 className="text-lg">मड़ावदा दुग्ध संकलन केंद्र</h2>
              </div>
              <img src={mission} alt="Swachh Bharat" className="h-16 w-auto" />
            </div>

            <h2 className="text-lg text-center mb-2">Milk Report ({startDate} → {endDate})</h2>

            <p className="mb-2">
              <strong>Customer Sl No:</strong> {selectedCustomer?.slNo}
            </p>
            <p className="mb-6">
              <strong>Customer Name:</strong> {selectedCustomer?.name}
            </p>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Date</th>
                  <th className="border p-2">Shift</th>
                  <th className="border p-2">Milk Type</th>
                  <th className="border p-2">Qty (L)</th>
                  <th className="border p-2">FAT</th>
                  <th className="border p-2">SNF</th>
                  <th className="border p-2">Rate</th>
                  <th className="border p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const dates = buildDates();
                  return dates.flatMap((date) =>
                    ["MORNING", "EVENING"].map((shift) => {
                      const entry = customerData.find(
                        (e) =>
                          (e.date || "").split("T")[0] === date && e.shift === shift
                      );
                      if (entry) {
                        return (
                          <tr key={`pdf-${date}-${shift}`} className="text-center">
                            <td className="border p-2">{date}</td>
                            <td className="border p-2">{entry.shift}</td>
                            <td className="border p-2">{entry.milkType}</td>
                            <td className="border p-2">{showNum(entry.quantityL)}</td>
                            <td className="border p-2">{showNum(entry.fat, 1)}</td>
                            <td className="border p-2">{showNum(entry.snf, 1)}</td>
                            <td className="border p-2">{showNum(entry.rate)}</td>
                            <td className="border p-2 font-semibold">₹{showNum(entry.amount)}</td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={`pdf-${date}-${shift}`} className="text-center italic bg-red-50">
                          <td className="border p-2">{date}</td>
                          <td className="border p-2">{shift}</td>
                          <td className="border p-2" colSpan="6">Not Available</td>
                        </tr>
                      );
                    })
                  );
                })()}

                <tr className="bg-gray-100 font-bold">
                  <td colSpan="2" className="border p-2 text-right">TOTAL</td>
                  <td className="border p-2">{totalDays} days</td>
                  <td className="border p-2">{totalLiters.toFixed(2)} L</td>
                  <td colSpan="3" className="border p-2"></td>
                  <td className="border p-2">₹{totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ height: 12, width: "100%" }} aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}