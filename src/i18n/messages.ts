/**
 * Every text of the screens, in French and in English, under one key.
 *
 * French is the reference: `MessageKey` is made from it, and the English table must have
 * exactly the same keys (the compiler checks it). Values are written `{name}`.
 * Keys are grouped by screen or by part of the app: `area.what`.
 */

const fr = {
  // ─── Barre d'onglets ───
  'tab.home': 'Accueil',
  'tab.reminders': 'Rappels',
  'tab.tasks': 'Tâches',
  'tab.calendar': 'Planning',
  'tab.people': 'Proches',

  // ─── Choix de la langue ───
  'language.label': 'Langue',
  'language.auto': 'Automatique',
  'language.fr': 'Français',
  'language.en': 'English',
  'language.hint.auto': 'Suit la langue de votre téléphone.',
  'language.hint.fr': 'L’application s’affiche en français.',
  'language.hint.en': 'L’application s’affiche en anglais.',
  'language.error': 'Impossible d’enregistrer la langue.',

  // ─── Réglages : fuseau ───
  'settings.timezone': 'Fuseau horaire',
  'settings.timezoneHint': 'Celui du téléphone : il suit tes déplacements',

  // ─── Onboarding : autorisations ───
  'permissions.title': 'Dernière étape',
  'permissions.subtitle':
    'Ces autorisations permettent à Junix Pulse de fonctionner pleinement. Elles peuvent être modifiées dans les paramètres de votre téléphone.',
  'permissions.notifications.title': 'Notifications',
  'permissions.notifications.desc':
    'Indispensable pour recevoir vos rappels même quand l’application est fermée.',
  'permissions.notifications.allow': 'Autoriser les notifications',
  'permissions.notifications.granted': 'Autorisées',
  'permissions.notifications.denied':
    'Non autorisées — vous pouvez les activer plus tard dans les paramètres de votre téléphone.',
  'permissions.contacts.title': 'Contacts',
  'permissions.contacts.desc':
    'L’accès aux contacts sera demandé uniquement si vous souhaitez importer des personnes depuis votre répertoire. Ce n’est pas requis maintenant.',
  'permissions.ready.title': 'Tout est prêt !',
  'permissions.ready.desc':
    'Junix Pulse est configuré pour vous. Commencez par créer votre premier rappel ou explorez librement.',
  'permissions.start': 'Commencer à utiliser Junix Pulse',
  'permissions.exactAlarms.title': 'Des rappels à l’heure exacte',
  'permissions.exactAlarms.body':
    'Sans cette autorisation, Android peut retarder vos rappels. Elle s’active sur l’écran suivant.',
  'permissions.exactAlarms.later': 'Plus tard',
  'permissions.exactAlarms.allow': 'Autoriser',

  // ─── Personnes : heure et disponibilité ───
  'personTime.where': 'Où vit cette personne ?',
  'personTime.pick': 'Ajouter une ville pour connaître son heure...',
  'personTime.pickA11y': 'Choisir le fuseau horaire de la personne',
  'personTime.none': 'Aucune',
  'personTime.specify': 'Préciser quand l’appeler',
  'personTime.specifyHint': 'Les jours et les heures où elle est disponible, chez elle',
  'personTime.from': 'De',
  'personTime.to': 'À',
  'personTime.earlier': 'une demi-heure plus tôt',
  'personTime.later': 'une demi-heure plus tard',
  'personTime.addTitle': 'Connaître l’heure chez cette personne',
  'personTime.addSub': 'Ajoutez sa ville et les heures où l’appeler',
  'personTime.addA11y': 'Ajouter le fuseau horaire et les heures d’appel',
  'personTime.editA11y': 'Modifier le fuseau et les heures d’appel',
  'personTime.at': 'Chez {name} · {city}',
  'personTime.available': 'Disponible maintenant, jusqu’à {time} chez elle',
  'personTime.nextSlot': 'Pas disponible. Prochain créneau : {there} chez elle, soit {here} chez vous',
  'personTime.unavailable': 'Pas disponible pour le moment',
  'personTime.cancel': 'Annuler',
  'personTime.save': 'Enregistrer',
  'personTime.saveError': 'Enregistrement impossible',

  // ─── Jours de la semaine, du lundi au dimanche ───
  'weekday.1': 'lundi',
  'weekday.2': 'mardi',
  'weekday.3': 'mercredi',
  'weekday.4': 'jeudi',
  'weekday.5': 'vendredi',
  'weekday.6': 'samedi',
  'weekday.7': 'dimanche',
  'weekdayShort.1': 'L',
  'weekdayShort.2': 'M',
  'weekdayShort.3': 'M',
  'weekdayShort.4': 'J',
  'weekdayShort.5': 'V',
  'weekdayShort.6': 'S',
  'weekdayShort.7': 'D',

  // ─── Quick Capture : avis d'appel ───
  'capture.callInfo': 'À ce moment, il sera {time} chez {name}.',
  'capture.callInside': 'Il sera {time} chez {name} : un bon moment pour appeler.',
  'capture.callOutside': 'Il sera {time} chez {name}, en dehors de ses heures d’appel.',
  'capture.callSuggestion': 'Plutôt {here} ({there} chez elle)',

  // ─── Mots communs ───
  'common.skip': 'Passer',
  'common.next': 'Suivant',
  'common.back': 'Retour',
  'common.continue': 'Continuer',
  'common.cancel': 'Annuler',
  'common.hourShort': '{hour}h',

  // ─── Onboarding : bienvenue ───
  'welcome.skipA11y': 'Passer l’onboarding',
  'welcome.headline': 'Retrouvez votre',
  'welcome.headlineAccent': 'rythme naturel',
  'welcome.tagline': 'Se souvenir. Planifier. Vivre.',
  'welcome.description1': 'Une gestion sereine de vos journées,',
  'welcome.description2': 'pensée pour apaiser votre charge mentale.',
  'welcome.badge.calm.title': 'Serein',
  'welcome.badge.calm.subtitle': 'Zéro surcharge',
  'welcome.badge.private.title': 'Privé',
  'welcome.badge.private.subtitle': '100\u00A0% Hors-ligne',
  'welcome.badge.rhythm.title': 'Rhythm',
  'welcome.badge.rhythm.subtitle': 'IA au repos',
  'welcome.start': 'Commencer l’expérience',
  'welcome.restoreQuestion': 'Vous utilisez déjà Junix Pulse\u00A0?',
  'welcome.restoreLink': 'Restaurer une sauvegarde',
  'welcome.restoreA11y': 'Restaurer une sauvegarde',
  'welcome.restore.unavailableTitle': 'Indisponible',
  'welcome.restore.unavailableBody': 'La restauration de sauvegarde est disponible dans l’application mobile.',
  'welcome.restore.invalidTitle': 'Fichier invalide',
  'welcome.restore.invalidBody': 'Impossible de lire la sauvegarde sélectionnée.',
  'welcome.restore.pickAgain': 'Sélectionnez à nouveau le fichier de sauvegarde.',
  'welcome.restore.mergeTitle': 'Fusionner cette sauvegarde ?',
  'welcome.restore.mergeBody':
    '{count} enregistrements validés seront examinés. Les éléments dont l’identifiant existe déjà seront conservés sans être remplacés.',
  'welcome.restore.import': 'Importer',
  'welcome.restore.doneTitle': 'Restauration terminée',
  'welcome.restore.doneBody': '{inserted} enregistrements ajoutés, {skipped} ignorés car ils existaient déjà.',
  'welcome.restore.failTitle': 'Échec de la restauration',
  'welcome.restore.failBody': 'Aucune donnée n’a été importée.',
  'welcome.restore.unlockTitle': 'Déverrouiller la sauvegarde',
  'welcome.restore.decrypt': 'Déchiffrer',

  // ─── Onboarding : comment ça fonctionne ───
  'discover.skipA11y': 'Passer les étapes restantes',
  'discover.title': 'Comment ça fonctionne',
  'discover.subtitle': 'Trois concepts, une cohérence.',
  'discover.reminders.title': 'Rappels',
  'discover.reminders.desc':
    'Une chose à ne pas oublier à un moment précis. Peut être ponctuel ou récurrent, lié à une personne, avec un snooze si besoin.',
  'discover.reminders.example': 'Ex\u00A0: Appeler maman vendredi 18h',
  'discover.tasks.title': 'Tâches',
  'discover.tasks.desc':
    'Une intention d’agir, avec ou sans date. Les tâches sans date vivent dans votre Inbox jusqu’à ce que vous les planifiiez.',
  'discover.tasks.example': 'Ex\u00A0: Préparer la réunion de lundi',
  'discover.events.title': 'Événements',
  'discover.events.desc':
    'Un rendez-vous ou une occupation avec une durée. Peut inclure un lieu, des personnes et un temps de trajet.',
  'discover.events.example': 'Ex\u00A0: Réunion d’équipe 14h–15h30',
  'discover.remember': 'À retenir',
  'discover.rememberReminder': 'Un rappel déclenche une attention.',
  'discover.rememberTask': 'Une tâche attend d’être accomplie.',
  'discover.rememberEvent': 'Un événement occupe une période dans le temps.',

  // ─── Onboarding : préférences ───
  'personalize.title': 'Quelques préférences',
  'personalize.subtitle': 'Pour que Junix Pulse vous connaisse un peu mieux.',
  'personalize.nameLabel': 'Votre prénom',
  'personalize.nameHint': 'Optionnel — pour personnaliser les messages',
  'personalize.namePlaceholder': 'Ex\u00A0: Camille',
  'personalize.addressLabel': 'Façon de vous parler',
  'personalize.addressHint': 'Pulse peut tutoyer ou vouvoyer — modifiable dans Paramètres',
  'personalize.addressTu': 'Tutoiement',
  'personalize.addressVous': 'Vouvoiement',

  // ─── Onboarding : rythme ───
  'schedule.skipA11y': 'Passer à la dernière étape',
  'schedule.title': 'Votre rythme',
  'schedule.subtitle': 'Ces préférences aident Junix Pulse à proposer les bons moments.',
  'schedule.endOfDay': 'Fin de journée',
  'schedule.endOfDayHint':
    'À cette heure, Junix vous envoie votre bilan et peut vous proposer de gérer les tâches non terminées.',
  'schedule.morning': 'Résumé du matin',
  'schedule.morningHint':
    'Une notification vous prévient à cette heure, et votre journée vous attend sur l’écran Aujourd’hui.',
  'schedule.note': 'Ces préférences sont modifiables à tout moment dans Paramètres.',
} as const;

