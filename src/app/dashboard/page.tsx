import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  // Redundant guard — middleware already handles this,
  // but keeps this page self-sufficient if middleware is misconfigured.
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
      </h1>
      <p className="mt-2 text-gray-500">
        Your Socratic learning sessions will appear here.
      </p>
    </main>
  );
}
