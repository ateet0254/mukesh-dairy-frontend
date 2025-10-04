import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import AddEntry from "./pages/AddEntry";
import Payments from "./pages/Payments";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import TodaysEntry from "./pages/TodaysEntry";
import PreviousEntries from "./pages/PreviousEntries";
import WeeklyData from "./pages/WeeklyData";
import WeeklyList from "./pages/WeeklyList"; 


// Protect private routes
function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AppContent() {
  const { token } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen pb-16 bg-gray-50">
      {/* ✅ Show Navbar only if logged in */}
      {token && <Navbar />}

      <main className="container max-w-4xl mx-auto px-4 py-4">
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Private */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <PrivateRoute>
                <Customers />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-entry"
            element={
              <PrivateRoute>
                <AddEntry />
              </PrivateRoute>
            }
          />
          <Route
            path="/todays-entry"
            element={
              <PrivateRoute>
                <TodaysEntry />
              </PrivateRoute>
            }
          />
          <Route
            path="/previous-entries"
            element={
              <PrivateRoute>
                <PreviousEntries />
              </PrivateRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <PrivateRoute>
                <Payments />
              </PrivateRoute>
            }
          />
          <Route 
            path="/weekly-data" 
              element={
                <PrivateRoute>
                  <WeeklyData />
                </PrivateRoute>
            } 
          />
          <Route 
            path="/weekly-list" 
              element={
                <PrivateRoute>
                  <WeeklyList />
                </PrivateRoute>
              } 
          />
        </Routes>
      </main>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
