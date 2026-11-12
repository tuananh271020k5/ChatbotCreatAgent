import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), '..');
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts']);
const ignoredDirectories = new Set(['node_modules', 'dist', '.next', 'coverage']);

const applicationRules = [
  {
    zone: 'frontend',
    root: 'frontend',
    forbiddenPackages: ['@agent-builder/backend'],
    forbiddenRoots: ['backend'],
  },
  {
    zone: 'backend',
    root: 'backend',
    forbiddenPackages: ['@agent-builder/frontend'],
    forbiddenRoots: ['frontend'],
  },
  {
    zone: 'contracts',
    root: 'packages/contracts',
    forbiddenPackages: [
      '@agent-builder/backend',
      '@agent-builder/frontend',
      '@nestjs/common',
      '@nestjs/core',
      'next',
      'react',
      'react-dom',
    ],
    forbiddenRoots: ['backend', 'frontend'],
  },
];

const providerSdkPrefixes = [
  'openai',
  '@anthropic-ai/sdk',
  '@google/genai',
  '@google/generative-ai',
  '@modelcontextprotocol/sdk',
  '@aws-sdk',
  '@azure',
  '@google-cloud',
];

function isWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function matchesPackage(specifier, prefix) {
  return specifier === prefix || specifier.startsWith(`${prefix}/`);
}

function relativePath(workspaceRoot, filePath) {
  return path.relative(workspaceRoot, filePath).replaceAll(path.sep, '/');
}

function isDomainFile(workspaceRoot, filePath) {
  const relative = relativePath(workspaceRoot, filePath);
  return (
    relative.startsWith('packages/runtime/') ||
    relative.startsWith('backend/src/domain/') ||
    /^backend\/src\/modules\/[^/]+\/domain\//.test(relative)
  );
}

async function walkSourceFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await walkSourceFiles(entryPath)));
      if (
        entry.isFile() &&
        sourceExtensions.has(path.extname(entry.name)) &&
        !entry.name.endsWith('.d.ts')
      ) {
        files.push(entryPath);
      }
    }

    return files;
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

function collectSpecifiers(sourceFile) {
  const specifiers = [];

  function add(moduleSpecifier) {
    if (!moduleSpecifier || !ts.isStringLiteralLike(moduleSpecifier)) return;
    const position = sourceFile.getLineAndCharacterOfPosition(moduleSpecifier.getStart(sourceFile));
    specifiers.push({
      value: moduleSpecifier.text,
      line: position.line + 1,
      column: position.character + 1,
    });
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier);

    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression);
    }

    if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (isDynamicImport || isRequire) add(node.arguments[0]);
    }

    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      add(node.argument.literal);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function findRule(workspaceRoot, filePath) {
  return applicationRules.find((rule) =>
    isWithin(filePath, path.resolve(workspaceRoot, rule.root)),
  );
}

function checkSpecifier(workspaceRoot, filePath, specifier) {
  const violations = [];
  const rule = findRule(workspaceRoot, filePath);

  if (rule) {
    const forbiddenPackage = rule.forbiddenPackages.find((prefix) =>
      matchesPackage(specifier.value, prefix),
    );

    if (forbiddenPackage) {
      violations.push({
        code: 'cross-zone-package',
        message: `${rule.zone} không được import ${forbiddenPackage}`,
      });
    }

    if (specifier.value.startsWith('.') || path.isAbsolute(specifier.value)) {
      const resolvedImport = path.resolve(path.dirname(filePath), specifier.value);
      const forbiddenRoot = rule.forbiddenRoots.find((root) =>
        isWithin(resolvedImport, path.resolve(workspaceRoot, root)),
      );

      if (forbiddenRoot) {
        violations.push({
          code: 'cross-zone-relative',
          message: `${rule.zone} không được import source từ ${forbiddenRoot}`,
        });
      }
    }
  }

  if (isDomainFile(workspaceRoot, filePath)) {
    const providerSdk = providerSdkPrefixes.find((prefix) =>
      matchesPackage(specifier.value, prefix),
    );
    if (providerSdk) {
      violations.push({
        code: 'provider-sdk-in-domain',
        message: `domain không được import trực tiếp provider SDK ${providerSdk}; hãy dùng adapter`,
      });
    }
  }

  return violations.map((violation) => ({
    ...violation,
    file: relativePath(workspaceRoot, filePath),
    line: specifier.line,
    column: specifier.column,
    specifier: specifier.value,
  }));
}

export async function checkWorkspace(workspaceRoot) {
  const resolvedWorkspace = path.resolve(workspaceRoot);
  const roots = ['backend', 'frontend', 'packages'];
  const sourceFiles = (
    await Promise.all(roots.map((root) => walkSourceFiles(path.join(resolvedWorkspace, root))))
  ).flat();
  const violations = [];

  for (const filePath of sourceFiles) {
    const source = await readFile(filePath, 'utf8');
    const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );

    for (const specifier of collectSpecifiers(sourceFile)) {
      violations.push(...checkSpecifier(resolvedWorkspace, filePath, specifier));
    }
  }

  return { filesChecked: sourceFiles.length, violations };
}

function parseWorkspaceArgument(argv) {
  const index = argv.indexOf('--workspace');
  if (index === -1) return projectRoot;
  const value = argv[index + 1];
  if (!value) throw new Error('--workspace yêu cầu một đường dẫn');
  return path.resolve(value);
}

async function main() {
  const workspaceRoot = parseWorkspaceArgument(process.argv.slice(2));
  const result = await checkWorkspace(workspaceRoot);

  if (result.violations.length > 0) {
    console.error(`Phát hiện ${result.violations.length} vi phạm ranh giới import:`);
    for (const violation of result.violations) {
      console.error(
        `- [${violation.code}] ${violation.file}:${violation.line}:${violation.column} ${violation.message} (import ${JSON.stringify(violation.specifier)})`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Ranh giới import hợp lệ (${result.filesChecked} file đã kiểm tra).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await main();
}
