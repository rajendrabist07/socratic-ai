
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">SocraticAI</h1>
      <p className="mt-4">Welcome to your AI Socratic tutor!</p>
    </div>
  );
}
