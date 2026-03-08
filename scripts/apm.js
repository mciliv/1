#!/usr/bin/env node

const cmd = process.argv[2] || 'monitor';

if (cmd === 'server') {
  require('../i/lib/apm/server').start();
} else if (cmd === 'monitor') {
  const { render } = require('../i/lib/apm/monitor');
  setInterval(render, 1000);
  render();
} else {
  console.log('Usage: node scripts/apm.js [server|monitor]');
  console.log('  server   Start the APM collection server');
  console.log('  monitor  Live dashboard of all active agents');
}
