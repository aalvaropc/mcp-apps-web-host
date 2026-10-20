import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const HOST = "127.0.0.1";
const PAGE_PORT = Number(process.env.PAGE_PORT || 8000);
const SANDBOX_PORT = Number(process.env.SANDBOX_PORT || 8001);
const PAGE_ORIGIN = `http://${HOST}:${PAGE_PORT}`;
const SANDBOX_ORIGIN = `http://${HOST}:${SANDBOX_PORT}`;
const VIEW_URI = "ui://example/options.html";
const MIME = "text/html;profile=mcp-app";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const OPTIONS = [
  { id: "ground", label: "Ground", cost: 240, days: 3 },
  { id: "air", label: "Air", cost: 390, days: 1 },
  { id: "split", label: "Split shipment", cost: 310, days: 2 },
];

const TOOL = {
  name: "compare_options",
  description: "Compare the delivery options for an order and show them as an MCP App.",
  inputSchema: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] },
  _meta: { ui: { resourceUri: VIEW_URI } },
};

async function mcp(method, params) {
  if (method === "tools/list") return { tools: [TOOL] };
  if (method === "resources/read" && params?.uri === VIEW_URI) {
    return { contents: [{ uri: VIEW_URI, mimeType: MIME, text: await read("example/view.html"), _meta: { ui: { csp: {}, prefersBorder: true } } }] };
  }
  if (method === "tools/call" && params?.name === TOOL.name) {
    const text = `${OPTIONS.length} options for ${params.arguments?.order_id}`;
    return { content: [{ type: "text", text }], structuredContent: { order_id: params.arguments?.order_id, options: OPTIONS } };
  }
  throw Object.assign(new Error(`Unknown method ${method}`), { code: -32601 });
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, { "Cache-Control": "no-store", ...headers });
  response.end(body);
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const page = createServer(async (request, response) => {
  const { pathname } = new URL(request.url, PAGE_ORIGIN);
  if (request.method === "POST" && pathname === "/mcp") {
    let message;
    try {
      message = await body(request);
      const result = await mcp(message.method, message.params);
      send(response, 200, JSON.stringify({ jsonrpc: "2.0", id: message.id, result }), { "Content-Type": "application/json" });
    } catch (error) {
      const failure = { code: error.code ?? -32603, message: error.message };
      send(response, 200, JSON.stringify({ jsonrpc: "2.0", id: message?.id ?? null, error: failure }), { "Content-Type": "application/json" });
    }
    return;
  }
  if (pathname === "/") {
    const html = (await read("example/index.html")).replace("__SANDBOX_ORIGIN__", SANDBOX_ORIGIN);
    send(response, 200, html, { "Content-Type": "text/html; charset=utf-8" });
  } else if (pathname === "/page.js" || pathname === "/host.js") {
    const source = await read(pathname === "/host.js" ? "src/host.js" : "example/page.js");
    send(response, 200, source, { "Content-Type": "text/javascript; charset=utf-8" });
  } else {
    send(response, 404, "Not found");
  }
});

const sandbox = createServer(async (request, response) => {
  const { pathname } = new URL(request.url, SANDBOX_ORIGIN);
  if (pathname !== "/mcp-app/sandbox.html") {
    send(response, 404, "Not found");
    return;
  }
  send(response, 200, await read("sandbox/sandbox.html"), {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; "
      + `connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${PAGE_ORIGIN}`,
    "Referrer-Policy": "no-referrer",
  });
});

page.listen(PAGE_PORT, HOST, () => {
  sandbox.listen(SANDBOX_PORT, HOST, () => {
    console.log(`Page:    ${PAGE_ORIGIN}/`);
    console.log(`Sandbox: ${SANDBOX_ORIGIN}/mcp-app/sandbox.html`);
  });
});
