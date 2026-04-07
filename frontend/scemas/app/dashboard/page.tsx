"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import Home from "../page";

export default function DashboardPage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-[#04070e] p-6 text-zinc-300">
        <p className="text-sm">Checking authentication...</p>
      </main>
    );
  }

  return (
    <main>
      <p className="bg-blue-900 px-4 py-3 text-center text-sm font-semibold text-blue-100">
        You are on the dashboard.
      </p>

      <div className="bg-[#04070e] px-6 py-4">
        <Link
          href="/alerts"
          className="inline-flex rounded-xl border border-emerald-500/50 bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/30"
        >
          View Alerts
        </Link>
      </div>

      <Home />
    </main>
  );
}
