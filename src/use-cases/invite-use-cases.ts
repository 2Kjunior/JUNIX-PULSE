/**
 * Sending and receiving an item without an account (study 001, 5-A and 12.5; sheet 025).
 * The rules of the link live in domain/rules/invite-rules.ts; here, what is read and saved.
 */

import { format } from 'date-fns';

import type { Person } from '../domain/entities';
import { receivedKind, senderAmong, type Invite, type InviteKind, type InviteStatus } from '../domain/rules/invite-rules';
import { momentKindOf } from '../domain/rules/moment-kind-rules';
import { EventRepository } from '../repositories/event-repository';
import { InviteRepository } from '../repositories/invite-repository';
import { PersonRepository } from '../repositories/person-repository';
import { ReminderRepository } from '../repositories/reminder-repository';
import { SettingsRepository } from '../repositories/settings-repository';
import { TaskRepository } from '../repositories/task-repository';
import { EventUseCases } from './event-use-cases';
import { PersonUseCases } from './person-use-cases';
import { createReminder } from './reminder-use-cases';
import { TaskUseCases } from './task-use-cases';

export interface InvitePerson {
  person: Person;
  status: InviteStatus | null;
}

async function personIdsOf(kind: InviteKind, itemId: string): Promise<string[]> {
  if (kind === 'task') return TaskRepository.findPersonIds(itemId);
  if (kind === 'reminder') return ReminderRepository.findPersonIds(itemId);
  return (await EventRepository.findEventPersons(itemId)).map(person => person.id);
}

export const InviteUseCases = {
  /** The invite of a saved item, with the sender's name; null when the item no longer exists. */
  async inviteOf(kind: InviteKind, itemId: string): Promise<Invite | null> {
    const from = (await SettingsRepository.get()).displayName?.trim() || undefined;
    if (kind === 'task') {
      const task = await TaskRepository.findById(itemId);
      return task ? { kind, title: task.title, day: task.scheduledDate, from } : null;
    }
    if (kind === 'reminder') {
      const reminder = await ReminderRepository.findById(itemId);
      return reminder ? { kind, title: reminder.title, at: new Date(reminder.scheduledAt).toISOString(), from } : null;
    }
    const event = await EventRepository.findById(itemId);
    if (!event) return null;
    return {
      kind,
      title: event.title,
      start: new Date(event.startAt).toISOString(),
      end: new Date(event.endAt).toISOString(),
      place: event.location?.trim() || undefined,
      momentKind: event.momentKind && event.momentKind !== 'other' ? event.momentKind : undefined,
      from,
    };
  },

  /** The people of an item, with what the sender knows of them. */
  async peopleOf(kind: InviteKind, itemId: string): Promise<InvitePerson[]> {
    const [ids, statuses] = await Promise.all([personIdsOf(kind, itemId), InviteRepository.findFor(kind, itemId)]);
    const people = await Promise.all(ids.map(id => PersonRepository.findById(id)));
    return people
      .filter((person): person is Person => person !== null)
      .map(person => ({ person, status: statuses[person.id] ?? null }));
  },

  /** After sending: everyone of the item not yet marked becomes "Invitée". */
  async markSent(kind: InviteKind, itemId: string): Promise<void> {
    for (const { person, status } of await InviteUseCases.peopleOf(kind, itemId)) {
      if (status === null) await InviteRepository.setStatus(kind, itemId, person.id, 'invited');
    }
  },

  async setStatus(kind: InviteKind, itemId: string, personId: string, status: InviteStatus): Promise<void> {
    await InviteRepository.setStatus(kind, itemId, personId, status);
  },

  /** The sender among the people, by name, or null. */
  async senderOf(invite: Invite): Promise<Person | null> {
    return senderAmong(invite.from, await PersonRepository.findAll());
  },

  /**
   * Adds a received item. The sender is linked when already among the people, or added to them
   * when the person asked for it ("Ajouter … à mes proches"), never otherwise. Returns where it opens.
   */
  async accept(invite: Invite, addSender: boolean): Promise<string> {
    let senderId = (await InviteUseCases.senderOf(invite))?.id;
    if (!senderId && addSender && invite.from) senderId = await PersonUseCases.createPerson({ displayName: invite.from });
    const personIds = senderId ? [senderId] : [];
    const kind = receivedKind(invite, new Date());

    if (kind === 'event' && invite.start && invite.end) {
      const settings = await SettingsRepository.get();
      const id = await EventUseCases.createEvent({
        title: invite.title,
        startAt: new Date(invite.start),
        endAt: new Date(invite.end),
        timezone: settings.timezone,
        location: invite.place,
        momentKind: momentKindOf(invite.momentKind),
        personIds,
      });
      return `/events/${id}`;
    }
    if (kind === 'reminder' && invite.at) {
      const settings = await SettingsRepository.get();
      const id = await createReminder({ title: invite.title, scheduledAt: new Date(invite.at), timezone: settings.timezone, personIds });
      return `/reminders/${id}`;
    }
    // A task, or a reminder already past: on its day
    const day = invite.day ?? (invite.at ? format(new Date(invite.at), 'yyyy-MM-dd') : undefined);
    const id = await TaskUseCases.createTask({ title: invite.title, scheduledDate: day, personIds });
    return `/tasks/${id}`;
  },
};
