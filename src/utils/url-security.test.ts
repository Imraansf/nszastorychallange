import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSafeYouTubeId,
  sanitizeExternalUrl,
  isAllowedModelUrl,
  sanitizeCesiumIonToken,
} from './url-security';

test('extractSafeYouTubeId accepts valid YouTube URLs and rejects spoofed hosts or injection', () => {
  assert.equal(extractSafeYouTubeId('https://www.youtube.com/watch?v=l11sW5KOi_g'), 'l11sW5KOi_g');
  assert.equal(extractSafeYouTubeId('https://youtu.be/oYEgdZ3iEKA'), 'oYEgdZ3iEKA');
  assert.equal(extractSafeYouTubeId('https://evil-youtu.be.attacker.com/abcd1234567'), null);
  assert.equal(extractSafeYouTubeId('https://www.youtube.com/watch?v=../../evil'), null);
  assert.equal(extractSafeYouTubeId('javascript:alert(1)'), null);
  assert.equal(extractSafeYouTubeId('http://www.youtube.com/watch?v=l11sW5KOi_g'), null);
});

test('sanitizeExternalUrl enforces https and trusted allowlist', () => {
  assert.equal(
    sanitizeExternalUrl('https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C'),
    'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C'
  );
  assert.equal(
    sanitizeExternalUrl('https://github.com/nasa/NASA-3D-Resources'),
    'https://github.com/nasa/NASA-3D-Resources'
  );
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('https://user:pass@nasa.gov/'), null);
  assert.equal(sanitizeExternalUrl('https://nasa.gov.evil.com/'), null);
});

test('isAllowedModelUrl permits safe local /model(s)/ paths and blocks traversal or external origins', () => {
  assert.equal(isAllowedModelUrl('/models/Apollo%20Lunar%20Module.glb'), true);
  assert.equal(isAllowedModelUrl('/model/dawn.glb'), true);
  assert.equal(isAllowedModelUrl('/models/../etc/passwd'), false);
  assert.equal(isAllowedModelUrl('//evil.com/model.glb'), false);
  assert.equal(isAllowedModelUrl('https://evil.com/model.glb'), false);
});

test('sanitizeCesiumIonToken allows JWT/alphanumeric tokens and drops invalid payloads', () => {
  assert.equal(sanitizeCesiumIonToken('  eyJhbGciOiJIUzI1NiJ9.abc_123  '), 'eyJhbGciOiJIUzI1NiJ9.abc_123');
  assert.equal(sanitizeCesiumIonToken('<script>alert(1)</script>'), '');
  assert.equal(sanitizeCesiumIonToken('a'.repeat(3000)), '');
});
