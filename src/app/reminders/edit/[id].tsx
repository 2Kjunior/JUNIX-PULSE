/** Change a reminder (sheet 022): the "To do" form that created it, filled in. Route /reminders/edit/[id]. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { TodoForm } from '@/features/create/TodoForm';

export default function EditReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TodoForm editing={{ kind: 'reminder', id }} />;
}
