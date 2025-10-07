"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmailVerification } from "@/components/email-verification";
import { GlassBox } from "@/components/ui/glassbox";
import { getEmailToken } from "@/services/auth.service";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [validToken, setValidToken] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (token) {
      getEmailToken(token).then((resp) => {
        if (!resp) {
          setValidToken(false);
          return;
        }
        const isVerified = resp?.is_verified ?? false;
        const isExpired = new Date(resp?.expires_at ?? '').getTime() < Date.now();
        setValidToken(!isVerified && !isExpired);
      });
    }
  }, [token]);

  const handleResend = () => {
    router.push('/auth/forgot-password');
  };

  if (!token || validToken !== true) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
        <GlassBox>
          <h1 className="text-2xl text-error font-bold mb-2">Invalid Token</h1>
          <p className="text-sm text-error/75 font-medium">The email verification token is invalid or has expired.</p>
          <p className="text-sm text-error/75 font-medium">Please request a new verification email.</p>
          <Button className="mt-4" variant="outline" onClick={handleResend}>Request New Email</Button>
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