import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const page = readFileSync(new URL("../sandbox/sandbox.html", import.meta.url), "utf8");
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];
const HOST = "http://127.0.0.1:8000";
const SANDBOX = "http://localhost:8000";
const plain = (value) => JSON.parse(JSON.stringify(value));

function fakeView() {
  const loads = [];
  const sent = [];
  return {
    attributes: {}, removed: false, sent,
    contentWindow: { postMessage: (message, target) => sent.push({ message: plain(message), target }) },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, fn) { if (type === "load") loads.push(fn); },
    remove() { this.removed = true; },
    load() { for (const fn of loads) fn(); },
  };
}

function proxy({ host = HOST, origin = SANDBOX, ancestors = [HOST], framed = true } = {}) {
  const listeners = [];
  const toHost = [];
  const views = [];
  const parent = { postMessage: (message, target) => toHost.push({ message: plain(message), target }) };
  const window = { addEventListener: (type, fn) => { if (type === "message") listeners.push(fn); } };
  window.parent = framed ? parent : window;
  const location = { search: host === null ? "" : `?host=${encodeURIComponent(host)}`, origin, ancestorOrigins: ancestors ?? undefined };
  const document = {
    createElement: () => { const view = fakeView(); views.push(view); return view; },
    body: { append: (node) => { node.appended = true; } },
  };
  vm.runInContext(script, vm.createContext({ window, document, location, URLSearchParams }));
  const fromHost = (data, from = HOST) => { for (const fn of listeners) fn({ source: parent, origin: from, data }); };
  return { toHost, views, fromHost, listeners };
}

function loaded(params = {}) {
  const sandbox = proxy();
  sandbox.fromHost({ jsonrpc: "2.0", method: "ui/notifications/sandbox-resource-ready", params: { html: "<p>view</p>", ...params } });
  const view = sandbox.views.at(-1);
  return { ...sandbox, view };
}

test("the proxy stays silent unless it is framed by the host it was given", () => {
  for (const options of [
    { host: null }, { host: "javascript:alert(1)" }, { host: "https://host.example.com/app" }, { host: SANDBOX },
    { framed: false }, { ancestors: ["https://evil.example.com"] },
  ]) {
    const sandbox = proxy(options);
    assert.deepEqual([sandbox.toHost, sandbox.listeners.length], [[], 0], JSON.stringify(options));
  }
  for (const ancestors of [[HOST], null, ["null"]]) {
    assert.deepEqual(proxy({ ancestors }).toHost, [{ message: { jsonrpc: "2.0", method: "ui/notifications/sandbox-proxy-ready", params: {} }, target: HOST }]);
  }
});

test("the view gets only the sandbox tokens the allowlist grants and a CSP built from its https origins", () => {
  const { view } = loaded({
    html: "<!DOCTYPE html>\n<p>view</p>",
    sandbox: "allow-scripts allow-same-origin allow-top-navigation allow-forms allow-popups-to-escape-sandbox",
    csp: {
      connectDomains: ["https://api.example.com", "http://plain.example.com", "https://path.example.com/x", "'unsafe-eval'", "https://a.example.com; script-src *"],
      resourceDomains: ["https://cdn.example.com:8443"], frameDomains: "https://not-a-list.example.com",
    },
  });
  assert.equal(view.attributes.sandbox, "allow-scripts allow-forms");
  assert.equal(view.attributes.referrerpolicy, "no-referrer");
  assert.equal(view.appended, true);
  const [, policy, body] = view.srcdoc.match(/^<!doctype html><meta http-equiv="Content-Security-Policy" content="([^"]*)">([\s\S]*)$/);
  assert.equal(body, "\n<p>view</p>");
  assert.deepEqual(policy.split("; "), [
    "default-src 'none'",
    "script-src 'unsafe-inline' https://cdn.example.com:8443",
    "style-src 'unsafe-inline' https://cdn.example.com:8443",
    "img-src data: https://cdn.example.com:8443",
    "font-src data: https://cdn.example.com:8443",
    "media-src https://cdn.example.com:8443",
    "connect-src https://api.example.com",
    "frame-src 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'none'",
  ]);
  assert.equal(loaded({ sandbox: undefined }).view.attributes.sandbox, "allow-scripts");
  assert.match(loaded({ csp: undefined }).view.srcdoc, /connect-src 'none'; frame-src 'none'/);
});

test("messages cross only between the host and the current view, and proxy methods never cross", () => {
  const sandbox = proxy();
  const resource = { jsonrpc: "2.0", method: "ui/notifications/sandbox-resource-ready", params: { html: "<p>view</p>" } };
  sandbox.fromHost(resource, "https://evil.example.com");
  for (const fn of sandbox.listeners) fn({ source: {}, origin: HOST, data: resource });
  assert.equal(sandbox.views.length, 0, "only the host may load a view");
  sandbox.fromHost(resource);
  const view = sandbox.views[0];
  const fromView = (data, source = view.contentWindow) => { for (const fn of sandbox.listeners) fn({ source, origin: "null", data }); };

  sandbox.fromHost({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2026-01-26" } });
  sandbox.fromHost({ jsonrpc: "2.0", method: "ui/notifications/sandbox-view-removed", params: {} });
  sandbox.fromHost({ jsonrpc: "2.0", id: 2, result: {} }, "https://evil.example.com");
  assert.deepEqual(view.sent, [{ message: { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2026-01-26" } }, target: "*" }]);

  const before = sandbox.toHost.length;
  fromView({ jsonrpc: "2.0", id: 1, method: "ui/initialize", params: {} });
  fromView({ jsonrpc: "2.0", method: "ui/notifications/sandbox-resource-ready", params: { html: "<p>spoofed</p>" } });
  fromView({ jsonrpc: "2.0", method: "ui/notifications/sandbox-view-removed", params: {} });
  fromView({ jsonrpc: "1.0", method: "ui/initialize" });
  fromView("ui/initialize");
  fromView({ jsonrpc: "2.0", method: "ui/initialize" }, {});
  assert.deepEqual(sandbox.toHost.slice(before), [{ message: { jsonrpc: "2.0", id: 1, method: "ui/initialize", params: {} }, target: HOST }]);
  assert.equal(sandbox.views.length, 1, "a view cannot load another view");
});

test("a view that navigates away is removed and the host is told; a new resource replaces the view", () => {
  const { view, toHost, fromHost, views } = loaded();
  view.load();
  assert.equal(view.removed, false, "the first load is the view itself");
  view.load();
  assert.equal(view.removed, true);
  assert.deepEqual(toHost.at(-1), { message: { jsonrpc: "2.0", method: "ui/notifications/sandbox-view-removed", params: { reason: "navigated" } }, target: HOST });
  fromHost({ jsonrpc: "2.0", method: "ui/notifications/sandbox-resource-ready", params: { html: "<p>one</p>" } });
  fromHost({ jsonrpc: "2.0", method: "ui/notifications/sandbox-resource-ready", params: { html: "<p>two</p>" } });
  assert.equal(views.length, 3);
  assert.deepEqual(views.slice(1).map((item) => item.removed), [true, false]);
  const sent = toHost.length;
  views[1].load();
  views[1].load();
  assert.equal(toHost.length, sent, "a replaced view's navigation is not reported");
});
