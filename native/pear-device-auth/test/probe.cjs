const auth = require('..')

async function main() {
  console.log('[probe] loadError:', auth.loadError() ? auth.loadError().message : 'none')
  console.log('[probe] isSupported:', auth.isSupported())

  if (process.argv.includes('--auth')) {
    console.log('[probe] calling authenticate() — a system dialog should appear...')
    try {
      const ok = await auth.authenticate('Probe: unlock a note')
      console.log('[probe] authenticate result:', ok)
    } catch (e) {
      console.log('[probe] authenticate error:', e.message)
    }
  }
}

main()
