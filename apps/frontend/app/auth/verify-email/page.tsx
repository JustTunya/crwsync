"use client";

import { useSearchParams } from "next/navigation";
import { EmailVerification } from "@/components/email-verification";
import { GlassBox } from "@/components/ui/glassbox";
import { useAvailability } from "@/hooks/use-availability";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const validToken = useAvailability

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
        <GlassBox>
          <h1 className="text-2xl text-error font-bold mb-2">Invalid Token</h1>
          <p className="text-sm text-error/75 font-medium">Please provide a valid email verification token.</p>
        </GlassBox>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <EmailVerification token={token} />
    </div>
  );
}