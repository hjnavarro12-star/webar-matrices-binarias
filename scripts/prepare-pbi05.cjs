const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'dist', 'pbi05');
const apkSource = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const markerSource = path.join(root, 'src', 'app', 'features', 'ar', 'poc', 'markers', 'print', 'marker-101.png');
const apkTarget = path.join(outputDir, 'webar-pbi05-debug.apk');
const markerTarget = path.join(outputDir, 'marker-101.png');

const env = { ...process.env };
if (process.platform === 'win32') {
  env.GRADLE_OPTS = `${env.GRADLE_OPTS || ''} -Djavax.net.ssl.trustStoreType=Windows-ROOT`.trim();
}

execFileSync('npm', ['run', 'build'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
execFileSync('npx', ['cap', 'sync', 'android'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const canRun = command => {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
    return true;
  } catch {
    return false;
  }
};
const gradleCandidates = [
  process.env.GRADLE_BIN,
  'gradle',
  path.join(os.tmpdir(), 'gradle-8.14.3', 'bin', process.platform === 'win32' ? 'gradle.bat' : 'gradle'),
].filter(Boolean);
let gradle = gradleCandidates.find(candidate => (
  path.isAbsolute(candidate) ? fs.existsSync(candidate) : canRun(candidate)
));

if (!gradle && process.platform === 'win32') {
  const gradleDir = path.join(os.tmpdir(), 'gradle-8.14.3');
  const gradleZip = path.join(os.tmpdir(), 'gradle-8.14.3-bin.zip');
  execFileSync('curl', [
    '-fL',
    'https://services.gradle.org/distributions/gradle-8.14.3-bin.zip',
    '-o', gradleZip,
  ], { stdio: 'inherit' });
  execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `Expand-Archive -Force '${gradleZip}' '${os.tmpdir()}'`,
  ], { stdio: 'inherit' });
  gradle = path.join(gradleDir, 'bin', 'gradle.bat');
}

if (!gradle) {
  const wrapper = path.join(root, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  if (fs.existsSync(wrapper)) gradle = wrapper;
}
if (!gradle) throw new Error('No se encontró Gradle. Define GRADLE_BIN o instala Gradle 8.14.3.');

execFileSync(gradle, ['-p', 'android', '--no-daemon', 'assembleDebug'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(apkSource, apkTarget);
fs.copyFileSync(markerSource, markerTarget);

const apkHash = createHash('sha256').update(fs.readFileSync(apkTarget)).digest('hex');
const markerHash = createHash('sha256').update(fs.readFileSync(markerTarget)).digest('hex');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const manifest = {
  pbi: 'RA-PBI-05',
  appId: 'co.edu.unipacifico.webar',
  versionCode: 5,
  versionName: '1.0-pbi05',
  commit,
  builtAt: new Date().toISOString(),
  apk: path.relative(root, apkTarget),
  marker: path.relative(root, markerTarget),
  sha256: {
    apk: apkHash,
    marker: markerHash,
  },
};

fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(
  path.join(outputDir, 'SHA256SUMS.txt'),
  `${apkHash}  webar-pbi05-debug.apk\n${markerHash}  marker-101.png\n`,
);

console.log(`Paquete PBI-05 listo en ${outputDir}`);
console.log(`APK: ${apkTarget}`);
console.log(`Marcador: ${markerTarget}`);
console.log(`SHA-256 APK: ${apkHash}`);
