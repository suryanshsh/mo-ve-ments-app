import 'server-only'

export function logApiCall(
  model: string,
  inputTokens: number,
  outputTokens: number,
  userId: string,
): void {
  if (process.env.NODE_ENV !== 'production') {
    console.info('[ai-cost]', {
      model,
      inputTokens,
      outputTokens,
      userId,
    })

    return
  }

  void model
  void inputTokens
  void outputTokens
  void userId
}