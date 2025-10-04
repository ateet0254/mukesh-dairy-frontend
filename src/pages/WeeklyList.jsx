// src/pages/WeeklyList.jsx
import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import html2pdf from "html2pdf.js";
import { motion } from "framer-motion";
// Assuming you have logo and mission images in assets
import logo from "../assets/logo.png";
import mission from "../assets/mission.jpg";

// Helper function to get today's date in YYYY-MM-DD format
const getTodaysDate = () => {
    return new Date().toISOString().split("T")[0];
};

// Helper function to calculate total days in the range
const calculateTotalDays = (start, end) => {
    if (!start || !end) return 0;
    try {
        const diffTime = new Date(end).getTime() - new Date(start).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays > 0 ? diffDays : 0;
    } catch {
        return 0;
    }
};

export default function WeeklyList() {
    const [customers, setCustomers] = useState([]);
    const [startDate, setStartDate] = useState(getTodaysDate());
    const [endDate, setEndDate] = useState(getTodaysDate());
    const [listData, setListData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [popup, setPopup] = useState(null);
    const pdfRef = useRef(null);

    const totalDays = calculateTotalDays(startDate, endDate);

    // 1. Load all customers on component mount
    useEffect(() => {
        api.listCustomers()
            .then(data => setCustomers(data.sort((a, b) => (a.slNo ?? 0) - (b.slNo ?? 0))))
            .catch(console.error);
    }, []);

    const showPopup = (type, message) => {
        setPopup({ type, message });
        setTimeout(() => setPopup(null), 3000);
    };

    const fetchWeeklyList = async () => {
        if (!startDate || !endDate) {
            return showPopup("error", "⚠️ Please select start and end dates.");
        }

        setIsLoading(true);
        setListData([]);

        try {
            const allEntries = await api.listEntries({
                from: startDate,
                to: endDate,
            });

            const aggregatedData = allEntries.reduce((acc, entry) => {
                const id = entry.customerId.toString();
                acc[id] = acc[id] || { totalLiters: 0, totalAmount: 0 };
                acc[id].totalLiters += Number(entry.quantityL || 0);
                acc[id].totalAmount += Number(entry.amount || 0);
                return acc;
            }, {});

            const combinedList = customers.map(customer => {
                const data = aggregatedData[customer.id.toString()] || { totalLiters: 0, totalAmount: 0 };
                return {
                    slNo: customer.slNo,
                    name: customer.name,
                    ...data
                };
            });
                
            setListData(combinedList);

        } catch (e) {
            console.error("Failed to fetch weekly list:", e);
            showPopup("error", "❌ Failed to fetch data.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const closeList = () => {
        setListData([]);
    };

    const getFormattedDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const generatePdf = async (action) => { // 'download' or 'print'
        if (listData.length === 0) {
            return showPopup("error", "⚠️ Generate the list first.");
        }

        setIsGeneratingPdf(true);
        const el = document.getElementById("pdf-list-content");
        if (!el) {
            setIsGeneratingPdf(false);
            return showPopup("error", "⚠️ Could not find PDF content.");
        }

        const prevDisplay = el.style.display;
        const wasHidden = prevDisplay === "none" || !prevDisplay;
        if (wasHidden) el.style.display = "block";

        const scale = 2;

        try {
            const pdf = await html2pdf()
                .set({
                    margin: 0.2, // 👈 REDUCED MARGIN TO MINIMIZE WHITESPACE
                    filename: `Weekly_Summary_${startDate}_to_${endDate}.pdf`,
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: { scale, useCORS: true },
                    jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
                    pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "thead", "tbody"], after: ".pdf-page-break" }
                })
                .from(el)
                .toPdf()
                .get("pdf");

            if (action === 'download') {
                pdf.save(`Weekly_Summary_${startDate}_to_${endDate}.pdf`);
                showPopup("success", "✅ PDF downloaded successfully!");
            } else if (action === 'print') {
                const blob = pdf.output("blob");
                const url = URL.createObjectURL(blob);
                const newWindow = window.open(url, "_blank");
                if (newWindow) newWindow.onload = () => newWindow.print();
            }
        } catch (err) {
            console.error(err);
            showPopup("error", `❌ Failed to ${action} PDF.`);
        } finally {
            el.style.display = prevDisplay;
            setIsGeneratingPdf(false);
        }
    };
    
    const grandTotalLiters = listData.reduce((sum, item) => sum + item.totalLiters, 0);
    const grandTotalAmount = listData.reduce((sum, item) => sum + item.totalAmount, 0);

    // --- JSX Rendering ---
    return (
        <div className="space-y-6">
            {/* Popup Message */}
            {popup && (
                <div
                    className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg shadow-md ${
                        popup.type === "success"
                            ? "bg-green-100 border border-green-300 text-green-700"
                            : "bg-red-100 border border-red-300 text-red-700"
                    }`}
                >
                    {popup.message}
                </div>
            )}

            <h1 className="text-xl font-bold text-gray-800">📋 Weekly List Summary</h1>
            
            {/* Date Picker and Buttons */}
            <div className="bg-gradient-to-r from-pink-50 to-pink-200 p-4 rounded-lg shadow space-y-3">
                 <div className="flex gap-4">
                    <div className="flex flex-col flex-1">
                        <label htmlFor="startDate" className="text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border rounded-lg p-2 w-full"
                        />
                    </div>
                    <div className="flex flex-col flex-1">
                        <label htmlFor="endDate" className="text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border rounded-lg p-2 w-full"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                    <button
                        onClick={fetchWeeklyList}
                        disabled={isLoading || isGeneratingPdf}
                        className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition"
                    >
                        {isLoading ? "Loading..." : "Show List"}
                    </button>
                    {listData.length > 0 && (
                        <>
                            <button
                                onClick={() => generatePdf('download')}
                                disabled={isGeneratingPdf}
                                className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition"
                            >
                                {isGeneratingPdf ? "Preparing..." : "📥 Download"}
                            </button>
                            <button
                                onClick={() => generatePdf('print')}
                                disabled={isGeneratingPdf}
                                className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition"
                            >
                                {isGeneratingPdf ? "Preparing..." : "🖨️ Print"}
                            </button>
                            <button
                                onClick={closeList}
                                disabled={isGeneratingPdf}
                                className="bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-red-400 transition"
                            >
                                Close
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Loading Spinner */}
            {isLoading && (
                <div className="flex justify-center items-center py-6">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"
                    />
                </div>
            )}

            {/* List Data Table */}
            {listData.length > 0 && !isLoading && (
                <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
                    {/* Display Total Days */}
                    <h2 className="text-lg font-semibold mb-3">
                        Summary Report ({getFormattedDate(startDate)} to {getFormattedDate(endDate)}) - Total Days: {totalDays}
                    </h2>
                    
                    {/* Table for display on screen */}
                    <table className="min-w-full border-collapse text-sm mb-4">
                        {/* Table Head (same as PDF) */}
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border p-2 text-left w-1/12">Sl No.</th>
                                <th className="border p-2 text-left w-5/12">Name</th>
                                <th className="border p-2 text-right w-2/12">Total Qty (L)</th>
                                <th className="border p-2 text-right w-2/12">Total Amount (₹)</th>
                                <th className="border p-2 w-2/12">Signature</th>
                            </tr>
                        </thead>
                        {/* Table Body (same as PDF) */}
                        <tbody>
                            {listData.map((item) => (
                                <tr key={item.slNo} className="hover:bg-gray-50">
                                    <td className="border p-2 font-medium">[{String(item.slNo).padStart(3, "0")}]</td>
                                    <td className="border p-2">{item.name}</td>
                                    <td className="border p-2 text-right font-semibold">{item.totalLiters.toFixed(2)}</td>
                                    <td className="border p-2 text-right font-bold">₹{item.totalAmount.toFixed(2)}</td>
                                    <td className="border p-2"></td>
                                </tr>
                            ))}
                        </tbody>
                        {/* Table Footer (Grand Total) */}
                        <tfoot>
                             <tr className="bg-gray-100 font-bold">
                                <td colSpan="2" className="border p-2 text-right">GRAND TOTAL</td>
                                <td className="border p-2 text-right">
                                    {grandTotalLiters.toFixed(2)} L
                                </td>
                                <td className="border p-2 text-right">
                                    ₹{grandTotalAmount.toFixed(2)}
                                </td>
                                <td className="border p-2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* PDF Content for Download/Print (Hidden by default) */}
            <div
                id="pdf-list-content"
                ref={pdfRef}
                className="bg-white border rounded-lg"
                // Reduced the outer padding here for maximum space saving
                style={{ display: 'none', paddingBottom: "0.05in", padding: "0.1in" }}
            >
                {/* PDF STYLES (Compressed for single-page fit) */}
                <style>
                    {`
                        #pdf-list-content table { 
                            page-break-inside: auto; 
                            border-collapse: collapse; 
                            width: 100%; 
                            font-size: 10px; /* Smaller font for more rows */
                        }
                        #pdf-list-content thead { display: table-header-group; }
                        #pdf-list-content tfoot { display: table-footer-group; }
                        #pdf-list-content tr,
                        #pdf-list-content td,
                        #pdf-list-content th {
                            page-break-inside: avoid;
                            break-inside: avoid;
                            -webkit-column-break-inside: avoid;
                        }
                        #pdf-list-content { page-break-after: auto; }
                        #pdf-list-content { padding: 0 0.05in 0 0.05in; } /* Minimal side padding */
                        #pdf-list-content table {
                            table-layout: fixed;
                            width: 100%; /* Use 100% width of the container */
                            margin: 0;
                            border-collapse: collapse;
                        }
                        #pdf-list-content th, #pdf-list-content td {
                            padding: 3px 4px; /* MINIMAL CELL PADDING */
                            border: 1px solid #e5e7eb;
                            vertical-align: middle;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: normal;
                            height: 15px; /* Force minimum height */
                        }
                        /* FINAL PDF COLUMN WIDTHS (Compressed) */
                        #pdf-list-content th:nth-child(1), #pdf-list-content td:nth-child(1) { width: 10%; text-align: left; } /* Sl No. */
                        #pdf-list-content th:nth-child(2), #pdf-list-content td:nth-child(2) { width: 35%; text-align: left; } /* Name - kept wide */
                        #pdf-list-content th:nth-child(3), #pdf-list-content td:nth-child(3) { width: 15%; text-align: right; } /* Qty (L) */
                        #pdf-list-content th:nth-child(4), #pdf-list-content td:nth-child(4) { width: 20%; text-align: right; } /* Amount (₹) */
                        #pdf-list-content th:nth-child(5), #pdf-list-content td:nth-child(5) { width: 20%; text-align: center; } /* Signature */

                        /* Header Compression */
                        #pdf-list-content > div:first-child { margin-bottom: 0px !important; padding-bottom: 0px !important; }
                        #pdf-list-content > div:first-child img { max-height: 40px; } /* Smallest logos */
                        #pdf-list-content h1 { font-size: 16px; margin: 0; }
                        #pdf-list-content h2 { font-size: 11px; margin: 0; }
                    `}
                </style>

                {/* PDF Header Content */}
                <div className="flex items-center justify-between pb-2" style={{ marginBottom: '3px' }}> {/* Removed bottom margin */}
                    <img src={logo} alt="Dairy Logo" className="h-16 w-auto" />
                    <div className="text-center flex-1">
                        <h1 className="text-2xl font-bold">Amul Dairy</h1>
                        <h2 className="text-lg">मड़ावदा दुग्ध संकलन केंद्र</h2>
                    </div>
                    <img src={mission} alt="Swachh Bharat" className="h-12 w-auto" />
                </div>
                
                <h2 className="text-lg text-center mb-1" style={{ marginTop: '5px' }}>Weekly Summary Report</h2>
                <p className="text-sm text-center mb-3" style={{ marginBottom: '5px' }}>
                    Period: {getFormattedDate(startDate)} to {getFormattedDate(endDate)} (Total Days: {totalDays})
                </p>

                {/* PDF Table Content with Pagination */}
                {listData.map((_, index) => {
                    if (index % 20 === 0) { // Limit to 20 per page
                        const start = index;
                        const end = Math.min(index + 20, listData.length);
                        const pageData = listData.slice(start, end);
                        const isLastPage = end === listData.length;

                        return (
                            <React.Fragment key={index}>
                                {/* Page Break for subsequent pages */}
                                {index > 0 && <div className="pdf-page-break" style={{ pageBreakAfter: 'always' }} />}

                                <table className="w-full border-collapse text-sm mt-3">
                                    <thead>
                                        <tr className="bg-gray-200">
                                            <th className="border p-2 text-left">Sl No.</th>
                                            <th className="border p-2 text-left">Name</th>
                                            <th className="border p-2 text-right">Total Qty (L)</th>
                                            <th className="border p-2 text-right">Total Amount (₹)</th>
                                            <th className="border p-2 w-[100px]">Signature</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageData.map((item) => (
                                            <tr key={item.slNo} className="h-10">
                                                <td className="border p-2 font-medium">[{String(item.slNo).padStart(3, "0")}]</td>
                                                <td className="border p-2">{item.name}</td>
                                                <td className="border p-2 text-right font-semibold">{item.totalLiters.toFixed(2)}</td>
                                                <td className="border p-2 text-right font-bold">₹{item.totalAmount.toFixed(2)}</td>
                                                <td className="border p-2"></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        {isLastPage && (
                                            <tr className=" font-bold text-base">
                                                <td colSpan="2" className="border p-2 text-right">Grand Total</td>
                                                <td className="border p-2 text-right">{grandTotalLiters.toFixed(2)} L</td>
                                                <td className="border p-2 text-right">₹{grandTotalAmount.toFixed(2)}</td>
                                                <td className="border p-2"></td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </React.Fragment>
                        );
                    }
                    return null;
                })}

                <div style={{ height: 12, width: "100%" }} aria-hidden="true" />
            </div>
        </div>
    );
}