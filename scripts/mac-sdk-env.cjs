const { execSync } = require('child_process')

// A newer Command Line Tools SDK than the selected Xcode breaks its linker (unknown architecture arm64e.x1).
function macSdkEnv() {
  if (process.platform !== 'darwin' || process.env.SDKROOT) return process.env
  try {
    const sdk = execSync('xcrun --sdk macosx --show-sdk-path', {
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim()
    return sdk ? { ...process.env, SDKROOT: sdk } : process.env
  } catch {
    return process.env
  }
}

module.exports = { macSdkEnv }
