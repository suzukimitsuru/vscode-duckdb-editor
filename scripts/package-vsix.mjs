// プラットフォーム別の VSIX を作る (README.md の「VSIX の作成」)
//
//   node scripts/package-vsix.mjs                 全ターゲット
//   node scripts/package-vsix.mjs linux-x64 ...   指定したターゲットだけ
//
// DuckDB のネイティブバイナリ (@duckdb/node-bindings-<platform>) は npm の optionalDependencies なので、
// npm / yarn は実行中のプラットフォームの分しか入れない。ターゲットごとに node_modules/@duckdb の
// バイナリをそのターゲットの分だけに入れ替えてから `vsce package --target` を実行する。
// 最後に実行中のプラットフォームの分へ戻す (テストやデバッグ実行がそのまま動くように)。
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRequire } from 'node:module';

/** vsce の版 (依存が重いので devDependencies には入れず npx で実行する) */
const VSCE = '@vscode/vsce@4.0.0';

// vsce 4 は ES Module 専用の依存 (parse5 8) を require() するため、require() で ES Module を読める Node.js 22.12.0 以上が要る。
// vsce の engines は ">= 22" だが、22.11 以前では ERR_REQUIRE_ESM で落ちる
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 12)) {
    console.error(`Node.js ${process.versions.node} では ${VSCE} を実行できません。Node.js 22.12.0 以上に更新して下さい (README.md の「VSIX の作成」)`);
    process.exit(1);
}

/** VS Code のターゲット → DuckDB のバイナリのパッケージ名の接尾辞 (linux-armhf は DuckDB が配布していない) */
const TARGETS = {
    'win32-x64': 'win32-x64',
    'win32-arm64': 'win32-arm64',
    'linux-x64': 'linux-x64',
    'linux-arm64': 'linux-arm64',
    'alpine-x64': 'linux-x64-musl',
    'alpine-arm64': 'linux-arm64-musl',
    'darwin-x64': 'darwin-x64',
    'darwin-arm64': 'darwin-arm64',
};

const root = path.resolve(import.meta.dirname, '..');
const duckdbModules = path.join(root, 'node_modules', '@duckdb');
const isWindows = process.platform === 'win32';

/** @duckdb/node-bindings が要求するバイナリの版 */
const bindingsVersion = () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(duckdbModules, 'node-bindings', 'package.json'), 'utf8'));
    return manifest.version;
};

/** 実行中のプラットフォームのターゲット */
const hostTarget = () => {
    if (process.platform === 'linux') {
        const { familySync, MUSL } = createRequire(path.join(duckdbModules, 'node-bindings', 'package.json'))('detect-libc');
        return `${familySync() === MUSL ? 'alpine' : 'linux'}-${process.arch}`;
    }
    return `${process.platform}-${process.arch}`;
};

/** node_modules/@duckdb のバイナリを、指定したターゲットの分だけにする */
const installBinding = (target) => {
    const suffix = TARGETS[target];
    if (!suffix) {
        throw new Error(`unsupported target: ${target} (supported: ${Object.keys(TARGETS).join(', ')})`);
    }
    for (const entry of fs.readdirSync(duckdbModules)) {
        if (entry.startsWith('node-bindings-')) {
            fs.rmSync(path.join(duckdbModules, entry), { recursive: true, force: true });
        }
    }
    const spec = `@duckdb/node-bindings-${suffix}@${bindingsVersion()}`;
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'duckdb-editor-vsix-'));
    try {
        // npm pack はレジストリの integrity を検証してから tarball を保存する
        const tarball = execFileSync(isWindows ? 'npm.cmd' : 'npm', ['pack', spec, '--pack-destination', work, '--silent'],
            { encoding: 'utf8', shell: isWindows }).trim().split(/\r?\n/).pop();
        const destination = path.join(duckdbModules, `node-bindings-${suffix}`);
        fs.mkdirSync(destination, { recursive: true });
        execFileSync('tar', ['-xzf', path.join(work, tarball), '-C', destination, '--strip-components=1']);
    } finally {
        fs.rmSync(work, { recursive: true, force: true });
    }
    console.log(`[duckdb] ${spec}`);
};

const targets = process.argv.slice(2).length > 0 ? process.argv.slice(2) : Object.keys(TARGETS);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const outDir = path.join(root, 'vsix');
fs.mkdirSync(outDir, { recursive: true });
try {
    for (const target of targets) {
        installBinding(target);
        const out = path.join(outDir, `${manifest.name}-${manifest.version}-${target}.vsix`);
        execFileSync(isWindows ? 'npx.cmd' : 'npx', ['--yes', VSCE, 'package', '--target', target, '--out', out],
            { cwd: root, stdio: 'inherit', shell: isWindows });
    }
} finally {
    installBinding(hostTarget());
}
