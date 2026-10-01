interface JsonResponse {
  status(code: number): { json(payload: unknown): void }
}

export default function health(_request: Request, response: JsonResponse) {
  response.status(200).json({
    status: 'ok',
    service: 'brandjodo-web',
    timestamp: new Date().toISOString(),
  })
}
