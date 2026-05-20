import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { EXPENSE_CATEGORY_KEYS, EXPENSE_CATEGORY_LABELS } from "@workshop/shared";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash: hash },
  });

  for (const key of EXPENSE_CATEGORY_KEYS) {
    await prisma.expenseCategory.upsert({
      where: { key },
      update: { label: EXPENSE_CATEGORY_LABELS[key] },
      create: { key, label: EXPENSE_CATEGORY_LABELS[key] },
    });
  }

  console.log(`Seeded admin user: ${username}`);
  console.log("Seeded expense categories");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
