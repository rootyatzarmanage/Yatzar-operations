import { Route, BrowserRouter as Router, Routes } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import AppPermission from "./pages/AppPermission";
import Contacts from "./pages/Contacts";
import Customers from "./pages/Customers";
import Leads from "./pages/Leads";
import NotFound from "./pages/OtherPage/NotFound";
import Others from "./pages/Others";
import Teams from "./pages/Teams";
import Workspace from "./pages/Workspace";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Task from "./pages/Task";
import Meetings from "./pages/Meetings";
import Calls from "./pages/Calls";
import Calendar from "./pages/Calendar";
import EmailMarketing from "./pages/EmailMarketing";
import Campaign from "./pages/Campaigns";
import EventWebinar from "./pages/EventWebinar";
import { hasPermission, useAuth } from "./context/AuthContext";
import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";

function ProtectedApp() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <AppLayout />;
}

function PermissionRoute({ menu, children }: { menu: string; children: ReactNode }) {
  const { user } = useAuth();
  return hasPermission(user, menu) ? children : <Navigate to="/" replace />;
}

function DefaultAppRoute() {
  const { user } = useAuth();
  const firstAllowedPath = [
    ["Teams", "/teams"],
    ["Workspace", "/workspace"],
    ["Contacts", "/contacts"],
    ["Tasks", "/task"],
    ["Meetings", "/meetings"],
    ["Calls", "/calls"],
    ["Campaigns", "/campaigns"],
    ["Email Marketing", "/email-marketing"],
    ["Event Webinar", "/event-webinar"],
    ["App Permission", "/app-permission"],
  ].find(([menu]) => hasPermission(user, menu));

  return <Navigate to={firstAllowedPath?.[1] ?? "/profile"} replace />;
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
            <Route index path="/" element={<DefaultAppRoute />} />
            <Route path="/teams" element={<PermissionRoute menu="Teams"><Teams /></PermissionRoute>} />
            <Route path="/others" element={<PermissionRoute menu="Teams"><Others /></PermissionRoute>} />

            {/* App Permission */}
            <Route path="/app-permission" element={<PermissionRoute menu="App Permission"><AppPermission /></PermissionRoute>} />

            {/* Workspace */}
            <Route path="/workspace" element={<PermissionRoute menu="Workspace"><Workspace /></PermissionRoute>} />

            {/* Contacts */}
            <Route path="/contacts" element={<PermissionRoute menu="Contacts"><Contacts /></PermissionRoute>} />
            <Route path="/profile" element={<Profile />} />

            {/* Workspace menu: Engagement */}
            <Route path="/leads" element={<PermissionRoute menu="Contacts"><Leads /></PermissionRoute>} />
            <Route path="/customers" element={<PermissionRoute menu="Contacts"><Customers /></PermissionRoute>} />
            <Route path="/task" element={<PermissionRoute menu="Tasks"><Task /></PermissionRoute>} />
            <Route path="/meetings" element={<PermissionRoute menu="Meetings"><Meetings /></PermissionRoute>} />
            <Route path="/calls" element={<PermissionRoute menu="Calls"><Calls /></PermissionRoute>} />
            <Route path="/calendar" element={<PermissionRoute menu="Meetings"><Calendar /></PermissionRoute>} />
            <Route path="/email-marketing" element={<PermissionRoute menu="Email Marketing"><EmailMarketing /></PermissionRoute>} />
            <Route path="/campaigns" element={<PermissionRoute menu="Campaigns"><Campaign /></PermissionRoute>} />
            <Route path="/event-webinar" element={<PermissionRoute menu="Event Webinar"><EventWebinar /></PermissionRoute>} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
