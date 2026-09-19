import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import DashboardView from "./components/DashboardView";
import ComposeView from "./components/ComposeView";
import PostsView from "./components/PostsView";
import AdminView from "./components/AdminView";
import AIAssistantView from "./components/AIAssistantView";
import AnalyticsView from "./components/AnalyticsView";
import CalendarView from "./components/CalendarView";
import SettingsView from "./components/SettingsView";
import AboutView from "./components/AboutView";
import AuthScreen from "./components/AuthScreen";
import BannedScreen from "./components/BannedScreen";
import SplashScreen from "./components/SplashScreen";
import { api } from "./lib/api";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { ThemeProvider } from "./lib/ThemeContext";

const VIEW_LABELS = {
  dashboard: "Dashboard",
  compose: "Compose",
  draft: "Drafts",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  failed: "Failed",
  assistant: "AI Assistant",
  analytics: "Analytics",
  calendar: "Calendar",
  settings: "Settings",
  about: "About",
  admin: "Admin — users",
};

// Views that don't back onto a filtered post list.
const NON_POST_VIEWS = ["dashboard", "compose", "admin", "assistant", "analytics", "calendar", "settings", "about"];

function Dashboard() {
  const { user, logout, loginWithLinkedIn } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [linkedinStatus, setLinkedinStatus] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshStatus = useCallback(() => {
    api
      .linkedinStatus()
      .then(setLinkedinStatus)
      .catch(() => setLinkedinStatus({ connected: false }));
  }, []);

  const refreshPosts = useCallback((status) => {
    if (NON_POST_VIEWS.includes(status)) return;
    setLoading(true);
    setError(null);
    api
      .listPosts(status)
      .then(setPosts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    refreshPosts(active);
  }, [active, refreshPosts]);

  const counts = usePostCounts();

  function handlePostChange(updated, removedId) {
    setPosts((prev) => {
      if (removedId) return prev.filter((p) => p._id !== removedId);
      if (!updated) return prev;
      if (!NON_POST_VIEWS.includes(active) && updated.status !== active) {
        return prev.filter((p) => p._id !== updated._id);
      }
      return prev.map((p) => (p._id === updated._id ? updated : p));
    });
  }

  function handleConnect() {
    loginWithLinkedIn();
  }

  return (
    <div className="flex h-screen bg-transparent">
      <Sidebar
        active={active}
        onSelect={setActive}
        counts={counts.value}
        isAdmin={user.role === "admin"}
        userEmail={user.email}
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <StatusBar
          status={linkedinStatus}
          onConnect={handleConnect}
          viewLabel={VIEW_LABELS[active]}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div key={active} className="animate-fade-in">
            {active === "dashboard" ? (
              <DashboardView counts={counts.value} onNavigate={setActive} />
            ) : active === "compose" ? (
              <ComposeView
                onGenerated={() => {
                  counts.refresh();
                }}
              />
            ) : active === "admin" ? (
              <AdminView />
            ) : active === "assistant" ? (
              <AIAssistantView />
            ) : active === "analytics" ? (
              <AnalyticsView />
            ) : active === "calendar" ? (
              <CalendarView />
            ) : active === "settings" ? (
              <SettingsView />
            ) : active === "about" ? (
              <AboutView />
            ) : (
              <PostsView
                status={active}
                posts={posts}
                loading={loading}
                error={error}
                onChange={(updated, removedId) => {
                  handlePostChange(updated, removedId);
                  counts.refresh();
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function usePostCounts() {
  const [value, setValue] = useState({});

  const refresh = useCallback(() => {
    Promise.all(
      ["draft", "approved", "scheduled", "failed"].map((status) =>
        api
          .listPosts(status)
          .then((list) => [status, list.length])
          .catch(() => [status, undefined])
      )
    ).then((pairs) => {
      setValue(Object.fromEntries(pairs));
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { value, refresh };
}

function Gate() {
  const { user, loading, banInfo, logout } = useAuth();

  if (loading) {
    return <div className="h-screen bg-transparent" />;
  }

  if (banInfo) {
    return <BannedScreen reason={banInfo.reason} onLogout={logout} />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <Dashboard />;
}

function AppShell() {
  const { loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      <Gate />
      {!splashDone && <SplashScreen ready={!loading} onDone={() => setSplashDone(true)} />}
    </>
  );
}

export default function App() {
  return (
    <>
      <div className="app-bg">
        <span className="app-bg-blob" />
      </div>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}