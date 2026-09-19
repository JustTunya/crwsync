import { redirect } from "next/navigation";

export default async function WorkspaceDangerZoneSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const { slug } = await params;
  redirect(`/${slug}/settings#danger-zone`);
}
