/**
 * Opens Focus for a task (study 001, 16.8 D; sheet 033), from its card, its "⋯" or its page: with
 * its time to do it and the Focus time already done, so Focus picks the next session.
 */
import { router } from 'expo-router';

export function openFocusForTask(task: { id: string; title: string; estimatedMinutes?: number; focusMinutes?: number }): void {
  router.push({
    pathname: '/focus' as never,
    params: {
      taskId: task.id,
      taskTitle: task.title,
      minutes: String(task.estimatedMinutes ?? ''),
      done: String(task.focusMinutes ?? 0),
    },
  });
}
