// Thrown by assertPlayerExists() and caught within the same Server Action
// that calls it (never allowed to propagate across the "use server"
// client/server boundary — Next.js does not preserve custom Error subclass
// identity across that boundary, so an `instanceof` check on the client side
// would silently never match in a real deployment; see
// src/server/actions/actionResult.ts). Actions convert this into a
// `{ ok: false, reason: "invalid_player" }` result before returning.
export class InvalidPlayerError extends Error {
  constructor(playerId: string) {
    super(`Player ${playerId} does not exist`);
    this.name = "InvalidPlayerError";
  }
}
