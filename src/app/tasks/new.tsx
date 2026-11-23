/** New "To do" (sheet 012): the form of the family, without an alert unless asked (?alert=1). */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { TodoForm } from '@/features/create/TodoForm';

export default function NewTaskScreen() {
  const params = useLocalSearchParams<{ defaultDate?: string; personId?: string; alert?: string }>();
  return <TodoForm initialAlert={params.alert === '1'} defaultDate={params.defaultDate} personId={params.personId} />;
}
