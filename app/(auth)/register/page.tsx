import { AuthForm } from "@/components/auth-form";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
 const { invite } = await searchParams;
 return <AuthForm register inviteCode={typeof invite === "string" ? invite.slice(0,24) : ""} />;
}
