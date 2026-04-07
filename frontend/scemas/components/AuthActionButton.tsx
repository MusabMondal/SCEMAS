"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type AuthActionButtonProps = {
  loginClassName: string;
  logoutClassName: string;
};

export default function AuthActionButton({ loginClassName, logoutClassName }: AuthActionButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
      setIsReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (!isReady || !isAuthenticated) {
    return (
      <Link href="/login" className={loginClassName}>
        Login
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleLogout} className={logoutClassName}>
      Logout
    </button>
  );
}
