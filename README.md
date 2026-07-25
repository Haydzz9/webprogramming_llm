# CSAE 104 Learning Module: How LLMs Work (Web Programming Edition)

A supplementary module for CSAE 104 — built as a small MERN-adjacent app
(Express backend, vanilla JS frontend) so it slots next to your existing
FOLIO lecture/lab structure without needing a new stack.

## Learning objectives
By the end of this module, students should be able to:
1. Explain that an LLM is reached over HTTP like any other API — request in, response out.
2. Trace a full **tool-calling loop**: user input → LLM decides it needs a tool →
   server executes the tool → result goes back to the LLM → LLM writes the final answer.
3. Explain why the tool execution must happen on the **server**, never the browser
   (API keys, trust boundary — ties back to earlier lessons on client/server separation).
4. Describe what a service like **Composio** is for: a catalog of pre-built tool
   integrations (GitHub, weather, search, etc.) so developers don't hand-roll every
   third-party API call themselves.

## Architecture (what to draw on the board)
```
Browser (index.html + app.js)
   |  fetch POST /api/chat  { message }
   v
Express server (server.js)
   |  anthropic.messages.create({ tools, messages })
   v
Anthropic API (the LLM)
   |  "I need WEATHERMAP_WEATHER for city=Baguio"  <-- tool_use block
   v
Express server
   |  composioToolset.executeAction(...)
   v
Composio  -->  actual Weather API
   |  result
   v
Express server sends the tool result back to the LLM, LLM writes final answer
   |
   v
Browser displays reply + a full trace of every step
```

## Setup (5–10 min in class)
1. `npm install`
2. Copy `.env.example` to `.env`, add an Anthropic key and a Composio key
   (both have free tiers — get students to sign up ahead of time).
3. `npm start`, open `http://localhost:3000`.
4. Ask: "What's the weather in Baguio?" and read the trace panel together.

## Suggested class flow (one session)
1. **Concept intro (10 min):** LLM = text-in/text-out API. Show a plain
   `curl` call to the Anthropic API with no tools — just chat.
2. **Live demo (10 min):** Run this app, ask the weather question, walk
   through the trace panel line by line.
3. **Code walkthrough (15 min):** Read `server.js` together — especially the
   `for` loop, which is the part students usually find non-obvious the first
   time (why isn't one API call enough?).
4. **Lab exercise (remaining time):** Have students add a **second** Composio
   action (pick anything that doesn't need OAuth login, e.g. a public search
   or Hacker News action) and extend `ENABLED_ACTIONS`, then test that the
   LLM correctly chooses between the two tools based on the question asked.

## Notes for you as instructor
- Composio's JS SDK and available action names change over time — verify
  `ENABLED_ACTIONS` and the import (`composio-core`) against
  [Composio's current docs](https://docs.composio.dev) before class, since
  package APIs move faster than this guide can be updated.
- This deliberately avoids OAuth-gated tools (Gmail, GitHub write actions,
  etc.) so no student gets blocked mid-class waiting on a login flow. Once
  they're comfortable with the loop, that's a natural "stretch goal."
- Pairs well as a follow-up to your existing FOLIO backend/API lessons —
  same Express patterns, new payload shape (tools/messages instead of plain
  CRUD routes).
