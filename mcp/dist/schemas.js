// Zod input schemas — shared across read/write/agent tool sets.
import { z } from "zod";
import { DEFAULT_CHAIN_ID } from "./chains.js";
export const AddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a 0x-prefixed 40-hex EVM address")
    .transform((s) => s);
export const ChainIdSchema = z
    .number()
    .int()
    .positive()
    .default(DEFAULT_CHAIN_ID);
export const PayrollIdSchema = z.union([z.number().int().nonnegative(), z.string()])
    .transform((v) => BigInt(v));
export const AmountSchema = z.union([z.number().nonnegative(), z.string()])
    .transform((v) => BigInt(v));
// Cadence modes: 0=BATCH, 1=STREAM, 2=PULL, 3=HYBRID
export const CadenceModeSchema = z
    .enum(["BATCH", "STREAM", "PULL", "HYBRID"])
    .transform((v) => ({ BATCH: 0, STREAM: 1, PULL: 2, HYBRID: 3 }[v]));
