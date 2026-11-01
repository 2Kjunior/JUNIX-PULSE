/**
 * Announcements to the mascot that need a lookup before they can be made.
 */

import { ReminderRepository } from '../../repositories/reminder-repository';
import { emitMascotEvent } from './mascot-event-bus';

/** A reminder has just reached the user in the foreground: its priority sets how much it matters. */
export async function announceReminderArrived(reminderId: string): Promise<void> {
  try {
    const reminder = await ReminderRepository.findById(reminderId);
    if (reminder) emitMascotEvent({ type: 'REMINDER_ARRIVED', priority: reminder.priority });
  } catch {
    // The mascot is decoration: ignored on purpose
  }
}
