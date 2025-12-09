"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getEmailVerificationStatus, resendVerificationEmail, verifyEmail } from "@/services/auth.service";
import { GlassBox } from "@/components/ui/glassbox";
import { Button } from "@/components/ui/button";

type Status = "pending" | "success" | "expired" | "error";

export function EmailVerification({ token }: { token: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(token ? "pending" : "error");

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    const run = async () => {
      try {
        const resp = await getEmailVerificationStatus(token);
        if (isCancelled) return;

        if (!resp) {
          setStatus("error");
          return;
        }

        if (resp.status === "verified") {
          router.push("/auth/signin");
          return;
        }

        if (resp.status === "expired") {
          setStatus("expired");
          return;
        }

        if (resp.status !== "pending") {
          setStatus("error");
          return;
        }

        const { success } = await verifyEmail(token);
        if (isCancelled) return;

        if (success) {
          setStatus("success");
          const timeoutId = setTimeout(() => {
            router.push("/auth/signin");
          }, 3000);

          return () => clearTimeout(timeoutId);
        } else {
          setStatus("error");
        }
      } catch {
        if (!isCancelled) {
          setStatus("error");
        }
      }
    };

    run();

    return () => {
      isCancelled = true;
    };
  }, [token, router]);

  const handleResend = async () => {
    if (!token) return;

    const { success, message } = await resendVerificationEmail(token);
    
    if (success) {
      alert(message || "Verification email resent successfully");
    } else {
      alert(message || "Failed to resend verification email");
    }
  };

  return (
    <GlassBox>
      <h1 className="text-xl sm:text-2xl font-medium mb-4">Email Verification</h1>
      {status === "pending" && (
        <p className="text-sm text-foreground/50">Verifying your email...</p>
      )}
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
            It seems like this email verification link has expired. 
            Please request a new one by pressing the button below.
          </p>

          <Button className="mt-4" variant="outline" onClick={handleResend}>Request New Email</Button>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-sm text-center text-error mb-4">
            The verification token is invalid or it is not linked to any account.
            Please check if you entered the link correctly.
          </p>
          <p className="text-sm text-center text-primary/75">
            If you believe this is an error, please contact support at <a className="underline underline-offset-2 text-info" href="mailto:support@crwsync.com">support@crwsync.com</a>
          </p>
        </>
      )}
    </GlassBox>
  );
}