export type MessageKey = keyof typeof fr;

const en: Record<MessageKey, string> = {
  'tab.home': 'Home',
  'tab.reminders': 'Reminders',
  'tab.tasks': 'Tasks',
  'tab.calendar': 'Schedule',
  'tab.people': 'People',

  'language.label': 'Language',
  'language.auto': 'Automatic',
  'language.fr': 'Français',
  'language.en': 'English',
  'language.hint.auto': 'Follows the language of your phone.',
  'language.hint.fr': 'The app is shown in French.',
  'language.hint.en': 'The app is shown in English.',
  'language.error': 'The language could not be saved.',

  'settings.timezone': 'Time zone',
  'settings.timezoneHint': 'The one of your phone: it follows you when you travel',

  'permissions.title': 'Last step',
  'permissions.subtitle':
    'These permissions let Junix Pulse work fully. You can change them in your phone settings.',
  'permissions.notifications.title': 'Notifications',
  'permissions.notifications.desc': 'Essential to receive your reminders even when the app is closed.',
  'permissions.notifications.allow': 'Allow notifications',
  'permissions.notifications.granted': 'Allowed',
  'permissions.notifications.denied': 'Not allowed — you can turn them on later in your phone settings.',
  'permissions.contacts.title': 'Contacts',
  'permissions.contacts.desc':
    'Access to your contacts is only asked if you want to import people from your address book. It is not needed now.',
  'permissions.ready.title': 'All set!',
  'permissions.ready.desc':
    'Junix Pulse is set up for you. Start by creating your first reminder, or just explore.',
  'permissions.start': 'Start using Junix Pulse',
  'permissions.exactAlarms.title': 'Reminders on the exact minute',
  'permissions.exactAlarms.body':
    'Without this permission, Android may delay your reminders. It is turned on in the next screen.',
  'permissions.exactAlarms.later': 'Later',
  'permissions.exactAlarms.allow': 'Allow',

  'personTime.where': 'Where does this person live?',
  'personTime.pick': 'Add a city to know their time...',
  'personTime.pickA11y': 'Choose the time zone of this person',
  'personTime.none': 'None',
  'personTime.specify': 'Set when to call',
  'personTime.specifyHint': 'The days and hours they are free, where they live',
  'personTime.from': 'From',
  'personTime.to': 'To',
  'personTime.earlier': 'half an hour earlier',
  'personTime.later': 'half an hour later',
  'personTime.addTitle': 'Know the time where this person lives',
  'personTime.addSub': 'Add their city and the hours to call them',
  'personTime.addA11y': 'Add the time zone and the hours to call',
  'personTime.editA11y': 'Change the time zone and the hours to call',
  'personTime.at': 'At {name}’s · {city}',
  'personTime.available': 'Available now, until {time} their time',
  'personTime.nextSlot': 'Not available. Next slot: {there} their time, which is {here} for you',
  'personTime.unavailable': 'Not available right now',
  'personTime.cancel': 'Cancel',
  'personTime.save': 'Save',
  'personTime.saveError': 'Could not save',

  'weekday.1': 'Monday',
  'weekday.2': 'Tuesday',
  'weekday.3': 'Wednesday',
  'weekday.4': 'Thursday',
  'weekday.5': 'Friday',
  'weekday.6': 'Saturday',
  'weekday.7': 'Sunday',
  'weekdayShort.1': 'M',
  'weekdayShort.2': 'T',
  'weekdayShort.3': 'W',
  'weekdayShort.4': 'T',
  'weekdayShort.5': 'F',
  'weekdayShort.6': 'S',
  'weekdayShort.7': 'S',

  'capture.callInfo': 'At that time, it will be {time} for {name}.',
  'capture.callInside': 'It will be {time} for {name}: a good time to call.',
  'capture.callOutside': 'It will be {time} for {name}, outside their calling hours.',
  'capture.callSuggestion': 'Better {here} ({there} their time)',

  'common.skip': 'Skip',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.cancel': 'Cancel',
  'common.hourShort': '{hour}:00',

  'welcome.skipA11y': 'Skip the onboarding',
  'welcome.headline': 'Find your',
  'welcome.headlineAccent': 'natural rhythm',
  'welcome.tagline': 'Remember. Plan. Live.',
  'welcome.description1': 'A calm way to manage your days,',
  'welcome.description2': 'made to ease your mental load.',
  'welcome.badge.calm.title': 'Calm',
  'welcome.badge.calm.subtitle': 'No overload',
  'welcome.badge.private.title': 'Private',
  'welcome.badge.private.subtitle': '100% offline',
  'welcome.badge.rhythm.title': 'Rhythm',
  'welcome.badge.rhythm.subtitle': 'AI at rest',
  'welcome.start': 'Start the experience',
  'welcome.restoreQuestion': 'Already use Junix Pulse?',
  'welcome.restoreLink': 'Restore a backup',
  'welcome.restoreA11y': 'Restore a backup',
  'welcome.restore.unavailableTitle': 'Not available',
  'welcome.restore.unavailableBody': 'Restoring a backup is available in the mobile app.',
  'welcome.restore.invalidTitle': 'Invalid file',
  'welcome.restore.invalidBody': 'The selected backup could not be read.',
  'welcome.restore.pickAgain': 'Select the backup file again.',
  'welcome.restore.mergeTitle': 'Merge this backup?',
  'welcome.restore.mergeBody':
    '{count} checked records will be reviewed. Items whose identifier already exists are kept, not replaced.',
  'welcome.restore.import': 'Import',
  'welcome.restore.doneTitle': 'Restore complete',
  'welcome.restore.doneBody': '{inserted} records added, {skipped} skipped because they already existed.',
  'welcome.restore.failTitle': 'Restore failed',
  'welcome.restore.failBody': 'No data was imported.',
  'welcome.restore.unlockTitle': 'Unlock the backup',
  'welcome.restore.decrypt': 'Decrypt',

  'discover.skipA11y': 'Skip the remaining steps',
  'discover.title': 'How it works',
  'discover.subtitle': 'Three ideas, one logic.',
  'discover.reminders.title': 'Reminders',
  'discover.reminders.desc':
    'Something not to forget at a precise moment. One-off or recurring, tied to a person, with a snooze if needed.',
  'discover.reminders.example': 'E.g. Call mom on Friday at 6 PM',
  'discover.tasks.title': 'Tasks',
  'discover.tasks.desc':
    'An intention to act, with or without a date. Tasks without a date stay in your Inbox until you plan them.',
  'discover.tasks.example': 'E.g. Prepare Monday’s meeting',
  'discover.events.title': 'Events',
  'discover.events.desc':
    'An appointment or an activity with a length. It can include a place, people and travel time.',
  'discover.events.example': 'E.g. Team meeting 2–3:30 PM',
  'discover.remember': 'Remember',
  'discover.rememberReminder': 'A reminder calls for your attention.',
  'discover.rememberTask': 'A task waits to be done.',
  'discover.rememberEvent': 'An event takes up a stretch of time.',

  'personalize.title': 'A few preferences',
  'personalize.subtitle': 'So Junix Pulse knows you a little better.',
  'personalize.nameLabel': 'Your first name',
  'personalize.nameHint': 'Optional — to personalize the messages',
  'personalize.namePlaceholder': 'E.g. Camille',
  'personalize.addressLabel': 'How to address you',
  'personalize.addressHint': 'Pulse can use the informal or the formal form — you can change it in Settings',
  'personalize.addressTu': 'Informal',
  'personalize.addressVous': 'Formal',

  'schedule.skipA11y': 'Skip to the last step',
  'schedule.title': 'Your rhythm',
  'schedule.subtitle': 'These preferences help Junix Pulse suggest the right moments.',
  'schedule.endOfDay': 'End of day',
  'schedule.endOfDayHint':
    'At this time, Junix sends your review and can offer to deal with the tasks left undone.',
  'schedule.morning': 'Morning summary',
  'schedule.morningHint':
    'A notification tells you at this time, and your day is waiting on the Today screen.',
  'schedule.note': 'You can change these preferences at any time in Settings.',
};

export const MESSAGES: Readonly<Record<'fr' | 'en', Readonly<Record<MessageKey, string>>>> = { fr, en };
