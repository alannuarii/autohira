// API Health Check - untuk Jenkins healthcheck
export function GET() {
  return Response.json({
    status: "ok",
    app: "AutoHIRA",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
