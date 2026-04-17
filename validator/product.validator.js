const { z } = require("zod");

const parseBoolean = (value) => {
  if (typeof value === "boolean" || value === undefined) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
};

const parseStringArray = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return undefined;

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        return [trimmed];
      }
    }

    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [trimmed];
  }

  return value;
};

const createProductSchema = z
  .object({
    name: z.string({ required_error: "Product name is required" }).min(3),
    description: z
      .string({ required_error: "Product description is required" })
      .min(10),
    price: z.coerce.number({ required_error: "Price is required" }).positive(),
    category: z.string({ required_error: "Category is required" }).min(2),
    stock: z.coerce.number().int().min(0).optional(),
    inStock: z.preprocess(parseBoolean, z.boolean().optional()),
    images: z
      .preprocess(parseStringArray, z.array(z.string().min(1)).max(5).optional()),
    tags: z.preprocess(parseStringArray, z.array(z.string().min(1)).optional()),
    featured: z.preprocess(parseBoolean, z.boolean().optional().default(false)),
  })
  .transform(({ inStock, stock, ...data }) => {
    const normalized = { ...data };

    if (stock !== undefined) {
      normalized.stock = stock;
    } else if (inStock === false) {
      normalized.stock = 0;
    }

    return normalized;
  });

module.exports = { createProductSchema };
