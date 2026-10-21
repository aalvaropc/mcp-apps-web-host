export const MCP_APPS_PROTOCOL: "2026-01-26";
export const MCP_APP_MIME: "text/html;profile=mcp-app";

/** The MCP client the host reads the view through: `tools/list` and `resources/read`. */
export interface McpRequester {
  request(method: string, params?: unknown): Promise<any>;
}

/** The `_meta.ui.csp` of a view resource; each list holds `https://` origins. */
export interface McpAppCsp {
  connectDomains?: string[];
  resourceDomains?: string[];
  frameDomains?: string[];
  baseUriDomains?: string[];
}

/** A tool's view, as `loadResource` and `show` resolve it. */
export interface McpAppResource {
  uri: string;
  html: string;
  csp: McpAppCsp;
  prefersBorder: boolean;
  invoking?: string;
  invoked?: string;
}

export interface McpAppHostOptions {
  /** The sandbox proxy's origin, for example `https://sandbox.example.com`; `null` disables views. */
  sandboxOrigin: string | null;
  /** The page's own origin, usually `location.origin`. */
  hostOrigin: string;
  /** The element the view's iframe is placed in. */
  slot: Element;
  mcp: McpRequester;
  /** Another window to host in; defaults to the global `window`. */
  window?: Window;
  /** Path of the sandbox page on the sandbox origin; default `/mcp-app/sandbox.html`. */
  proxyPath?: string;
  /** Only views whose URI starts with this prefix are loaded; default `ui://`. */
  uriPrefix?: string;
  mime?: string;
  protocol?: string;
  hostInfo?: { name: string; version: string };
  hostContext?: () => Record<string, unknown>;
  /** Handles `ui/message`; a truthy result (or resolved value) accepts it, anything else refuses it. */
  onMessage?: (params: any) => unknown | Promise<unknown>;
  onHide?: (reason: string) => void;
  /** Called once, after the view initialized and received its tool input and result. */
  onReady?: (resource: McpAppResource) => void;
  /** Called when a mounted view fails to initialize in time; the failed frame is already removed. */
  onError?: (error: Error) => void;
  frameTitle?: string;
  frameId?: string;
  minHeight?: number;
  maxHeight?: number;
  teardownTimeout?: number;
  /** Milliseconds a mounted view has to initialize, counted again from the sandbox page's `load`; default 5000, `0` or `Infinity` disables the limit. */
  readyTimeout?: number;
  rejectMessage?: string;
}

export interface McpAppShowRequest {
  toolName: string;
  input?: unknown;
  /** The MCP tool result (`content`, `structuredContent`, `_meta`). */
  result: unknown;
  /** Checked after the resource is read; `false` shows nothing. */
  stillWanted?: () => boolean;
}

export interface McpAppHost {
  loadResource(toolName: string): Promise<McpAppResource | null>;
  show(request: McpAppShowRequest): Promise<McpAppResource | null>;
  hide(reason?: string): Promise<void>;
  notifyContext(): void;
  isShowing(): boolean;
  ready(): boolean;
  destroy(): Promise<void>;
}

export function createMcpAppHost(options: McpAppHostOptions): McpAppHost;
