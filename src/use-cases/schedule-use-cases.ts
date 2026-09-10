/**
 * Use cases pour la gestion du planning personnel hebdomadaire.
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
}

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
    const schedule = await ScheduleUseCases.getOrCreateActiveSchedule();
    const now = new Date().toISOString();

    const block: PlanningBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      scheduleId: schedule.id,
      label: params.label.trim(),
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
