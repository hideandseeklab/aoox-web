// Checks the unsaved-changes store and the link-click rules
// (`unsaved-changes.ts`). Run by `npm test`.
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clearUnsavedChanges,
  confirmDiscard,
  hasPendingDiscard,
  hasUnsavedChanges,
  isLeavingClick,
  registerUnsavedGuard,
  resolvePendingDiscard,
  setUnsaved,
  traversalDelta,
} from "./unsaved-changes.ts"

const HERE = "http://panel.test:3000/applications/a1?tab=environment"
const click = (over = {}) => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  target: "",
  hasDownload: false,
  href: "http://panel.test:3000/projects",
  ...over,
})

test("a plain click on another in-app page leaves", () => {
  assert.equal(isLeavingClick(click(), HERE), true)
  assert.equal(isLeavingClick(click({ href: "/projects/p1" }), HERE), true)
  assert.equal(isLeavingClick(click({ target: "_self" }), HERE), true)
  // Same path, other query: another page for the router.
  assert.equal(
    isLeavingClick(click({ href: "/applications/a1?tab=settings" }), HERE),
    true
  )
})

test("new-tab, download, external, hash-only and API links are left alone", () => {
  for (const over of [
    { button: 1 },
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { defaultPrevented: true },
    { target: "_blank" },
    { hasDownload: true },
    { href: "https://example.com/" },
    { href: "http://panel.test:3001/projects" },
    { href: "mailto:a@b.c" },
    { href: "/applications/a1?tab=environment#env" },
    { href: "/api/backups/b1/download" },
    { href: "/api" },
  ]) {
    assert.equal(isLeavingClick(click(over), HERE), false, JSON.stringify(over))
  }
  // "/apix" is a page, not the API prefix.
  assert.equal(isLeavingClick(click({ href: "/apix" }), HERE), true)
})

test("traversal delta falls back to one step back", () => {
  assert.equal(traversalDelta(4, 3), -1)
  assert.equal(traversalDelta(4, 5), 1)
  assert.equal(traversalDelta(4, 2), -2)
  assert.equal(traversalDelta(null, 3), -1)
  assert.equal(traversalDelta(undefined, undefined), -1)
})

test("confirmDiscard runs at once when clean or when no guard is mounted", () => {
  clearUnsavedChanges()
  let ran = 0
  confirmDiscard(() => ran++)
  assert.equal(ran, 1)
  setUnsaved("x", true)
  confirmDiscard(() => ran++) // no guard dialog mounted
  assert.equal(ran, 2)
  clearUnsavedChanges()
})

test("dirty + guard: asks, Stay keeps the changes, Discard clears and proceeds", () => {
  const unregister = registerUnsavedGuard()
  try {
    setUnsaved("editor", true)
    assert.equal(hasUnsavedChanges(), true)
    let ran = 0
    confirmDiscard(() => ran++)
    assert.equal(ran, 0)
    assert.equal(hasPendingDiscard(), true)
    resolvePendingDiscard(false)
    assert.equal(ran, 0)
    assert.equal(hasPendingDiscard(), false)
    assert.equal(hasUnsavedChanges(), true)

    confirmDiscard(() => ran++)
    resolvePendingDiscard(true)
    assert.equal(ran, 1)
    assert.equal(hasUnsavedChanges(), false)
    // A second answer (the dialog closing) does nothing more.
    resolvePendingDiscard(false)
    assert.equal(ran, 1)
  } finally {
    unregister()
    clearUnsavedChanges()
  }
})

test("sources clear on their own", () => {
  setUnsaved("a", true)
  setUnsaved("b", true)
  setUnsaved("a", false)
  assert.equal(hasUnsavedChanges(), true)
  setUnsaved("b", false)
  assert.equal(hasUnsavedChanges(), false)
})
