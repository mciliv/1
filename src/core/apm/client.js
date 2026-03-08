const http = require('http');

class APMClient {
  constructor(agentId, name) {
    this.agentId = agentId || `agent-${Math.random().toString(36).substr(2, 9)}`;
    this.name = name || 'Anonymous Agent';
    this.port = process.env.APM_PORT || 7243;
    this.host = '127.0.0.1';
  }

  async report(data) {
    const payload = JSON.stringify({
      name: this.name,
      ...data
    });

    const options = {
      hostname: this.host,
      port: this.port,
      path: `/ingest/${this.agentId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve(true));
      });

      req.on('error', () => resolve(false));
      req.write(payload);
      req.end();
    });
  }

  async setStatus(status, files = [], lastPrompt = '') {
    return this.report({ status, files, lastPrompt });
  }
}

module.exports = APMClient;
