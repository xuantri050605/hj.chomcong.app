/**
 * Post-build verification and asset injection
 * Generates health.json in the web-build directory for automated health checks and uptime monitoring.
 */
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'web-build');
if (!fs.existsSync(targetDir)) {
  console.error('Error: web-build directory does not exist. Run build first.');
  process.exit(1);
}

const healthData = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: '0.1.0',
  service: 'cham-cong-payroll-app',
  environment: 'production',
};

const healthPath = path.join(targetDir, 'health.json');
fs.writeFileSync(healthPath, JSON.stringify(healthData, null, 2), 'utf8');
console.log('✓ Successfully generated health.json in web-build');

