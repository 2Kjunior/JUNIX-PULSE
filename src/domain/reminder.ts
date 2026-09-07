export type ReminderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type ReminderStatus =
    | "PENDING"
    | "SNOOZED"
    | "MISSED"
    | "COMPLETED"
    | "DELETED";

export type ActionType = "NONE" | "CALL" | "SMS" | "WHATSAPP" | "EMAIL";

export interface Reminder {
    id: string;
    title: string;
    notes?: string;
    scheduledAt: Date;
    priority: ReminderPriority;
    status: ReminderStatus;
    actionType: ActionType;
    personId?: string;
    recurrenceRuleId?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    deletedAt?: Date;
}