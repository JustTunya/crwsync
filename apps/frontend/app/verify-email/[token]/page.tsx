import { EmailVerification } from "@/components/email-verification";

interface VerifyEmailPageProps {
  params: Promise<{ token: string }>;
}

export default async function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const { token } = await params;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <EmailVerification token={token} />
    </div>
  );
}