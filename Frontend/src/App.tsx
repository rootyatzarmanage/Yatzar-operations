import { Route, BrowserRouter as Router, Routes } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import Analytics from "./pages/Analytics";
import AppPermission from "./pages/AppPermission";
import Contacts from "./pages/Contacts";
import NotFound from "./pages/OtherPage/NotFound";
import Teams from "./pages/Teams";
import Workspace from "./pages/Workspace";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Analytics />} />
            <Route path="/teams" element={<Teams />} />

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