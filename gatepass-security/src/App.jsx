import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SecurityLayout from "./components/security/SecurityLayout";
import GateSetupScreen from "./components/security/GateSetupScreen";
import LoginScreen, { SECURITY_AUTH_KEY } from "./components/security/LoginScreen";
import { SecurityAppProvider } from "./context/SecurityAppContext";
import { useSecurityApp } from "./context/SecurityAppContext";
import ChatPage from "./pages/security/ChatPage";
import CreateDeliveryPage from "./pages/security/CreateDeliveryPage";
import HomePage from "./pages/security/HomePage";
import LiveStatusPage from "./pages/security/LiveStatusPage";
import NotificationsPage from "./pages/security/NotificationsPage";

function AppRoutes() {
  const { hasGateSetup } = useSecurityApp();

  if (!hasGateSetup) {
    return <GateSetupScreen />;
  }

  return (
    <Routes>
      <Route element={<SecurityLayout />}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/create" element={<CreateDeliveryPage />} />
        <Route path="/live" element={<LiveStatusPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:threadId" element={<ChatPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  const [authedUser, setAuthedUser] = useState(() => {
    try {
      const raw = localStorage.getItem(SECURITY_AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  function handleLogout() {
    localStorage.removeItem(SECURITY_AUTH_KEY);
    setAuthedUser(null);
  }

  if (!authedUser) {
    return <LoginScreen onLogin={setAuthedUser} />;
  }

  return (
    <BrowserRouter>
      <SecurityAppProvider persona={authedUser} onLogout={handleLogout}>
        <AppRoutes />
      </SecurityAppProvider>
    </BrowserRouter>
  );
}

export default App;
