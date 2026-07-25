// server.js
// CSAE 104 — Web Programming | Learning Module: "How LLMs Work"
//
// This is a MINIMAL, HEAVILY COMMENTED full-stack demo. It is meant to be
// read top to bottom in class, not just run. The goal is to make the LLM
// "black box" concrete by showing every HTTP request/response that happens
// between: Browser <-> our Express server <-> Anthropic (the LLM) <-> a
// real-world tool (a weather API).

import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.static('public'));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// STEP 1: Describe the tool(s) we expose to the LLM. Claude decides WHEN to
// call this based on the name/description below; our server is what
// actually runs it. We use Open-Meteo here because it needs no API key or
// signup, so the demo stays copy-paste-runnable in class.
const tools = [
  {
    name: 'get_weather',
    description: 'Get the current weather for a city by name.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name, e.g. "Baguio"' },
      },
      required: ['city'],
    },
  },
];

async function getWeather(city) {
  // Open-Meteo's forecast endpoint needs lat/lon, so we geocode the city
  // name first (also free, no key required).
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  const geo = await geoRes.json();
  const place = geo.results?.[0];
  if (!place) return { error: `Could not find a location named "${city}"` };

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m,weather_code`
  );
  const weather = await weatherRes.json();

  return {
    city: place.name,
    country: place.country,
    temperature_c: weather.current.temperature_2m,
    wind_speed_kmh: weather.current.wind_speed_10m,
  };
}

// STEP 2: The main chat endpoint the frontend calls.
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: 'message is required' });

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

      // ...then actually run each requested tool and record what we send back.
      const toolResults = [];
      for (const block of toolUseBlocks) {
        trace.push({ step: 'Tool call requested', tool: block.name, input: block.input });

        const result = await getWeather(block.input.city);

        trace.push({ step: 'Tool result received', tool: block.name, result });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
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
