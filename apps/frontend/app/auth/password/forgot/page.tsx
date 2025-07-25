import { ForgotPasswordForm } from "@/components/forgot-password-form";
import SpotlightCard from "@/components/ui/spotlight";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.8)" spotlightRadius="160px">
        <ForgotPasswordForm />
      </SpotlightCard>
    </div>
  );
}