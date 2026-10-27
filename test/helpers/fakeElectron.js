import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { moduleMocks } from './cjsMocks.js'

const SEALED_PREFIX = 'sealed:'

export function installFakeElectron() {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pear-notes-test-'))
  const safe = { available: true, backend: 'gnome_libsecret' }

  moduleMocks.electron = {
    app: { getPath: () => userData },
    safeStorage: {
      isEncryptionAvailable: () => safe.available,
      getSelectedStorageBackend: () => safe.backend,
      encryptString: (value) => Buffer.from(`${SEALED_PREFIX}${value}`),
      decryptString: (buffer) => {
        const text = buffer.toString()
        if (!text.startsWith(SEALED_PREFIX)) throw new Error('cannot decrypt')
        return text.slice(SEALED_PREFIX.length)
      }
    }
  }

  return {
    userData,
    safe,
    secretsFile: path.join(userData, 'secrets.json'),
    cleanup: () => fs.rmSync(userData, { recursive: true, force: true })
  }
}

export function withPlatform(platform, run) {
  const original = Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { value: platform })
  try {
    return run()
  } finally {
    Object.defineProperty(process, 'platform', original)
  }
}
