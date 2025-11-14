"use client";

import { GlassBox } from "@/components/ui/glassbox";
import { useUser } from "@/providers/user.provider";

export default function DashPage() {
  const user = useUser();

  return (
    <GlassBox>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome to your dashboard, {user?.username}!</p>
    </GlassBox>
  );
}