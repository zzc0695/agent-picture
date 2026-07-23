import "dotenv/config";

import bcrypt from "bcryptjs";
import { db } from "../lib/db";

async function main() {
  const passwordHash = await bcrypt.hash("demo123456", 10);

  const merchant = await db.merchant.upsert({
    where: { email: "demo@example.com" },
    update: {
      name: "演示软装商家",
      passwordHash,
    },
    create: {
      name: "演示软装商家",
      email: "demo@example.com",
      passwordHash,
    },
  });

  await db.promptTemplate.deleteMany({
    where: {
      merchantId: null,
      isSystem: true,
    },
  });

  await db.promptTemplate.createMany({
    data: [
      {
        title: "客厅现代简约窗帘",
        category: "room-style",
        body: "保留客厅原有结构、窗户位置和透视角度，为窗户安装现代简约风格窗帘，强调自然垂感、真实布料纹理、柔和室内光线，整体干净高级。",
        isSystem: true,
      },
      {
        title: "卧室高遮光温馨方案",
        category: "curtain-selling-point",
        body: "保留卧室原始布局和床窗关系，为窗户搭配高遮光窗帘，突出厚实面料、柔和褶皱、安静舒适的睡眠氛围，画面保持真实摄影质感。",
        isSystem: true,
      },
    ],
  });

  await db.material.deleteMany({
    where: {
      merchantId: merchant.id,
      name: "米白高遮光绒布窗帘",
    },
  });

  await db.material.create({
    data: {
      merchantId: merchant.id,
      name: "米白高遮光绒布窗帘",
      category: "窗帘",
      color: "米白",
      fabric: "高遮光绒布",
      priceRange: "中高端",
      sizeNote: "适合客厅和卧室落地窗",
      sellingPoints: "遮光强、垂感好、质感柔和",
      imageUrl:
        "https://images.unsplash.com/photo-1583847268964-b28e50bc78d3?auto=format&fit=crop&w=800&q=85",
    },
  });
}

main()
  .then(async () => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
