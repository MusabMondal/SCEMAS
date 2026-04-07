import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <main className="flex min-h-screen items-center justify-center bg-[#04070e] p-6 text-zinc-100">
        <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#0a101c] p-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-300">Dashboard</h1>
          <p className="mt-3 text-zinc-300">
            You are logged in. Continue to the live monitoring experience.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
          >
            Go to Homepage
          </Link>
        </section>
      </main>
    </AuthGuard>
  );
}
