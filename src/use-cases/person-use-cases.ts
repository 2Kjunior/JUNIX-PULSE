/**
 * Use cases (actions métier) pour la gestion des personnes et des interactions.
 */

import { randomUUID } from 'expo-crypto';
import { PersonRepository } from '../repositories/person-repository';
import { Interaction, InteractionType } from '../domain/entities';
import { isPersonForgotten } from '../domain/rules/person-rules';
import { emitMascotEvent } from '../services/mascot/mascot-event-bus';

export interface CreatePersonInput {
  displayName: string;
  relationship?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  notes?: string;
  forgottenThresholdDays?: number;
  importedFromContacts?: boolean;
}

export interface UpdatePersonInput {
  id: string;
  displayName?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  notes?: string;
  forgottenThresholdDays?: number;
}

export interface LogInteractionInput {
  personId: string;
  type: InteractionType;
  notes?: string;
  occurredAt?: Date;
  reminderId?: string;
}

export const PersonUseCases = {
  /**
   * Crée une nouvelle fiche personne.
   */
  async createPerson(input: CreatePersonInput): Promise<string> {
    const personId = randomUUID();
    const now = new Date().toISOString();

    await PersonRepository.create({
      id: personId,
      displayName: input.displayName.trim(),
      relationship: input.relationship?.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim(),
      birthDate: input.birthDate,
      notes: input.notes?.trim(),
      forgottenThresholdDays: input.forgottenThresholdDays ?? 30,
      importedFromContacts: input.importedFromContacts ?? false,
      createdAt: now,
      updatedAt: now,
    });

    emitMascotEvent({ type: 'ITEM_CREATED' });
    return personId;
  },

  /**
   * Met à jour les informations d'une personne.
   */
  async updatePerson(input: UpdatePersonInput): Promise<void> {
    const now = new Date().toISOString();
    await PersonRepository.update({
      ...input,
      displayName: input.displayName?.trim(),
      relationship: input.relationship?.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim(),
      notes: input.notes?.trim(),
      updatedAt: now,
    });
  },

  /**
   * Supprime une personne (soft delete).
   */
  async deletePerson(id: string): Promise<void> {
    const now = new Date().toISOString();
    await PersonRepository.softDelete(id, now);
    emitMascotEvent({ type: 'ITEM_DELETED' });
  },

  /**
   * Restaure une personne supprimée.
   */
  async undoDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await PersonRepository.undoDelete(id, now);
  },

  /**
   * Enregistre une nouvelle interaction avec une personne.
   * Met automatiquement à jour son champ `lastInteractionAt`.
   */
  async logInteraction(input: LogInteractionInput): Promise<Interaction> {
    const now = new Date().toISOString();
    const occurredAtStr = (input.occurredAt ?? new Date()).toISOString();

    // Read before the write: afterwards the person is no longer "forgotten"
    let wasForgotten = false;
    try {
      const person = await PersonRepository.findById(input.personId);
      wasForgotten = person ? isPersonForgotten(person) : false;
    } catch {
      // Without it the reaction is simply the ordinary one
    }

    const interaction: Interaction = {
      id: randomUUID(),
      personId: input.personId,
      type: input.type,
      occurredAt: occurredAtStr,
      notes: input.notes?.trim(),
      reminderId: input.reminderId,
      createdAt: now,
    };

    await PersonRepository.createInteraction(interaction);
    emitMascotEvent({ type: 'PERSON_CONTACTED', wasForgotten });
    return interaction;
  },

  /**
   * Supprime un enregistrement d'interaction.
   */
  async deleteInteraction(id: string): Promise<void> {
    await PersonRepository.deleteInteraction(id);
  },
};
