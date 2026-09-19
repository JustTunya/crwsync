"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { getEmailVerificationStatus, resendVerificationEmail, verifyEmail } from "@/services/auth.service";
import { GlassBox } from "@/components/ui/glassbox";
import { Button } from "@/components/ui/button";
import { Lead } from "@/components/ui/lead";
import { variants } from "@/lib/utils";

type Status = "pending" | "success" | "expired" | "error";

export function EmailVerification({ token }: { token: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(token ? "pending" : "error");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

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
          router.push("/auth/signin?verified=true");
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
            router.push("/auth/signin?verified=true");
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
    if (!token || resending) return;

    setResending(true);
    setResendMessage(null);
    try {
      const { success, message } = await resendVerificationEmail(token);
      setResendMessage(message || (success ? "Verification email resent successfully" : "Failed to resend verification email"));
    } catch {
      setResendMessage("Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  return (
    <GlassBox>
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {status === "pending" && (
            <>
              <Lead title="Verifying your email" description="This will only take a moment." />
              <div className="mx-auto size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </>
          )}

          {status === "success" && (
            <>
              <Lead title="Email verified" description="You will be redirected to sign in shortly." />
              <div className="p-3 text-xs sm:text-sm text-center text-success bg-success/10 border border-success/30 rounded-md">
                Your email has been verified successfully.
              </div>
            </>
          )}

          {status === "expired" && (
            <>
              <Lead title="Link expired" description="This email verification link is no longer valid." />
              <div className="flex flex-col items-center space-y-4">
                {resendMessage && (
                  <p className="text-xs sm:text-sm text-center text-muted-foreground">{resendMessage}</p>
                )}
                <Button variant="outline" disabled={resending} onClick={handleResend} className="w-full">
                  {resending ? "Requesting..." : "Request new link"}
                </Button>
              </div>
            </>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <Lead
                title="Verification failed"
                description="This link is invalid or not linked to any account. Check that you copied it correctly."
              />
              <p className="text-xs sm:text-sm text-center text-muted-foreground">
                Still stuck? Contact{" "}
                <a className="text-primary underline underline-offset-2" href="mailto:support@crwsync.xyz">
                  support@crwsync.xyz
                </a>
              </p>
            </div>
          )}

          {status !== "success" && (
            <p className="mt-5 text-center text-xs sm:text-sm text-muted-foreground">
              <Link
                href="/auth/signin"
                className="text-primary underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/50 focus-visible:outline-none"
              >
                Back to Sign In
              </Link>
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </GlassBox>
  );
}
