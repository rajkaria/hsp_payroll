// Minimal zod → JSON Schema converter for MCP tool advertisement.
// We use a small hand-rolled converter instead of `zod-to-json-schema` to
// keep the dependency footprint tight. Only supports the zod primitives
// we actually use in tool inputSchemas.
export function zodToJsonSchema(schema) {
    const def = schema._def;
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
                items: zodToJsonSchema(def.type),
            };
        case "ZodObject": {
            const shape = schema.shape;
            const properties = {};
            const required = [];
            for (const [key, value] of Object.entries(shape)) {
                properties[key] = zodToJsonSchema(value);
                if (!value.isOptional())
                    required.push(key);
            }
            return {
                type: "object",
                properties,
                ...(required.length ? { required } : {}),
                additionalProperties: false,
            };
        }
        case "ZodOptional":
            return zodToJsonSchema(def.innerType);
        case "ZodDefault":
            return zodToJsonSchema(def.innerType);
        case "ZodEffects":
            return zodToJsonSchema(def.schema);
        case "ZodUnion": {
            const options = def.options;
            return { anyOf: options.map(zodToJsonSchema) };
        }
        case "ZodEnum":
            return {
                type: "string",
                enum: def.values,
            };
        case "ZodLiteral":
            return {
                enum: [def.value],
            };
        default:
            return {};
    }
}
