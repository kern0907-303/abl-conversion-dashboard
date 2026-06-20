import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import { supabase } from "./lib/supabaseClient";

const isDemoDashboard =
  import.meta.env.VITE_DEMO_DASHBOARD === "true" || import.meta.env.VITE_SUPABASE_ANON_KEY === "local-preview-anon-key";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(!isDemoDashboard);

  useEffect(() => {
    if (isDemoDashboard) {
      return;
    }

    let isActive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isActive) {
        setSession(data.session);
        setIsCheckingSession(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsCheckingSession(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isCheckingSession) {
    return (
      <main className="app-shell">
        <p className="status-message">正在確認登入狀態。</p>
      </main>
    );
  }

  if (isDemoDashboard) {
    return <Dashboard demoMode />;
  }

  return session ? <Dashboard session={session} /> : <Login />;
}
