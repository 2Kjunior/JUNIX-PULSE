/**
 * Use cases pour la gestion du planning personnel hebdomadaire.
 *
 * Règles métier :
 * BR-015 : les heures de début et de fin doivent être au format HH:MM exact.
 * BR-016 : un nouveau bloc ne peut pas chevaucher un bloc existant le même jour
 *           (détection de collision : start1 < end2 ET start2 < end1).
 * BR-017 : la fin doit être strictement après le début.
 */

import { PersonalScheduleRepository } from '../repositories/personal-schedule-repository';
import { PersonalSchedule, PlanningBlock, PlanningBlockType } from '../domain/entities';

export interface CreateBlockParams {
  label: string;
  type: PlanningBlockType;
  dayOfWeek: number; // 0=dimanche ... 6=samedi
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  color?: string;
  /** Libellé personnalisé (utilisé quand type === 'OTHER') */
  customLabel?: string;
}

// ─── Helpers horaires ──────────────────────────────────────────────────────────

/** Convertit "HH:MM" en nombre de minutes depuis minuit. Lève une erreur si invalide. */
function timeToMinutes(time: string): number {
  const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!HH_MM.test(time)) {
    throw new Error(`Format d'heure invalide : "${time}". Utilisez HH:MM (ex: 08:30).`);
  }
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Vérifie le chevauchement entre deux intervalles [s1, e1[ et [s2, e2[. */
function overlaps(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && s2 < e1;
}

// ─── Use cases ─────────────────────────────────────────────────────────────────

export const ScheduleUseCases = {
  async getOrCreateActiveSchedule(): Promise<PersonalSchedule> {
    let schedule = await PersonalScheduleRepository.findActiveSchedule();
    if (!schedule) {
      const now = new Date().toISOString();
      schedule = {
        id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: 'Semaine type',
        validFrom: now,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };
      await PersonalScheduleRepository.createSchedule(schedule);
    }
    return schedule;
  },

  async createBlock(params: CreateBlockParams): Promise<PlanningBlock> {
    // BR-015 : Validation du format HH:MM
    const startMin = timeToMinutes(params.startTime);
    const endMin = timeToMinutes(params.endTime);

    // BR-017 : fin > début
    if (endMin <= startMin) {
      throw new Error('L\'heure de fin doit être après l\'heure de début.');
    }

    const schedule = await ScheduleUseCases.getOrCreateActiveSchedule();

    // BR-016 : Détection de collision sur le même jour
    const existingBlocks = await PersonalScheduleRepository.getBlocksForDay(
      schedule.id,
      params.dayOfWeek
    );

    const conflict = existingBlocks.find(b => {
      try {
        const bs = timeToMinutes(b.startTime);
        const be = timeToMinutes(b.endTime);
        return overlaps(startMin, endMin, bs, be);
      } catch {
        return false; // Ignorer les blocs avec un format horaire invalide existant
      }
    });

    if (conflict) {
      throw new Error(
        `Conflit de planning : ce créneau chevauche "${conflict.label}" (${conflict.startTime} – ${conflict.endTime}).`
      );
    }

    const now = new Date().toISOString();
    const finalLabel = params.type === 'OTHER' && params.customLabel?.trim()
      ? params.customLabel.trim()
      : params.label.trim();

    const block: PlanningBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      scheduleId: schedule.id,
      label: finalLabel,
      type: params.type,
      dayOfWeek: params.dayOfWeek,
      startTime: params.startTime,
      endTime: params.endTime,
      color: params.color,
      createdAt: now,
      updatedAt: now,
    };

    await PersonalScheduleRepository.createBlock(block);
    return block;
  },

  async deleteBlock(blockId: string): Promise<void> {
    await PersonalScheduleRepository.deleteBlock(blockId);
  },

  async getActiveScheduleBlocks(): Promise<PlanningBlock[]> {
    const schedule = await ScheduleUseCases.getOrCreateActiveSchedule();
    return PersonalScheduleRepository.getBlocksForSchedule(schedule.id);
  },

  async getBlocksForToday(): Promise<PlanningBlock[]> {
    const schedule = await ScheduleUseCases.getOrCreateActiveSchedule();
    const todayNum = new Date().getDay(); // 0..6
    return PersonalScheduleRepository.getBlocksForDay(schedule.id, todayNum);
  },
};
