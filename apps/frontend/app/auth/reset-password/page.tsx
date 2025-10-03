import { ResetPasswordForm } from "@/components/reset-password-form";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}