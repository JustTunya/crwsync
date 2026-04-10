import { SignupForm } from "@/components/signup-form";
import { Ripple } from "@/components/ui/ripple";

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Ripple />
      <SignupForm />
    </div>
  );
}