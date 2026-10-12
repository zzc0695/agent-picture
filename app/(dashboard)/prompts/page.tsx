import { curtainTemplates } from "@/lib/prompt-templates";
import { PromptLibrary } from "@/components/prompt-library";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export default async function PromptsPage() {
  const session = await requirePageMerchantSession();
  const templates = await db.promptTemplate.findMany({
    where: { OR: [{ isSystem: true }, { merchantId: session.merchantId }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
  });

  return <div className="studio-page studio-library-page"><header className="library-header"><h1>提示词库</h1><p>找到适合的描述，复制到工作台后按需要修改。</p></header><PromptLibrary templates={[...curtainTemplates,...templates.map(({id,title,body,category,isSystem}) => ({id,title,body,category,isSystem}))]} /></div>;
}
