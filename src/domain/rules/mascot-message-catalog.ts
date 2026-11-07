/**
 * Single catalogue of Pulse mascot messages (French, user-facing).
 * Every message exists in all eight variants: tu or vous, warm or sober tone, with or without
 * the first name. Sentences are never assembled from fragments. Pulse speaks in the feminine.
 *
 * Template syntax (rendered in mascot-message-rules):
 *   {name} {title} ...        plain parameter
 *   {count|tâche|tâches}      singular below 2, plural otherwise
 *   {de:person}               "de" or "d'" depending on the first letter
 */

export interface MessageForms {
  plain: string;
  named: string; // Contains {name}
}

export interface MessageVariants {
  warm: MessageForms;
  sober: MessageForms;
}

export interface MessageEntry {
  tu: MessageVariants;
  vous: MessageVariants;
}

type Form = readonly [plain: string, named: string];

function entry(tuWarm: Form, tuSober: Form, vousWarm: Form, vousSober: Form): MessageEntry {
  const forms = ([plain, named]: Form): MessageForms => ({ plain, named });
  return {
    tu: { warm: forms(tuWarm), sober: forms(tuSober) },
    vous: { warm: forms(vousWarm), sober: forms(vousSober) },
  };
}

export const MASCOT_MESSAGES = {
  // ─── Onboarding ───────────────────────────────────────────────────────────
  WELCOME: entry(
    ["Bienvenue, je suis Pulse ! Je t'aide à te souvenir, à planifier et à vivre.", "Bienvenue {name}, je suis Pulse ! Je t'aide à te souvenir, à planifier et à vivre."],
    ["Bienvenue. Je suis Pulse, ton assistante pour te souvenir, planifier et organiser tes journées.", "Bienvenue, {name}. Je suis Pulse, ton assistante pour te souvenir, planifier et organiser tes journées."],
    ["Bienvenue, je suis Pulse ! Je vous aide à vous souvenir, à planifier et à vivre.", "Bienvenue {name}, je suis Pulse ! Je vous aide à vous souvenir, à planifier et à vivre."],
    ["Bienvenue. Je suis Pulse, votre assistante pour vous souvenir, planifier et organiser vos journées.", "Bienvenue, {name}. Je suis Pulse, votre assistante pour vous souvenir, planifier et organiser vos journées."],
  ),
  DISCOVER_INTRO: entry(
    ["Voici les trois choses que je suivrai pour toi.", "{name}, voici les trois choses que je suivrai pour toi."],
    ["Voici les trois éléments que je suivrai pour toi.", "{name}, voici les trois éléments que je suivrai pour toi."],
    ["Voici les trois choses que je suivrai pour vous.", "{name}, voici les trois choses que je suivrai pour vous."],
    ["Voici les trois éléments que je suivrai pour vous.", "{name}, voici les trois éléments que je suivrai pour vous."],
  ),
  DISCOVER_REMINDER: entry(
    ["Un rappel te prévient à l'heure.", "{name}, un rappel te prévient à l'heure."],
    ["Un rappel t'avertit à l'heure prévue.", "{name}, un rappel t'avertit à l'heure prévue."],
    ["Un rappel vous prévient à l'heure.", "{name}, un rappel vous prévient à l'heure."],
    ["Un rappel vous avertit à l'heure prévue.", "{name}, un rappel vous avertit à l'heure prévue."],
  ),
  DISCOVER_TASK: entry(
    ["Une tâche attend d'être faite.", "{name}, une tâche attend d'être faite."],
    ["Une tâche reste à accomplir.", "{name}, une tâche reste à accomplir."],
    ["Une tâche attend d'être faite.", "{name}, une tâche attend d'être faite."],
    ["Une tâche reste à accomplir.", "{name}, une tâche reste à accomplir."],
  ),
  DISCOVER_EVENT: entry(
    ["Un événement occupe un moment.", "{name}, un événement occupe un moment."],
    ["Un événement occupe un créneau.", "{name}, un événement occupe un créneau."],
    ["Un événement occupe un moment.", "{name}, un événement occupe un moment."],
    ["Un événement occupe un créneau.", "{name}, un événement occupe un créneau."],
  ),
  PERSONALIZE_NAME: entry(
    ["Comment dois-je t'appeler ?", "{name}, c'est bien ton prénom ?"],
    ["Quel prénom dois-je utiliser ?", "{name}, c'est le prénom à utiliser ?"],
    ["Comment dois-je vous appeler ?", "{name}, c'est bien votre prénom ?"],
    ["Quel prénom dois-je utiliser ?", "{name}, c'est le prénom à utiliser ?"],
  ),
  PERSONALIZE_TIMEZONE: entry(
    ["Je vérifie que tes rappels sonnent à la bonne heure.", "{name}, je vérifie que tes rappels sonnent à la bonne heure."],
    ["Je contrôle le fuseau horaire de tes rappels.", "{name}, je contrôle le fuseau horaire de tes rappels."],
    ["Je vérifie que vos rappels sonnent à la bonne heure.", "{name}, je vérifie que vos rappels sonnent à la bonne heure."],
    ["Je contrôle le fuseau horaire de vos rappels.", "{name}, je contrôle le fuseau horaire de vos rappels."],
  ),
  SCHEDULE_INTRO: entry(
    ["Enchantée ! Le matin je te résume ta journée, le soir je fais le bilan.", "Enchantée, {name} ! Le matin je te résume ta journée, le soir je fais le bilan."],
    ["Enchantée. Le matin je résume ta journée, le soir je fais le bilan.", "Enchantée, {name}. Le matin je résume ta journée, le soir je fais le bilan."],
    ["Enchantée ! Le matin je vous résume votre journée, le soir je fais le bilan.", "Enchantée, {name} ! Le matin je vous résume votre journée, le soir je fais le bilan."],
    ["Enchantée. Le matin je résume votre journée, le soir je fais le bilan.", "Enchantée, {name}. Le matin je résume votre journée, le soir je fais le bilan."],
  ),
  PERMISSION_ASK: entry(
    ["J'ai besoin de pouvoir te prévenir au bon moment.", "{name}, j'ai besoin de pouvoir te prévenir au bon moment."],
    ["Les notifications me permettent de te prévenir à l'heure.", "{name}, les notifications me permettent de te prévenir à l'heure."],
    ["J'ai besoin de pouvoir vous prévenir au bon moment.", "{name}, j'ai besoin de pouvoir vous prévenir au bon moment."],
    ["Les notifications me permettent de vous prévenir à l'heure.", "{name}, les notifications me permettent de vous prévenir à l'heure."],
  ),
  PERMISSION_GRANTED: entry(
    ["Parfait, je m'occupe du reste.", "Parfait {name}, je m'occupe du reste."],
    ["Bien noté, je m'occupe du reste.", "Bien noté {name}, je m'occupe du reste."],
    ["Parfait, je m'occupe du reste.", "Parfait {name}, je m'occupe du reste."],
    ["Bien noté, je m'occupe du reste.", "Bien noté {name}, je m'occupe du reste."],
  ),
  PERMISSION_DENIED: entry(
    ["Pas de souci, je te montrerai tes rappels dans l'app.", "Pas de souci {name}, je te montrerai tes rappels dans l'app."],
    ["Compris. Tes rappels resteront visibles dans l'app.", "Compris {name}. Tes rappels resteront visibles dans l'app."],
    ["Pas de souci, je vous montrerai vos rappels dans l'app.", "Pas de souci {name}, je vous montrerai vos rappels dans l'app."],
    ["Compris. Vos rappels resteront visibles dans l'app.", "Compris {name}. Vos rappels resteront visibles dans l'app."],
  ),

  // ─── Home tour (four stops) and first visit tips ───────────────────────────
  TOUR_PILLARS: entry(
    ["Voici ton accueil : rappels, tâches, planning et proches d'un coup d'œil.", "{name}, voici ton accueil : rappels, tâches, planning et proches d'un coup d'œil."],
    ["Ton accueil réunit rappels, tâches, planning et proches.", "{name}, ton accueil réunit rappels, tâches, planning et proches."],
    ["Voici votre accueil : rappels, tâches, planning et proches d'un coup d'œil.", "{name}, voici votre accueil : rappels, tâches, planning et proches d'un coup d'œil."],
    ["Votre accueil réunit rappels, tâches, planning et proches.", "{name}, votre accueil réunit rappels, tâches, planning et proches."],
  ),
  TOUR_QUICK_ADD: entry(
    ["Ici, tu ajoutes un rappel, une tâche ou une note en quelques secondes.", "{name}, ici, tu ajoutes un rappel, une tâche ou une note en quelques secondes."],
    ["Ajoute ici un rappel, une tâche ou une note.", "{name}, ajoute ici un rappel, une tâche ou une note."],
    ["Ici, vous ajoutez un rappel, une tâche ou une note en quelques secondes.", "{name}, ici, vous ajoutez un rappel, une tâche ou une note en quelques secondes."],
    ["Ajoutez ici un rappel, une tâche ou une note.", "{name}, ajoutez ici un rappel, une tâche ou une note."],
  ),
  TOUR_TIMELINE: entry(
    ["Ton fil du jour met tout ce qui compte aujourd'hui dans l'ordre.", "{name}, ton fil du jour met tout ce qui compte aujourd'hui dans l'ordre."],
    ["Le fil du jour classe tes éléments dans l'ordre.", "{name}, le fil du jour classe tes éléments dans l'ordre."],
    ["Votre fil du jour met tout ce qui compte aujourd'hui dans l'ordre.", "{name}, votre fil du jour met tout ce qui compte aujourd'hui dans l'ordre."],
    ["Le fil du jour classe vos éléments dans l'ordre.", "{name}, le fil du jour classe vos éléments dans l'ordre."],
  ),
  TOUR_MASCOT: entry(
    ["Touche-moi pour ouvrir Pulse : j'y garde mes propositions.", "{name}, touche-moi pour ouvrir Pulse : j'y garde mes propositions."],
    ["Un appui sur la mascotte ouvre Pulse et ses propositions.", "{name}, un appui sur la mascotte ouvre Pulse et ses propositions."],
    ["Touchez-moi pour ouvrir Pulse : j'y garde mes propositions.", "{name}, touchez-moi pour ouvrir Pulse : j'y garde mes propositions."],
    ["Un appui sur la mascotte ouvre Pulse et ses propositions.", "{name}, un appui sur la mascotte ouvre Pulse et ses propositions."],
  ),
  TIP_REMINDERS: entry(
    ["Ici, tes rappels. Glisse-en un pour le terminer ou le reporter.", "{name}, ici, tes rappels. Glisse-en un pour le terminer ou le reporter."],
    ["Glisse un rappel pour le terminer ou le reporter.", "{name}, glisse un rappel pour le terminer ou le reporter."],
    ["Ici, vos rappels. Faites-en glisser un pour le terminer ou le reporter.", "{name}, ici, vos rappels. Faites-en glisser un pour le terminer ou le reporter."],
    ["Faites glisser un rappel pour le terminer ou le reporter.", "{name}, faites glisser un rappel pour le terminer ou le reporter."],
  ),
  TIP_TASKS: entry(
    ["Ici, tes tâches. Touche le cercle pour en terminer une.", "{name}, ici, tes tâches. Touche le cercle pour en terminer une."],
    ["Touche le cercle d'une tâche pour la terminer.", "{name}, touche le cercle d'une tâche pour la terminer."],
    ["Ici, vos tâches. Touchez le cercle pour en terminer une.", "{name}, ici, vos tâches. Touchez le cercle pour en terminer une."],
    ["Touchez le cercle d'une tâche pour la terminer.", "{name}, touchez le cercle d'une tâche pour la terminer."],
  ),
  TIP_CALENDAR: entry(
    ["Ici, ton planning. Choisis un jour pour voir ce qui l'attend.", "{name}, ici, ton planning. Choisis un jour pour voir ce qui l'attend."],
    ["Choisis un jour pour voir son contenu.", "{name}, choisis un jour pour voir son contenu."],
    ["Ici, votre planning. Choisissez un jour pour voir ce qui l'attend.", "{name}, ici, votre planning. Choisissez un jour pour voir ce qui l'attend."],
    ["Choisissez un jour pour voir son contenu.", "{name}, choisissez un jour pour voir son contenu."],
  ),
  TIP_PEOPLE: entry(
    ["Ici, tes proches. Je te signale ceux que tu n'as pas vus depuis longtemps.", "{name}, ici, tes proches. Je te signale ceux que tu n'as pas vus depuis longtemps."],
    ["Les proches sans nouvelles depuis longtemps sont signalés.", "{name}, les proches sans nouvelles depuis longtemps sont signalés."],
    ["Ici, vos proches. Je vous signale ceux que vous n'avez pas vus depuis longtemps.", "{name}, ici, vos proches. Je vous signale ceux que vous n'avez pas vus depuis longtemps."],
    ["Les proches sans nouvelles depuis longtemps sont signalés.", "{name}, les proches sans nouvelles depuis longtemps sont signalés."],
  ),
  TIP_PULSE: entry(
    ["Ici, je garde mes propositions. Tu décides toujours : je donne seulement une idée.", "{name}, ici, je garde mes propositions. Tu décides toujours : je donne seulement une idée."],
    ["Les propositions sont ici. Tu décides toujours de la suite.", "{name}, les propositions sont ici. Tu décides toujours de la suite."],
    ["Ici, je garde mes propositions. Vous décidez toujours : je donne seulement une idée.", "{name}, ici, je garde mes propositions. Vous décidez toujours : je donne seulement une idée."],
    ["Les propositions sont ici. Vous décidez toujours de la suite.", "{name}, les propositions sont ici. Vous décidez toujours de la suite."],
  ),

  // ─── Proposals P1 to P12 ──────────────────────────────────────────────────
  FORGOTTEN_CONTACT: entry(
    ["Ça fait {days} jours que tu n'as pas pris de nouvelles {de:person}. On lui écrit ?", "{name}, ça fait {days} jours que tu n'as pas pris de nouvelles {de:person}. On lui écrit ?"],
    ["Aucune nouvelle {de:person} depuis {days} jours. Veux-tu lui écrire ?", "{name}, aucune nouvelle {de:person} depuis {days} jours. Veux-tu lui écrire ?"],
    ["Cela fait {days} jours que vous n'avez pas pris de nouvelles {de:person}. Souhaitez-vous lui écrire ?", "{name}, cela fait {days} jours que vous n'avez pas pris de nouvelles {de:person}. Souhaitez-vous lui écrire ?"],
    ["Aucune nouvelle {de:person} depuis {days} jours. Souhaitez-vous lui écrire ?", "{name}, aucune nouvelle {de:person} depuis {days} jours. Souhaitez-vous lui écrire ?"],
  ),
  MISSED_REMINDER: entry(
    ["« {title} » n'a pas été fait à {time}. Je le reporte à demain, même heure ?", "{name}, « {title} » n'a pas été fait à {time}. Je le reporte à demain, même heure ?"],
    ["« {title} » n'a pas été fait à {time}. Reporter à demain, même heure ?", "{name}, « {title} » n'a pas été fait à {time}. Reporter à demain, même heure ?"],
    ["« {title} » n'a pas été fait à {time}. Je le reporte à demain, même heure ?", "{name}, « {title} » n'a pas été fait à {time}. Je le reporte à demain, même heure ?"],
    ["« {title} » n'a pas été fait à {time}. Reporter à demain, même heure ?", "{name}, « {title} » n'a pas été fait à {time}. Reporter à demain, même heure ?"],
  ),
  STREAK_AT_RISK: entry(
    ["Ta série de {streak} {streak|jour|jours} sur « {title} » est en jeu. Tu la valides ce soir ?", "{name}, ta série de {streak} {streak|jour|jours} sur « {title} » est en jeu. Tu la valides ce soir ?"],
    ["Ta série de {streak} {streak|jour|jours} sur « {title} » n'est pas encore validée aujourd'hui.", "{name}, ta série de {streak} {streak|jour|jours} sur « {title} » n'est pas encore validée aujourd'hui."],
    ["Votre série de {streak} {streak|jour|jours} sur « {title} » est en jeu. Vous la validez ce soir ?", "{name}, votre série de {streak} {streak|jour|jours} sur « {title} » est en jeu. Vous la validez ce soir ?"],
    ["Votre série de {streak} {streak|jour|jours} sur « {title} » n'est pas encore validée aujourd'hui.", "{name}, votre série de {streak} {streak|jour|jours} sur « {title} » n'est pas encore validée aujourd'hui."],
  ),
  BIRTHDAY_SOON: entry(
    ["L'anniversaire {de:person}, c'est dans {days} {days|jour|jours}. Je te mets un rappel ?", "{name}, l'anniversaire {de:person}, c'est dans {days} {days|jour|jours}. Je te mets un rappel ?"],
    ["L'anniversaire {de:person} a lieu dans {days} {days|jour|jours}. Créer un rappel ?", "{name}, l'anniversaire {de:person} a lieu dans {days} {days|jour|jours}. Créer un rappel ?"],
    ["L'anniversaire {de:person}, c'est dans {days} {days|jour|jours}. Je vous mets un rappel ?", "{name}, l'anniversaire {de:person}, c'est dans {days} {days|jour|jours}. Je vous mets un rappel ?"],
    ["L'anniversaire {de:person} a lieu dans {days} {days|jour|jours}. Créer un rappel ?", "{name}, l'anniversaire {de:person} a lieu dans {days} {days|jour|jours}. Créer un rappel ?"],
  ),
  BIRTHDAY_TODAY: entry(
    ["C'est l'anniversaire {de:person} aujourd'hui. Un petit message ?", "{name}, c'est l'anniversaire {de:person} aujourd'hui. Un petit message ?"],
    ["Aujourd'hui, c'est l'anniversaire {de:person}. Lui écrire ?", "{name}, aujourd'hui, c'est l'anniversaire {de:person}. Lui écrire ?"],
    ["C'est l'anniversaire {de:person} aujourd'hui. Un petit message ?", "{name}, c'est l'anniversaire {de:person} aujourd'hui. Un petit message ?"],
    ["Aujourd'hui, c'est l'anniversaire {de:person}. Lui écrire ?", "{name}, aujourd'hui, c'est l'anniversaire {de:person}. Lui écrire ?"],
  ),
  TASKS_TO_POSTPONE: entry(
    ["Il reste {count} {count|tâche|tâches} d'aujourd'hui. On {count|la|les} décale à demain ?", "{name}, il reste {count} {count|tâche|tâches} d'aujourd'hui. On {count|la|les} décale à demain ?"],
    ["{count} {count|tâche|tâches} d'aujourd'hui {count|reste|restent} à faire. Décaler à demain ?", "{name}, {count} {count|tâche|tâches} d'aujourd'hui {count|reste|restent} à faire. Décaler à demain ?"],
    ["Il reste {count} {count|tâche|tâches} d'aujourd'hui. On {count|la|les} décale à demain ?", "{name}, il reste {count} {count|tâche|tâches} d'aujourd'hui. On {count|la|les} décale à demain ?"],
    ["{count} {count|tâche|tâches} d'aujourd'hui {count|reste|restent} à faire. Décaler à demain ?", "{name}, {count} {count|tâche|tâches} d'aujourd'hui {count|reste|restent} à faire. Décaler à demain ?"],
  ),
  OVERLOADED_DAY: entry(
    ["Demain est très chargé : {count} choses prévues. On en décale une ?", "{name}, demain est très chargé : {count} choses prévues. On en décale une ?"],
    ["Demain compte {count} éléments prévus. En décaler un ?", "{name}, demain compte {count} éléments prévus. En décaler un ?"],
    ["Demain est très chargé : {count} choses prévues. On en décale une ?", "{name}, demain est très chargé : {count} choses prévues. On en décale une ?"],
    ["Demain compte {count} éléments prévus. En décaler un ?", "{name}, demain compte {count} éléments prévus. En décaler un ?"],
  ),
  PLANNING_CONFLICT: entry(
    ["Deux événements se chevauchent demain à {time}. On regarde ?", "{name}, deux événements se chevauchent demain à {time}. On regarde ?"],
    ["Deux événements se chevauchent demain à {time}.", "{name}, deux événements se chevauchent demain à {time}."],
    ["Deux événements se chevauchent demain à {time}. On regarde ?", "{name}, deux événements se chevauchent demain à {time}. On regarde ?"],
    ["Deux événements se chevauchent demain à {time}.", "{name}, deux événements se chevauchent demain à {time}."],
  ),
  MORNING_BRIEFING: entry(
    ["Bonjour ! Aujourd'hui : {reminders} {reminders|rappel|rappels} et {count} {count|tâche|tâches}.", "Bonjour {name} ! Aujourd'hui : {reminders} {reminders|rappel|rappels} et {count} {count|tâche|tâches}."],
    ["Aujourd'hui : {reminders} {reminders|rappel|rappels} et {count} {count|tâche|tâches}.", "{name}, aujourd'hui : {reminders} {reminders|rappel|rappels} et {count} {count|tâche|tâches}."],
    ["Bonjour ! Aujourd'hui : {reminders} {reminders|rappel|rappels} et {count} {count|tâche|tâches}.", "Bonjour {name} ! Aujourd'hui : {reminders} {reminders|rappel|rappels} et {count} {count|tâche|tâches}."],
    ["Aujourd'hui : {reminders} {reminders|rappel|rappels} et {count} {count|tâche|tâches}.", "{name}, aujourd'hui : {reminders} {reminders|rappel|rappels} et {count} {count|tâche|tâches}."],
  ),
  EVENING_REVIEW: entry(
    ["Bilan du jour : {done} sur {total} {total|tâche terminée|tâches terminées}. Bonne soirée !", "{name}, bilan du jour : {done} sur {total} {total|tâche terminée|tâches terminées}. Bonne soirée !"],
    ["Bilan du jour : {done} sur {total} {total|tâche terminée|tâches terminées}.", "{name}, bilan du jour : {done} sur {total} {total|tâche terminée|tâches terminées}."],
    ["Bilan du jour : {done} sur {total} {total|tâche terminée|tâches terminées}. Bonne soirée !", "{name}, bilan du jour : {done} sur {total} {total|tâche terminée|tâches terminées}. Bonne soirée !"],
    ["Bilan du jour : {done} sur {total} {total|tâche terminée|tâches terminées}.", "{name}, bilan du jour : {done} sur {total} {total|tâche terminée|tâches terminées}."],
  ),
  GOAL_APPROACHING: entry(
    ["Ton objectif « {goal} » est dans {days} {days|jour|jours} : {percent} % fait.", "{name}, ton objectif « {goal} » est dans {days} {days|jour|jours} : {percent} % fait."],
    ["Objectif « {goal} » : {percent} % fait, échéance dans {days} {days|jour|jours}.", "{name}, objectif « {goal} » : {percent} % fait, échéance dans {days} {days|jour|jours}."],
    ["Votre objectif « {goal} » est dans {days} {days|jour|jours} : {percent} % fait.", "{name}, votre objectif « {goal} » est dans {days} {days|jour|jours} : {percent} % fait."],
    ["Objectif « {goal} » : {percent} % fait, échéance dans {days} {days|jour|jours}.", "{name}, objectif « {goal} » : {percent} % fait, échéance dans {days} {days|jour|jours}."],
  ),
  LINGERING_TASK: entry(
    ["« {title} » traîne depuis {days} jours. On s'en occupe ?", "{name}, « {title} » traîne depuis {days} jours. On s'en occupe ?"],
    ["« {title} » est en attente depuis {days} jours. La planifier ?", "{name}, « {title} » est en attente depuis {days} jours. La planifier ?"],
    ["« {title} » traîne depuis {days} jours. On s'en occupe ?", "{name}, « {title} » traîne depuis {days} jours. On s'en occupe ?"],
    ["« {title} » est en attente depuis {days} jours. La planifier ?", "{name}, « {title} » est en attente depuis {days} jours. La planifier ?"],
  ),
  WELCOME_BACK: entry(
    ["Contente de te revoir ! {count} {count|rappel t'attend|rappels t'attendent}.", "Contente de te revoir, {name} ! {count} {count|rappel t'attend|rappels t'attendent}."],
    ["Bon retour. {count} {count|rappel t'attend|rappels t'attendent}.", "Bon retour, {name}. {count} {count|rappel t'attend|rappels t'attendent}."],
    ["Contente de vous revoir ! {count} {count|rappel vous attend|rappels vous attendent}.", "Contente de vous revoir, {name} ! {count} {count|rappel vous attend|rappels vous attendent}."],
    ["Bon retour. {count} {count|rappel vous attend|rappels vous attendent}.", "Bon retour, {name}. {count} {count|rappel vous attend|rappels vous attendent}."],
  ),

  // ─── Time-driven ──────────────────────────────────────────────────────────
  EVENT_IN_60: entry(
    ["Prochain événement : {title} à {time}.", "{name}, prochain événement : {title} à {time}."],
    ["Prochain événement : {title}, {time}.", "{name}, prochain événement : {title}, {time}."],
    ["Prochain événement : {title} à {time}.", "{name}, prochain événement : {title} à {time}."],
    ["Prochain événement : {title}, {time}.", "{name}, prochain événement : {title}, {time}."],
  ),
  EVENT_IN_15: entry(
    ["{title} dans 15 minutes !", "{name}, {title} dans 15 minutes !"],
    ["{title} dans 15 minutes.", "{name}, {title} dans 15 minutes."],
    ["{title} dans 15 minutes !", "{name}, {title} dans 15 minutes !"],
    ["{title} dans 15 minutes.", "{name}, {title} dans 15 minutes."],
  ),
  EVENT_DEPARTURE: entry(
    ["Il est temps de partir pour {place}.", "{name}, il est temps de partir pour {place}."],
    ["Heure de départ pour {place}.", "{name}, heure de départ pour {place}."],
    ["Il est temps de partir pour {place}.", "{name}, il est temps de partir pour {place}."],
    ["Heure de départ pour {place}.", "{name}, heure de départ pour {place}."],
  ),
  EVENT_START: entry(
    ["C'est l'heure : {title}.", "{name}, c'est l'heure : {title}."],
    ["{title} commence maintenant.", "{name}, {title} commence maintenant."],
    ["C'est l'heure : {title}.", "{name}, c'est l'heure : {title}."],
    ["{title} commence maintenant.", "{name}, {title} commence maintenant."],
  ),
  BLOCK_FOCUS: entry(
    ["C'est l'heure de ton bloc {block}. Un Focus de 25 min ?", "{name}, c'est l'heure de ton bloc {block}. Un Focus de 25 min ?"],
    ["Ton bloc {block} commence. Lancer un Focus de 25 min ?", "{name}, ton bloc {block} commence. Lancer un Focus de 25 min ?"],
    ["C'est l'heure de votre bloc {block}. Un Focus de 25 min ?", "{name}, c'est l'heure de votre bloc {block}. Un Focus de 25 min ?"],
    ["Votre bloc {block} commence. Lancer un Focus de 25 min ?", "{name}, votre bloc {block} commence. Lancer un Focus de 25 min ?"],
  ),
  BLOCK_SPORT: entry(
    ["C'est l'heure de ta séance de sport !", "{name}, c'est l'heure de ta séance de sport !"],
    ["Séance de sport.", "{name}, séance de sport."],
    ["C'est l'heure de votre séance de sport !", "{name}, c'est l'heure de votre séance de sport !"],
    ["Séance de sport.", "{name}, séance de sport."],
  ),

  // ─── Reactions (said by the companion after a medium or large reaction) ───────────────────
  REACT_DONE: entry(
    ["C'est fait, bien joué !", "Bien joué, {name} !"],
    ["C'est fait.", "{name}, c'est fait."],
    ["C'est fait, bravo !", "Bravo, {name} !"],
    ["C'est fait.", "{name}, c'est fait."],
  ),
  REACT_DAY_CLEARED: entry(
    ["Journée dégagée. Tu peux souffler.", "{name}, journée dégagée. Tu peux souffler."],
    ["Journée terminée : tout est fait.", "{name}, journée terminée : tout est fait."],
    ["Journée dégagée. Vous pouvez souffler.", "{name}, journée dégagée. Vous pouvez souffler."],
    ["Journée terminée : tout est fait.", "{name}, journée terminée : tout est fait."],
  ),
  REACT_GOAL: entry(
    ["Objectif atteint, bravo !", "Objectif atteint, bravo {name} !"],
    ["Objectif atteint.", "{name}, objectif atteint."],
    ["Objectif atteint, bravo !", "Objectif atteint, bravo {name} !"],
    ["Objectif atteint.", "{name}, objectif atteint."],
  ),
  REACT_CONTACT: entry(
    ["Tu as repris contact. Ça compte.", "{name}, tu as repris contact. Ça compte."],
    ["Contact repris.", "{name}, contact repris."],
    ["Vous avez repris contact. Ça compte.", "{name}, vous avez repris contact. Ça compte."],
    ["Contact repris.", "{name}, contact repris."],
  ),
  // ─── Deadlines (said on the home screen, 2 days and 1 day before) ─────────────────────────
  DEADLINE_SOON: entry(
    ["« {title} » est à rendre dans {days} {days|jour|jours}. On s'y met ?", "{name}, « {title} » est à rendre dans {days} {days|jour|jours}. On s'y met ?"],
    ["« {title} » : échéance dans {days} {days|jour|jours}.", "{name}, « {title} » : échéance dans {days} {days|jour|jours}."],
    ["« {title} » est à rendre dans {days} {days|jour|jours}. On s'y met ?", "{name}, « {title} » est à rendre dans {days} {days|jour|jours}. On s'y met ?"],
    ["« {title} » : échéance dans {days} {days|jour|jours}.", "{name}, « {title} » : échéance dans {days} {days|jour|jours}."],
  ),
  // Other wordings of the same reactions, said in turn so that Pulse does not repeat itself
  REACT_DONE_2: entry(
    ["Et une de moins !", "Et une de moins, {name} !"],
    ["Une de moins.", "{name}, une de moins."],
    ["Et une de moins !", "Et une de moins, {name} !"],
    ["Une de moins.", "{name}, une de moins."],
  ),
  REACT_DONE_3: entry(
    ["Bien avancé ! Continue comme ça.", "Bien avancé, {name} ! Continue comme ça."],
    ["Avancée notée.", "{name}, avancée notée."],
    ["Bien avancé ! Continuez comme ça.", "Bien avancé, {name} ! Continuez comme ça."],
    ["Avancée notée.", "{name}, avancée notée."],
  ),
  REACT_DAY_CLEARED_2: entry(
    ["Tout est bouclé pour aujourd'hui. Profite !", "{name}, tout est bouclé pour aujourd'hui. Profite !"],
    ["Plus rien pour aujourd'hui.", "{name}, plus rien pour aujourd'hui."],
    ["Tout est bouclé pour aujourd'hui. Profitez !", "{name}, tout est bouclé pour aujourd'hui. Profitez !"],
    ["Plus rien pour aujourd'hui.", "{name}, plus rien pour aujourd'hui."],
  ),
  REACT_GOAL_2: entry(
    ["Tu l'as fait : objectif atteint !", "{name}, tu l'as fait : objectif atteint !"],
    ["Objectif accompli.", "{name}, objectif accompli."],
    ["Vous l'avez fait : objectif atteint !", "{name}, vous l'avez fait : objectif atteint !"],
    ["Objectif accompli.", "{name}, objectif accompli."],
  ),
  REACT_CONTACT_2: entry(
    ["Un lien entretenu, c'est précieux.", "{name}, un lien entretenu, c'est précieux."],
    ["Échange noté.", "{name}, échange noté."],
    ["Un lien entretenu, c'est précieux.", "{name}, un lien entretenu, c'est précieux."],
    ["Échange noté.", "{name}, échange noté."],
  ),
} as const satisfies Record<string, MessageEntry>;

export type MascotMessageId = keyof typeof MASCOT_MESSAGES;
