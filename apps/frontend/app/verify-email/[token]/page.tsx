import { EmailVerification } from "@/components/email-verification";

export default function VerifyEmailPage({ params }: { params: { token: string } }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <EmailVerification token={params.token} />
    </div>
  );
}