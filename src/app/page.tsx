import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <h1 className="text-4xl font-bold mb-4">Welcome to SocraticAI</h1>
      <p className="mb-6">An AI-powered Socratic tutor. Sign in to get started.</p>
      <div className="flex gap-4">
        <Link href="/sign-in" className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-700">Sign in</Link>
        <Link href="/dashboard" className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">Dashboard</Link>
      </div>
    </main>
  );
}
