import { EmailVerification } from "@/components/email-verification";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <EmailVerification token={token} />
    </div>
  );
}