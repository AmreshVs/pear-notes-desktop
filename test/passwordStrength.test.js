import test from 'brittle'

import { getPasswordStrengthUi } from '../src/utils/passwordStrength.js'

const fallback = (key, text) => text

test('lock password is only valid when every rule passes', (t) => {
  t.is(getPasswordStrengthUi('abc', fallback).valid, false)
  t.is(getPasswordStrengthUi('Abcdefghij1', fallback).valid, false)
  const strong = getPasswordStrengthUi('Correct-Horse-9-Battery', fallback)
  t.is(strong.valid, true)
  t.is(strong.label, 'Strong')
})
