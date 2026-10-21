import { createMcpAppHost, MCP_APPS_PROTOCOL, MCP_APP_MIME, type McpAppHost, type McpAppResource } from "../types/host";

const protocol: "2026-01-26" = MCP_APPS_PROTOCOL;
const mime: string = MCP_APP_MIME;

const host: McpAppHost = createMcpAppHost({
  sandboxOrigin: "https://sandbox.example.com",
  hostOrigin: "https://app.example.com",
  slot: document.createElement("div"),
  mcp: { request: async (method, params) => ({ method, params }) },
  hostContext: () => ({ theme: "dark", displayMode: "inline" }),
  onMessage: async (params) => typeof params === "object",
  onHide: (reason) => reason.length,
  maxHeight: 640,
});

async function demo(): Promise<void> {
  const shown: McpAppResource | null = await host.show({ toolName: "compare_options", input: { id: 1 }, result: {} });
  if (shown) {
    const uri: string = shown.uri;
    const border: boolean = shown.prefersBorder;
    void uri; void border;
  }
  host.notifyContext();
  const showing: boolean = host.isShowing() && host.ready();
  void showing;
  await host.hide("replaced");
  await host.destroy();
}

void demo; void protocol; void mime;
