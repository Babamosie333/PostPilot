import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import ComposeView from "./components/ComposeView";
import PostsView from "./components/PostsView";
import AdminView from "./components/AdminView";
import AnalyticsView from "./components/AnalyticsView";
import SettingsView from "./components/SettingsView";
import AuthScreen from "./components/AuthScreen";
import BannedScreen from "./components/BannedScreen";
import { api } from "./lib/api";
import { AuthProvider, useAuth } from "./lib/AuthContext";

const VIEW_LABELS = {
  compose: "Compose",
  draft: "Drafts",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  failed: "Failed",
  analytics: "Analytics",
  settings: "Settings",
  admin: "Admin — users",
};

// Views that don't back onto a filtered post list.
const NON_POST_VIEWS = ["compose", "admin", "analytics", "settings"];

function Dashboard() {
  const { user, logout, loginWithLinkedIn } = useAuth();
  const [active, setActive] = useState("compose");
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
    <div className="flex h-screen bg-ink">
      <Sidebar
        active={active}
        onSelect={setActive}
        counts={counts.value}
        isAdmin={user.role === "admin"}
        userEmail={user.email}
        onLogout={logout}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <StatusBar
          status={linkedinStatus}
          onConnect={handleConnect}
          viewLabel={VIEW_LABELS[active]}
        />
        <main className="flex-1 overflow-y-auto">
          {active === "compose" ? (
            <ComposeView
              onGenerated={() => {
                counts.refresh();
              }}
            />
          ) : active === "admin" ? (
            <AdminView />
          ) : active === "analytics" ? (
            <AnalyticsView />
          ) : active === "settings" ? (
            <SettingsView />
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
    return (
      <div className="flex h-screen items-center justify-center bg-ink">
        <span className="font-mono text-[12px] text-paper-dim">loading…</span>
      </div>
    );
  }

  if (banInfo) {
    return <BannedScreen reason={banInfo.reason} onLogout={logout} />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
