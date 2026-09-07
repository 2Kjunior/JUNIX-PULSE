import { ReminderPriority } from "./reminder";

export type TaskStatus = "INBOX" | "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "POSTPONED";

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    scheduledDate?: Date;
    estimatedDuration?: number;
    priority: ReminderPriority;
    personId?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}