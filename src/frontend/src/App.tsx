import { Toaster } from "@/components/ui/sonner";
import React, { type ReactNode } from "react";
import BottomNav from "./components/BottomNav";
import DesktopNav from "./components/DesktopNav";
import { AppProvider, useApp } from "./context/AppContext";
import AdminPage from "./pages/AdminPage";
import AnalysisPage from "./pages/AnalysisPage";
import BreakdownPage from "./pages/BreakdownPage";
import BreakdownPanelPage from "./pages/BreakdownPanelPage";
import CapaPage from "./pages/CapaPage";
import ChecklistPage from "./pages/ChecklistPage";
import DashboardPage from "./pages/DashboardPage";
import ElectricityPage from "./pages/ElectricityPage";
import HistoryPage from "./pages/HistoryPage";
import KaizenPage from "./pages/KaizenPage";
import LoginPage from "./pages/LoginPage";
import OperatorLogbookPage from "./pages/OperatorLogbookPage";
import PredictivePage from "./pages/PredictivePage";
import PreventivePage from "./pages/PreventivePage";
import SparesPage from "./pages/SparesPage";
import TaskListPage from "./pages/TaskListPage";

// Global catastrophic error boundary
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
            background: "oklch(0.165 0.022 252)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "oklch(0.88 0.010 260)",
            fontFamily: "sans-serif",
            padding: "2rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
            Application Error
          </h2>
          <p
            style={{
              color: "oklch(0.65 0.010 260)",
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
              background: "oklch(0.55 0.15 252)",
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

// Per-page error boundary fallback (shown inside the page area, not full screen)
function PageErrorFallback({
  error,
  onBackToDashboard,
  onReload,
}: {
  error: string;
  onBackToDashboard: () => void;
  onReload: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        background: "oklch(0.165 0.022 252)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "oklch(0.88 0.010 260)",
        fontFamily: "sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "oklch(0.19 0.020 255)",
          border: "1px solid oklch(0.28 0.022 252)",
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "oklch(0.35 0.12 25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            fontSize: "1.25rem",
          }}
        >
          ⚠
        </div>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
            color: "oklch(0.88 0.010 260)",
          }}
        >
          Page Error
        </h2>
        <p
          style={{
            color: "oklch(0.62 0.010 260)",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
        >
          {error || "An unexpected error occurred on this page."}
        </p>
        <div
          style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}
        >
          <button
            type="button"
            onClick={onBackToDashboard}
            style={{
              background: "oklch(0.55 0.15 252)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.6rem 1.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Back to Dashboard
          </button>
          <button
            type="button"
            onClick={onReload}
            style={{
              background: "oklch(0.28 0.022 252)",
              color: "oklch(0.78 0.010 260)",
              border: "1px solid oklch(0.35 0.022 252)",
              borderRadius: "8px",
              padding: "0.6rem 1.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}

// Class-based per-page error boundary
class PageErrorBoundary extends React.Component<
  {
    children: ReactNode;
    onGoToDashboard: () => void;
    pageKey: string;
  },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidUpdate(prevProps: { pageKey: string }) {
    // Reset error state when page changes
    if (prevProps.pageKey !== this.props.pageKey && this.state.hasError) {
      this.setState({ hasError: false, error: "" });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <PageErrorFallback
          error={this.state.error}
          onBackToDashboard={this.props.onGoToDashboard}
          onReload={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}

// Wrapper that provides navigate function from context to PageErrorBoundary
function PageWrapper({ children }: { children: ReactNode }) {
  const { navigate, currentPage } = useApp();
  return (
    <PageErrorBoundary
      key={currentPage}
      pageKey={currentPage}
      onGoToDashboard={() => navigate("dashboard")}
    >
      {children}
    </PageErrorBoundary>
  );
}

function AppRouter() {
  const { currentPage } = useApp();
  switch (currentPage) {
    case "login":
      return <LoginPage />;
    case "dashboard":
      return (
        <PageWrapper>
          <DashboardPage />
        </PageWrapper>
      );
    case "checklist":
      return (
        <PageWrapper>
          <ChecklistPage />
        </PageWrapper>
      );
    case "admin":
      return (
        <PageWrapper>
          <AdminPage />
        </PageWrapper>
      );
    case "preventive":
      return (
        <PageWrapper>
          <PreventivePage />
        </PageWrapper>
      );
    case "breakdown-panel":
      return (
        <PageWrapper>
          <BreakdownPanelPage />
        </PageWrapper>
      );
    case "analysis":
      return (
        <PageWrapper>
          <AnalysisPage />
        </PageWrapper>
      );
    case "breakdown":
      return (
        <PageWrapper>
          <BreakdownPage />
        </PageWrapper>
      );
    case "capa":
      return (
        <PageWrapper>
          <CapaPage />
        </PageWrapper>
      );
    case "history":
      return (
        <PageWrapper>
          <HistoryPage />
        </PageWrapper>
      );
    case "task-list":
      return (
        <PageWrapper>
          <TaskListPage />
        </PageWrapper>
      );
    case "kaizen":
      return (
        <PageWrapper>
          <KaizenPage />
        </PageWrapper>
      );
    case "predictive":
      return (
        <PageWrapper>
          <PredictivePage />
        </PageWrapper>
      );
    case "electricity":
      return (
        <PageWrapper>
          <ElectricityPage />
        </PageWrapper>
      );
    case "logbook":
      return (
        <PageWrapper>
          <OperatorLogbookPage />
        </PageWrapper>
      );
    case "spares":
      return (
        <PageWrapper>
          <SparesPage />
        </PageWrapper>
      );
    default:
      return <LoginPage />;
  }
}

function AppWithNav() {
  const { currentPage } = useApp();
  const showNav = currentPage !== "login";
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      {showNav && <DesktopNav />}
      {/* Top padding on desktop to clear the fixed nav bar (52px) */}
      <div className={showNav ? "md:pt-[52px]" : ""}>
        <AppRouter />
      </div>
      {showNav && <BottomNav />}
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
