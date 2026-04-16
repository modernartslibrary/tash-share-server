import { redirect } from "next/navigation";

const RESERVED_TYPES = new Set([
  "u",
  "profile",
  "post",
  "list",
  "movie",
  "tv",
  "album",
  "track",
  "book",
  "artist",
  "work",
  "open-app",
]);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LegacyProfilePage({
  params,
}: {
  params: Promise<{ identifier: string }>;
}) {
  const { identifier } = await params;
  const decodedIdentifier = decodeURIComponent(identifier);

  if (RESERVED_TYPES.has(decodedIdentifier.toLowerCase())) {
    redirect("/");
  }

  redirect(`/profile/${encodeURIComponent(decodedIdentifier)}`);
}
