export default function handler(_request: Request): Response {
  return Response.json({
    status: 'ok',
    service: 'brandjodo-web',
    timestamp: new Date().toISOString(),
  })
}
