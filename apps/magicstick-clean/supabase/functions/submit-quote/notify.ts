// Emails sent right after a quote (or booking request) is saved: one to the
// owner with every detail, one short confirmation to the client when they
// gave an email address. Built here as plain functions so the tests can check
// the wording without sending anything.
//
// The owner reads French; the client gets their own language.

import type { QuoteInput } from "./validate.ts";

const NONE_FR = "Non précisé";

function line(label: string, value: string | null | undefined): string {
  return `${label} : ${value && String(value).trim() ? value : NONE_FR}`;
}

export function ownerEmail(q: QuoteInput, uploadsMissing = 0): { subject: string; text: string } {
  const kind = q.source === "booking" ? "Demande de réservation" : "Demande de devis";
  const home = [q.home_type, q.bedrooms && `${q.bedrooms} ch.`, q.bathrooms && `${q.bathrooms} sdb`]
    .filter(Boolean).join(", ");
  const files = [
    q.photo_paths.length ? `${q.photo_paths.length} photo(s)` : null,
    q.video_path ? "1 vidéo" : null,
  ].filter(Boolean).join(", ");
  const text = [
    `${kind} de ${q.name}`,
    "",
    line("Téléphone", q.phone),
    line("Courriel", q.email),
    q.phone || q.email ? null : line("Contact", q.contact),
    line("Adresse ou secteur", q.address),
    line("Zone", q.zone),
    line("Service", q.service),
    line("Fréquence", q.frequency),
    line("Superficie approximative", q.home_size),
    line("Maison", home || null),
    line("Animaux", q.pets),
    line("Date souhaitée", q.preferred_date),
    q.source === "booking" ? line("Plage horaire", q.preferred_time) : null,
    line("Fichiers", files ? `${files} (voir le tableau de bord)` : null),
    uploadsMissing > 0 ? `Attention : ${uploadsMissing} fichier(s) ne sont pas arrivés.` : null,
    line("Langue du client", q.lang === "fr" ? "français" : "anglais"),
    "",
    "Message :",
    q.message || "(aucun)",
    "",
    "Répondez le jour même : https://magicstickclean.ca/admin.html",
  ].filter((l) => l !== null).join("\n");
  return { subject: `${kind} : ${q.service} (${q.name})`, text };
}

export function clientEmail(q: QuoteInput): { subject: string; text: string } {
  if (q.lang === "fr") {
    const what = q.source === "booking" ? "votre demande de réservation" : "votre demande de devis";
    return {
      subject: "Magicstick Clean a bien reçu votre demande",
      text: `Bonjour ${q.name},\n\nMerci ! Nous avons bien reçu ${what} (${q.service}). ` +
        "Nous vous répondons le jour même pour confirmer le prix et la date. Rien n'est à payer en ligne.\n\n" +
        "Pour toute question : (343) 843-7761 (appel ou texto) ou magicstickclean@gmail.com.\n\n— Magicstick Clean\nhttps://magicstickclean.ca",
    };
  }
  const what = q.source === "booking" ? "your booking request" : "your quote request";
  return {
    subject: "Magicstick Clean received your request",
    text: `Hi ${q.name},\n\nThanks! We received ${what} (${q.service}). ` +
      "We'll reply the same day to confirm the price and the date. Nothing to pay online.\n\n" +
      "Questions? Call or text (343) 843-7761, or email magicstickclean@gmail.com.\n\n— Magicstick Clean\nhttps://magicstickclean.ca",
  };
}
