import { SigninForm } from "@/components/signin-form";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <SigninForm next={next} />
    </div>
  );
}