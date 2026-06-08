"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <SignIn />
    </div>
  );
}
