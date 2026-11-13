import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, '..');
const checker = path.join(scriptsDirectory, 'check-import-boundaries.mjs');

function runChecker(workspace) {
  return spawnSync(process.execPath, [checker, '--workspace', workspace], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
}

const projectResult = runChecker(projectRoot);
assert.equal(
  projectResult.status,
  0,
  `Repository hiện tại phải vượt qua boundary check:\n${projectResult.stdout}${projectResult.stderr}`,
);

const fixtures = [
  {
    name: 'frontend import backend bằng relative path',
    workspace: path.join(scriptsDirectory, 'fixtures', 'import-boundaries', 'cross-zone'),
    expectedCode: 'cross-zone-relative',
  },
  {
    name: 'frontend import package backend',
    workspace: path.join(scriptsDirectory, 'fixtures', 'import-boundaries', 'cross-zone-package'),
    expectedCode: 'cross-zone-package',
  },
  {
    name: 'domain import provider SDK trực tiếp',
    workspace: path.join(scriptsDirectory, 'fixtures', 'import-boundaries', 'provider-domain'),
    expectedCode: 'provider-sdk-in-domain',
  },
];

for (const fixture of fixtures) {
  const result = runChecker(fixture.workspace);
  const output = `${result.stdout}${result.stderr}`;
  assert.notEqual(result.status, 0, `Fixture phải bị từ chối: ${fixture.name}`);
  assert.match(
    output,
    new RegExp(`\\[${fixture.expectedCode}\\]`),
    `Fixture ${fixture.name} phải báo đúng rule:\n${output}`,
  );
}

console.log(`Boundary checker đã vượt qua repository và từ chối ${fixtures.length} fixture.`);
