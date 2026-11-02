/**
 * English catalogue of the Pulse mascot messages.
 * Same ids and same parameters as the French catalogue. English has a single way to address
 * someone, so a message has four variants here instead of eight: warm or sober tone, with or
 * without the first name. Sentences are never assembled from fragments.
 *
 * Template syntax (rendered in mascot-message-rules):
 *   {name} {title} ...        plain parameter
 *   {count|task|tasks}        singular below 2, plural otherwise
 */

import type { MascotMessageId, MessageVariants } from './mascot-message-catalog';

type Form = readonly [plain: string, named: string];

function entry(warm: Form, sober: Form): MessageVariants {
  return {
    warm: { plain: warm[0], named: warm[1] },
    sober: { plain: sober[0], named: sober[1] },
  };
}

export const MASCOT_MESSAGES_EN: Record<MascotMessageId, MessageVariants> = {
  // ─── Onboarding ───────────────────────────────────────────────────────────
  WELCOME: entry(
    ["Welcome, I'm Pulse! I help you remember, plan and live.", "Welcome {name}, I'm Pulse! I help you remember, plan and live."],
    ["Welcome. I'm Pulse, your assistant to remember, plan and organize your days.", "Welcome, {name}. I'm Pulse, your assistant to remember, plan and organize your days."],
  ),
  DISCOVER_INTRO: entry(
    ["Here are the three things I'll keep track of for you.", "{name}, here are the three things I'll keep track of for you."],
    ["Here are the three items I'll follow for you.", "{name}, here are the three items I'll follow for you."],
  ),
  DISCOVER_REMINDER: entry(
    ["A reminder alerts you on time.", "{name}, a reminder alerts you on time."],
    ["A reminder notifies you at the scheduled time.", "{name}, a reminder notifies you at the scheduled time."],
  ),
  DISCOVER_TASK: entry(
    ["A task is waiting to be done.", "{name}, a task is waiting to be done."],
    ["A task remains to be completed.", "{name}, a task remains to be completed."],
  ),
  DISCOVER_EVENT: entry(
    ["An event takes up a moment.", "{name}, an event takes up a moment."],
    ["An event takes up a time slot.", "{name}, an event takes up a time slot."],
  ),
  PERSONALIZE_NAME: entry(
    ["What should I call you?", "{name}, is that your first name?"],
    ["Which first name should I use?", "{name}, is that the first name to use?"],
  ),
  PERSONALIZE_TIMEZONE: entry(
    ["I'm checking that your reminders ring at the right time.", "{name}, I'm checking that your reminders ring at the right time."],
    ["I'm checking the time zone of your reminders.", "{name}, I'm checking the time zone of your reminders."],
  ),
  SCHEDULE_INTRO: entry(
    ["Lovely! In the morning I sum up your day, in the evening I review it.", "Lovely, {name}! In the morning I sum up your day, in the evening I review it."],
    ["Nice to meet you. In the morning I sum up your day, in the evening I review it.", "Nice to meet you, {name}. In the morning I sum up your day, in the evening I review it."],
  ),
  PERMISSION_ASK: entry(
    ["I need to be able to alert you at the right time.", "{name}, I need to be able to alert you at the right time."],
    ["Notifications let me alert you on time.", "{name}, notifications let me alert you on time."],
  ),
  PERMISSION_GRANTED: entry(
    ["Perfect, I'll take care of the rest.", "Perfect {name}, I'll take care of the rest."],
    ["Noted, I'll take care of the rest.", "Noted {name}, I'll take care of the rest."],
  ),
  PERMISSION_DENIED: entry(
    ["No worries, I'll show you your reminders in the app.", "No worries {name}, I'll show you your reminders in the app."],
    ["Understood. Your reminders will stay visible in the app.", "Understood {name}. Your reminders will stay visible in the app."],
  ),

  // ─── Home tour (four stops) and first visit tips ───────────────────────────
  TOUR_PILLARS: entry(
    ["This is your home: reminders, tasks, schedule and loved ones at a glance.", "{name}, this is your home: reminders, tasks, schedule and loved ones at a glance."],
    ["Your home brings together reminders, tasks, schedule and loved ones.", "{name}, your home brings together reminders, tasks, schedule and loved ones."],
  ),
  TOUR_QUICK_ADD: entry(
    ["Here you add a reminder, a task or a note in a few seconds.", "{name}, here you add a reminder, a task or a note in a few seconds."],
    ["Add a reminder, a task or a note here.", "{name}, add a reminder, a task or a note here."],
  ),
  TOUR_TIMELINE: entry(
    ["Your daily timeline puts everything that matters today in order.", "{name}, your daily timeline puts everything that matters today in order."],
    ["The daily timeline sorts your items in order.", "{name}, the daily timeline sorts your items in order."],
  ),
  TOUR_MASCOT: entry(
    ["Tap me to open Pulse: I keep my suggestions there.", "{name}, tap me to open Pulse: I keep my suggestions there."],
    ["Tapping the mascot opens Pulse and its suggestions.", "{name}, tapping the mascot opens Pulse and its suggestions."],
  ),
  TIP_REMINDERS: entry(
    ["Here are your reminders. Swipe one to complete or postpone it.", "{name}, here are your reminders. Swipe one to complete or postpone it."],
    ["Swipe a reminder to complete or postpone it.", "{name}, swipe a reminder to complete or postpone it."],
  ),
  TIP_TASKS: entry(
    ["Here are your tasks. Tap the circle to complete one.", "{name}, here are your tasks. Tap the circle to complete one."],
    ["Tap the circle of a task to complete it.", "{name}, tap the circle of a task to complete it."],
  ),
  TIP_CALENDAR: entry(
    ["Here is your schedule. Pick a day to see what awaits.", "{name}, here is your schedule. Pick a day to see what awaits."],
    ["Pick a day to see its content.", "{name}, pick a day to see its content."],
  ),
  TIP_PEOPLE: entry(
    ["Here are your loved ones. I'll point out the ones you haven't seen in a while.", "{name}, here are your loved ones. I'll point out the ones you haven't seen in a while."],
    ["Loved ones you haven't heard from in a long time are flagged.", "{name}, loved ones you haven't heard from in a long time are flagged."],
  ),
  TIP_PULSE: entry(
    ["Here I keep my suggestions. You always decide: I only offer an idea.", "{name}, here I keep my suggestions. You always decide: I only offer an idea."],
    ["The suggestions are here. You always decide what happens next.", "{name}, the suggestions are here. You always decide what happens next."],
  ),

  // ─── Proposals P1 to P12 ──────────────────────────────────────────────────
  FORGOTTEN_CONTACT: entry(
    ["It's been {days} days since you checked in on {person}. Shall we write to them?", "{name}, it's been {days} days since you checked in on {person}. Shall we write to them?"],
    ["No news from {person} in {days} days. Would you like to write to them?", "{name}, no news from {person} in {days} days. Would you like to write to them?"],
  ),
  MISSED_REMINDER: entry(
    ["“{title}” wasn't done at {time}. Shall I move it to tomorrow, same time?", "{name}, “{title}” wasn't done at {time}. Shall I move it to tomorrow, same time?"],
    ["“{title}” was not done at {time}. Move it to tomorrow, same time?", "{name}, “{title}” was not done at {time}. Move it to tomorrow, same time?"],
  ),
  STREAK_AT_RISK: entry(
    ["Your {streak}-day streak on “{title}” is at stake. Will you check it off tonight?", "{name}, your {streak}-day streak on “{title}” is at stake. Will you check it off tonight?"],
    ["Your {streak}-day streak on “{title}” is not validated yet today.", "{name}, your {streak}-day streak on “{title}” is not validated yet today."],
  ),
  BIRTHDAY_SOON: entry(
    ["{person}'s birthday is in {days} {days|day|days}. Shall I set a reminder?", "{name}, {person}'s birthday is in {days} {days|day|days}. Shall I set a reminder?"],
    ["{person}'s birthday is in {days} {days|day|days}. Create a reminder?", "{name}, {person}'s birthday is in {days} {days|day|days}. Create a reminder?"],
  ),
  BIRTHDAY_TODAY: entry(
    ["It's {person}'s birthday today. A little message?", "{name}, it's {person}'s birthday today. A little message?"],
    ["Today is {person}'s birthday. Write to them?", "{name}, today is {person}'s birthday. Write to them?"],
  ),
  TASKS_TO_POSTPONE: entry(
    ["{count} {count|task|tasks} from today {count|is|are} left. Shall we move {count|it|them} to tomorrow?", "{name}, {count} {count|task|tasks} from today {count|is|are} left. Shall we move {count|it|them} to tomorrow?"],
    ["{count} {count|task|tasks} from today {count|remains|remain} to do. Move to tomorrow?", "{name}, {count} {count|task|tasks} from today {count|remains|remain} to do. Move to tomorrow?"],
  ),
  OVERLOADED_DAY: entry(
    ["Tomorrow is very busy: {count} things planned. Shall we move one?", "{name}, tomorrow is very busy: {count} things planned. Shall we move one?"],
    ["Tomorrow has {count} items planned. Move one?", "{name}, tomorrow has {count} items planned. Move one?"],
  ),
  PLANNING_CONFLICT: entry(
    ["Two events overlap tomorrow at {time}. Shall we take a look?", "{name}, two events overlap tomorrow at {time}. Shall we take a look?"],
    ["Two events overlap tomorrow at {time}.", "{name}, two events overlap tomorrow at {time}."],
  ),
  MORNING_BRIEFING: entry(
    ["Good morning! Today: {reminders} {reminders|reminder|reminders} and {count} {count|task|tasks}.", "Good morning {name}! Today: {reminders} {reminders|reminder|reminders} and {count} {count|task|tasks}."],
    ["Today: {reminders} {reminders|reminder|reminders} and {count} {count|task|tasks}.", "{name}, today: {reminders} {reminders|reminder|reminders} and {count} {count|task|tasks}."],
  ),
  EVENING_REVIEW: entry(
    ["Review of the day: {done} of {total} {total|task|tasks} completed. Have a good evening!", "{name}, review of the day: {done} of {total} {total|task|tasks} completed. Have a good evening!"],
    ["Review of the day: {done} of {total} {total|task|tasks} completed.", "{name}, review of the day: {done} of {total} {total|task|tasks} completed."],
  ),
  GOAL_APPROACHING: entry(
    ["Your goal “{goal}” is due in {days} {days|day|days}: {percent}% done.", "{name}, your goal “{goal}” is due in {days} {days|day|days}: {percent}% done."],
    ["Goal “{goal}”: {percent}% done, due in {days} {days|day|days}.", "{name}, goal “{goal}”: {percent}% done, due in {days} {days|day|days}."],
  ),
  LINGERING_TASK: entry(
    ["“{title}” has been lingering for {days} days. Shall we deal with it?", "{name}, “{title}” has been lingering for {days} days. Shall we deal with it?"],
    ["“{title}” has been pending for {days} days. Schedule it?", "{name}, “{title}” has been pending for {days} days. Schedule it?"],
  ),
  WELCOME_BACK: entry(
    ["Good to see you again! {count} {count|reminder is|reminders are} waiting for you.", "Good to see you again, {name}! {count} {count|reminder is|reminders are} waiting for you."],
    ["Welcome back. {count} {count|reminder is|reminders are} waiting for you.", "Welcome back, {name}. {count} {count|reminder is|reminders are} waiting for you."],
  ),

  // ─── Time-driven ──────────────────────────────────────────────────────────
  EVENT_IN_60: entry(
    ["Next event: {title} at {time}.", "{name}, next event: {title} at {time}."],
    ["Next event: {title}, {time}.", "{name}, next event: {title}, {time}."],
  ),
  EVENT_IN_15: entry(
    ["{title} in 15 minutes!", "{name}, {title} in 15 minutes!"],
    ["{title} in 15 minutes.", "{name}, {title} in 15 minutes."],
  ),
  EVENT_DEPARTURE: entry(
    ["Time to leave for {place}.", "{name}, time to leave for {place}."],
    ["Departure time for {place}.", "{name}, departure time for {place}."],
  ),
  EVENT_START: entry(
    ["It's time: {title}.", "{name}, it's time: {title}."],
    ["{title} starts now.", "{name}, {title} starts now."],
  ),
  BLOCK_FOCUS: entry(
    ["It's time for your {block} block. A 25-min Focus?", "{name}, it's time for your {block} block. A 25-min Focus?"],
    ["Your {block} block is starting. Start a 25-min Focus?", "{name}, your {block} block is starting. Start a 25-min Focus?"],
  ),
  BLOCK_SPORT: entry(
    ["It's time for your workout!", "{name}, it's time for your workout!"],
    ["Workout session.", "{name}, workout session."],
  ),

  // ─── Reactions (said by the companion after a medium or large reaction) ───────────────────
  REACT_DONE: entry(
    ["Done, well played!", "Well played, {name}!"],
    ["Done.", "{name}, done."],
  ),
  REACT_DAY_CLEARED: entry(
    ["Day cleared. You can breathe.", "{name}, day cleared. You can breathe."],
    ["Day finished: everything is done.", "{name}, day finished: everything is done."],
  ),
  REACT_GOAL: entry(
    ["Goal reached, congratulations!", "Goal reached, congratulations {name}!"],
    ["Goal reached.", "{name}, goal reached."],
  ),
  REACT_CONTACT: entry(
    ["You got back in touch. That counts.", "{name}, you got back in touch. That counts."],
    ["Contact resumed.", "{name}, contact resumed."],
  ),
};
