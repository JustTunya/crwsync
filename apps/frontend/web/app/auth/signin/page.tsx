import { SigninForm } from "@/components/signin-form";
import { Ripple } from "@/components/ui/ripple";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? null;

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Ripple />
      <SigninForm next={next} />
    </div>
  );
}