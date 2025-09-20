import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting AI Chat Backend...');

// Change to backend directory
process.chdir(path.join(__dirname, 'backend'));

// Start the backend server
const backend = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error);
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend...');
  backend.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down backend...');
  backend.kill('SIGTERM');
  process.exit(0);
});
