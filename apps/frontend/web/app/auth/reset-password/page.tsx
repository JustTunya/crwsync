import { ResetPasswordForm } from "@/components/reset-password-form";
import { Ripple } from "@/components/ui/ripple";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}
) {
  const params = await searchParams;
  const token = params.token ?? null;

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Ripple />
      <ResetPasswordForm token={token} />
    </div>
  );
}