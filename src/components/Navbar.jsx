// src/components/Navbar.jsx
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/logo.png";

export default function Navbar() {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  function logout() {
    setToken(null);
    navigate("/login");
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (!open) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // Updated button-like styles + active state
  const navLinkClasses = ({ isActive }) =>
    [
      "block w-full bg-gradient-to-r from-stone-50 to-stone-300 rounded-lg px-4 py-2 text-sm font-bold transition",
      isActive
        ? "bg-blue-50 text-blue-700"
        : "bg-gray-50 text-gray-700 hover:bg-gray-100",
    ].join(" ");

  return (
    <header className="sticky top-0 z-50 border-b bg-gradient-to-r from-[#FF9933] via-white to-[#4fe042] backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="relative">
        {/* Subtle gradient bar */}
        <div className="pointer-events-none absolute inset-x-0 -top-1 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" />

        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex h-20 items-center justify-between">
            <Link to="/" className="group flex items-center gap-3">
              <motion.img
                src={logo}
                alt="Amul Dairy logo"
                className="h-16 w-16 rounded-full shadow-sm ring-1 ring-black/5"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
              />
              <div className="leading-tight">
                <motion.h1
                  className="text-xl font-bold tracking-tight"
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                >
                  Amul Dairy
                </motion.h1>
                <motion.p
                  className="text-sm -mt-0.5 text-gray-950"
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25, delay: 0.12 }}
                >
                  मड़ावदा दुग्ध संकलन केंद्र
                </motion.p>
              </div>
            </Link>

            {token && (
              <div className="relative">
                {/* Menu button */}
                <motion.button
                  ref={btnRef}
                  onClick={() => setOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  className="flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:bg-gray-100 active:scale-[0.99]"
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="sr-only">Open menu</span>
                  <span>☰</span>
                  <motion.span
                    animate={{ rotate: open ? 90 : 0 }}
                    className="inline-block"
                    aria-hidden="true"
                  >
                    ▸
                  </motion.span>
                </motion.button>

                {/* Animated Dropdown */}
                <AnimatePresence>
                  {open && (
                    <motion.div
                      ref={menuRef}
                      role="menu"
                      aria-label="Main Navigation"
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-lg ring-1 ring-black/5 p-3 space-y-2"
                    >
                      <NavLink
                        to="/"
                        end
                        className={navLinkClasses}
                        onClick={() => setOpen(false)}
                        role="menuitem"
                      >
                        Dashboard
                      </NavLink>
                      <NavLink
                        to="/customers"
                        className={navLinkClasses}
                        onClick={() => setOpen(false)}
                        role="menuitem"
                      >
                        Customers
                      </NavLink>
                      <NavLink
                        to="/add-entry"
                        className={navLinkClasses}
                        onClick={() => setOpen(false)}
                        role="menuitem"
                      >
                        Add Entry
                      </NavLink>
                      <NavLink
                        to="/todays-entry"
                        className={navLinkClasses}
                        onClick={() => setOpen(false)}
                        role="menuitem"
                      >
                        Today&apos;s Entry
                      </NavLink>
                      <NavLink
                        to="/previous-entries"
                        className={navLinkClasses}
                        onClick={() => setOpen(false)}
                        role="menuitem"
                      >
                        Previous Entries
                      </NavLink>
                      <NavLink
                        to="/weekly-data"
                        className={navLinkClasses}
                        onClick={() => setOpen(false)}
                        role="menuitem"
                      >
                        Weekly Data
                      </NavLink>
                      <NavLink
                        to="/weekly-list"
                        className={navLinkClasses}
                        onClick={() => setOpen(false)}
                        role="menuitem"
                      >
                        Weekly List
                      </NavLink>
                      <NavLink
                        to="/payments"
                        className={navLinkClasses}
                        onClick={() => setOpen(false)}
                        role="menuitem"
                      >
                        Payments
                      </NavLink>

                      <div className="border-t pt-2">
                        <button
                          onClick={() => {
                            setOpen(false);
                            logout();
                          }}
                          role="menuitem"
                          className="block w-full rounded-lg bg-red-100 text-red-600 font-semibold px-4 py-2 text-sm hover:bg-red-100 transition"
                        >
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
