const { z } = require("zod");

const createProductSchema = z.object({
  name: z.string({ required_error: "Product name is required" }).min(3),
  description: z
    .string({ required_error: "Product description is required" })
    .min(10),
  price: z.number({ required_error: "Price is required" }).positive(),
  category: z.string({ required_error: "Category is required" }).min(2),
  inStock: z.boolean().optional().default(true),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string().min(1)).optional(),
  featured: z.boolean().optional().default(false),
});

module.exports = { createProductSchema };
