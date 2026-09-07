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

    // ---------- index.html: hero ----------
    'home.hero.tag': { en: 'First-time client special', fr: 'Offre nouveaux clients' },
    'home.hero.title': { en: 'The clean you can check off your list.', fr: 'Le ménage que tu peux enfin rayer de ta liste.' },
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
