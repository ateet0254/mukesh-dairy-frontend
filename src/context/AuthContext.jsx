import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // ✅ FIXED import

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem("token");
    if (!stored) return null;

    try {
      const decoded = jwtDecode(stored);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        return null;
      }
      return stored;
    } catch {
      localStorage.removeItem("token");
      return null;
    }
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);

      try {
        const decoded = jwtDecode(token);
        const timeLeft = decoded.exp * 1000 - Date.now();

        if (timeLeft > 0) {
          const timeout = setTimeout(() => {
            setToken(null); // auto logout
          }, timeLeft);
          return () => clearTimeout(timeout);
        } else {
          setToken(null); // already expired
        }
      } catch {
        setToken(null);
      }
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
