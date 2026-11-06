const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  const version = packageJson.version;
  const releaseDir = path.join(rootDir, 'release');
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  const payloadZip = path.join(releaseDir, 'payload.zip');
  const installerSource = path.join(rootDir, 'src', 'installer', 'Installer.cs');
  const outputExe = path.join(releaseDir, `Spoti-Fly Setup ${version}.exe`);
  const iconPath = path.join(rootDir, 'assets', 'installer', 'icon.ico');
  const logoPath = path.join(rootDir, 'public', 'logo.png');

  console.log(`\n===========================================`);
  console.log(`Building Custom Spoti-Fly Setup v${version}`);
  console.log(`===========================================\n`);

  if (!fs.existsSync(unpackedDir)) {
    throw new Error(`Directory not found: ${unpackedDir}. Run electron-builder --win --dir first.`);
  }

  // 1. Create payload.zip from win-unpacked
  console.log(`[1/3] Packaging payload from ${unpackedDir}...`);
  if (fs.existsSync(payloadZip)) {
    fs.unlinkSync(payloadZip);
  }

  // Use tar.exe which is native on Windows 10/11
  const tarCmd = `tar -a -c -f "${payloadZip}" -C "${unpackedDir}" .`;
  execSync(tarCmd, { stdio: 'inherit' });

  const payloadSize = (fs.statSync(payloadZip).size / (1024 * 1024)).toFixed(2);
  console.log(`Payload compressed successfully: ${payloadSize} MB`);

  // 2. Locate csc.exe (.NET Framework 4.0/4.8 64-bit compiler)
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  if (!fs.existsSync(cscPath)) {
    throw new Error(`C# compiler not found at ${cscPath}`);
  }

  console.log(`[2/3] Compiling custom installer GUI with ${cscPath}...`);

  const versionConfigPath = path.join(releaseDir, 'VersionConfig.cs');
  fs.writeFileSync(
    versionConfigPath,
    `namespace SpotiflyInstaller
{
    public static class AppInfo
    {
        public const string Version = "${version}";
        public const string Title = "Spoti-Fly";
        public const string Tagline = "Always-on-Top Spotify Mini-Player • v${version}";
    }
}
`,
    'utf-8'
  );

  const refs = [
    'System.dll',
    'System.Drawing.dll',
    'System.Windows.Forms.dll',
    'System.IO.Compression.dll',
    'System.IO.Compression.FileSystem.dll',
    'Microsoft.CSharp.dll'
  ].join(',');

  const cscArgs = [
    '/nologo',
    '/optimize+',
    '/target:winexe',
    `/r:${refs}`,
    fs.existsSync(iconPath) ? `/win32icon:"${iconPath}"` : '',
    fs.existsSync(iconPath) ? `/resource:"${iconPath}",icon.ico` : '',
    `/resource:"${payloadZip}",payload.zip`,
    fs.existsSync(logoPath) ? `/resource:"${logoPath}",logo.png` : '',
    `/out:"${outputExe}"`,
    `"${versionConfigPath}"`,
    `"${installerSource}"`
  ].filter(Boolean).join(' ');

  try {
    execSync(`"${cscPath}" ${cscArgs}`, { stdio: 'inherit' });
  } finally {
    if (fs.existsSync(versionConfigPath)) {
      fs.unlinkSync(versionConfigPath);
    }
  }

  // 3. Clean up payload.zip
  console.log(`[3/3] Cleaning up temporary files...`);
  if (fs.existsSync(payloadZip)) {
    fs.unlinkSync(payloadZip);
  }

  const exeSize = (fs.statSync(outputExe).size / (1024 * 1024)).toFixed(2);
  console.log(`\n===========================================`);
  console.log(`SUCCESS! Custom installer created:`);
  console.log(`Path: ${outputExe}`);
  console.log(`Size: ${exeSize} MB`);
  console.log(`===========================================\n`);
}

main().catch(err => {
  console.error('\nBuild failed:', err.message);
  process.exit(1);
});
