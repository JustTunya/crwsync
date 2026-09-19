import { redirect } from "next/navigation";

export default async function WorkspaceMembersSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const memberId = sp.memberId ? `?memberId=${sp.memberId}` : "";
  redirect(`/${slug}/settings${memberId}#members`);
}
