import ResetPasswordClient from "./ResetPasswordClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordClient token={params.token} />;
};
