"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PUBLIC_USER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // prevent page reload

    try {
      await handleSignup(name, email, password, role);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignup = async (name: string, email: string, password: string, role: string) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get Firebase ID token
    const idToken = await user.getIdToken();

    // Send request to backend
    const res = await fetch("http://localhost:8080/accounts/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`, 
      },
      body: JSON.stringify({
        name,
        email,
        type: role,          // e.g., "PUBLIC_USER"
        firebaseUid: user.uid
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Backend error: ${res.status} ${errorText}`);
    }

    const createdAccount = await res.json();
    console.log("Account created successfully:", createdAccount);
    // redirect or update UI as needed
  } catch (err: any) {
    if (err.code === "auth/email-already-in-use") {
      alert("This email is already registered. Please log in.");
    } else {
      alert(err.message);
    }
    console.error(err);
  }
};

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="PUBLIC_USER">Public User</option>
            <option value="SYSTEM_ADMINISTRATOR">System Administrator</option>
            <option value="CITY_OPERATOR">City Operator</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
