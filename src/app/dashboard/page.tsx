import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db/client";

export default async function DashboardPage() {
  const { userId } = await auth();

  // Redundant guard — middleware already handles this,
  // but keeps this page self-sufficient if middleware is misconfigured.
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  // Load sessions for this user
  const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
  const sessions = dbUser
    ? await db.session.findMany({
        where: { userId: dbUser.id },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
          </h1>
          <p className="mt-2 text-gray-500">
            Your Socratic learning sessions will appear here.
          </p>
        </div>
        <div>
          <Link
            href="/session/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            New Session
          </Link>
        </div>
      </div>

      <section className="mt-6">
        {sessions.length === 0 ? (
          <div className="p-8 border border-dashed border-gray-200 rounded text-center bg-white">
            <p className="text-gray-600 mb-4">No sessions yet.</p>
            <Link href="/session/new" className="text-indigo-600 underline">
              Create your first session
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sessions.map((s) => (
              <article key={s.id} className="p-4 bg-white border rounded shadow-sm hover:shadow">
                <Link href={`/session/${s.id}`} className="text-lg font-semibold text-slate-800">
                  {s.title}
                </Link>
                <p className="mt-1 text-sm text-gray-500">{s.topic}</p>
                <div className="mt-3 text-xs text-gray-400">{new Date(s.updatedAt).toLocaleString()}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
