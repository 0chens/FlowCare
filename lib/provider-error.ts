export const connectionMessages = {
  missing_key: "Add RESCUETIME_API_KEY to .env.local, then restart FlowCare.",
  unauthorized: "RescueTime rejected the key. Check that it is an active RescueTime API key, then restart FlowCare.",
  rate_limited: "RescueTime is receiving too many requests. Wait a minute, then try again.",
  network: "The server could not reach RescueTime. Check its internet access or run the development server from a terminal with network access.",
  unavailable: "RescueTime is temporarily unavailable. Please try again shortly.",
  invalid_response: "RescueTime returned an unexpected data format. Please try again.",
} as const;
export class ProviderError extends Error {
  constructor(public readonly code: keyof typeof connectionMessages) { super(connectionMessages[code]); }
}
