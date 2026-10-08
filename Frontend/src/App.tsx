import { Route, BrowserRouter as Router, Routes } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import Analytics from "./pages/Analytics";
import AppPermission from "./pages/AppPermission";
import Contacts from "./pages/Contacts";
import NotFound from "./pages/OtherPage/NotFound";
import Others from "./pages/Others";
import Teams from "./pages/Teams";
import Workspace from "./pages/Workspace";
import Login from "./pages/Login";
import { useAuth } from "./context/AuthContext";
import { Navigate, useLocation } from "react-router";

function ProtectedApp() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <AppLayout />;
}

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedApp />}>
            <Route index path="/" element={<Analytics />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/others" element={<Others />} />

            {/* App Permission */}
            <Route path="/app-permission" element={<AppPermission />} />

            {/* Workspace */}
            <Route path="/workspace" element={<Workspace />} />

            {/* Contacts */}
            <Route path="/contacts" element={<Contacts />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
