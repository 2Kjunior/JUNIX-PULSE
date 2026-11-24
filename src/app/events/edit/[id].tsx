/** Change a moment (sheet 022): the "Moment" form that created it, filled in. Route /events/edit/[id]. */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { MomentForm } from '@/features/create/MomentForm';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MomentForm editingId={id} />;
}
