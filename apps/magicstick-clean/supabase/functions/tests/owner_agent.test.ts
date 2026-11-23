import { assertEquals } from "jsr:@std/assert@1";
import { cleanActions, splitReply } from "../owner-agent/logic.ts";

const ids = { quotes: new Set(["q1"]), prospects: new Set(["p1"]), growth: new Set(["fb-post"]) };

Deno.test("owner-agent: answer and actions block are split", () => {
  const r = splitReply('Voici.\n```actions\n[{"type":"open_section","section":"orders","label":"Ouvrir"}]\n```');
  assertEquals(r.reply, "Voici.");
  assertEquals((r.actions as unknown[]).length, 1);
  assertEquals(splitReply("Rien d'autre.").actions, []);
  assertEquals(splitReply("x ```actions not json``` y").actions, []);
});

Deno.test("owner-agent: only known actions with real ids survive", () => {
  const out = cleanActions([
    { type: "send_price", quote_id: "q1", amount: 180, label: "Prix" },
    { type: "send_price", quote_id: "unknown", amount: 180 },
    { type: "delete_everything" },
    { type: "prospect", prospect_id: "p1", status: "contacted", days: 5, label: "Contacté" },
    { type: "automation", kind: "unpaid", enabled: false, label: "Pause" },
    { type: "automation", kind: "not_a_kind", enabled: false },
    { type: "message", channel: "sms", text: "Bonjour", quote_id: "q1" },
    { type: "schedule", quote_id: "q1", date: "2026-11-27", window: "Morning (8am–11am)" },
  ], ids);
  assertEquals(out.map((a) => a.type), ["send_price", "prospect", "automation", "message", "schedule"]);
  assertEquals(out[0].sensitive, true);
  assertEquals(out[2].enabled, false);
});
