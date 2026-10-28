/**
 * Onglet Rappels — Intégration directe au niveau de la Bottom Bar.
 * Réhabilite la visibilité immédiate des rappels selon le modèle ergonomique Wave.
 */

import React from 'react';
import RemindersListScreen from '@/app/reminders/index';

export default function RemindersTabScreen() {
  return <RemindersListScreen hideBackButton />;
}

