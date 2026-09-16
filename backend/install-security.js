// Security packages installation script
const { execSync } = require('child_process');

const packages = [
  'helmet',
  'xss', 
  'validator',
  'express-rate-limit',
  'express-mongo-sanitize',
  'hpp'
];

console.log('Installing security packages...');

try {
  execSync(`npm install ${packages.join(' ')}`, { stdio: 'inherit' });
  console.log('Security packages installed successfully!');
} catch (error) {
  console.error('Failed to install security packages:', error.message);
}