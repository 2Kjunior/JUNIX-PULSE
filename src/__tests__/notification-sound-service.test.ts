/**
 * Tests unitaires pour NotificationSoundService.
 *
 * Couvre : anti-spam, préférence désactivée, splash guard,
 * player failure (pas de crash), lecture réussie.
 */

import { NotificationSoundService } from "@/services/sound/NotificationSoundService";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock du module expo-audio
const mockPlay = jest.fn().mockResolvedValue(undefined);
const mockRemove = jest.fn();
const mockPlayer = {
  volume: 1,
  playing: false,
  play: mockPlay,
  remove: mockRemove,
};
const mockCreateAudioPlayer = jest.fn().mockReturnValue(mockPlayer);

jest.mock("expo-audio", () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
}));

// Mock du repository de settings
const mockSettingsGet = jest.fn();
jest.mock("@/repositories/settings-repository", () => ({
  SettingsRepository: {
    get: () => mockSettingsGet(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Simule une préférence utilisateur pour le son. */
function mockSoundEnabled(enabled: boolean) {
  mockSettingsGet.mockResolvedValue({ notificationSoundEnabled: enabled });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Remettre le timestamp de dernier son à zéro avant chaque test
  NotificationSoundService._resetLastPlayedAt();
  mockSoundEnabled(true);
});

describe("NotificationSoundService", () => {
  describe("splash guard", () => {
    it("ne joue pas de son quand splashActive = true", async () => {
      await NotificationSoundService.play(true);
      expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    });

    it("joue le son quand splashActive = false", async () => {
      await NotificationSoundService.play(false);
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    });
  });

  describe("préférence utilisateur désactivée", () => {
    it("ne joue pas de son si notificationSoundEnabled = false", async () => {
      mockSoundEnabled(false);
      await NotificationSoundService.play(false);
      expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    });
  });

  describe("anti-spam", () => {
    it("ignore le second appel dans l'intervalle minimum (2s)", async () => {
      await NotificationSoundService.play(false);
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);

      // Deuxième appel immédiat — doit être ignoré (< 2000ms)
      await NotificationSoundService.play(false);
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    });

    it("met à jour lastPlayedAt après une lecture réussie", async () => {
      const before = NotificationSoundService._getLastPlayedAt();
      await NotificationSoundService.play(false);
      const after = NotificationSoundService._getLastPlayedAt();
      expect(after).toBeGreaterThan(before);
    });
  });

  describe("player failure", () => {
    it("ne crash pas si createAudioPlayer lance une erreur", async () => {
      mockCreateAudioPlayer.mockImplementationOnce(() => {
        throw new Error("player unavailable");
      });
      // Ne doit pas throw
      await expect(NotificationSoundService.play(false)).resolves.toBeUndefined();
    });

    it("ne crash pas si player.play() rejette", async () => {
      mockPlay.mockRejectedValueOnce(new Error("play failed"));
      await expect(NotificationSoundService.play(false)).resolves.toBeUndefined();
    });

    it("appelle toujours player.remove() même en cas d'erreur", async () => {
      mockPlay.mockRejectedValueOnce(new Error("play failed"));
      await NotificationSoundService.play(false);
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe("lecture réussie", () => {
    it("applique un volume de 0.8", async () => {
      await NotificationSoundService.play(false);
      // Le volume est assigné directement sur l'objet player
      expect(mockPlayer.volume).toBe(0.8);
    });

    it("appelle player.remove() en fin de lecture", async () => {
      await NotificationSoundService.play(false);
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });
  });
});

