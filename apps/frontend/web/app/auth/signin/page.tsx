import { SigninForm } from "@/components/signin-form";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? null;

  return (<SigninForm next={next} />);
}