import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ResidentLayout from "./components/resident/ResidentLayout";
import LoginScreen, { RESIDENT_AUTH_KEY } from "./components/resident/LoginScreen";
import { ResidentAppProvider } from "./context/ResidentAppContext";
import ChatPage from "./pages/resident/ChatPage";
import HomePage from "./pages/resident/HomePage";
import NotificationsPage from "./pages/resident/NotificationsPage";
import VisitorsPage from "./pages/resident/VisitorsPage";

function ResidentApp({ user, onLogout }) {
  return (
    <BrowserRouter>
      <ResidentAppProvider unit={user.unit} residentName={user.name} residentUserId={user.id} onLogout={onLogout}>
        <Routes>
          <Route element={<ResidentLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/visitors" element={<VisitorsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:threadId" element={<ChatPage />} />
          </Route>
        </Routes>
      </ResidentAppProvider>
    </BrowserRouter>
  );
}

function App() {
  const [authedUser, setAuthedUser] = useState(() => {
    try {
      const raw = localStorage.getItem(RESIDENT_AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  function handleLogout() {
    localStorage.removeItem(RESIDENT_AUTH_KEY);
    setAuthedUser(null);
  }

  if (!authedUser) {
    return <LoginScreen onLogin={setAuthedUser} />;
  }

  return <ResidentApp user={authedUser} onLogout={handleLogout} />;
}

export default App;

