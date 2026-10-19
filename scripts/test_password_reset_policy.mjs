import assert from "node:assert/strict";
import {
  TEMPORARY_PASSWORD,
  allowedTargetRoles,
  canResetPassword,
  isStaffRole,
  isValidTargetUid,
  loginFromEmail,
} from "../src/lib/password-reset-policy.ts";

console.log("=================================================");
console.log("AGENDA LAB PASSWORD RESET POLICY TEST HARNESS");
console.log("=================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`[PASS] Test ${totalCount}: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalCount}: ${name}`);
    console.error(err);
    throw err;
  }
}

runTest("Temporary password is the app default", () => {
  assert.equal(TEMPORARY_PASSWORD, "123456");
});

runTest("isStaffRole recognizes admin and secretary only", () => {
  assert.equal(isStaffRole("admin"), true);
  assert.equal(isStaffRole("secretario"), true);
  assert.equal(isStaffRole("professor"), false);
  assert.equal(isStaffRole(null), false);
  assert.equal(isStaffRole(undefined), false);
  assert.equal(isStaffRole("coordenador"), false);
});

runTest("admin can target professors and secretaries", () => {
  assert.deepEqual(allowedTargetRoles("admin"), ["professor", "secretario"]);
});

runTest("secretary can target professors only", () => {
  assert.deepEqual(allowedTargetRoles("secretario"), ["professor"]);
});

runTest("professor and unknown roles cannot target anyone", () => {
  assert.deepEqual(allowedTargetRoles("professor"), []);
  assert.deepEqual(allowedTargetRoles(undefined), []);
  assert.deepEqual(allowedTargetRoles("coordenador"), []);
});

runTest("canResetPassword matrix", () => {
  assert.equal(canResetPassword("admin", "professor"), true);
  assert.equal(canResetPassword("admin", "secretario"), true);
  assert.equal(canResetPassword("admin", "admin"), false);
  assert.equal(canResetPassword("secretario", "professor"), true);
  assert.equal(canResetPassword("secretario", "secretario"), false);
  assert.equal(canResetPassword("secretario", "admin"), false);
  assert.equal(canResetPassword("professor", "professor"), false);
  assert.equal(canResetPassword(undefined, "professor"), false);
  assert.equal(canResetPassword("admin", undefined), false);
});

runTest("loginFromEmail extracts the app login", () => {
  assert.equal(loginFromEmail("Maria.Silva@labschool.app"), "maria.silva");
  assert.equal(loginFromEmail("  joao@labschool.app  "), "joao");
  assert.equal(loginFromEmail("user@example.com"), null);
  assert.equal(loginFromEmail("@labschool.app"), null);
  assert.equal(loginFromEmail(null), null);
  assert.equal(loginFromEmail(undefined), null);
});

runTest("isValidTargetUid accepts Firebase-like ids only", () => {
  assert.equal(isValidTargetUid("AbC123xyz"), true);
  assert.equal(isValidTargetUid(" abc123 "), true);
  assert.equal(isValidTargetUid(""), false);
  assert.equal(isValidTargetUid("   "), false);
  assert.equal(isValidTargetUid("abc 123"), false);
  assert.equal(isValidTargetUid("abc/def"), false);
  assert.equal(isValidTargetUid(null), false);
  assert.equal(isValidTargetUid("a".repeat(129)), false);
});

console.log(`\n${passedCount}/${totalCount} testes passaram.`);
if (passedCount !== totalCount) process.exit(1);
