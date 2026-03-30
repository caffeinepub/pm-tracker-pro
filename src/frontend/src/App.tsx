import { Toaster } from "@/components/ui/sonner";
import React, { type ReactNode } from "react";
import BottomNav from "./components/BottomNav";
import { AppProvider, useApp } from "./context/AppContext";
import AdminPage from "./pages/AdminPage";
import AnalysisPage from "./pages/AnalysisPage";
import BreakdownPage from "./pages/BreakdownPage";
import BreakdownPanelPage from "./pages/BreakdownPanelPage";
import CapaPage from "./pages/CapaPage";
import ChecklistPage from "./pages/ChecklistPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import PreventivePage from "./pages/PreventivePage";

class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0d1117",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#e6edf3",
            fontFamily: "sans-serif",
            padding: "2rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
            Something went wrong
          </h2>
          <p
            style={{
              color: "#8b949e",
              marginBottom: "2rem",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            {this.state.error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "#1f6feb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRouter() {
  const { currentPage } = useApp();

  switch (currentPage) {
    case "login":
      return <LoginPage />;
    case "dashboard":
      return <DashboardPage />;
    case "checklist":
      return <ChecklistPage />;
    case "admin":
      return <AdminPage />;
    case "preventive":
      return <PreventivePage />;
    case "breakdown-panel":
      return <BreakdownPanelPage />;
    case "analysis":
      return <AnalysisPage />;
    case "breakdown":
      return <BreakdownPage />;
    case "capa":
      return <CapaPage />;
    case "history":
      return <HistoryPage />;
    default:
      return <LoginPage />;
  }
}

function AppWithNav() {
  const { currentPage } = useApp();
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <AppRouter />
      {currentPage !== "login" && <BottomNav />}
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppWithNav />
      </AppProvider>
    </ErrorBoundary>
  );
}
