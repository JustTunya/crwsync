import { SignupForm } from "@/components/signup-form";
import SpotlightCard from "@/components/ui/spotlight";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-bold">Create Your Account</h1>
        <p className="text-sm text-muted-foreground">
          Please fill in the details below to create your account.
        </p>
      </div>
      <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.8)" spotlightRadius="160px">
        <SignupForm />
      </SpotlightCard>
    </div>
  );
}