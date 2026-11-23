/** New reminder (sheet 012): the "To do" form with its alert on. The route stays for every link to it. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { TodoForm } from '@/features/create/TodoForm';

export default function NewReminderScreen() {
  const params = useLocalSearchParams<{ defaultDate?: string; defaultHour?: string; personId?: string }>();
  return (
    <TodoForm initialAlert defaultDate={params.defaultDate} defaultHour={params.defaultHour} personId={params.personId} />
  );
}
