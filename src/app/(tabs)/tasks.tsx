/**
 * The "To do" tab (sheet 015): reminders and tasks together, see features/todo/TodoTabScreen.
 * The route keeps its name "tasks", so every link to it still works.
 */
import React from 'react';

import { TodoTabScreen } from '@/features/todo/TodoTabScreen';

export default function TasksTabScreen() {
  return <TodoTabScreen />;
}
