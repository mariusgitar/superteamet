declare module '@netlify/functions' {
  export interface HandlerEvent {
    httpMethod: string;
    headers: Record<string, string | undefined>;
    body: string | null;
    path: string;
    queryStringParameters: Record<string, string | undefined> | null;
  }

  export interface HandlerContext {
    [key: string]: unknown;
  }

  export interface HandlerResponse {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
  }

  export type Handler = (
    event: HandlerEvent,
    context: HandlerContext,
  ) => Promise<HandlerResponse> | HandlerResponse;
}
