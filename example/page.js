import { createMcpAppHost } from "/host.js";

const $ = (id) => document.getElementById(id);
let nextId = 1;
let theme = "light";

function log(text) {
  const item = document.createElement("li");
  item.textContent = text;
  $("log").append(item);
}

const mcp = {
  async request(method, params) {
    const response = await fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    });
    const answer = await response.json();
    if (answer.error) throw new Error(answer.error.message);
    return answer.result;
  },
};

const host = createMcpAppHost({
  sandboxOrigin: document.querySelector('meta[name="sandbox-origin"]').content,
  hostOrigin: location.origin,
  slot: $("slot"),
  mcp,
  uriPrefix: "ui://example/",
  hostInfo: { name: "mcp-apps-web-host example", version: "1.0.0" },
  hostContext: () => ({ theme, displayMode: "inline", containerDimensions: { width: $("slot").clientWidth } }),
  onMessage: async (params) => {
    const text = params?.content?.text ?? "";
    const accepted = /^Pick (ground|air)$/.test(text);
    log(`ui/message "${text}": ${accepted ? "accepted" : "refused"}`);
    return accepted;
  },
  onHide: (reason) => log(`view removed (${reason})`),
  rejectMessage: "The page only takes ground or air",
  frameTitle: "Delivery options (MCP App)",
});

$("call").addEventListener("click", async () => {
  const input = { order_id: `ORD-${100 + nextId}` };
  const result = await mcp.request("tools/call", { name: "compare_options", arguments: input });
  log(`tools/call compare_options: ${result.content[0].text}`);
  const resource = await host.show({ toolName: "compare_options", input, result });
  log(resource ? `showing ${resource.uri}` : "the tool has no MCP App view");
});

$("theme").addEventListener("click", () => {
  theme = theme === "light" ? "dark" : "light";
  $("theme").textContent = `Switch to ${theme === "light" ? "dark" : "light"}`;
  host.notifyContext();
  log(`host context: theme ${theme}`);
});

$("hide").addEventListener("click", () => host.hide("hidden by the page"));
