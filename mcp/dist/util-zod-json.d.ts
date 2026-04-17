import { z } from "zod";
type JsonSchema = Record<string, unknown>;
export declare function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema;
export {};
