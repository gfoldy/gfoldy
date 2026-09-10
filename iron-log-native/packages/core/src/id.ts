/** Short, collision-resistant id (time + randomness), matching the web app. */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
