/**
 * Use cases (actions métier) pour la gestion des personnes et des interactions.
 */

import { randomUUID } from 'expo-crypto';
import { PersonRepository } from '../repositories/person-repository';
import { Person, Interaction, InteractionType } from '../domain/entities';

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
    return interaction;
  },

  /**
   * Supprime un enregistrement d'interaction.
   */
  async deleteInteraction(id: string): Promise<void> {
    await PersonRepository.deleteInteraction(id);
  },
};
