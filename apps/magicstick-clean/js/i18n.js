// Site-wide EN/FR translations. Every page loads this before its own
// script. Static text is tagged in the HTML with data-i18n (textContent),
// data-i18n-html (innerHTML, for strings with an embedded link/tag), or
// data-i18n-placeholder (input/textarea placeholder). Dynamic strings
// built in JS call MagicstickI18N.t('key').
(function () {
  const STRINGS = {
    // ---------- shared nav / footer ----------
    'nav.beforeAfter': { en: 'Before & After', fr: 'Avant/Après' },
    'nav.services': { en: 'Services', fr: 'Services' },
    'nav.howItWorks': { en: 'How it works', fr: 'Comment ça marche' },
    'nav.faq': { en: 'FAQ', fr: 'FAQ' },
    'nav.serviceArea': { en: 'Service area', fr: 'Zone desservie' },
    'nav.bookOnline': { en: 'Book online', fr: 'Réserver en ligne' },
    'nav.workWithUs': { en: 'Work With Us', fr: 'Travailler avec nous' },
    'nav.myAccount': { en: 'My account', fr: 'Mon compte' },
    'nav.getQuote': { en: 'Get a quote', fr: 'Demander un devis' },
    'nav.learnMore': { en: 'Learn more', fr: 'En savoir plus' },
    'nav.ownerBrand': { en: 'Magicstick Clean — Owner', fr: 'Magicstick Clean — Propriétaire' },
    'footer.tagline': { en: 'Trusted home cleaning in Clarence-Rockland, Ottawa & Gatineau', fr: 'Entretien ménager de confiance à Clarence-Rockland, Ottawa et Gatineau' },
    'footer.copyright': { en: '© 2026 Magicstick Clean', fr: '© 2026 Magicstick Clean' },
    'common.optional': { en: '(optional)', fr: '(optionnel)' },
    'common.notSpecified': { en: 'Not specified', fr: 'Non précisé' },
    'common.none': { en: '(none)', fr: '(aucune)' },
    'common.callOrText': { en: 'or call/text 343-843-7761', fr: 'ou appelle/texte le 343-843-7761' },

    // ---------- index.html: zone modal ----------
    'zone.title1': { en: 'Which area are you in?', fr: 'Dans quel secteur es-tu?' },
    'zone.desc1': { en: 'So I can give you accurate scheduling and pricing.', fr: 'Pour te donner un horaire et un prix précis.' },
    'zone.rockland': { en: 'Rockland-Orléans', fr: 'Rockland-Orléans' },
    'zone.ottawaGatineau': { en: 'Ottawa-Gatineau', fr: 'Ottawa-Gatineau' },
    'zone.skip': { en: "I'm not sure / somewhere else", fr: "Je ne suis pas sûr / ailleurs" },
    'zone.title2': { en: "You're in luck.", fr: 'Bonne nouvelle.' },
    'zone.desc2': { en: 'Get 15% off your first cleaning.', fr: 'Obtiens 15% de rabais sur ton premier nettoyage.' },
    'zone.desc2Zone': { en: 'Get 15% off your first cleaning in {zone}.', fr: 'Obtiens 15% de rabais sur ton premier nettoyage à {zone}.' },
    'zone.claim': { en: 'Claim my 15% off', fr: 'Profiter du 15% de rabais' },
    'zone.later': { en: 'Maybe later', fr: 'Peut-être plus tard' },
    'zone.tagPrefix': { en: 'Serving {zone}', fr: 'Dessert {zone}' },
    'zone.dismiss': { en: 'Dismiss', fr: 'Fermer' },
    'zone.step3.title': { en: 'Almost done.', fr: 'Presque fini.' },
    'zone.step3.desc': { en: "Just your name and a way to reach you — you'll fill in the rest of the details next.", fr: 'Juste ton nom et un moyen de te joindre — tu rempliras le reste des détails ensuite.' },
    'zone.step3.submit': { en: 'Continue to my quote', fr: 'Continuer vers mon devis' },

    // ---------- index.html: hero ----------
    'home.hero.tag': { en: 'First-time client special', fr: 'Offre nouveaux clients' },
    'home.hero.title': { en: "Canada's most affordable, most efficient clean.", fr: 'Le nettoyage le plus abordable et le plus efficace au Canada.' },
    'home.hero.lede': { en: 'Magicstick Clean is a locally owned cleaning service serving Clarence-Rockland, Ottawa, and Gatineau. Homes, rentals, and businesses alike, cleaned with care.', fr: 'Magicstick Clean est une entreprise de nettoyage locale desservant Clarence-Rockland, Ottawa et Gatineau. Maisons, locations et commerces, nettoyés avec soin.' },
    'home.hero.ctaQuote': { en: 'Get a free quote', fr: 'Devis gratuit' },
    'home.hero.ctaServices': { en: 'See services & pricing', fr: 'Voir services et prix' },

    // ---------- index.html: gallery ----------
    'home.gallery.title': { en: 'See the difference', fr: 'Vois la différence' },
    'home.gallery.subtitle': { en: 'Real jobs, real homes. No stock photos.', fr: 'De vrais travaux, de vraies maisons. Aucune photo générique.' },
    'home.gallery.hardwood': { en: 'Hardwood floor reset', fr: 'Remise à neuf d’un plancher de bois' },
    'home.gallery.bathroom': { en: 'Bathroom deep clean', fr: 'Nettoyage en profondeur d’une salle de bain' },
    'home.gallery.fridge': { en: 'Fridge & freezer detail', fr: 'Détail réfrigérateur et congélateur' },
    'home.gallery.before': { en: 'BEFORE', fr: 'AVANT' },
    'home.gallery.after': { en: 'AFTER', fr: 'APRÈS' },
    'home.gallery.cta': { en: 'Want your home to look like this?', fr: 'Tu veux que ta maison ressemble à ça?' },
    'home.gallery.hardwoodBefore': { en: 'Hardwood floor reset — before', fr: 'Plancher de bois — avant' },
    'home.gallery.hardwoodAfter': { en: 'Hardwood floor reset — after', fr: 'Plancher de bois — après' },
    'home.gallery.bathroomBefore': { en: 'Bathroom deep clean — before', fr: 'Salle de bain — avant' },
    'home.gallery.bathroomAfter': { en: 'Bathroom deep clean — after', fr: 'Salle de bain — après' },
    'home.gallery.fridgeBefore': { en: 'Fridge & freezer detail — before', fr: 'Réfrigérateur et congélateur — avant' },
    'home.gallery.fridgeAfter': { en: 'Fridge & freezer detail — after', fr: 'Réfrigérateur et congélateur — après' },

    // ---------- index.html: services ----------
    'home.services.title': { en: 'What I offer', fr: 'Ce que j’offre' },
    'home.services.subtitle': { en: 'Homes, rentals, and commercial spaces, all cleaned the same careful way.', fr: 'Maisons, locations et espaces commerciaux, nettoyés avec le même soin.' },
    'home.services.residential': { en: 'Residential', fr: 'Résidentiel' },
    'home.services.commercial': { en: 'Commercial & specialty', fr: 'Commercial et spécialisé' },
    'home.services.standard.name': { en: 'Standard Cleaning', fr: 'Nettoyage standard' },
    'home.services.standard.desc': { en: 'Regular maintenance for kitchens, bathrooms, floors, and dusting. Keeps your home consistently comfortable.', fr: 'Entretien régulier des cuisines, salles de bain, planchers et époussetage. Garde ta maison confortable en tout temps.' },
    'home.services.standard.price': { en: 'From $130', fr: 'À partir de 130$' },
    'home.services.deep.name': { en: 'Deep Cleaning', fr: 'Nettoyage en profondeur' },
    'home.services.deep.desc': { en: 'A full top-to-bottom reset: appliances, baseboards, cabinets, windows, and everything in between.', fr: 'Une remise à neuf complète : électroménagers, plinthes, armoires, fenêtres et tout le reste.' },
    'home.services.deep.price': { en: 'From $180', fr: 'À partir de 180$' },
    'home.services.moveInOut.name': { en: 'Move-In / Move-Out', fr: 'Déménagement (entrée/sortie)' },
    'home.services.moveInOut.desc': { en: 'A fresh start for your next chapter, with every room cleaned before the keys change hands.', fr: 'Un nouveau départ : chaque pièce nettoyée avant la remise des clés.' },
    'home.services.moveInOut.price': { en: 'Custom quote', fr: 'Devis sur mesure' },
    'home.services.airbnb.name': { en: 'Airbnb & Short-Term Rental Turnovers', fr: 'Roulement Airbnb et location court terme' },
    'home.services.airbnb.desc': { en: 'Guest-ready resets between bookings: beds remade, bathrooms reset, restocked, and staged.', fr: 'Prêt pour les invités entre les réservations : lits refaits, salles de bain nettoyées, réapprovisionnées et mises en scène.' },
    'home.services.airbnb.price': { en: 'From $100', fr: 'À partir de 100$' },
    'home.services.office.name': { en: 'Office Cleaning', fr: 'Nettoyage de bureaux' },
    'home.services.office.desc': { en: 'Recurring cleaning scheduled around your business hours, not the other way around.', fr: 'Nettoyage récurrent planifié autour de tes heures d’affaires, pas l’inverse.' },
    'home.services.office.price': { en: 'Custom quote', fr: 'Devis sur mesure' },
    'home.services.retail.name': { en: 'Retail & Store Cleaning', fr: 'Nettoyage de commerces et magasins' },
    'home.services.retail.desc': { en: 'Floors, fixtures, and front-of-store upkeep that keeps a shop guest-ready.', fr: 'Planchers, installations et entretien de façade pour garder ton commerce impeccable.' },
    'home.services.retail.price': { en: 'Custom quote', fr: 'Devis sur mesure' },
    'home.services.postConstruction.name': { en: 'Post-Construction & Event Cleanup', fr: 'Nettoyage post-construction et événements' },
    'home.services.postConstruction.desc': { en: 'Dust and debris after a reno, or a fast reset after a hall rental or event.', fr: 'Poussière et débris après une rénovation, ou une remise à neuf rapide après un événement.' },
    'home.services.postConstruction.price': { en: 'Custom quote', fr: 'Devis sur mesure' },
    'home.services.seeDetails': { en: 'See what’s included', fr: 'Voir ce qui est inclus' },
    'home.services.standard.detail': { en: 'Includes kitchen counters, stovetop and exterior of appliances, all bathroom surfaces, floors (vacuumed and mopped), dusting of furniture and surfaces, and trash removal. Typically takes 1.5–2.5 hours depending on home size — perfect for keeping a home guest-ready between deeper cleans.', fr: 'Comprend les comptoirs de cuisine, la cuisinière et l’extérieur des électroménagers, toutes les surfaces de la salle de bain, les planchers (aspirés et lavés), l’époussetage des meubles et surfaces, et le retrait des poubelles. Prend habituellement 1h30 à 2h30 selon la taille du logement — parfait pour garder une maison prête à recevoir entre deux nettoyages en profondeur.' },
    'home.services.deep.detail': { en: 'Everything in Standard Cleaning, plus: inside the fridge and oven, baseboards, door frames and light switches, ceiling fans and vents, cabinet fronts, and interior windows. A thorough reset that usually takes 3–5 hours — recommended before hosting guests, after a renovation, or as your very first cleaning with me.', fr: 'Tout ce qui est inclus dans le nettoyage standard, plus : l’intérieur du réfrigérateur et du four, les plinthes, les cadres de porte et interrupteurs, les ventilateurs de plafond et bouches d’aération, les façades d’armoires, et les fenêtres (intérieur). Une remise à neuf complète qui prend habituellement 3 à 5 heures — recommandé avant de recevoir des invités, après une rénovation, ou comme tout premier nettoyage.' },
    'home.services.moveInOut.detail': { en: 'A full deep clean of every room, inside every cabinet and closet, appliances, and all fixtures, so the space is spotless for the next chapter. Duration and price depend on the size and condition of the home — request a custom quote and I’ll walk you through what’s included.', fr: 'Un nettoyage en profondeur complet de chaque pièce, à l’intérieur de chaque armoire et garde-robe, des électroménagers et de tous les accessoires, pour que l’espace soit impeccable pour la suite. La durée et le prix dépendent de la taille et de l’état du logement — demande un devis sur mesure et je t’expliquerai ce qui est inclus.' },
    'home.services.airbnb.detail': { en: 'Beds stripped and remade with fresh linens, bathrooms fully reset and restocked (soap, toilet paper, towels), kitchen wiped down and dishes put away, and a final staging pass so the space photographs well for the next guest. Fast turnaround between checkout and check-in — tell me your booking schedule and I’ll work around it.', fr: 'Lits défaits et refaits avec des draps propres, salles de bain entièrement remises à neuf et réapprovisionnées (savon, papier de toilette, serviettes), cuisine essuyée et vaisselle rangée, et une touche finale de mise en scène pour que l’espace soit bien présenté pour le prochain invité. Roulement rapide entre le départ et l’arrivée — donne-moi ton horaire de réservations et je m’adapte.' },
    'home.services.office.detail': { en: 'Desks, common areas, kitchenette, and washrooms cleaned on a recurring schedule — daily, weekly, or whatever fits your business. Scheduled before or after hours so it never disrupts your team. Custom quote based on square footage and frequency.', fr: 'Bureaux, espaces communs, cuisinette et toilettes nettoyés selon un horaire récurrent — quotidien, hebdomadaire, ou selon ce qui convient à ton entreprise. Planifié avant ou après les heures d’ouverture pour ne jamais déranger ton équipe. Devis sur mesure selon la superficie et la fréquence.' },
    'home.services.retail.detail': { en: 'Floors, entryways, fitting rooms, and display fixtures kept spotless so your shop always looks its best for customers. Scheduled around your opening hours. Custom quote based on store size and how often you’d like visits.', fr: 'Planchers, entrées, cabines d’essayage et présentoirs gardés impeccables pour que ton commerce soit toujours à son meilleur pour la clientèle. Planifié autour de tes heures d’ouverture. Devis sur mesure selon la taille du commerce et la fréquence souhaitée.' },
    'home.services.postConstruction.detail': { en: 'Fine dust and debris removed from every surface (including light fixtures and vents), floors deep-cleaned, and windows wiped down after a renovation — or a fast turnaround clean after a hall rental, party, or event. Custom quote based on the scope of the mess.', fr: 'Poussière fine et débris retirés de toutes les surfaces (incluant les luminaires et bouches d’aération), planchers nettoyés en profondeur, et fenêtres essuyées après une rénovation — ou un nettoyage rapide après la location d’une salle, une fête ou un événement. Devis sur mesure selon l’ampleur du travail.' },

    // ---------- index.html: offer band ----------
    'home.offer.title': { en: 'New here? Start with the deep clean.', fr: 'Nouveau client? Commence avec le nettoyage en profondeur.' },
    'home.offer.desc': { en: 'It sets a fresh baseline for your home, then you switch to easy standard visits from there, at an introductory rate for first-time clients.', fr: 'Ça établit une base fraîche pour ta maison, puis tu passes à des visites standard, à un tarif de bienvenue pour les nouveaux clients.' },
    'home.offer.cta': { en: 'Claim the special', fr: 'Profiter de l’offre' },

    // ---------- index.html: how it works ----------
    'home.how.title': { en: 'How it works', fr: 'Comment ça marche' },
    'home.how.subtitle': { en: 'Booking takes about as long as making a coffee.', fr: 'Réserver prend environ le temps de te faire un café.' },
    'home.how.step1.title': { en: 'Reach out', fr: 'Contacte-moi' },
    'home.how.step1.desc': { en: 'Call, text, or email for a free quote. No forms, no waiting on hold.', fr: 'Appelle, texte ou envoie un courriel pour un devis gratuit. Pas de formulaire, pas d’attente.' },
    'home.how.step2.title': { en: 'Get your quote', fr: 'Reçois ton devis' },
    'home.how.step2.desc': { en: 'A few quick questions about your home, then a clear price. No surprises later.', fr: 'Quelques questions rapides sur ta maison, puis un prix clair. Aucune surprise.' },
    'home.how.step3.title': { en: 'Book your clean', fr: 'Réserve ton nettoyage' },
    'home.how.step3.desc': { en: 'Pick a day that works for you, and I’ll take care of the rest.', fr: 'Choisis une journée qui te convient, je m’occupe du reste.' },

    // ---------- index.html: why us ----------
    'home.why.title': { en: 'Why Magicstick Clean', fr: 'Pourquoi Magicstick Clean' },
    'home.why.item1': { en: 'Detail-oriented and reliable, every visit', fr: 'Minutieux et fiable, à chaque visite' },
    'home.why.item2': { en: 'Flexible scheduling around your life', fr: 'Horaire flexible qui s’adapte à ta vie' },
    'home.why.item3': { en: 'I bring my own eco-friendly supplies', fr: 'J’apporte mes propres produits écologiques' },
    'home.why.item4': { en: 'Locally owned and operated', fr: 'Entreprise locale, propriété locale' },
    'home.why.item5': { en: 'Not happy? I’ll come back and make it right, free', fr: 'Pas satisfait? Je reviens gratuitement pour corriger le tout' },

    // ---------- index.html: comparison table ----------
    'home.compare.title': { en: 'How our Ottawa cleaning services compare', fr: 'Comment nos services se comparent à Ottawa' },
    'home.compare.subtitle': { en: 'What you actually get with a locally owned, hands-on cleaner.', fr: 'Ce que tu obtiens vraiment avec une entreprise locale et impliquée.' },
    'home.compare.otherCompanies': { en: 'Other Companies', fr: 'Autres entreprises' },
    'home.compare.row1': { en: 'Brings own supplies & equipment', fr: 'Apporte ses propres produits et équipement' },
    'home.compare.row2': { en: 'Flexible scheduling', fr: 'Horaire flexible' },
    'home.compare.row3': { en: 'Same cleaner every visit', fr: 'Le même nettoyeur à chaque visite' },
    'home.compare.row4': { en: 'Direct line to the owner', fr: 'Ligne directe avec le propriétaire' },
    'home.compare.row5': { en: 'Satisfaction guarantee', fr: 'Garantie de satisfaction' },
    'home.compare.row6': { en: 'Locally owned & operated', fr: 'Entreprise locale' },
    'home.compare.row7': { en: 'Liability insurance', fr: 'Assurance responsabilité' },
    'home.compare.varies': { en: 'Varies', fr: 'Varie' },
    'home.compare.oftenRotates': { en: 'Often rotates staff', fr: 'Change souvent de personnel' },
    'home.compare.rarely': { en: 'Rarely', fr: 'Rarement' },
    'home.compare.comingSoon': { en: 'Coming soon', fr: 'Bientôt disponible' },

    // ---------- index.html: service area ----------
    'home.area.title': { en: 'Proudly serving three communities', fr: 'Fièrement au service de trois communautés' },
    'home.area.desc': { en: 'Based in Clarence-Rockland, cleaning homes across the region, into Ottawa, and across the river into Gatineau. If you’re nearby and not sure you’re covered, just ask.', fr: 'Basée à Clarence-Rockland, l’entreprise nettoie des maisons dans toute la région, jusqu’à Ottawa, et de l’autre côté de la rivière à Gatineau. Si tu es à proximité et pas certain d’être couvert, demande-moi simplement.' },
    'home.area.mapTitle': { en: 'Map of the Magicstick Clean service area: Clarence-Rockland, Ottawa, and Gatineau', fr: 'Carte de la zone desservie par Magicstick Clean : Clarence-Rockland, Ottawa et Gatineau' },

    // ---------- index.html: FAQ ----------
    'home.faq.title': { en: 'Common questions', fr: 'Questions fréquentes' },
    'home.faq.subtitle': { en: 'If yours isn’t here, just ask when you request a quote.', fr: 'Si ta question n’est pas ici, demande simplement lors de ta demande de devis.' },
    'home.faq.q1': { en: 'How much does a cleaning cost?', fr: 'Combien coûte un nettoyage?' },
    'home.faq.a1': { en: 'It depends on the size of the space and how often you’d like visits. Starting prices for each service are listed above, and recurring visits come with a standing discount. You’ll always get a clear price before booking.', fr: 'Ça dépend de la taille de l’espace et de la fréquence des visites. Les prix de départ pour chaque service sont indiqués ci-dessus, et les visites récurrentes bénéficient d’un rabais permanent. Tu obtiens toujours un prix clair avant de réserver.' },
    'home.faq.q2': { en: 'Do I need to be home during the cleaning?', fr: 'Dois-je être à la maison pendant le nettoyage?' },
    'home.faq.a2': { en: 'Not at all. Many clients are out at work. As long as we’ve arranged access ahead of time, everything else takes care of itself.', fr: 'Pas du tout. Plusieurs clients sont au travail. Tant que l’accès est arrangé à l’avance, tout le reste se fait tout seul.' },
    'home.faq.q3': { en: 'Do you bring your own supplies?', fr: 'Apportes-tu tes propres produits?' },
    'home.faq.a3': { en: 'Yes, eco-friendly supplies and equipment are included at no extra cost. If you’d prefer I use products you already have, just let me know.', fr: 'Oui, les produits écologiques et l’équipement sont inclus sans frais supplémentaires. Si tu préfères que j’utilise tes propres produits, dis-le-moi simplement.' },
    'home.faq.q4': { en: 'What if I’m not happy with the clean?', fr: 'Et si je ne suis pas satisfait du nettoyage?' },
    'home.faq.a4': { en: 'Tell me within 24 hours and I’ll come back to fix it, free of charge. Getting it right matters more than getting it done fast.', fr: 'Avise-moi dans les 24 heures et je reviens corriger le tout, gratuitement. Bien faire les choses compte plus que les faire vite.' },
    'home.faq.q5': { en: 'Do you offer discounts for recurring cleanings?', fr: 'Offres-tu des rabais pour les nettoyages récurrents?' },
    'home.faq.a5': { en: 'Yes. Weekly visits save 15%, and biweekly or monthly visits save 10%, compared to a one-time clean. You can pick a frequency when requesting a quote.', fr: 'Oui. Les visites hebdomadaires économisent 15%, et les visites aux deux semaines ou mensuelles économisent 10%, comparativement à un nettoyage unique. Tu peux choisir une fréquence lors de ta demande de devis.' },
    'home.faq.q6': { en: 'What’s your cancellation policy?', fr: 'Quelle est ta politique d’annulation?' },
    'home.faq.a6': { en: 'Plans change, that’s fine. Just give at least 24 hours notice where possible so the time can go to another client.', fr: 'Les plans changent, c’est correct. Donne un préavis d’au moins 24 heures si possible, pour que la plage horaire puisse être offerte à un autre client.' },
    'home.faq.q7': { en: 'Do you clean around pets?', fr: 'Nettoies-tu en présence d’animaux?' },
    'home.faq.a7': { en: 'Of course. Just let me know what pets are home so I can plan around them. For everyone’s safety, aggressive or very anxious pets are best kept in another room during the visit.', fr: 'Bien sûr. Dis-moi simplement quels animaux sont à la maison pour que je puisse m’organiser. Pour la sécurité de tous, les animaux agressifs ou très anxieux sont mieux gardés dans une autre pièce pendant la visite.' },

    // ---------- index.html: flyers ----------
    'home.flyers.title': { en: 'Flyers', fr: 'Dépliants' },
    'home.flyers.subtitle': { en: 'Feel free to save or share these if you know someone who could use a cleaner.', fr: 'N’hésite pas à sauvegarder ou partager ceci si tu connais quelqu’un qui a besoin d’un nettoyeur.' },
    'home.flyers.print.title': { en: 'Printable flyer', fr: 'Dépliant imprimable' },
    'home.flyers.print.desc': { en: 'Letter size, ready to print and post on a community board.', fr: 'Format lettre, prêt à imprimer et afficher sur un tableau communautaire.' },
    'home.flyers.print.cta': { en: 'Download PDF', fr: 'Télécharger le PDF' },
    'home.flyers.social.title': { en: 'Social media flyer', fr: 'Dépliant pour réseaux sociaux' },
    'home.flyers.social.desc': { en: 'Square image, sized for Facebook, Instagram, or Nextdoor.', fr: 'Image carrée, dimensionnée pour Facebook, Instagram ou Nextdoor.' },
    'home.flyers.social.cta': { en: 'Download image', fr: 'Télécharger l’image' },

    // ---------- index.html: quote form ----------
    'home.contact.title': { en: 'Ready for a spotless home?', fr: 'Prêt pour une maison impeccable?' },
    'home.contact.subtitle': { en: 'Fill this in and I’ll get back to you the same day.', fr: 'Remplis ce formulaire et je te réponds le jour même.' },
    'form.name': { en: 'Name', fr: 'Nom' },
    'form.nameErr': { en: 'Please enter your name.', fr: 'Veuillez entrer votre nom.' },
    'form.contact': { en: 'Phone or email', fr: 'Téléphone ou courriel' },
    'form.contactErr': { en: 'Please enter a phone number or email.', fr: 'Veuillez entrer un numéro de téléphone ou un courriel.' },
    'form.service': { en: 'What do you need?', fr: 'De quoi as-tu besoin?' },
    'form.service.standard': { en: 'Standard Cleaning', fr: 'Nettoyage standard' },
    'form.service.deep': { en: 'Deep Cleaning (first-time special)', fr: 'Nettoyage en profondeur (offre nouveaux clients)' },
    'form.service.moveInOut': { en: 'Move-In / Move-Out Cleaning', fr: 'Nettoyage déménagement (entrée/sortie)' },
    'form.service.airbnb': { en: 'Airbnb / Rental Turnover', fr: 'Roulement Airbnb / location' },
    'form.service.office': { en: 'Office Cleaning', fr: 'Nettoyage de bureaux' },
    'form.service.retail': { en: 'Retail & Store Cleaning', fr: 'Nettoyage de commerces' },
    'form.service.postConstruction': { en: 'Post-Construction & Event Cleanup', fr: 'Nettoyage post-construction et événements' },
    'form.service.notSure': { en: 'Not sure yet', fr: 'Pas encore sûr' },
    'form.frequency': { en: 'How often?', fr: 'À quelle fréquence?' },
    'form.frequency.oneTime': { en: 'One-time', fr: 'Une seule fois' },
    'form.frequency.weekly': { en: 'Weekly (15% off)', fr: 'Hebdomadaire (15% de rabais)' },
    'form.frequency.biweekly': { en: 'Biweekly (10% off)', fr: 'Aux deux semaines (10% de rabais)' },
    'form.frequency.monthly': { en: 'Monthly (10% off)', fr: 'Mensuel (10% de rabais)' },
    'form.preferredDay': { en: 'Preferred day', fr: 'Journée préférée' },
    'form.pets': { en: 'Pets at home?', fr: 'Animaux à la maison?' },
    'common.yes': { en: 'Yes', fr: 'Oui' },
    'common.no': { en: 'No', fr: 'Non' },
    'form.bedrooms': { en: 'Bedrooms', fr: 'Chambres' },
    'form.bathrooms': { en: 'Bathrooms', fr: 'Salles de bain' },
    'form.homeType': { en: 'Home type', fr: 'Type de logement' },
    'form.homeType.house': { en: 'House', fr: 'Maison' },
    'form.homeType.apartment': { en: 'Apartment / Condo', fr: 'Appartement / Condo' },
    'form.homeType.townhouse': { en: 'Townhouse', fr: 'Maison de ville' },
    'form.studio': { en: 'Studio', fr: 'Studio' },
    'form.photos': { en: 'Photos of your home', fr: 'Photos de ta maison' },
    'form.photos.cta': { en: 'Choose photos', fr: 'Choisir des photos' },
    'form.photos.hint': { en: 'Up to 6 photos, 10MB each', fr: 'Jusqu’à 6 photos, 10 Mo chacune' },
    'form.photos.tooMany': { en: 'You can attach up to 6 photos.', fr: 'Tu peux joindre jusqu’à 6 photos.' },
    'form.photos.tooBig': { en: '{name} is over 10MB — please choose a smaller photo.', fr: '{name} dépasse 10 Mo — choisis une photo plus légère.' },
    'form.video': { en: 'Video walkthrough', fr: 'Vidéo de visite' },
    'form.video.cta': { en: 'Choose a video', fr: 'Choisir une vidéo' },
    'form.video.hint': { en: 'Up to 50MB', fr: 'Jusqu’à 50 Mo' },
    'form.video.tooBig': { en: '{name} is over 50MB — please choose a shorter video.', fr: '{name} dépasse 50 Mo — choisis une vidéo plus courte.' },
    'form.note.uploading': { en: 'Uploading your photos and video...', fr: 'Téléversement de tes photos et de ta vidéo...' },
    'form.note.uploadFailed': { en: 'Some files could not be uploaded, but your request was still sent.', fr: 'Certains fichiers n’ont pas pu être téléversés, mais ta demande a quand même été envoyée.' },
    'form.note.filesNeedBackend': { en: 'Photo/video upload isn’t turned on yet, so these won’t be sent automatically — please attach them yourself in the email that opens.', fr: 'Le téléversement de photos/vidéos n’est pas encore activé — attache-les toi-même dans le courriel qui s’ouvrira.' },
    'form.message': { en: 'Anything else I should know? (optional)', fr: 'Autre chose à savoir? (optionnel)' },
    'form.messagePlaceholder': { en: 'Preferred days, access instructions, pets...', fr: 'Journées préférées, accès, animaux...' },
    'form.submit': { en: 'Send quote request', fr: 'Envoyer la demande de devis' },
    'form.note.default': { en: 'This opens your email app with everything filled in, ready to send to magicstickclean@gmail.com.', fr: 'Ceci ouvre ton application courriel, prête à envoyer à magicstickclean@gmail.com.' },
    'form.note.sending': { en: 'Sending your request...', fr: 'Envoi de ta demande...' },
    'form.note.success': { en: 'Thanks! Your request is in — we’ll get back to you the same day.', fr: 'Merci! Ta demande est reçue — on te répond le jour même.' },
    'form.note.opening': { en: 'Opening your email app with your request filled in...', fr: 'Ouverture de ton application courriel avec ta demande...' },
    'form.note.invalid': { en: 'Please fill in your name and a way to reach you.', fr: 'Veuillez remplir votre nom et un moyen de vous joindre.' },
    'mail.subject.quote': { en: 'Free quote request: {service}', fr: 'Demande de devis gratuit : {service}' },
    'mail.label.name': { en: 'Name', fr: 'Nom' },
    'mail.label.contact': { en: 'Phone or email', fr: 'Téléphone ou courriel' },
    'mail.label.area': { en: 'Area', fr: 'Secteur' },
    'mail.label.frequency': { en: 'Frequency', fr: 'Fréquence' },
    'mail.label.service': { en: 'Service', fr: 'Service' },
    'mail.label.home': { en: 'Home', fr: 'Logement' },
    'mail.label.preferredDay': { en: 'Preferred day', fr: 'Journée préférée' },
    'mail.label.pets': { en: 'Pets', fr: 'Animaux' },
    'mail.label.discount': { en: 'Discount', fr: 'Rabais' },
    'mail.label.firstTimeOffer': { en: 'First-time offer', fr: 'Offre nouveau client' },
    'mail.label.notes': { en: 'Notes', fr: 'Notes' },
    'mail.discount.none': { en: 'None', fr: 'Aucun' },
    'mail.discount.claimed': { en: '15% first cleaning offer claimed', fr: 'Offre de 15% sur le premier nettoyage réclamée' },
    'mail.discount.notClaimed': { en: 'Not claimed', fr: 'Non réclamée' },
    'mail.discount.pct': { en: '{pct}% {frequency} discount', fr: 'Rabais de {pct}% ({frequency})' },
    'freq.weekly.lower': { en: 'weekly', fr: 'hebdomadaire' },
    'freq.biweekly.lower': { en: 'biweekly', fr: 'aux deux semaines' },
    'freq.monthly.lower': { en: 'monthly', fr: 'mensuel' },
    'freq.oneTime.lower': { en: 'one-time', fr: 'unique' },
    'bed.suffix': { en: 'bed', fr: 'ch.' },
    'bath.suffix': { en: 'bath', fr: 'sdb' },

    // ---------- careers.html ----------
    'careers.hero.tag': { en: 'We’re hiring', fr: 'On embauche' },
    'careers.hero.title': { en: 'Join the Magicstick Clean team', fr: 'Joins l’équipe de Magicstick Clean' },
    'careers.hero.lede': { en: 'We’re expanding our cleaning team in Clarence-Rockland, Ottawa, and Gatineau — part-time and full-time, immediate start. Flexible schedule, steady work, and pay that respects the work you do.', fr: 'Nous agrandissons notre équipe de nettoyage à Clarence-Rockland, Ottawa et Gatineau — temps partiel et temps plein, début immédiat. Horaire flexible, travail stable, et une paye qui respecte ton travail.' },
    'careers.hero.apply': { en: 'Apply now', fr: 'Postuler maintenant' },
    'careers.hero.call': { en: 'Call 343-843-7761', fr: 'Appeler le 343-843-7761' },
    'careers.offer.title': { en: 'Earn $22/hr as an Independent Contractor Cleaning Technician — competitive rates.', fr: 'Gagne 22$/h comme technicien(ne) de nettoyage entrepreneur autonome — taux compétitifs.' },
    'careers.offer.item1': { en: 'Unlimited work — we can provide as much work as you can take.', fr: 'Travail illimité — on peut t’offrir autant de travail que tu peux en prendre.' },
    'careers.offer.item2': { en: 'Flexibility at its best — work locally and when you want; we assign jobs around where you live and your schedule.', fr: 'Flexibilité maximale — travaille près de chez toi, quand tu veux; les mandats sont assignés selon ton secteur et ton horaire.' },
    'careers.offer.item3': { en: 'Stable, trustworthy income — get paid on time, every time, with secure and ongoing jobs.', fr: 'Revenu stable et fiable — payé à temps, à chaque fois, avec du travail sécurisé et continu.' },
    'careers.why.title': { en: 'Why choose Magicstick Clean?', fr: 'Pourquoi choisir Magicstick Clean?' },
    'careers.why.desc': { en: 'We’re expanding our cleaning team (part-time & full-time) for an immediate start. We specialize in residential and commercial cleaning, and offer some of the best rates and bonuses in the market.', fr: 'Nous agrandissons notre équipe de nettoyage (temps partiel et temps plein) pour un début immédiat. Nous nous spécialisons en nettoyage résidentiel et commercial, avec des taux et des bonis parmi les meilleurs du marché.' },
    'careers.why.step1.title': { en: 'Stable income', fr: 'Revenu stable' },
    'careers.why.step1.desc': { en: 'Get paid on time, every time, with secure and ongoing jobs.', fr: 'Payé à temps, à chaque fois, avec du travail sécurisé et continu.' },
    'careers.why.step2.title': { en: 'Growing, well-reviewed team', fr: 'Une équipe en croissance, bien notée' },
    'careers.why.step2.desc': { en: 'We’re building a reputation as one of the most reliable cleaning teams in the Ottawa area — client reviews back it up.', fr: 'Nous bâtissons une réputation parmi les équipes de nettoyage les plus fiables de la région d’Ottawa — les avis clients le confirment.' },
    'careers.why.step3.title': { en: 'Happy team, satisfied clients', fr: 'Équipe heureuse, clients satisfaits' },
    'careers.why.step3.desc': { en: 'We aim for a 95%+ satisfaction rating from our own team, not just our clients.', fr: 'On vise un taux de satisfaction de 95%+ au sein même de notre équipe, pas seulement chez nos clients.' },
    'careers.apart.title': { en: 'What sets us apart', fr: 'Ce qui nous distingue' },
    'careers.apart.item1': { en: 'Competitive salaries — up to $2,000 every two weeks for Independent Contractors with 40 hrs/week of availability.', fr: 'Salaires compétitifs — jusqu’à 2 000$ aux deux semaines pour les entrepreneurs autonomes disponibles 40h/semaine.' },
    'careers.apart.item2': { en: 'Hassle-free experience — no admin work; we handle invoicing, scheduling, and customer service.', fr: 'Aucun tracas administratif — on s’occupe de la facturation, de l’horaire et du service à la clientèle.' },
    'careers.apart.item3': { en: 'Unlimited work — we assign work in your choice of location and schedule. Ongoing work available.', fr: 'Travail illimité — mandats assignés selon ton secteur et ton horaire. Travail continu disponible.' },
    'careers.apart.item4': { en: 'Incentives for high performers — we reward excellence and hard work.', fr: 'Primes pour les meilleurs — on récompense l’excellence et le travail acharné.' },
    'careers.about.title': { en: 'About the role', fr: 'À propos du poste' },
    'careers.about.p1': { en: 'Magicstick Clean is looking for exceptional cleaning professionals to join our growing team. We’re not just looking for "good cleaners" — we want outstanding cleaners who take pride in their work. If you have meticulous attention to detail, strong organizational skills, and time-management expertise, we want you.', fr: 'Magicstick Clean cherche des professionnels du nettoyage exceptionnels pour joindre notre équipe grandissante. On ne cherche pas juste de "bons nettoyeurs" — on veut des nettoyeurs hors pair qui sont fiers de leur travail. Si tu as le souci du détail, un bon sens de l’organisation et une bonne gestion du temps, on te veut dans l’équipe.' },
    'careers.about.p2': { en: 'Complete a short onboarding and start working with us to be part of one of the most reliable cleaning teams serving Clarence-Rockland, Ottawa, and Gatineau.', fr: 'Complète une courte formation d’accueil et commence à travailler avec nous, au sein d’une des équipes de nettoyage les plus fiables desservant Clarence-Rockland, Ottawa et Gatineau.' },
    'careers.fastTrack.title': { en: 'Join us — fast-track your application', fr: 'Joins-toi à nous — accélère ta candidature' },
    'careers.fastTrack.desc': { en: 'We warmly welcome experienced cleaning teams from companies such as Mopify, Molly Maids, Merry Maids, Hellamaid, Luxoclean, and Scrubbi. We recognize your expertise — apply today and your journey with Magicstick Clean could begin sooner than you think.', fr: 'On accueille chaleureusement les équipes expérimentées provenant d’entreprises comme Mopify, Molly Maids, Merry Maids, Hellamaid, Luxoclean et Scrubbi. On reconnaît ton expertise — postule aujourd’hui, ton parcours chez Magicstick Clean pourrait commencer plus vite que tu penses.' },
    'careers.requirements.title': { en: 'Ideally, you have', fr: 'Idéalement, tu as' },
    'careers.requirements.item1': { en: 'At least 6 months of cleaning experience (domestic, commercial, hotel cleaning, housekeeping, or building cleaning)', fr: 'Au moins 6 mois d’expérience en nettoyage (résidentiel, commercial, hôtelier, entretien ménager ou d’immeubles)' },
    'careers.requirements.item2': { en: 'A driver’s license and your own vehicle', fr: 'Un permis de conduire et ton propre véhicule' },
    'careers.requirements.item3': { en: 'The right to work in Canada', fr: 'Le droit de travailler au Canada' },
    'careers.requirements.item4': { en: 'A clean background/police check', fr: 'Une vérification de casier judiciaire sans antécédent' },
    'careers.requirements.item5': { en: 'Your own equipment and supplies', fr: 'Ton propre équipement et tes propres produits' },
    'careers.apply.title': { en: 'Ready to join the team?', fr: 'Prêt à joindre l’équipe?' },
    'careers.apply.subtitle': { en: 'Fill this in and we’ll get back to you the same day.', fr: 'Remplis ce formulaire et on te répond le jour même.' },
    'careers.form.availability': { en: 'Availability', fr: 'Disponibilité' },
    'careers.form.availability.fullTime': { en: 'Full-time', fr: 'Temps plein' },
    'careers.form.availability.partTime': { en: 'Part-time', fr: 'Temps partiel' },
    'careers.form.availability.notSure': { en: 'Not sure yet', fr: 'Pas encore sûr' },
    'careers.form.experience': { en: 'Cleaning experience', fr: 'Expérience en nettoyage' },
    'careers.form.experience.6to1': { en: '6 months – 1 year', fr: '6 mois à 1 an' },
    'careers.form.experience.1to3': { en: '1–3 years', fr: '1 à 3 ans' },
    'careers.form.experience.3plus': { en: '3+ years', fr: '3 ans et plus' },
    'careers.form.experience.lessThan6': { en: 'Less than 6 months', fr: 'Moins de 6 mois' },
    'careers.form.message': { en: 'Anything else we should know? (optional)', fr: 'Autre chose à savoir? (optionnel)' },
    'careers.form.messagePlaceholder': { en: 'Previous employer, areas you can cover, vehicle, etc.', fr: 'Ancien employeur, secteurs couverts, véhicule, etc.' },
    'careers.form.submit': { en: 'Send application', fr: 'Envoyer la candidature' },
    'careers.form.note.default': { en: 'This opens your email app with everything filled in, ready to send to magicstickclean@gmail.com.', fr: 'Ceci ouvre ton application courriel, prête à envoyer à magicstickclean@gmail.com.' },
    'careers.form.note.opening': { en: 'Opening your email app with your application filled in...', fr: 'Ouverture de ton application courriel avec ta candidature...' },
    'mail.subject.application': { en: 'Job application: Cleaning Technician ({availability})', fr: 'Candidature : technicien(ne) de nettoyage ({availability})' },
    'mail.label.availability': { en: 'Availability', fr: 'Disponibilité' },
    'mail.label.experience': { en: 'Cleaning experience', fr: 'Expérience en nettoyage' },

    // ---------- booking.html ----------
    'booking.hero.tag': { en: 'Online booking', fr: 'Réservation en ligne' },
    'booking.hero.title': { en: 'Book your cleaning', fr: 'Réserve ton nettoyage' },
    'booking.hero.lede': { en: 'Pick a service, a date, and a time window. A refundable deposit secures your spot — the rest is due at the appointment.', fr: 'Choisis un service, une date et une plage horaire. Un dépôt remboursable réserve ta place — le solde est dû au rendez-vous.' },
    'booking.notice.backend': { en: 'Online booking isn’t turned on yet for this site. Please use the <a href="index.html#contact">quote request form</a> or call/text <a href="tel:3438437761">343-843-7761</a> instead.', fr: 'La réservation en ligne n’est pas encore activée sur ce site. Utilise plutôt le <a href="index.html#contact">formulaire de demande de devis</a> ou appelle/texte le <a href="tel:3438437761">343-843-7761</a>.' },
    'booking.notice.unavailable': { en: 'Online booking is temporarily unavailable. Please use the quote request form or call/text 343-843-7761 instead.', fr: 'La réservation en ligne est temporairement indisponible. Utilise plutôt le formulaire de demande de devis ou appelle/texte le 343-843-7761.' },
    'booking.status.success': { en: 'Payment received! Your booking is confirmed — check your email for the details.', fr: 'Paiement reçu! Ta réservation est confirmée — vérifie tes courriels pour les détails.' },
    'booking.status.cancelled': { en: 'Checkout was cancelled — no payment was taken. You can try again below.', fr: 'Le paiement a été annulé — aucun montant n’a été prélevé. Tu peux réessayer ci-dessous.' },
    'booking.form.whichService': { en: 'Which service?', fr: 'Quel service?' },
    'booking.form.date': { en: 'Date', fr: 'Date' },
    'booking.form.timeWindow': { en: 'Time window', fr: 'Plage horaire' },
    'booking.form.time.morning': { en: 'Morning (8am–11am)', fr: 'Matin (8h–11h)' },
    'booking.form.time.midday': { en: 'Midday (11am–2pm)', fr: 'Midi (11h–14h)' },
    'booking.form.time.afternoon': { en: 'Afternoon (2pm–5pm)', fr: 'Après-midi (14h–17h)' },
    'booking.form.name': { en: 'Name', fr: 'Nom' },
    'booking.form.contact': { en: 'Phone or email', fr: 'Téléphone ou courriel' },
    'booking.form.area': { en: 'Area', fr: 'Secteur' },
    'booking.form.area.other': { en: 'Other / not sure', fr: 'Autre / pas certain' },
    'booking.form.notes': { en: 'Anything I should know? (optional)', fr: 'Autre chose à savoir? (optionnel)' },
    'booking.form.notesPlaceholder': { en: 'Home size, access instructions, pets...', fr: 'Taille du logement, accès, animaux...' },
    'booking.form.submit': { en: 'Pay deposit & book', fr: 'Payer le dépôt et réserver' },
    'booking.form.note.default': { en: 'You’ll be redirected to Stripe to pay a refundable deposit securely. The rest is due at your appointment.', fr: 'Tu seras redirigé vers Stripe pour payer un dépôt remboursable en toute sécurité. Le solde est dû au rendez-vous.' },
    'booking.form.note.invalid': { en: 'Please fill in your name, contact info, and a date.', fr: 'Veuillez remplir votre nom, vos coordonnées et une date.' },
    'booking.form.note.settingUp': { en: 'Setting up secure checkout...', fr: 'Préparation du paiement sécurisé...' },
    'booking.form.note.error': { en: 'Something went wrong starting checkout. Please try again, or call/text 343-843-7761.', fr: 'Une erreur est survenue au démarrage du paiement. Réessaie, ou appelle/texte le 343-843-7761.' },
    'booking.deposit.summary': { en: 'Deposit due today: ${deposit} CAD — remaining ${remaining} due at the appointment.', fr: 'Dépôt dû aujourd’hui : {deposit}$ CAD — solde de {remaining}$ dû au rendez-vous.' },
    'booking.priceFrom': { en: 'From ${price}', fr: 'À partir de {price}$' },
    'booking.depositToday': { en: '${deposit} deposit today', fr: 'dépôt de {deposit}$ aujourd’hui' },

    // ---------- account.html ----------
    'account.title': { en: 'My account', fr: 'Mon compte' },
    'account.lede': { en: 'Sign in to see your booking history, or create an account when you book online.', fr: 'Connecte-toi pour voir ton historique de réservations, ou crée un compte lors de ta réservation en ligne.' },
    'account.notice.backend': { en: 'Accounts aren’t turned on yet for this site. You can still <a href="booking.html">book as a guest</a>.', fr: 'Les comptes ne sont pas encore activés sur ce site. Tu peux quand même <a href="booking.html">réserver comme invité</a>.' },
    'account.tab.login': { en: 'Log in', fr: 'Connexion' },
    'account.tab.signup': { en: 'Create account', fr: 'Créer un compte' },
    'account.email': { en: 'Email', fr: 'Courriel' },
    'account.password': { en: 'Password', fr: 'Mot de passe' },
    'account.login.submit': { en: 'Log in', fr: 'Se connecter' },
    'account.name': { en: 'Name', fr: 'Nom' },
    'account.signup.submit': { en: 'Create account', fr: 'Créer un compte' },
    'account.signup.note.creating': { en: 'Creating your account...', fr: 'Création de ton compte...' },
    'account.signup.note.checkEmail': { en: 'Account created! Check your email to confirm, then log in.', fr: 'Compte créé! Vérifie tes courriels pour confirmer, puis connecte-toi.' },
    'account.login.note.signingIn': { en: 'Signing in...', fr: 'Connexion en cours...' },
    'account.signedInAs': { en: 'Signed in as', fr: 'Connecté en tant que' },
    'account.logout': { en: 'Log out', fr: 'Se déconnecter' },
    'account.myBookings': { en: 'My bookings', fr: 'Mes réservations' },
    'account.bookings.loadError': { en: 'Could not load your bookings right now.', fr: 'Impossible de charger tes réservations pour le moment.' },
    'account.bookings.empty': { en: 'No bookings yet. <a href="booking.html">Book your first cleaning</a>.', fr: 'Aucune réservation pour le moment. <a href="booking.html">Réserve ton premier nettoyage</a>.' },
    'status.pending_payment': { en: 'Awaiting payment', fr: 'En attente de paiement' },
    'status.confirmed': { en: 'Confirmed', fr: 'Confirmée' },
    'status.completed': { en: 'Completed', fr: 'Terminée' },
    'status.cancelled': { en: 'Cancelled', fr: 'Annulée' },
    'status.new': { en: 'New', fr: 'Nouvelle' },
    'status.contacted': { en: 'Contacted', fr: 'Contacté' },
    'status.booked': { en: 'Booked', fr: 'Réservé' },
    'status.declined': { en: 'Declined', fr: 'Refusé' },
    'authError.invalidCredentials': { en: 'Invalid login credentials', fr: 'Identifiants de connexion invalides' },
    'authError.alreadyRegistered': { en: 'This email is already registered.', fr: 'Ce courriel est déjà enregistré.' },

    // ---------- admin.html ----------
    'admin.title': { en: 'Owner dashboard', fr: 'Tableau de bord propriétaire' },
    'admin.notice.backend': { en: 'The backend isn’t configured yet — see SETUP.md to connect Supabase.', fr: 'Le backend n’est pas encore configuré — voir SETUP.md pour connecter Supabase.' },
    'admin.notAdmin': { en: 'This account isn’t set up as an admin. Add it to <code>admin_users</code> in Supabase — see SETUP.md.', fr: 'Ce compte n’est pas configuré comme administrateur. Ajoute-le dans <code>admin_users</code> sur Supabase — voir SETUP.md.' },
    'admin.tab.quotes': { en: 'Quote requests', fr: 'Demandes de devis' },
    'admin.tab.bookings': { en: 'Bookings', fr: 'Réservations' },
    'admin.logout': { en: 'Log out', fr: 'Se déconnecter' },
    'admin.col.date': { en: 'Date', fr: 'Date' },
    'admin.col.time': { en: 'Time', fr: 'Heure' },
    'admin.col.name': { en: 'Name', fr: 'Nom' },
    'admin.col.contact': { en: 'Contact', fr: 'Contact' },
    'admin.col.service': { en: 'Service', fr: 'Service' },
    'admin.col.frequency': { en: 'Frequency', fr: 'Fréquence' },
    'admin.col.area': { en: 'Area', fr: 'Secteur' },
    'admin.col.home': { en: 'Home', fr: 'Logement' },
    'admin.col.notes': { en: 'Notes', fr: 'Notes' },
    'admin.col.status': { en: 'Status', fr: 'Statut' },
    'admin.col.deposit': { en: 'Deposit', fr: 'Dépôt' },
    'admin.col.files': { en: 'Files', fr: 'Fichiers' },
    'admin.col.preferredDay': { en: 'Preferred day', fr: 'Journée préférée' },
    'admin.col.pets': { en: 'Pets', fr: 'Animaux' },
    'admin.files.none': { en: '—', fr: '—' },
    'admin.files.view': { en: 'View {count}', fr: 'Voir {count}' },
    'admin.files.photo': { en: 'Photo {n}', fr: 'Photo {n}' },
    'admin.files.video': { en: 'Video', fr: 'Vidéo' },
    'admin.files.loadError': { en: 'Could not load files', fr: 'Impossible de charger les fichiers' },

    'footer.company': { en: 'Company', fr: 'Entreprise' },
    'footer.about': { en: 'About us', fr: 'À propos' },
    'footer.giftCards': { en: 'Gift cards', fr: 'Cartes-cadeaux' },
    'footer.legal': { en: 'Legal', fr: 'Mentions légales' },
    'footer.privacy': { en: 'Privacy policy', fr: 'Politique de confidentialité' },
    'footer.terms': { en: 'Terms of service', fr: 'Conditions d’utilisation' },

    'about.hero.tag': { en: 'About us', fr: 'À propos' },
    'about.hero.title': { en: 'The story behind Magicstick Clean', fr: 'L’histoire derrière Magicstick Clean' },
    'about.hero.lede': { en: 'Locally owned and run by hand, not by a call center — when you book with me, you get the same cleaner every time.', fr: 'Une entreprise locale, gérée à la main, pas par un centre d’appels — quand vous réservez avec moi, vous avez la même personne à chaque visite.' },
    'about.story.title': { en: 'Why I started Magicstick Clean', fr: 'Pourquoi j’ai fondé Magicstick Clean' },
    'about.story.p1': { en: 'I started Magicstick Clean because I was tired of seeing cleaning done the impersonal way: a different face every visit, a call center between you and the person in your home, and no one you could really reach if something wasn’t right.', fr: 'J’ai fondé Magicstick Clean parce que j’en avais assez de voir le ménage fait de façon impersonnelle : un visage différent à chaque visite, un centre d’appels entre vous et la personne dans votre maison, et personne à joindre vraiment si quelque chose n’allait pas.' },
    'about.story.p2': { en: 'So I built something smaller and more personal: one cleaner you can count on, eco-friendly supplies I bring myself, and a direct line to me — the owner — for anything you need, from Clarence-Rockland to Ottawa and across the river into Gatineau.', fr: 'J’ai donc bâti quelque chose de plus petit et de plus personnel : une seule personne sur qui compter, des produits écologiques que j’apporte moi-même, et une ligne directe avec moi — la propriétaire — pour tout ce dont vous avez besoin, de Clarence-Rockland à Ottawa, jusqu’à Gatineau.' },
    'about.values.title': { en: 'What you can expect', fr: 'Ce à quoi vous attendre' },
    'about.values.item1': { en: 'Detail-oriented and reliable, every visit', fr: 'Minutieuse et fiable, à chaque visite' },
    'about.values.item2': { en: 'Flexible scheduling around your life', fr: 'Horaire flexible qui s’adapte à votre vie' },
    'about.values.item3': { en: 'Eco-friendly supplies, brought by me', fr: 'Produits écologiques, apportés par moi' },
    'about.values.item4': { en: 'Locally owned and operated', fr: 'Propriété locale et gestion locale' },
    'about.values.item5': { en: 'Not happy? I’ll come back and make it right, free', fr: 'Pas satisfait? Je reviens tout arranger, gratuitement' },
    'about.cta.title': { en: 'Ready to see the difference?', fr: 'Prêt à voir la différence?' },
    'about.cta.desc': { en: 'Request a free quote, or book your first cleaning online.', fr: 'Demandez un devis gratuit, ou réservez votre premier ménage en ligne.' },
    'about.cta.quote': { en: 'Get a quote', fr: 'Demander un devis' },
    'about.cta.book': { en: 'Book online', fr: 'Réserver en ligne' },

    'giftcards.hero.tag': { en: 'Gift cards', fr: 'Cartes-cadeaux' },
    'giftcards.hero.title': { en: 'Give the gift of a clean home', fr: 'Offrez le cadeau d’une maison propre' },
    'giftcards.hero.lede': { en: 'A Magicstick Clean gift card is perfect for a housewarming, a new parent, a birthday, or just because. Request one below and I’ll take care of the rest.', fr: 'Une carte-cadeau Magicstick Clean est parfaite pour une pendaison de crémaillère, de nouveaux parents, un anniversaire, ou juste comme ça. Faites une demande ci-dessous et je m’occupe du reste.' },
    'giftcards.how.title': { en: 'How it works', fr: 'Comment ça marche' },
    'giftcards.how.step1.title': { en: 'Request a card', fr: 'Faites une demande' },
    'giftcards.how.step1.desc': { en: 'Tell me the amount and who it\'s for using the form below.', fr: 'Indiquez le montant et pour qui c’est avec le formulaire ci-dessous.' },
    'giftcards.how.step2.title': { en: 'I confirm and arrange payment', fr: 'Je confirme et j’organise le paiement' },
    'giftcards.how.step2.desc': { en: 'I\'ll reach out by phone or email within a day to arrange payment and details.', fr: 'Je vous contacte par téléphone ou courriel en moins d’une journée pour organiser le paiement et les détails.' },
    'giftcards.how.step3.title': { en: 'Recipient redeems it', fr: 'Le destinataire l’utilise' },
    'giftcards.how.step3.desc': { en: 'The recipient uses it toward any cleaning service, whenever they\'re ready to book.', fr: 'Le destinataire l’utilise pour n’importe quel service de ménage, quand il est prêt à réserver.' },
    'giftcards.form.title': { en: 'Request a gift card', fr: 'Demander une carte-cadeau' },
    'giftcards.form.subtitle': { en: 'Fill this in and I\'ll get back to you the same day.', fr: 'Remplissez ce formulaire et je vous réponds le jour même.' },
    'giftcards.form.amount': { en: 'Amount', fr: 'Montant' },
    'giftcards.form.recipient': { en: 'Recipient\'s name (optional)', fr: 'Nom du destinataire (optionnel)' },
    'giftcards.form.message': { en: 'Message (optional)', fr: 'Message (optionnel)' },
    'giftcards.form.messagePlaceholder': { en: 'Anything you\'d like on the card, or other details', fr: 'Ce que vous aimeriez inscrire sur la carte, ou d’autres détails' },
    'giftcards.form.submit': { en: 'Send request', fr: 'Envoyer la demande' },
    'giftcards.form.note.default': { en: 'This opens your email app with everything filled in, ready to send to magicstickclean@gmail.com.', fr: 'Ceci ouvre votre application courriel avec tout déjà rempli, prêt à envoyer à magicstickclean@gmail.com.' },
    'giftcards.form.note.opening': { en: 'Opening your email app…', fr: 'Ouverture de votre application courriel…' },

    'privacy.hero.tag': { en: 'Privacy', fr: 'Confidentialité' },
    'privacy.hero.title': { en: 'Privacy Policy', fr: 'Politique de confidentialité' },
    'privacy.hero.lede': { en: 'Last updated 2026. This page explains what information Magicstick Clean collects and how it\'s used.', fr: 'Dernière mise à jour en 2026. Cette page explique quels renseignements Magicstick Clean recueille et comment ils sont utilisés.' },
    'privacy.collect.title': { en: 'Information we collect', fr: 'Renseignements que nous recueillons' },
    'privacy.collect.p1': { en: 'When you request a quote or book a cleaning, we collect your name, phone number or email, service address or area, and details about your home (size, type, and any notes you provide).', fr: 'Lorsque vous demandez un devis ou réservez un ménage, nous recueillons votre nom, votre numéro de téléphone ou courriel, l’adresse ou le secteur du service, et des détails sur votre logement (taille, type, et toute note que vous fournissez).' },
    'privacy.collect.p2': { en: 'If you choose to upload photos or a video of your home with your quote request, those files are stored so I can prepare an accurate quote.', fr: 'Si vous choisissez de téléverser des photos ou une vidéo de votre logement avec votre demande de devis, ces fichiers sont conservés afin que je puisse préparer un devis précis.' },
    'privacy.collect.p3': { en: 'If you create a My Account login, we store your email address and an encrypted password. If you pay a deposit online, your payment details are handled directly by our payment processor (Stripe) — we never see or store your full card number.', fr: 'Si vous créez un compte Mon compte, nous conservons votre adresse courriel et un mot de passe chiffré. Si vous payez un dépôt en ligne, vos renseignements de paiement sont traités directement par notre processeur de paiement (Stripe) — nous ne voyons ni ne conservons jamais votre numéro de carte complet.' },
    'privacy.use.title': { en: 'How we use it', fr: 'Comment nous l’utilisons' },
    'privacy.use.p1': { en: 'We use your information to prepare and send you a quote, schedule and manage bookings, contact you about your service, process deposits, and send booking confirmations by email.', fr: 'Nous utilisons vos renseignements pour préparer et vous envoyer un devis, planifier et gérer les réservations, communiquer avec vous à propos de votre service, traiter les dépôts, et envoyer des confirmations de réservation par courriel.' },
    'privacy.use.p2': { en: 'We never sell your information, and we only use it to operate and improve Magicstick Clean.', fr: 'Nous ne vendons jamais vos renseignements, et nous les utilisons uniquement pour faire fonctionner et améliorer Magicstick Clean.' },
    'privacy.storage.title': { en: 'Where it\'s stored', fr: 'Où ils sont conservés' },
    'privacy.storage.p1': { en: 'Your information is stored securely with our database provider (Supabase). Uploaded photos and videos are kept in a private storage area accessible only to Magicstick Clean, not the public.', fr: 'Vos renseignements sont conservés en sécurité chez notre fournisseur de base de données (Supabase). Les photos et vidéos téléversées sont conservées dans un espace de stockage privé, accessible uniquement à Magicstick Clean, jamais au public.' },
    'privacy.thirdparty.title': { en: 'Third parties we use', fr: 'Tiers que nous utilisons' },
    'privacy.thirdparty.p1': { en: 'Stripe processes online payments and deposits. Resend sends transactional emails (like quote and booking confirmations). Both are used only to operate the service.', fr: 'Stripe traite les paiements et dépôts en ligne. Resend envoie les courriels transactionnels (comme les confirmations de devis et de réservation). Les deux sont utilisés uniquement pour faire fonctionner le service.' },
    'privacy.cookies.title': { en: 'Cookies & local storage', fr: 'Témoins et stockage local' },
    'privacy.cookies.p1': { en: 'We store your language preference (English/French) in your browser\'s local storage so the site remembers it on your next visit. We don\'t use advertising or tracking cookies.', fr: 'Nous conservons votre préférence de langue (anglais/français) dans le stockage local de votre navigateur afin que le site s’en souvienne à votre prochaine visite. Nous n’utilisons aucun témoin publicitaire ou de suivi.' },
    'privacy.choices.title': { en: 'Your choices', fr: 'Vos choix' },
    'privacy.choices.p1': { en: 'You can ask to see, correct, or delete the information we have about you at any time by emailing magicstickclean@gmail.com.', fr: 'Vous pouvez demander à voir, corriger ou supprimer les renseignements que nous détenons à votre sujet en tout temps en écrivant à magicstickclean@gmail.com.' },
    'privacy.contact.title': { en: 'Questions?', fr: 'Des questions?' },
    'privacy.contact.p1': { en: 'Reach out any time at magicstickclean@gmail.com or 343-843-7761.', fr: 'Écrivez-nous en tout temps à magicstickclean@gmail.com ou au 343-843-7761.' },

    'terms.hero.tag': { en: 'Legal', fr: 'Mentions légales' },
    'terms.hero.title': { en: 'Terms of Service', fr: 'Conditions générales d’utilisation' },
    'terms.hero.lede': { en: 'Last updated 2026. These terms apply when you request a quote, book a cleaning, or use this website. Use the search or the table of contents to jump to any section.', fr: 'Dernière mise à jour en 2026. Ces conditions s’appliquent lorsque vous demandez un devis, réservez un ménage, ou utilisez ce site. Utilisez la recherche ou la table des matières pour accéder directement à une section.' },

    'terms.search.placeholder': { en: 'Search these terms (e.g. "cancellation", "deposit")', fr: 'Rechercher dans ces conditions (ex. « annulation », « dépôt »)' },
    'terms.search.noResults': { en: 'No section matches your search.', fr: 'Aucune section ne correspond à votre recherche.' },
    'terms.toc.label': { en: 'Table of contents', fr: 'Table des matières' },
    'terms.backToTop': { en: 'Back to top', fr: 'Retour en haut' },
    'terms.stickyCta.quote': { en: 'Get a quote', fr: 'Demander un devis' },
    'terms.stickyCta.book': { en: 'Book online', fr: 'Réserver en ligne' },

    'terms.s1.title': { en: '01. Acceptance of terms & scope of services', fr: '01. Acceptation des conditions et portée des services' },
    'terms.s1.body': { en: '<p>By requesting a quote, booking a service, or otherwise using this website, you agree to these Terms of Service. If you do not agree, please do not use our services.</p><p>Magicstick Clean provides residential and commercial cleaning services (standard cleaning, deep cleaning, move-in/move-out, Airbnb turnovers, office and retail cleaning, and post-construction cleanup) in Clarence-Rockland, Ottawa, and Gatineau, as described on this site. Exact scope, duration, and price are confirmed with you at the time of quote or booking.</p>', fr: '<p>En demandant un devis, en réservant un service, ou en utilisant autrement ce site, vous acceptez les présentes conditions générales d’utilisation. Si vous n’êtes pas d’accord, veuillez ne pas utiliser nos services.</p><p>Magicstick Clean offre des services de nettoyage résidentiel et commercial (nettoyage standard, nettoyage en profondeur, entrée/sortie de déménagement, roulement Airbnb, nettoyage de bureaux et commerces, et nettoyage post-construction) à Clarence-Rockland, Ottawa et Gatineau, tel que décrit sur ce site. La portée exacte, la durée et le prix sont confirmés avec vous au moment du devis ou de la réservation.</p>' },

    'terms.s2.title': { en: '02. Booking, pricing & billing', fr: '02. Réservation, tarification et facturation' },
    'terms.s2.body': { en: '<p>Quotes are estimates based on the information you provide (home size, type, and any notes or photos). If your home\'s actual condition differs materially from what was described, the final price may be adjusted and confirmed with you before or at the time of service.</p><p>Recurring visits (weekly, biweekly, monthly) come with a standing discount, shown at the time of quote. Payment is due at the time of service unless otherwise agreed, by cash, e-transfer, or card. Online bookings may require a deposit, paid securely through Stripe, to confirm your appointment — deposit terms are shown at checkout before you pay.</p>', fr: '<p>Les devis sont des estimations basées sur les renseignements que vous fournissez (taille du logement, type, et toute note ou photo). Si l’état réel du logement diffère de façon importante de ce qui a été décrit, le prix final pourrait être ajusté et confirmé avec vous avant ou pendant le service.</p><p>Les visites récurrentes (hebdomadaires, aux deux semaines, mensuelles) bénéficient d’un rabais permanent, indiqué au moment du devis. Le paiement est exigible au moment du service, sauf entente contraire, par argent comptant, virement Interac ou carte. Les réservations en ligne peuvent exiger un dépôt, payé de façon sécurisée via Stripe, afin de confirmer votre rendez-vous — les conditions du dépôt sont indiquées avant le paiement.</p>' },

    'terms.s3.title': { en: '03. Cancellation, rescheduling & refund policy', fr: '03. Politique d’annulation, de modification et de remboursement' },
    'terms.s3.body': { en: '<p>Plans change, that\'s fine — just give at least <strong>[Cancellation notice, e.g. 24 hours]</strong>\' notice where possible so the time can go to another client. You can cancel or reschedule by phone, text, or email.</p><p>If a deposit was paid to confirm an online booking: cancelling or rescheduling with at least the notice above is fully refundable or transferable to a new date at no cost. Cancelling with less notice, or a missed appointment ("no-show"), may result in the deposit being forfeited to cover the reserved time slot. Refunds, when due, are returned to the original payment method within a reasonable time.</p>', fr: '<p>Les plans changent, c’est correct — donnez simplement un préavis d’au moins <strong>[Délai d’annulation, ex. 24 heures]</strong> lorsque possible afin que la plage horaire puisse être offerte à un autre client. Vous pouvez annuler ou déplacer un rendez-vous par téléphone, texto ou courriel.</p><p>Si un dépôt a été payé pour confirmer une réservation en ligne : une annulation ou un déplacement respectant le préavis ci-dessus est entièrement remboursable ou transférable à une nouvelle date, sans frais. Une annulation avec un préavis plus court, ou une absence au rendez-vous, peut entraîner la perte du dépôt afin de couvrir la plage horaire réservée. Les remboursements, lorsqu’applicables, sont retournés au mode de paiement original dans un délai raisonnable.</p>' },

    'terms.s4.title': { en: '04. Insurance, damages & limitation of liability', fr: '04. Assurances, dommages et limites de responsabilité' },
    'terms.s4.body': { en: '<p>We take care to protect your home and belongings during every visit. Please let us know in advance about fragile, high-value, or sentimental items so we can take extra precautions around them.</p><p>Liability insurance coverage is <strong>currently being finalized (coming soon)</strong> — this is disclosed here and on our services comparison so you can make an informed decision. Until coverage is in place, our liability for any loss or damage arising from a cleaning visit is limited to the direct cost of repair or replacement of the specific item affected, and we are not responsible for pre-existing damage, normal wear, or items left in a state that made damage reasonably unavoidable (e.g. unsecured breakables in high-traffic areas). Report any concern within <strong>[Report window, e.g. 24 hours]</strong> of the visit so we can address it promptly.</p>', fr: '<p>Nous prenons soin de protéger votre maison et vos biens à chaque visite. Merci de nous aviser à l’avance des objets fragiles, de grande valeur ou sentimentaux afin que nous puissions prendre des précautions supplémentaires.</p><p>La couverture d’assurance responsabilité est <strong>en cours de finalisation (bientôt disponible)</strong> — ceci est indiqué ici ainsi que dans notre tableau comparatif afin que vous puissiez prendre une décision éclairée. En attendant la mise en place de cette couverture, notre responsabilité pour toute perte ou tout dommage découlant d’une visite de nettoyage se limite au coût direct de réparation ou de remplacement de l’article précis touché, et nous ne sommes pas responsables des dommages préexistants, de l’usure normale, ou des objets laissés dans un état rendant le dommage raisonnablement inévitable (ex. objets fragiles non sécurisés dans une zone de passage). Signalez toute préoccupation dans un délai de <strong>[Délai de signalement, ex. 24 heures]</strong> suivant la visite afin que nous puissions y remédier rapidement.</p>' },

    'terms.s5.title': { en: '05. Equipment, supplies & access to premises', fr: '05. Équipements, fournitures et accès aux locaux' },
    'terms.s5.body': { en: '<p>We bring our own eco-friendly cleaning supplies and equipment at no extra cost. If you\'d prefer we use products you already have, just let us know before the visit.</p><p>You are responsible for providing safe, working access to the premises at the agreed time (key, door code, lockbox, or your presence) and for basic utilities needed for cleaning (running water, electricity). If access cannot be arranged and we are unable to start the visit, this may be treated as a late cancellation under section 03.</p>', fr: '<p>Nous apportons nos propres produits et équipements de nettoyage écologiques, sans frais supplémentaires. Si vous préférez que nous utilisions des produits que vous possédez déjà, informez-nous simplement avant la visite.</p><p>Vous êtes responsable de fournir un accès sécuritaire et fonctionnel aux lieux à l’heure convenue (clé, code de porte, boîte à clé, ou votre présence), ainsi que des services de base nécessaires au nettoyage (eau courante, électricité). Si l’accès ne peut être organisé et que nous sommes dans l’impossibilité de commencer la visite, ceci peut être traité comme une annulation tardive en vertu de la section 03.</p>' },

    'terms.s6.title': { en: '06. Satisfaction guarantee & follow-up photos / quality assurance', fr: '06. Garantie de satisfaction et photos de suivi / assurance qualité' },
    'terms.s6.body': { en: '<p>If you\'re not happy with a cleaning, tell us within <strong>[Guarantee window, e.g. 24 hours]</strong> and we\'ll come back to fix it, free of charge. Getting it right matters more than getting it done fast.</p><p>For quality assurance and, with your consent, for our before/after gallery, we may take photos of the work completed. Any photos you upload with a quote request, or that we take on-site, are used only to prepare an accurate quote or to confirm the work performed, and are never shared publicly without your explicit permission (see our <a href="privacy.html">Privacy Policy</a>).</p>', fr: '<p>Si vous n’êtes pas satisfait d’un ménage, avisez-nous dans un délai de <strong>[Délai de garantie, ex. 24 heures]</strong> et nous reviendrons corriger la situation, gratuitement. Bien faire les choses compte plus que les faire vite.</p><p>À des fins d’assurance qualité et, avec votre consentement, pour notre galerie avant/après, il se peut que nous prenions des photos du travail accompli. Toute photo que vous téléversez avec une demande de devis, ou que nous prenons sur place, est utilisée uniquement pour préparer un devis précis ou confirmer le travail effectué, et n’est jamais partagée publiquement sans votre permission explicite (voir notre <a href="privacy.html">politique de confidentialité</a>).</p>' },

    'terms.s7.title': { en: '07. Safe working environment & client obligations', fr: '07. Environnement de travail sécuritaire et obligations du client' },
    'terms.s7.body': { en: '<p>You agree to provide a reasonably safe environment for our team: no hazardous materials, exposed wiring, or unsafe structural conditions in the areas to be cleaned. Please let us know about any known hazards in advance.</p><p>Pets are welcome in the home during a visit, but for everyone\'s safety, aggressive or very anxious pets are best kept in another room during the visit. We reserve the right to pause or end a visit early, at no penalty to you, if the environment becomes unsafe.</p>', fr: '<p>Vous acceptez de fournir un environnement raisonnablement sécuritaire à notre équipe : aucun matériau dangereux, câblage exposé, ou condition structurelle non sécuritaire dans les zones à nettoyer. Merci de nous informer à l’avance de tout danger connu.</p><p>Les animaux de compagnie sont les bienvenus à la maison pendant une visite, mais pour la sécurité de tous, les animaux agressifs ou très anxieux sont mieux gardés dans une autre pièce pendant la visite. Nous nous réservons le droit de suspendre ou de mettre fin à une visite plus tôt, sans pénalité pour vous, si l’environnement devient non sécuritaire.</p>' },

    'terms.s8.title': { en: '08. No direct solicitation of service providers', fr: '08. Clause de non-sollicitation directe des prestataires' },
    'terms.s8.body': { en: '<p>Our cleaners and independent contractors are the heart of the business. To keep it sustainable for everyone, you agree not to directly hire, engage, or solicit any cleaner or contractor introduced to you through Magicstick Clean, for cleaning services outside of Magicstick Clean, for a period of <strong>[Non-solicitation period, e.g. 12 months]</strong> after your last booking with us — except with our prior written agreement.</p>', fr: '<p>Nos préposés au nettoyage et entrepreneurs indépendants sont au cœur de l’entreprise. Afin de préserver un modèle durable pour tous, vous acceptez de ne pas embaucher, engager ou solliciter directement un préposé ou un entrepreneur qui vous a été présenté par l’entremise de Magicstick Clean, pour des services de nettoyage en dehors de Magicstick Clean, pendant une période de <strong>[Période de non-sollicitation, ex. 12 mois]</strong> suivant votre dernière réservation avec nous — sauf avec notre accord écrit préalable.</p>' },

    'terms.s9.title': { en: '09. Tipping policy', fr: '09. Politique concernant les pourboires' },
    'terms.s9.body': { en: '<p>Tipping is never required, but always appreciated. If you\'d like to leave a tip, 100% of it goes directly to the person who cleaned your home — by cash on-site, e-transfer, or through your customer account where available.</p>', fr: '<p>Le pourboire n’est jamais obligatoire, mais toujours apprécié. Si vous souhaitez laisser un pourboire, 100 % de celui-ci est remis directement à la personne qui a nettoyé votre logement — en argent comptant sur place, par virement Interac, ou via votre compte client lorsque disponible.</p>' },

    'terms.s10.title': { en: '10. Consent to communications (SMS, notifications, emails)', fr: '10. Consentement aux communications (SMS, notifications, courriels)' },
    'terms.s10.body': { en: '<p>By providing your phone number or email when requesting a quote, booking, or creating an account, you consent to receive communications related to your request or service — quote follow-ups, booking confirmations, appointment reminders, and account notifications — by SMS, email, or phone call.</p><p>We may also occasionally send promotional messages (like seasonal offers). You can opt out of promotional messages at any time by replying "STOP" to a text, unsubscribing from an email, or telling us directly — this will not affect service-related communications about an active booking.</p>', fr: '<p>En fournissant votre numéro de téléphone ou votre courriel lors d’une demande de devis, d’une réservation, ou de la création d’un compte, vous consentez à recevoir des communications liées à votre demande ou à votre service — suivis de devis, confirmations de réservation, rappels de rendez-vous, et notifications de compte — par SMS, courriel ou appel téléphonique.</p><p>Il se peut aussi que nous envoyions occasionnellement des messages promotionnels (comme des offres saisonnières). Vous pouvez vous désabonner des messages promotionnels en tout temps en répondant « STOP » à un texto, en vous désabonnant d’un courriel, ou en nous le disant directement — ceci n’affectera pas les communications liées au service pour une réservation active.</p>' },

    'terms.s11.title': { en: '11. Privacy & protection of personal data', fr: '11. Confidentialité et protection des données personnelles' },
    'terms.s11.body': { en: '<p>We collect only the information needed to prepare your quote, manage your booking, and operate the service — your name, contact details, service address, home details, and any photos or videos you choose to share. Online payments are processed securely through Stripe; we never see or store your full card number.</p><p>Full details on what we collect, how it\'s used, where it\'s stored, and your rights (to access, correct, or delete your information) are in our dedicated <a href="privacy.html">Privacy Policy</a>, which forms part of these terms by reference.</p>', fr: '<p>Nous recueillons uniquement les renseignements nécessaires pour préparer votre devis, gérer votre réservation, et faire fonctionner le service — votre nom, vos coordonnées, l’adresse du service, les détails du logement, et toute photo ou vidéo que vous choisissez de partager. Les paiements en ligne sont traités de façon sécurisée via Stripe; nous ne voyons ni ne conservons jamais votre numéro de carte complet.</p><p>Tous les détails sur ce que nous recueillons, comment c’est utilisé, où c’est conservé, et vos droits (d’accès, de correction ou de suppression de vos renseignements) se trouvent dans notre <a href="privacy.html">politique de confidentialité</a> dédiée, laquelle fait partie intégrante des présentes conditions par renvoi.</p>' },

    'terms.s12.title': { en: '12. Governing law & dispute resolution', fr: '12. Droit applicable et résolution des litiges' },
    'terms.s12.body': { en: '<p>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict-of-law principles.</p><p>If a disagreement comes up, we\'ll always try to resolve it directly and in good faith first — reach out any time at <strong>magicstickclean@gmail.com</strong> or <strong>343-843-7761</strong>. If it can\'t be resolved directly, either party may pursue the matter through the applicable small claims court or another venue of competent jurisdiction in Ontario.</p>', fr: '<p>Les présentes conditions sont régies par les lois de la province de l’Ontario et les lois fédérales du Canada qui s’y appliquent, sans égard aux principes de conflits de lois.</p><p>En cas de désaccord, nous chercherons toujours d’abord à le résoudre directement et de bonne foi — écrivez-nous en tout temps à <strong>magicstickclean@gmail.com</strong> ou au <strong>343-843-7761</strong>. Si le différend ne peut être résolu directement, chaque partie peut porter l’affaire devant la cour des petites créances applicable ou un autre tribunal compétent en Ontario.</p>' },

    'terms.changes.title': { en: 'Changes to these terms', fr: 'Modifications de ces conditions' },
    'terms.changes.p1': { en: 'These terms may be updated from time to time. The date at the top of this page reflects the latest update — please check back occasionally.', fr: 'Ces conditions peuvent être mises à jour de temps à autre. La date en haut de cette page reflète la plus récente mise à jour — n’hésitez pas à la consulter à l’occasion.' },
    'terms.contact.title': { en: 'Questions?', fr: 'Des questions?' },
    'terms.contact.p1': { en: 'Reach out any time at magicstickclean@gmail.com or 343-843-7761.', fr: 'Écrivez-nous en tout temps à magicstickclean@gmail.com ou au 343-843-7761.' },

    'home.testimonials.title': { en: 'What clients are saying', fr: 'Ce que disent les clients' },
    'home.testimonials.subtitle': { en: 'Magicstick Clean is a new local business — real reviews are on their way. Here\'s what I show up to earn every visit.', fr: 'Magicstick Clean est une nouvelle entreprise locale — les vrais avis s’en viennent. Voici ce que je m’efforce de mériter à chaque visite.' },
    'home.testimonials.placeholder': { en: 'Your review could be here', fr: 'Votre avis pourrait être ici' },
    'home.testimonials.cta': { en: 'Had a cleaning already? I\'d be grateful for a few words.', fr: 'Vous avez déjà eu un ménage? J’apprécierais quelques mots de votre part.' },
    'home.testimonials.ctaLink': { en: 'Share your experience', fr: 'Partager votre expérience' },

    'form.sameDayReminder': { en: '⏱ I typically reply within the same day.', fr: '⏱ Je réponds habituellement le jour même.' },

    'learnMore.hero.tag': { en: 'Learn more', fr: 'En savoir plus' },
    'learnMore.hero.title': { en: 'Real results, real answers', fr: 'De vrais résultats, de vraies réponses' },
    'learnMore.hero.lede': { en: 'Before & after photos, how booking works, what clients are saying, and everything else you might want to know before reaching out.', fr: 'Photos avant/après, comment fonctionne la réservation, ce que disent les clients, et tout ce que vous voudriez savoir avant de nous contacter.' },
    'learnMore.cta.title': { en: 'Ready when you are.', fr: 'Prêt quand vous le serez.' },
    'learnMore.cta.desc': { en: 'Request a free quote, or book your first cleaning online.', fr: 'Demandez un devis gratuit, ou réservez votre premier ménage en ligne.' },
  };

  function getLang() {
    try {
      return localStorage.getItem('magicstick_lang') || 'en';
    } catch (e) {
      return 'en';
    }
  }

  function t(key, vars) {
    const entry = STRINGS[key];
    let text = entry ? (entry[getLang()] || entry.en) : key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        text = text.replace(`{${k}}`, vars[k]);
      });
    }
    return text;
  }

  function applyLang() {
    const lang = getLang();
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    document.dispatchEvent(new CustomEvent('magicstick:langchange', { detail: { lang } }));
  }

  function setLang(lang) {
    try {
      localStorage.setItem('magicstick_lang', lang);
    } catch (e) { /* ignore */ }
    applyLang();
  }

  function initLangToggle() {
    document.querySelectorAll('.lang-toggle').forEach((toggle) => {
      toggle.querySelectorAll('.lang-btn').forEach((btn) => {
        btn.addEventListener('click', () => setLang(btn.dataset.lang));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLangToggle();
    applyLang();
  });

  window.MagicstickI18N = { t, getLang, setLang, applyLang };
})();
