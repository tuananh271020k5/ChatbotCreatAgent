import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const checks = [];

function addResult(name, status, detail) {
  checks.push({ name, status, detail });
}

function checkDockerEngine() {
  try {
    const output = execSync('docker info --format "{{.ServerVersion}}"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    addResult('Docker Engine', 'PASS', `Phiên bản: ${output}`);
  } catch {
    try {
      const output = execSync('docker version --format "{{.Server.Version}}"', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      addResult('Docker Engine', 'PASS', `Phiên bản: ${output}`);
    } catch {
      addResult(
        'Docker Engine',
        'WARN',
        'Không thể kết nối daemon hoặc đang trong môi trường sandbox',
      );
    }
  }
}

function checkDockerCompose() {
  try {
    const output = execSync('docker compose version', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    addResult('Docker Compose', 'PASS', output);
  } catch {
    try {
      const output = execSync('docker-compose --version', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      addResult('Docker Compose', 'PASS', output);
    } catch {
      addResult('Docker Compose', 'WARN', 'Không tìm thấy Docker Compose CLI');
    }
  }
}

function checkFileExists(relativePath, label) {
  const fullPath = path.join(rootDir, relativePath);
  if (existsSync(fullPath)) {
    addResult(`File: ${label}`, 'PASS', relativePath);
  } else {
    addResult(`File: ${label}`, 'FAIL', `Thiếu file ${relativePath}`);
  }
}

function checkPortAvailability(port, label) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        addResult(
          `Port ${port} (${label})`,
          'WARN',
          'Port đang được dùng (có thể container đang chạy)',
        );
      } else {
        addResult(`Port ${port} (${label})`, 'WARN', `Lỗi: ${err.message}`);
      }
      resolve();
    });
    server.once('listening', () => {
      server.close(() => {
        addResult(`Port ${port} (${label})`, 'PASS', 'Sẵn sàng');
        resolve();
      });
    });
    server.listen(port, '127.0.0.1');
  });
}

async function main() {
  console.log('--- BÁO CÁO CHẨN ĐOÁN MÔI TRƯỜNG DOCKER (DOCKER DOCTOR) ---');

  checkDockerEngine();
  checkDockerCompose();

  checkFileExists('deployment/compose.yaml', 'Core Compose');
  checkFileExists('deployment/compose.dev.yaml', 'Dev Compose');
  checkFileExists('deployment/compose.test.yaml', 'Test Compose');
  checkFileExists('.env.example', 'File mẫu môi trường');
  checkFileExists('deployment/bootstrap/bootstrap-secrets.sh', 'Secret Bootstrap');
  checkFileExists('deployment/keycloak/realm-template.json', 'Keycloak Realm Template');
  checkFileExists('deployment/storage/bootstrap-buckets.sh', 'Bucket Bootstrap');
  checkFileExists('deployment/backup/backup.sh', 'Backup Script');
  checkFileExists('deployment/backup/restore.sh', 'Restore Script');

  const portsToCheck = [
    { port: 3000, label: 'Frontend Web' },
    { port: 3001, label: 'Backend API' },
    { port: 5432, label: 'PostgreSQL' },
    { port: 6380, label: 'Redis Cache' },
    { port: 6381, label: 'Redis Queue' },
    { port: 8333, label: 'SeaweedFS S3' },
    { port: 8080, label: 'Keycloak OIDC' },
  ];

  for (const { port, label } of portsToCheck) {
    await checkPortAvailability(port, label);
  }

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const r of checks) {
    const symbol = r.status === 'PASS' ? '✓' : r.status === 'WARN' ? '!' : '✗';
    console.log(`[${symbol}] [${r.status}] ${r.name.padEnd(35)} : ${r.detail}`);
    if (r.status === 'PASS') passCount++;
    else if (r.status === 'WARN') warnCount++;
    else failCount++;
  }

  console.log('------------------------------------------------------------');
  console.log(`Kết quả: ${passCount} Đạt | ${warnCount} Cảnh báo | ${failCount} Thất bại`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy docker doctor:', err);
  process.exit(1);
});
