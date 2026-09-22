/**
 * Automated Verification Suite for Issue #51
 * 
 * Tests:
 * 1. Eye Icon Toggle Logic in PasswordInput.tsx and input.tsx
 * 2. handlePhoneKeyDown Keystroke Blocker in formValidators.tsx
 * 3. sanitizePhoneNumber input cleaning
 * 4. Browser Autofill & Form Attribute Boundaries across all pages
 * 5. Live Inline Phone Validation Warnings
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import type React from 'react';
import { handlePhoneKeyDown, sanitizePhoneNumber } from '../src/lib/validation/formValidators';

const ROOT_DIR = process.cwd();

function readFile(relativePath: string): string {
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log('🧪 Running Issue #51 Comprehensive Verification Test Suite');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// Group 1: Eye Icon Toggle Logic
// ----------------------------------------------------------------------------
console.log('📌 Test Group 1: Eye Icon Toggle Logic Standard');

runTest('PasswordInput.tsx renders Eye when password is hidden, EyeOff when visible', () => {
  const code = readFile('src/components/ui/PasswordInput.tsx');
  assert.ok(
    /isVisible\s*\?\s*\(?\s*<EyeOff[\s\S]*?:\s*\(?\s*<Eye\b/.test(code),
    'PasswordInput.tsx does not render EyeOff when true and Eye when false'
  );
  assert.ok(
    !/!isVisible\s*\?\s*<EyeOff/.test(code),
    'PasswordInput.tsx still contains inverted !isVisible condition'
  );
});

runTest('input.tsx (variant="password") renders Eye when password is hidden, EyeOff when visible', () => {
  const code = readFile('src/components/ui/input.tsx');
  assert.ok(
    /showPassword\s*\?\s*<EyeOff[\s\S]*?:\s*<Eye\b/.test(code),
    'input.tsx does not render EyeOff when true and Eye when false'
  );
  assert.ok(
    !/!showPassword\s*\?\s*<EyeOff/.test(code),
    'input.tsx still contains inverted !showPassword condition'
  );
});

// ----------------------------------------------------------------------------
// Group 2: handlePhoneKeyDown & sanitizePhoneNumber Unit Logic
// ----------------------------------------------------------------------------
console.log('\n📌 Test Group 2: handlePhoneKeyDown Event Blocker & Sanitization');

function createMockKeyEvent(key: string, ctrlKey = false, metaKey = false) {
  let defaultPrevented = false;
  return {
    event: {
      key,
      ctrlKey,
      metaKey,
      preventDefault: () => {
        defaultPrevented = true;
      },
    } as any as React.KeyboardEvent<HTMLInputElement>,
    isPrevented: () => defaultPrevented,
  };
}

runTest('handlePhoneKeyDown blocks alphabetic characters (v, a, z, Q, M)', () => {
  const alphabets = ['v', 'a', 'z', 'Q', 'M', 'c', 'x'];
  for (const letter of alphabets) {
    const { event, isPrevented } = createMockKeyEvent(letter);
    handlePhoneKeyDown(event);
    assert.strictEqual(isPrevented(), true, `Failed to block letter: "${letter}"`);
  }
});

runTest('handlePhoneKeyDown blocks unauthorized special characters (@, #, $, %, ^, !)', () => {
  const symbols = ['@', '#', '$', '%', '^', '!', '=', '_', '~'];
  for (const sym of symbols) {
    const { event, isPrevented } = createMockKeyEvent(sym);
    handlePhoneKeyDown(event);
    assert.strictEqual(isPrevented(), true, `Failed to block special character: "${sym}"`);
  }
});

runTest('handlePhoneKeyDown allows numeric digits (0-9)', () => {
  for (let i = 0; i <= 9; i++) {
    const { event, isPrevented } = createMockKeyEvent(String(i));
    handlePhoneKeyDown(event);
    assert.strictEqual(isPrevented(), false, `Blocked valid digit: "${i}"`);
  }
});

runTest('handlePhoneKeyDown allows phone format symbols (+, -, (, ), space)', () => {
  const phoneChars = ['+', '-', '(', ')', ' '];
  for (const ch of phoneChars) {
    const { event, isPrevented } = createMockKeyEvent(ch);
    handlePhoneKeyDown(event);
    assert.strictEqual(isPrevented(), false, `Blocked valid phone symbol: "${ch}"`);
  }
});

runTest('handlePhoneKeyDown allows navigation & editing keys (Backspace, Delete, Tab, ArrowLeft, Enter)', () => {
  const controlKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'];
  for (const k of controlKeys) {
    const { event, isPrevented } = createMockKeyEvent(k);
    handlePhoneKeyDown(event);
    assert.strictEqual(isPrevented(), false, `Blocked control key: "${k}"`);
  }
});

runTest('handlePhoneKeyDown allows Ctrl/Command shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X)', () => {
  const shortcuts = ['a', 'c', 'v', 'x'];
  for (const k of shortcuts) {
    const { event, isPrevented } = createMockKeyEvent(k, true);
    handlePhoneKeyDown(event);
    assert.strictEqual(isPrevented(), false, `Blocked Ctrl shortcut: "Ctrl+${k}"`);
  }
});

runTest('sanitizePhoneNumber removes any invalid non-phone characters from string', () => {
  assert.strictEqual(sanitizePhoneNumber('abc123def'), '123');
  assert.strictEqual(sanitizePhoneNumber('+1 (555) 234-5678 ext. 9'), '+1 (555) 234-5678  9');
  assert.strictEqual(sanitizePhoneNumber('vvv cv c vcvcv'), '   ');
});

// ----------------------------------------------------------------------------
// Group 3: Browser Autofill & Form Attribute Boundaries Across Pages
// ----------------------------------------------------------------------------
console.log('\n📌 Test Group 3: Browser Autofill & Field Attribute Boundaries');

runTest('SignupPage.tsx has autoComplete="off", tel field, new-password fields, and handlePhoneKeyDown', () => {
  const code = readFile('src/pages/public/SignupPage.tsx');
  assert.ok(code.includes('autoComplete="off"'), 'Missing form autoComplete="off"');
  assert.ok(code.includes('autoComplete="given-name"'), 'Missing firstName autoComplete');
  assert.ok(code.includes('autoComplete="family-name"'), 'Missing lastName autoComplete');
  assert.ok(code.includes('autoComplete="email"'), 'Missing email autoComplete');
  assert.ok(code.includes('name="phoneNumber"'), 'Missing phone name="phoneNumber"');
  assert.ok(code.includes('autoComplete="tel"'), 'Missing phone autoComplete="tel"');
  assert.ok(code.includes('onKeyDown={handlePhoneKeyDown}'), 'Missing phone onKeyDown={handlePhoneKeyDown}');
  assert.ok(code.includes('autoComplete="new-password"'), 'Missing password autoComplete="new-password"');
});

runTest('OnboardingPage.tsx has name="phoneNumber", autoComplete="tel", and handlePhoneKeyDown across all roles', () => {
  const code = readFile('src/pages/public/OnboardingPage.tsx');
  const phoneKeyDownMatches = (code.match(/onKeyDown=\{handlePhoneKeyDown\}/g) || []).length;
  assert.ok(phoneKeyDownMatches >= 3, `Expected at least 3 onKeyDown={handlePhoneKeyDown}, found ${phoneKeyDownMatches}`);
  const telMatches = (code.match(/autoComplete="tel"/g) || []).length;
  assert.ok(telMatches >= 3, `Expected at least 3 autoComplete="tel", found ${telMatches}`);
});

runTest('ResetNewPasswordPage.tsx has autoComplete="off" and autoComplete="new-password"', () => {
  const code = readFile('src/pages/public/ResetNewPasswordPage.tsx');
  assert.ok(code.includes('autoComplete="off"'), 'Missing form autoComplete="off"');
  assert.ok(code.includes('autoComplete="new-password"'), 'Missing autoComplete="new-password"');
  assert.ok(code.includes('name="newPassword"'), 'Missing name="newPassword"');
  assert.ok(code.includes('name="confirmPassword"'), 'Missing name="confirmPassword"');
});

runTest('EditProfilePage.tsx has name="phoneNumber", autoComplete="tel", and handlePhoneKeyDown', () => {
  const code = readFile('src/pages/client/EditProfilePage.tsx');
  assert.ok(code.includes('name="phoneNumber"'), 'Missing name="phoneNumber"');
  assert.ok(code.includes('autoComplete="tel"'), 'Missing autoComplete="tel"');
  assert.ok(code.includes('onKeyDown={handlePhoneKeyDown}'), 'Missing onKeyDown={handlePhoneKeyDown}');
});

runTest('SecuritySettingsPage.tsx has password autoComplete attributes, and MFA phone validation', () => {
  const code = readFile('src/pages/client/settings/SecuritySettingsPage.tsx');
  assert.ok(code.includes('autoComplete="current-password"'), 'Missing autoComplete="current-password"');
  assert.ok(code.includes('autoComplete="new-password"'), 'Missing autoComplete="new-password"');
  assert.ok(code.includes('name="mfaPhoneNumber"'), 'Missing name="mfaPhoneNumber"');
  assert.ok(code.includes('autoComplete="tel"'), 'Missing autoComplete="tel"');
  assert.ok(code.includes('onKeyDown={handlePhoneKeyDown}'), 'Missing onKeyDown={handlePhoneKeyDown}');
});

runTest('SymbioteSettingsPage.tsx has password and phone attributes with handlePhoneKeyDown', () => {
  const code = readFile('src/pages/symbiote/SymbioteSettingsPage.tsx');
  assert.ok(code.includes('autoComplete="current-password"'), 'Missing autoComplete="current-password"');
  assert.ok(code.includes('autoComplete="new-password"'), 'Missing autoComplete="new-password"');
  assert.ok(code.includes('name="phoneNumber"'), 'Missing name="phoneNumber"');
  assert.ok(code.includes('name="mfaPhoneNumber"'), 'Missing name="mfaPhoneNumber"');
  const phoneKeyDownMatches = (code.match(/onKeyDown=\{handlePhoneKeyDown\}/g) || []).length;
  assert.ok(phoneKeyDownMatches >= 2, `Expected at least 2 onKeyDown={handlePhoneKeyDown}, found ${phoneKeyDownMatches}`);
});

runTest('AddUserModal.tsx has autoComplete="off" and autoComplete="new-password"', () => {
  const code = readFile('src/components/admin/AddUserModal.tsx');
  assert.ok(code.includes('autoComplete="off"'), 'Missing form autoComplete="off"');
  assert.ok(code.includes('name="newEmail"'), 'Missing name="newEmail"');
  assert.ok(code.includes('name="newPassword"'), 'Missing name="newPassword"');
  assert.ok(code.includes('autoComplete="new-password"'), 'Missing autoComplete="new-password"');
});

// ----------------------------------------------------------------------------
// Group 4: Live Inline Phone Validation Warnings
// ----------------------------------------------------------------------------
console.log('\n📌 Test Group 4: Live Inline Phone Validation');

runTest('Inline minimum 8 digits warning is rendered in Signup, EditProfile, SecuritySettings & SymbioteSettings', () => {
  const files = [
    'src/pages/public/SignupPage.tsx',
    'src/pages/client/EditProfilePage.tsx',
    'src/pages/client/settings/SecuritySettingsPage.tsx',
    'src/pages/symbiote/SymbioteSettingsPage.tsx',
  ];
  for (const f of files) {
    const code = readFile(f);
    assert.ok(
      code.includes('Minimum 8 digits required for a valid phone number'),
      `Missing inline phone validation notice in ${f}`
    );
  }
});

console.log('================================================================');
console.log(`📊 Issue #51 Test Summary: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests > 0) {
  console.log(`❌ Failed Tests: ${failedTests}`);
  process.exit(1);
} else {
  console.log('🎉 All Issue #51 verification tests passed cleanly!');
}
console.log('================================================================\n');
