#!/usr/bin/env node

/**
 * 1 CLI — The Terminal Interface for Chemical Discovery
 * 
 * Usage:
 *   node scripts/queb.js <query>
 *   node scripts/queb.js analyze "coffee"
 *   node scripts/queb.js help
 */

import fetch from 'node-fetch';

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const BASE_URL = `http://${HOST}:${PORT}`;

// ANSI Color Helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help') {
  printHelp();
  process.exit(0);
}

// Default to "analyze" if not a known command
if (['analyze', 'search', 'show'].includes(command)) {
  const query = args.slice(1).join(' ');
  if (!query) {
    console.error(`${colors.red}Error: No query provided.${colors.reset}`);
    process.exit(1);
  }
  handleAnalyze(query);
} else {
  // Treat unknown command as a direct query
  handleAnalyze(args.join(' '));
}

async function handleAnalyze(query) {
  console.log(`${colors.gray}Analyzing "${colors.bright}${query}${colors.reset}${colors.gray}"...${colors.reset}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/structuralize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query, lookupMode: 'GPT-5' })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    printResult(data);
  } catch (error) {
    console.error(`${colors.red}API Error: ${error.message}${colors.reset}`);
    if (error.code === 'ECONNREFUSED') {
      console.error(`${colors.yellow}Hint: Is the server running on ${BASE_URL}?${colors.reset}`);
      console.error(`${colors.gray}Run "npm start" to start the server.${colors.reset}`);
    }
  }
}

function printResult(data) {
  const chemicals = data.chemicals || data.molecules || [];
  
  if (chemicals.length === 0) {
    console.log(`${colors.yellow}No chemical compounds identified for this item.${colors.reset}`);
    return;
  }

  console.log(`
${colors.bright}${colors.green}Found ${chemicals.length} compounds:${colors.reset}
`);
  
  chemicals.forEach((chem, i) => {
    console.log(`${colors.magenta}${i + 1}. ${chem.name}${colors.reset}`);
    if (chem.smiles) {
      console.log(`   ${colors.gray}SMILES:${colors.reset} ${colors.cyan}${chem.smiles}${colors.reset}`);
    }
    if (chem.sdfPath) {
      console.log(`   ${colors.gray}SDF:${colors.reset}    ${colors.blue}${chem.sdfPath}${colors.reset}`);
    }
    console.log('');
  });

  console.log(`${colors.gray}View in browser: ${colors.reset}${colors.blue}${BASE_URL}?autoload=true&test=${data.object}${colors.reset}`);
}

function printHelp() {
  console.log(`
${colors.bright}${colors.cyan}1 CLI v1.0.0${colors.reset}
The terminal interface for chemical content prediction.

${colors.bright}Usage:${colors.reset}
  1 <query>           Analyze an object (e.g., "1 coffee")
  1 analyze <query>   Analyze an object (explicit command)
  1 help              Show this message

${colors.bright}Options:${colors.reset}
  PORT=8080              Specify API port (default: 8080)
  HOST=localhost         Specify API host (default: localhost)
`);
}
