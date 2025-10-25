/** @typedef {import('pear-interface')} */ /* global Pear */

import './lib/notes'

document.querySelector('h1').addEventListener('click', (e) => { e.target.innerHTML = '🍐' })

Pear.updates(() => Pear.reload())
