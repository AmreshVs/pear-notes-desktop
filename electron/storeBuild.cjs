function storeBuild(version, buildNumber) {
  const [major, minor] = version.split('.').map(Number)
  return major * 10000 + minor * 100 + Number(buildNumber)
}

module.exports = { storeBuild }
