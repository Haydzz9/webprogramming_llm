// app.js — the browser side. Deliberately plain JS (no framework) so
// students can trace exactly what's happening: fetch() sends the user's
// message to our OWN server; our server is the only thing that talks to
// Anthropic and Composio. The browser never sees API keys.

const chat = document.getElementById('chat');
const trace = document.getElementById('trace');
const form = document.getElementById('chatForm');
const input = document.getElementById('userInput');

function addMessage(text, who) {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = (who === 'user' ? 'You: ' : 'LLM: ') + text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  input.value = '';
  trace.textContent = 'sending request to /api/chat ...';

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();

  if (data.error) {
    addMessage('Error: ' + data.error, 'bot');
    trace.textContent = JSON.stringify(data, null, 2);
    return;
  }

  addMessage(data.reply, 'bot');
  trace.textContent = JSON.stringify(data.trace, null, 2);
});
