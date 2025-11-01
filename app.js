/** @typedef {import('pear-interface')} */ /* global Pear */

import { createInvite, destroy, getAllNotes, insertData, insertNote, pairUser, ready, requestWriter, startPairing } from './backend/notes'

const args = Pear.config.args

ready()

Pear.teardown(() => destroy())

document.querySelector('h1').innerHTML = `Notes app - ${args[0]}`

document.querySelector('h1').addEventListener('click', (e) => { e.target.innerHTML = '🍐' })

document.querySelector('#insertData').addEventListener('click', async () => {
  await insertData()
})

document.querySelector('#getAllNotes').addEventListener('click', async () => {
  await getAllNotes()
})

document.querySelector('#insertNote').addEventListener('click', async () => {
  const key = document.querySelector('#noteKey').value
  const value = document.querySelector('#noteValue').value
  await insertNote({ key, value })
  await getAllNotes()
  document.querySelector('#noteKey').value = ''
  document.querySelector('#noteValue').value = ''
})

document.querySelector('#requestWriter').addEventListener('click', async () => {
  await requestWriter()
})

document.querySelector('#createInvite').addEventListener('click', async () => {
  createInvite()
})

document.querySelector('#startPairing').addEventListener('click', async () => {
  startPairing()
})

document.querySelector('#pairUser').addEventListener('click', async () => {
  const invite = document.querySelector('#inviteValue').value
  await pairUser(invite)
  document.querySelector('#inviteValue').value = ''
})


// Pear.updates(() => Pear.reload())
