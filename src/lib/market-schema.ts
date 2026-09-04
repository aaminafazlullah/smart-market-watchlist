import { z } from "zod";

export const quoteSchema = z.object({
  c: z.number(),
  d: z.number(),
  dp: z.number(),
  h: z.number(),
  l: z.number(),
  o: z.number(),
  pc: z.number(),
  t: z.number(),
});

export type FinnhubQuote = z.infer<typeof quoteSchema>;