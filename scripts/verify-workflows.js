const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const workflowsDir = path.join(__dirname, '..', '.github', 'workflows');
const files = fs.readdirSync(workflowsDir);
console.log('Discovered workflow files in', workflowsDir, ':', files);

let totalUploadPagesArtifact = 0;
let totalDeployPages = 0;
let totalGithubPagesArtifactOccurrences = 0;

for (const file of files) {
  if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
  const fullPath = path.join(workflowsDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Verify YAML syntax parsing
  try {
    const parsed = yaml.parse(content);
    console.log('✓ Validated YAML syntax for file:', file);
  } catch (err) {
    console.error('❌ YAML syntax error in', file, ':', err.message);
    process.exit(1);
  }

  // Count occurrences
  const uploadPagesMatches = content.match(/upload-pages-artifact/g) || [];
  const deployPagesMatches = content.match(/deploy-pages/g) || [];
  const githubPagesNameMatches = content.match(/["']github-pages["']/g) || [];

  totalUploadPagesArtifact += uploadPagesMatches.length;
  totalDeployPages += deployPagesMatches.length;
  totalGithubPagesArtifactOccurrences += githubPagesNameMatches.length;

  console.log(`File [${file}] stats:`);
  console.log(`  - upload-pages-artifact count: ${uploadPagesMatches.length}`);
  console.log(`  - deploy-pages count: ${deployPagesMatches.length}`);
  console.log(`  - explicit github-pages name matches: ${githubPagesNameMatches.length}`);
}

console.log('----------------------------------------------------');
console.log('TOTAL across entire .github/workflows directory:');
console.log(`  - Total upload-pages-artifact: ${totalUploadPagesArtifact}`);
console.log(`  - Total deploy-pages: ${totalDeployPages}`);

if (totalUploadPagesArtifact !== 1) {
  console.error(`FAIL: Expected exactly 1 upload-pages-artifact, found ${totalUploadPagesArtifact}`);
  process.exit(1);
}
if (totalDeployPages !== 1) {
  console.error(`FAIL: Expected exactly 1 deploy-pages, found ${totalDeployPages}`);
  process.exit(1);
}

console.log('✓ AUDIT PROOF PASSED: Exactly 1 upload-pages-artifact and 1 deploy-pages found.');
