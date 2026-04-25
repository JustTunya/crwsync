import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Ripple } from "@/components/ui/ripple";

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Ripple />
      <ForgotPasswordForm />
    </div>
  );
}