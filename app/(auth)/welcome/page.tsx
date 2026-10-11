import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { WelcomeGuide } from "@/components/welcome-guide";
export default async function WelcomePage() { await requirePageMerchantSession(); return <WelcomeGuide />; }
