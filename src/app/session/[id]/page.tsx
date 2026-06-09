import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SessionChat } from "@/components/chat/SessionChat";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  return (
    <main className="space-y-8 py-10">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-600">Socratic chat</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Session chat</h1>
            <p className="mt-2 text-slate-600">
              Ask questions, review guided replies, and continue the conversation as if you were chatting with an AI study partner.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4">
        <SessionChat sessionId={id} />
      </div>
    </main>
  );
}
