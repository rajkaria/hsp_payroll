// Minimal zod → JSON Schema converter for MCP tool advertisement.
// We use a small hand-rolled converter instead of `zod-to-json-schema` to
// keep the dependency footprint tight. Only supports the zod primitives
// we actually use in tool inputSchemas.

import { z } from "zod";

type JsonSchema = Record<string, unknown>;

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const def = (schema as { _def: { typeName: string } })._def;
  const typeName = def.typeName;

  switch (typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodBigInt":
      return { type: "string", format: "bigint" };
    case "ZodArray":
      return {
        type: "array",
        items: zodToJsonSchema((def as unknown as { type: z.ZodTypeAny }).type),
      };
    case "ZodObject": {
      const shape = (schema as unknown as z.ZodObject<z.ZodRawShape>).shape;
      const properties: JsonSchema = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
        if (!(value as z.ZodTypeAny).isOptional()) required.push(key);
      }
      return {
        type: "object",
        properties,
        ...(required.length ? { required } : {}),
        additionalProperties: false,
      };
    }
    case "ZodOptional":
      return zodToJsonSchema(
        (def as unknown as { innerType: z.ZodTypeAny }).innerType,
      );
    case "ZodDefault":
      return zodToJsonSchema(
        (def as unknown as { innerType: z.ZodTypeAny }).innerType,
      );
    case "ZodEffects":
      return zodToJsonSchema(
        (def as unknown as { schema: z.ZodTypeAny }).schema,
      );
    case "ZodUnion": {
      const options = (def as unknown as { options: z.ZodTypeAny[] }).options;
      return { anyOf: options.map(zodToJsonSchema) };
    }
    case "ZodEnum":
      return {
        type: "string",
        enum: (def as unknown as { values: string[] }).values,
      };
    case "ZodLiteral":
      return {
        enum: [(def as unknown as { value: unknown }).value],
      };
    default:
      return {};
  }
}
