const http = require('http');
const readline = require('readline');

const PORT = process.env.APM_PORT || 7243;

function getAgents() {
  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:${PORT}/agents`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

function clear() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

async function render() {
  const agents = await getAgents();
  
  clear();
  console.log('\x1b[36m' + '='.repeat(60));
  console.log('🤖  AGENT PROCESS MANAGER MONITOR');
  console.log('='.repeat(60) + '\x1b[0m\n');
  
  if (agents.length === 0) {
    console.log('  \x1b[90mNo agents currently active.\x1b[0m');
  } else {
    agents.forEach(agent => {
      console.log(`\x1b[35m[ ${agent.name} ]\x1b[0m  \x1b[90m(ID: ${agent.id})\x1b[0m`);
      console.log(`  \x1b[32mStatus:\x1b[0m ${agent.status}`);
      
      if (agent.files && agent.files.length > 0) {
        console.log(`  \x1b[34mFocus Files:\x1b[0m`);
        agent.files.forEach(f => console.log(`    - ${f}`));
      } else {
        console.log(`  \x1b[34mFocus Files:\x1b[0m none`);
      }
      
      if (agent.lastPrompt) {
        const truncated = agent.lastPrompt.length > 100 
          ? agent.lastPrompt.substring(0, 97) + '...' 
          : agent.lastPrompt;
        console.log(`  \x1b[33mLatest Prompt:\x1b[0m \x1b[3m"${truncated}"\x1b[0m`);
      }
      
      const lastSeen = Math.round((Date.now() - agent.lastUpdate) / 1000);
      console.log(`  \x1b[90mLast update: ${lastSeen}s ago\x1b[0m\n`);
    });
  }
  
  console.log('\x1b[90m' + '-'.repeat(60));
  console.log('Press Ctrl+C to exit monitor.');
  console.log('-'.repeat(60) + '\x1b[0m');
}

setInterval(render, 1000);
render();
