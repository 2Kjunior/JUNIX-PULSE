/**
 * Use cases (actions métier) pour la gestion des événements et de l'agenda.
 */

import { randomUUID } from 'expo-crypto';
import { EventRepository } from '../repositories/event-repository';
import { EventType } from '../domain/entities';

export interface CreateEventInput {
  title: string;
  notes?: string;
  startAt: Date;
  endAt: Date;
  timezone?: string;
  location?: string;
  type?: EventType;
  travelBufferMinutes?: number;
  personIds?: string[];
}

export interface UpdateEventInput {
  id: string;
  title?: string;
  notes?: string;
  startAt?: Date;
  endAt?: Date;
  location?: string;
  type?: EventType;
  travelBufferMinutes?: number;
  personIds?: string[];
}

export const EventUseCases = {
  /**
   * Crée un nouvel événement.
   */
  async createEvent(input: CreateEventInput): Promise<string> {
    if (input.endAt <= input.startAt) {
      throw new Error("L'heure de fin doit être postérieure à l'heure de début.");
    }

    const eventId = randomUUID();
    const now = new Date().toISOString();

    await EventRepository.create(
      {
        id: eventId,
        title: input.title.trim(),
        notes: input.notes?.trim(),
        startAt: input.startAt.toISOString(),
        endAt: input.endAt.toISOString(),
        timezone: input.timezone ?? 'UTC',
        location: input.location?.trim(),
        type: input.type ?? 'BUSY',
        travelBufferMinutes: input.travelBufferMinutes ?? 0,
        createdAt: now,
        updatedAt: now,
      },
      input.personIds
    );

    return eventId;
  },

  /**
   * Met à jour un événement existant.
   */
  async updateEvent(input: UpdateEventInput): Promise<void> {
    if (input.startAt && input.endAt && input.endAt <= input.startAt) {
      throw new Error("L'heure de fin doit être postérieure à l'heure de début.");
    }

    const now = new Date().toISOString();
    await EventRepository.update(
      {
        id: input.id,
        title: input.title?.trim(),
        notes: input.notes?.trim(),
        startAt: input.startAt ? input.startAt.toISOString() : undefined,
        endAt: input.endAt ? input.endAt.toISOString() : undefined,
        location: input.location?.trim(),
        type: input.type,
        travelBufferMinutes: input.travelBufferMinutes,
        updatedAt: now,
      },
      input.personIds
    );
  },

  /**
   * Supprime un événement (soft delete).
   */
  async deleteEvent(id: string): Promise<void> {
    const now = new Date().toISOString();
    await EventRepository.softDelete(id, now);
  },

  /**
   * Restaure un événement précédemment supprimé.
   */
  async undoDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await EventRepository.undoDelete(id, now);
  },
};
