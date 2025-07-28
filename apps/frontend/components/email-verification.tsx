"use client";

import { useState, useEffect } from "react";
import { verifyEmail } from "@/services/auth.service";

export function EmailVerification({ token }: { token: string }) {
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");

  useEffect(() => {
    const verifyEmailToken = async () => {
      try {
        const resp = await verifyEmail(token);
        setStatus(resp.success ? "success" : "error");
      } catch {
        setStatus("error");
      }
    };

    verifyEmailToken();
  }, [token]);

  return (
    <div className="text-center space-y-4">
      <h1 className="text-xl font-medium">Email Verification</h1>
      {status === "pending" && <p className="text-sm text-primary">Verifying your email...</p>}
      {status === "success" && (
        <p className="text-sm text-success">Your email has been successfully verified!</p>
      )}
      {status === "error" && (
        <p className="text-sm text-error">This Verification link is invalid or has expired. Please request a new one.</p>
      )}
    </div>
  );
}