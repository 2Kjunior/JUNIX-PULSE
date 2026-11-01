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
};

export const MESSAGES: Readonly<Record<'fr' | 'en', Readonly<Record<MessageKey, string>>>> = { fr, en };
