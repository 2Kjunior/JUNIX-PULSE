/** New moment (sheet 012): the "Moment" form. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { MomentForm } from '@/features/create/MomentForm';

export default function NewEventScreen() {
  const params = useLocalSearchParams<{ defaultDate?: string; defaultHour?: string; personId?: string }>();
  return <MomentForm defaultDate={params.defaultDate} defaultHour={params.defaultHour} personId={params.personId} />;
}
