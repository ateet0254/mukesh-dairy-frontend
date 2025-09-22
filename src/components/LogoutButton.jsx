import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token"); // clear token
    navigate("/login"); // redirect to login
  }

  return (
    <button
      onClick={logout}
      className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
    >
      Logout
    </button>
  );
}
