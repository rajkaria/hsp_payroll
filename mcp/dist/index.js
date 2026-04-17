#!/usr/bin/env node
// HashPay MCP server — stdio transport.
// Exposes 25 tools across read, write, and agent tiers for the HashPay
// Income Protocol on EVM chains.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "./util-zod-json.js";
import { readTools } from "./tools/read.js";
import { writeTools } from "./tools/write.js";
import { agentTools } from "./tools/agent.js";
const allTools = [...readTools, ...writeTools, ...agentTools];
const toolByName = new Map(allTools.map((t) => [t.name, t]));
const server = new Server({
    name: "hashpay-mcp",
    version: "0.1.0",
}, {
    capabilities: { tools: {} },
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: zodToJsonSchema(t.inputSchema),
    })),
}));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = toolByName.get(req.params.name);
    if (!tool) {
        throw new Error(`Unknown tool: ${req.params.name}`);
    }
    try {
        const parsed = tool.inputSchema.parse(req.params.arguments ?? {});
        const result = await tool.handler(parsed);
        return {
            content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
            ],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            isError: true,
            content: [{ type: "text", text: `Error: ${msg}` }],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write(`[HashPay MCP] v0.1.0 ready. ${allTools.length} tools registered. ` +
        `Mode=${process.env.HASHPAY_MODE ?? "read"}.\n`);
}
main().catch((err) => {
    process.stderr.write(`[HashPay MCP] Fatal: ${err}\n`);
    process.exit(1);
});
