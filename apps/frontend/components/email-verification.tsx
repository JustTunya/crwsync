"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getEmailToken, sendVerificationEmail, verifyEmail } from "@/services/auth.service";
import { GlassBox } from "@/components/ui/glassbox";
import { Button } from "@/components/ui/button";

export function EmailVerification({ token }: { token: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "success" | "expired" | "error">("pending");
  const [user, setUser] = useState<{user_id: string, email: string} | undefined>(undefined);

  useEffect(() => {
    setStatus("pending");
    if (!token) {
      setStatus("error");
      return;
    }

    getEmailToken(token).then((resp) => {
      if (!resp) {
        setStatus("error");
        return;
      }

      const isVerified = resp?.is_verified ?? false;
      const isExpired = new Date(resp?.expires_at ?? '').getTime() < Date.now();

      if (isVerified) {
        router.push('/auth/signin');
      } else if (isExpired) {
        setStatus("expired");
        setUser({ user_id: resp.user_id, email: resp.email });
      } else {
        setStatus("success");
        verifyEmail(token).then(() => {
          setTimeout(() => {
            router.push('/auth/signin');
          }, 3000);
        });
      }
    });
  }, [token]);

  const handleResend = () => {
    if (!user) {
      return;
    }

    sendVerificationEmail(user.email, user.user_id);
  };

  return (
    <GlassBox>
      <h1 className="text-xl sm:text-2xl font-medium mb-4">Email Verification</h1>
      {status === "pending" && <p className="text-sm text-foreground/50">Verifying your email...</p>}
      {status === "success" && (
        <>
          <p className="text-sm text-center text-success">
            Your email has been verified successfully!<br/>
            Shortly you will be redirected to the login page...
          </p>
        </>
      )}
      {status === "expired" && (
        <>
          <p className="text-sm text-center text-error">
            This email verification link is invalid or it has expired. 
            Please request a new one by pressing the button below.
          </p>

          <Button className="mt-4" variant="outline" onClick={handleResend}>Request New Email</Button>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-sm text-center text-error mb-4">
            The verification token is invalid and it is not linked to any account.
            Please check the link again or try creating a new account. 
          </p>
          <p className="text-sm text-center text-primary/75 mt-2">
            If you believe this is an error, please contact support at <a className="underline underline-offset-2 text-info" href="mailto:support@crwsync.com">support@crwsync.com</a>
          </p>
        </>
      )}
    </GlassBox>
  );
}