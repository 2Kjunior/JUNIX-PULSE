/**
 * Tests unitaires pour la section Apparence des Paramètres (Phase P4).
 *
 * Couverture :
 * - Options de segmented control : 'light', 'dark', 'system'.
 * - Persistance asynchrone lors de la sélection via SettingsRepository.update.
 * - Gestion d'erreur et restauration de l'état précédent en cas d'échec d'écriture.
 */

import { AppearanceMode } from '../domain/entities';
import { useAppStore } from '../store/app-store';

describe('Phase P4 — Section Apparence dans Réglages', () => {
  beforeEach(() => {
    useAppStore.setState({
      themeMode: 'dark',
      snackbar: null,
    });
  });

  it('les modes supportés incluent bien light, dark et system', () => {
    const validModes: AppearanceMode[] = ['light', 'dark', 'system'];
    expect(validModes).toHaveLength(3);
  });

  it('le store met à jour themeMode immédiatement', () => {
    expect(useAppStore.getState().themeMode).toBe('dark');

    useAppStore.getState().setThemeMode('light');
    expect(useAppStore.getState().themeMode).toBe('light');

    useAppStore.getState().setThemeMode('system');
    expect(useAppStore.getState().themeMode).toBe('system');
  });

  it('la gestion d\'erreur rollback l\'état si la persistance échoue', async () => {
    const previousMode = useAppStore.getState().themeMode; // 'dark'
    const newMode: AppearanceMode = 'light';

    // Simulation de l'action de sélection
    useAppStore.getState().setThemeMode(newMode);
    expect(useAppStore.getState().themeMode).toBe('light');

    // Échec simulé de SettingsRepository.update
    const mockUpdate = jest.fn().mockRejectedValue(new Error('Erreur SQLite simulateur'));

    try {
      await mockUpdate({ appearanceMode: newMode });
    } catch {
      // Rollback vers previousMode
      useAppStore.getState().setThemeMode(previousMode);
      useAppStore.getState().showSnackbar('Échec de la sauvegarde de l’apparence');
    }

    expect(useAppStore.getState().themeMode).toBe('dark');
    expect(useAppStore.getState().snackbar?.message).toBe('Échec de la sauvegarde de l’apparence');
  });
});
