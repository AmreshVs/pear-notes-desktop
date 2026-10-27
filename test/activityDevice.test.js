import test from 'brittle'

import { buildDeviceLabelOptions } from '../src/lib/activityDevice.js'

test('device platforms get translated names', (t) => {
  const options = buildDeviceLabelOptions((key) => key)
  t.is(options.platformNames.darwin, 'sync.platforms.macOS')
  t.is(options.platformNames.win32, 'sync.platforms.Windows')
  t.is(options.platformNames.ios, 'sync.platforms.iOS')
  t.is(options.unknownLabel, 'sync.platforms.unknown')
})
