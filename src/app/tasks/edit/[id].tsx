/** Change a task (sheet 022): the "To do" form that created it, filled in. Route /tasks/edit/[id]. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { TodoForm } from '@/features/create/TodoForm';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TodoForm editing={{ kind: 'task', id }} />;
}
