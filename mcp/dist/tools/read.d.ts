import { z } from "zod";
export type Tool = {
    name: string;
    description: string;
    inputSchema: z.ZodTypeAny;
    handler: (args: unknown) => Promise<unknown>;
};
export declare const readTools: Tool[];
