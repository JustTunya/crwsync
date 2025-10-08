"use client";

import { useSearchParams } from "next/navigation";
import { EmailVerification } from "@/components/email-verification";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <EmailVerification token={token} />
    </div>
  );
}