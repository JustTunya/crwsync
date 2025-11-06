"use client";

import { useUser } from "@/providers/user.provider";

export default function DashPage() {
  const user = useUser();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome to your dashboard, {user?.username}!</p>
    </div>
  );
}