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
4. Describe why real-world "tools" for an LLM are usually just existing APIs
   (here: a weather API) wrapped in a name/description/schema the LLM can read.

## Architecture (what to draw on the board)
```
Browser (index.html + app.js)
   |  fetch POST /api/chat  { message }
   v
Express server (server.js)
   |  anthropic.messages.create({ tools, messages })
   v
Anthropic API (the LLM)
   |  "I need get_weather for city=Baguio"  <-- tool_use block
   v
Express server
   |  fetch(...) to Open-Meteo (geocoding + forecast, no API key needed)
   v
Express server sends the tool result back to the LLM, LLM writes final answer
   |
   v
Browser displays reply + a full trace of every step
```

## Setup (5–10 min in class)
1. `npm install`
2. Copy `.env.example` to `.env`, add an Anthropic key
   (has a free tier — get students to sign up ahead of time).
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
4. **Lab exercise (remaining time):** Have students add a **second** tool
   (pick any free, no-signup-required public API, e.g. a joke or trivia API)
   to the `tools` array and its own handler function, then test that the
   LLM correctly chooses between the two tools based on the question asked.

## Notes for you as instructor
- This uses [Open-Meteo](https://open-meteo.com) for weather because it
  needs no API key or signup — one less account for students to juggle
  mid-class. If you swap in a different tool provider, double check its
  current API/SDK docs first, since third-party APIs change over time (an
  earlier version of this demo used Composio, whose JS SDK was deprecated
  and had its backend API removed out from under it).
- This deliberately avoids OAuth-gated tools (Gmail, GitHub write actions,
  etc.) so no student gets blocked mid-class waiting on a login flow. Once
  they're comfortable with the loop, that's a natural "stretch goal."
- Pairs well as a follow-up to your existing FOLIO backend/API lessons —
  same Express patterns, new payload shape (tools/messages instead of plain
  CRUD routes).
