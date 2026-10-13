// Minimal Express-like shim so the original Mangaverse server handlers run
// unchanged on top of Web Request/Response (TanStack Start server routes).

type Handler = (req: ShimRequest, res: ShimResponse) => unknown;

export interface ShimRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
  body: any;
  headers: Headers;
  url: URL;
}

export class ShimResponse {
  statusCode = 200;
  headers = new Headers();
  body: BodyInit | null = null;

  status(code: number) {
    this.statusCode = code;
    return this;
  }
  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }
  json(data: unknown) {
    this.headers.set("Content-Type", "application/json; charset=utf-8");
    this.body = JSON.stringify(data);
    return this;
  }
  send(data: BodyInit) {
    this.body = data;
    return this;
  }
  redirect(url: string) {
    this.statusCode = 302;
    this.headers.set("Location", url);
    return this;
  }
  toResponse(): Response {
    return new Response(this.body, {
      status: this.statusCode,
      headers: this.headers,
    });
  }
}

interface RouteEntry {
  method: string;
  segments: string[];
  handler: Handler;
}

export class ShimApp {
  private routes: RouteEntry[] = [];

  private add(method: string, path: string, handler: Handler) {
    this.routes.push({
      method,
      segments: path.split("/").filter(Boolean),
      handler,
    });
  }

  get(path: string, handler: Handler) {
    this.add("GET", path, handler);
  }
  post(path: string, handler: Handler) {
    this.add("POST", path, handler);
  }
  put(path: string, handler: Handler) {
    this.add("PUT", path, handler);
  }
  delete(path: string, handler: Handler) {
    this.add("DELETE", path, handler);
  }
  use(_arg: unknown) {
    // static/middleware not needed in the port
  }

  private match(route: RouteEntry, pathSegments: string[]): Record<string, string> | null {
    if (route.segments.length !== pathSegments.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < route.segments.length; i++) {
      const seg = route.segments[i];
      if (seg.startsWith(":")) {
        params[seg.slice(1)] = decodeURIComponent(pathSegments[i]);
      } else if (seg !== pathSegments[i]) {
        return null;
      }
    }
    return params;
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    let body: any = undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      const text = await request.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
    }

    for (const route of this.routes) {
      if (route.method !== request.method) continue;
      const params = this.match(route, pathSegments);
      if (!params) continue;

      const req: ShimRequest = {
        method: request.method,
        path: url.pathname,
        query,
        params,
        body,
        headers: request.headers,
        url,
      };
      const res = new ShimResponse();
      await route.handler(req, res);
      return res.toResponse();
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
