import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  return (
    <main className="p-8">
      <div className="bg-white p-6 rounded shadow-sm">
        <h1 className="text-xl font-semibold">Session: {id}</h1>
        <p className="mt-2 text-gray-500">Chat interface coming soon.</p>
      </div>
    </main>
  );
}
