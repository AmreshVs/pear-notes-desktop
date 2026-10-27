const EXTENSIONS = ['.js', '.jsx', '/index.js']

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
    if (!isRelative || error.code !== 'ERR_MODULE_NOT_FOUND') throw error
    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(specifier + extension, context)
      } catch {}
    }
    throw error
  }
}
