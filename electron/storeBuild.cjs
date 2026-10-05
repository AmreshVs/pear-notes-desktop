function storeBuild(version, buildNumber) {
  const [major, minor] = version.split('.').map(Number)
  return major * 10000 + minor * 100 + Number(buildNumber)
}

function msixVersion(version, buildNumber) {
  const [major, minor, patch] = version.split('.').map(Number)
  return `${major}.${minor}.${patch * 100 + Number(buildNumber)}.0`
}

module.exports = { storeBuild, msixVersion }
