const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.APM_PORT || 7243;

app.use(bodyParser.json());

// In-memory store for agent states
// Key: agentId, Value: { name, status, files, lastPrompt, lastUpdate }
const agents = new Map();

app.post('/ingest/:agentId', (req, res) => {
  const { agentId } = req.params;
  const { name, status, files, lastPrompt } = req.body;
  
  const existing = agents.get(agentId) || {};
  
  agents.set(agentId, {
    id: agentId,
    name: name || existing.name || agentId,
    status: status || existing.status || 'unknown',
    files: files || existing.files || [],
    lastPrompt: lastPrompt || existing.lastPrompt || '',
    lastUpdate: Date.now()
  });
  
  res.status(204).end();
});

app.get('/agents', (req, res) => {
  res.json(Array.from(agents.values()));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`APM Server running at http://127.0.0.1:${PORT}`);
});
