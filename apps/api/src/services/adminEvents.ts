import { EventEmitter } from "node:events";

export type AdminEvent =
  | { type: "ping" }
  | { type: "order_created"; orderId: string; code: string; totalCents: number }
  | { type: "order_paid"; orderId: string; code: string; totalCents: number };

const emitter = new EventEmitter();

export function publishAdminEvent(evt: AdminEvent) {
  emitter.emit("event", evt);
}

export function subscribeAdminEvents(onEvent: (evt: AdminEvent) => void) {
  emitter.on("event", onEvent);
  return () => emitter.off("event", onEvent);
}

