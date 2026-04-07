"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PUBLIC_USER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (fullName: string, userEmail: string, userPassword: string, userRole: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userPassword);
    const user = userCredential.user;

    const idToken = await user.getIdToken();

    const response = await fetch("http://localhost:8080/accounts/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        name: fullName,
        email: userEmail,
        type: userRole,
        firebaseUid: user.uid,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${response.status} ${errorText}`);
    }

    await response.json();
    router.push("/login");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await handleSignup(name, email, password, role);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "auth/email-already-in-use") {
        setError("This email is already registered. Please log in.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to sign up. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-blue-950 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-gray-700 bg-gray-800 p-8 shadow-xl"
      >
        <h1 className="mb-4 text-center text-5xl font-extrabold text-blue-400 drop-shadow-lg">SCEMAS</h1>
        <h2 className="mb-6 text-center text-2xl font-bold text-white">Create Account</h2>

        {error ? <p className="mb-4 text-center text-sm text-red-400">{error}</p> : null}

        <div className="mb-4">
          <label className="mb-1 block font-medium text-gray-300">Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            required
            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block font-medium text-gray-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            required
            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block font-medium text-gray-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block font-medium text-gray-300">Role</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="PUBLIC_USER">Public User</option>
            <option value="SYSTEM_ADMINISTRATOR">System Administrator</option>
            <option value="CITY_OPERATOR">City Operator</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
