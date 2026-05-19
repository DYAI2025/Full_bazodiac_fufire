// Capture-DOM stub for page-render integration tests.
//
// Goal: verify that page modules produce DOM output strictly derived from
// the supplied API profile / mocked responses — never from baked-in demo
// strings. Pages call .innerHTML = `<template>` and .textContent = "…" and
// build subtrees via createElement + appendChild. We don't need a real DOM:
// we record every string that ever ends up in those slots and aggregate
// it. Tests then assert the aggregate satisfies noFakeDataGuard AND
// contains expected API values.
//
// What this stub deliberately does NOT do:
//  - parse innerHTML into real nodes (querySelector returns stub-nodes that
//    can still receive append/replaceWith and continue capturing).
//  - emulate layout, events, focus.
//  - validate HTML correctness.

export function installCaptureDom() {
  const captured = [];

  function recordString(s) {
    if (typeof s === 'string' && s.length > 0) captured.push(s);
  }

  function makeNode(tag = 'div') {
    const node = {
      tag,
      _children: [],
      _attrs: {},
      _listeners: {},
      _text: '',
      style: {
        cssText: '',
        marginTop: '',
        display: '',
        marginBottom: '',
      },
      hidden: false,
      type: '',
      disabled: false,
      value: '',
      classList: {
        _classes: new Set(),
        add(c)    { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        toggle(c, force) {
          const has = this._classes.has(c);
          if (force === undefined) { if (has) this._classes.delete(c); else this._classes.add(c); }
          else if (force) this._classes.add(c);
          else this._classes.delete(c);
          return this._classes.has(c);
        },
        contains(c) { return this._classes.has(c); },
      },
      get textContent() { return this._text; },
      set textContent(v) { this._text = String(v ?? ''); recordString(this._text); },
      get innerHTML() { return this._html || ''; },
      set innerHTML(v) {
        this._html = String(v ?? '');
        recordString(this._html);
        // For querySelector to find mount points referenced inside the
        // template, we extract class names from the HTML and pre-create
        // child stubs keyed by class. Crude but enough for our pages.
        const classRe = /class="([^"]+)"/g;
        let m;
        while ((m = classRe.exec(this._html)) !== null) {
          for (const cls of m[1].split(/\s+/)) {
            if (!this._mountByClass[cls]) {
              this._mountByClass[cls] = makeNode('div');
              this._mountByClass[cls].classList.add(cls);
            }
          }
        }
      },
      get className() { return this._attrs.class || ''; },
      set className(v) {
        this._attrs.class = String(v);
        for (const c of String(v).split(/\s+/)) if (c) this.classList.add(c);
      },
      _mountByClass: {},
      appendChild(c) { this._children.push(c); return c; },
      append(...kids) { for (const k of kids) this._children.push(k); },
      replaceWith(other) { /* tracked but no parent linkage */ if (other && typeof other === 'object') this._children.push(other); },
      before(...kids) { for (const k of kids) this._children.push(k); },
      after(...kids)  { for (const k of kids) this._children.push(k); },
      remove() {},
      setAttribute(k, v) { this._attrs[k] = String(v); },
      getAttribute(k) { return this._attrs[k] ?? null; },
      hasAttribute(k) { return k in this._attrs; },
      removeAttribute(k) { delete this._attrs[k]; },
      addEventListener(ev, cb) { (this._listeners[ev] ||= []).push(cb); },
      removeEventListener() {},
      querySelector(sel) {
        // Support only `.class` and `#id` selectors — pages use those.
        if (sel.startsWith('.')) return this._mountByClass[sel.slice(1)] || makeNode();
        if (sel.startsWith('#')) return makeNode();  // ID lookups → fresh stub
        return makeNode();
      },
      querySelectorAll() { return []; },
      get firstChild() { return this._children[0] || null; },
      contains() { return true; },
      focus() {},
    };
    return node;
  }

  const docRoot = makeNode('document-root');
  global.document = {
    createElement: (tag) => makeNode(tag),
    createTextNode: (txt) => ({ textContent: String(txt), _text: String(txt) }),
    getElementById: () => docRoot,
    body: docRoot,
    contains: () => true,
    addEventListener: () => {},
  };
  global.window = {
    location: { hash: '', href: '', search: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    __FUFIRE_FLAGS: {},
  };
  // sessionStorage and localStorage stubs (some pages persist on render).
  const sessionMap = new Map();
  const localMap   = new Map();
  global.sessionStorage = {
    getItem(k) { return sessionMap.has(k) ? sessionMap.get(k) : null; },
    setItem(k, v) { sessionMap.set(k, String(v)); },
    removeItem(k) { sessionMap.delete(k); },
  };
  global.localStorage = {
    getItem(k) { return localMap.has(k) ? localMap.get(k) : null; },
    setItem(k, v) { localMap.set(k, String(v)); },
    removeItem(k) { localMap.delete(k); },
  };

  return {
    rootNode: docRoot,
    captured,
    aggregate: () => captured.join('\n'),
    reset: () => { captured.length = 0; },
  };
}
