import { SignupForm } from "@/components/signup-form";
import SpotlightCard from "@/components/ui/spotlight";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.8)" spotlightRadius="160px">
        <SignupForm />
      </SpotlightCard>
    </div>
  );
}