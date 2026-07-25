// server.js
// CSAE 104 — Web Programming | Learning Module: "How LLMs Work"
//
// This is a MINIMAL, HEAVILY COMMENTED full-stack demo. It is meant to be
// read top to bottom in class, not just run. The goal is to make the LLM
// "black box" concrete by showing every HTTP request/response that happens
// between: Browser <-> our Express server <-> Anthropic (the LLM) <-> Composio
// (real-world tool execution).
//
// CONCEPTS THIS DEMO TEACHES
//   1. An LLM is just an API you POST text to and get text back.
//   2. "Tool calling" (a.k.a. function calling): the LLM can ask YOUR server
//      to run a function, then it reads the function's result and continues
//      its answer. The LLM never runs code itself — your server does.
//   3. Composio is a library of ready-made "tools" (GitHub, weather, search,
//      etc.) so you don't have to hand-write every API integration yourself.
//   4. A request/response cycle can loop more than once: user message ->
//      LLM asks for a tool -> server runs tool -> server sends result back
//      to LLM -> LLM writes the final answer.

import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { OpenAIToolSet } from 'composio-core'; // composio-core also ships a
// framework-agnostic ToolSet; OpenAIToolSet's tool-schema format happens to
// match what most LLM providers (including Claude) expect, so we reuse it
// here instead of hand-writing JSON schemas for every tool.

const app = express();
app.use(express.static('public'));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const composioToolset = new OpenAIToolSet({ apiKey: process.env.COMPOSIO_API_KEY });

// STEP 1: Ask Composio for the tool schemas we want to expose to the LLM.
// We keep the demo to ONE safe, no-login-required action so students can run
// it without setting up OAuth for GitHub/Gmail/etc. in the middle of class.
// Composio's action catalog: https://app.composio.dev/apps
const ENABLED_ACTIONS = ['WEATHERMAP_WEATHER']; // current weather by city name

async function getToolsForLLM() {
  const composioTools = await composioToolset.getTools({ actions: ENABLED_ACTIONS });
  // Composio returns tools already shaped for OpenAI-style function calling.
  // Claude's tool format is slightly different, so we translate field names.
  return composioTools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

// STEP 2: The main chat endpoint the frontend calls.
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: 'message is required' });

    const tools = await getToolsForLLM();
    const trace = []; // we send this back to the browser so students can SEE
    // every step of the loop, not just the final answer.

    const messages = [{ role: 'user', content: userMessage }];

    // The LLM may ask for a tool, then ask for another tool, before it's
    // ready to answer — so this has to be a loop, not a single call.
    for (let turn = 0; turn < 4; turn++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        tools,
        messages,
      });

      trace.push({ step: `LLM turn ${turn + 1}`, stop_reason: response.stop_reason });

      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

      if (toolUseBlocks.length === 0) {
        // No tool requested — the LLM is done. Collect its text and return.
        const finalText = response.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        return res.json({ reply: finalText, trace });
      }

      // The LLM DID ask for a tool. Add its request to the conversation...
      messages.push({ role: 'assistant', content: response.content });

      // ...then actually run each requested tool via Composio and record
      // what we send back.
      const toolResults = [];
      for (const block of toolUseBlocks) {
        trace.push({ step: 'Tool call requested', tool: block.name, input: block.input });

        const executionResult = await composioToolset.executeAction({
          action: block.name,
          params: block.input,
        });

        trace.push({ step: 'Tool result received', tool: block.name, result: executionResult.data });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(executionResult.data),
        });
      }

      // Send the tool result(s) back so the LLM can keep reasoning.
      messages.push({ role: 'user', content: toolResults });
    }

    res.json({ reply: '(Stopped after 4 turns to keep the demo bounded.)', trace });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Demo running at http://localhost:${port}`));
