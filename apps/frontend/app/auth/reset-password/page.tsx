import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}
) {
  const params = await searchParams;
  const token = params.token ?? null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <ResetPasswordForm token={token} />
    </div>
  );
}