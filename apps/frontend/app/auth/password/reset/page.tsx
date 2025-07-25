import { ResetPasswordForm } from "@/components/reset-password-form";
import SpotlightCard from "@/components/ui/spotlight";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.8)" spotlightRadius="160px">
        <ResetPasswordForm />
      </SpotlightCard>
    </div>
  );
}