import { SigninForm } from "@/components/signin-form";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; verified?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? null;
  const banner = params.reset === "success"
    ? "Password has been reset successfully. Please sign in with your new password."
    : params.verified === "true"
      ? "Your email has been verified! You can now sign in."
      : null;

  return <SigninForm next={next} banner={banner} />;
}
