/**
 * AI-powered tool executor
 * 
 * This file contains tools for using AI to dynamically execute other tools
 * based on natural language queries.
 */
import { createPrivateTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";

const AI_TOOL_GENERATION_SCHEMA = {
  type: "object",
  properties: {
    toolName: {
      type: "string",
      description: "A descriptive name for the generated tool",
    },
    toolDescription: {
      type: "string",
      description: "Description of what the tool does",
    },
    inputSchema: {
      type: "object",
      description: "JSON schema for the tool input",
    },
    outputSchema: {
      type: "object",
      description: "JSON schema for the tool output",
    },
    executeCode: {
      type: "string",
      description: "ES module code with default export function. MUST be in format: 'export default async function (input, ctx) { /* code */ }'. The function receives (input, ctx) where ctx.env.SELF provides access to tools.",
    },
    input: {
      type: "object",
      description: "The input parameters to pass to the tool",
      additionalProperties: true,
    },
    reasoning: {
      type: "string",
      description: "Brief explanation of what you're doing and why",
    },
  },
  required: ["toolName", "toolDescription", "inputSchema", "outputSchema", "executeCode", "input", "reasoning"],
};

export const createAIToolExecutorTool = (env: Env) =>
  createPrivateTool({
    id: "AI_TOOL_EXECUTOR",
    description: "Use AI to determine which tool to call and generate its input based on a natural language query",
    inputSchema: z.object({
      query: z.string(),
    }),
    outputSchema: z.object({
      reasoning: z.string(),
      toolUri: z.string(),
      generatedInput: z.any(),
      result: z.any().optional(),
      error: z.string().optional(),
    }),
    execute: async ({ context }) => {
      // Use AI to generate the tool code dynamically
      const aiPrompt = `You are a tool code generator. Based on the user's request, generate JavaScript code that will accomplish the task.

User request: "${context.query}"

You have access to these tools via ctx.env.SELF:
- ctx.env.SELF.LIST_TODOS({}) - List all todos
- ctx.env.SELF.GENERATE_TODO_WITH_AI({ prompt?: string }) - Generate a todo with AI
- ctx.env.SELF.TOGGLE_TODO({ id: number }) - Toggle a todo's completion
- ctx.env.SELF.DELETE_TODO({ id: number }) - Delete a todo

Generate a tool that:
1. Has a descriptive name and description
2. Defines appropriate input/output JSON schemas
3. Contains an ES module with a default export function

The executeCode MUST follow this exact format:
\`\`\`javascript
export default async function (input, ctx) {
  // Your code here
  const result = await ctx.env.SELF.LIST_TODOS({});
  return { todos: result.todos };
}
\`\`\`

CRITICAL Requirements for executeCode:
- MUST start with "export default async function (input, ctx) {"
- MUST end with "}"
- The 'input' parameter contains the input data based on inputSchema
- The 'ctx.env.SELF' object provides access to our tools
- Use async/await for all tool calls
- Return a JSON object matching the outputSchema
- Handle errors gracefully with try/catch if needed

Example for listing todos:
\`\`\`javascript
export default async function (input, ctx) {
  const result = await ctx.env.SELF.LIST_TODOS({});
  return { todos: result.todos };
}
\`\`\`

Example for creating a todo:
\`\`\`javascript
export default async function (input, ctx) {
  const result = await ctx.env.SELF.GENERATE_TODO_WITH_AI({ prompt: input.prompt });
  return { todo: result.todo };
}
\`\`\`

Return a JSON with: toolName, toolDescription, inputSchema, outputSchema, executeCode (as a complete ES module string), input (the data to pass when executing), and reasoning.`;

      const aiResponse = await env.AI_GATEWAY.AI_GENERATE_OBJECT({
        model: "openai:gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates executable JavaScript code for tools. Always provide valid, executable code.",
          },
          {
            role: "user",
            content: aiPrompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent code generation
        schema: AI_TOOL_GENERATION_SCHEMA,
      });
      console.log("AI Response:", JSON.stringify(aiResponse.object, null, 2));

      const toolName = String(aiResponse.object?.toolName);
      const toolDescription = String(aiResponse.object?.toolDescription);
      const inputSchema = aiResponse.object?.inputSchema as Record<string, unknown> || {};
      const outputSchema = aiResponse.object?.outputSchema as Record<string, unknown> || {};
      const executeCode = String(aiResponse.object?.executeCode);
      const generatedInput = aiResponse.object?.input as Record<string, unknown> || {};
      const reasoning = String(aiResponse.object?.reasoning);

      console.log("Generated Execute Code:", executeCode);

      if (!executeCode || !toolName) {
        throw new Error("Failed to generate tool code");
      }

      // Validate that executeCode is in the correct format
      if (!executeCode.includes("export default async function")) {
        console.error("Invalid execute code format. Expected ES module with default export.");
        throw new Error("Generated code is not in the correct ES module format. Code must start with 'export default async function (input, ctx) {'");
      }

      // Execute the tool using DECO_TOOL_RUN_TOOL
      try {
        console.log("Executing tool with input:", JSON.stringify(generatedInput, null, 2));
        
        const toolResult = await env.TOOLS.DECO_TOOL_RUN_TOOL({
          tool: {
            name: toolName,
            description: toolDescription,
            inputSchema,
            outputSchema,
            execute: executeCode,
          },
          input: generatedInput,
        });

        console.log("Tool execution result:", JSON.stringify(toolResult, null, 2));

        // Check if there was an error in the tool execution
        if (toolResult.error) {
          console.error("Tool execution error:", toolResult.error);
          return {
            reasoning,
            toolUri: `DYNAMIC::${toolName}`,
            generatedInput,
            result: undefined,
            error: JSON.stringify(toolResult.error),
          };
        }

        return {
          reasoning,
          toolUri: `DYNAMIC::${toolName}`,
          generatedInput,
          result: toolResult.result,
          error: undefined,
        };
      } catch (error) {
        console.error("Exception during tool execution:", error);
        return {
          reasoning,
          toolUri: `DYNAMIC::${toolName}`,
          generatedInput,
          result: undefined,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  });

// Export all AI executor tools
export const aiExecutorTools = [
  createAIToolExecutorTool,
]; 