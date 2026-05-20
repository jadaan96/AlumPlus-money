import { prisma } from "./prisma";

export async function resolveExpenseCategory(
  categoryKey?: string,
  categoryId?: string
) {
  if (categoryId) {
    return prisma.expenseCategory.findUnique({ where: { id: categoryId } });
  }
  if (categoryKey) {
    return prisma.expenseCategory.findUnique({ where: { key: categoryKey } });
  }
  return null;
}
