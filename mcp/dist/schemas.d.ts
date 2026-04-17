import { z } from "zod";
export declare const AddressSchema: z.ZodEffects<z.ZodString, `0x${string}`, string>;
export declare const ChainIdSchema: z.ZodDefault<z.ZodNumber>;
export declare const PayrollIdSchema: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, bigint, string | number>;
export declare const AmountSchema: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, bigint, string | number>;
export declare const CadenceModeSchema: z.ZodEffects<z.ZodEnum<["BATCH", "STREAM", "PULL", "HYBRID"]>, number, "BATCH" | "STREAM" | "PULL" | "HYBRID">;
