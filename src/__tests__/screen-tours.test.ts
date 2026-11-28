import { MASCOT_MESSAGES } from '../domain/rules/mascot-message-catalog';
import { MASCOT_MESSAGES_EN } from '../domain/rules/mascot-message-catalog-en';
import { planTour, SCREEN_TOURS, TOUR_STOPS, tourFromSegments, type TourId } from '../domain/rules/mascot-tour-rules';

describe('the tour of each tab (sheet 045)', () => {
  const screen = { width: 360, height: 780, topInset: 24, bottomReserve: 110 };
  const rect = { x: 16, y: 200, width: 300, height: 60 };

  it('knows the tab of a route', () => {
    expect(tourFromSegments(['(tabs)'])).toBe('home');
    expect(tourFromSegments(['(tabs)', 'index'])).toBe('home');
    expect(tourFromSegments(['(tabs)', 'tasks'])).toBe('todo');
    expect(tourFromSegments(['(tabs)', 'calendar'])).toBe('planning');
    expect(tourFromSegments(['(tabs)', 'people'])).toBe('people');
    expect(tourFromSegments(['(tabs)', 'reminders'])).toBeNull();
    expect(tourFromSegments(['settings'])).toBeNull();
  });

  it('keeps the home tour as it was', () => {
    expect(TOUR_STOPS.map(stop => stop.id)).toEqual(['pillars', 'quickAdd', 'timeline', 'mascot']);
    expect(SCREEN_TOURS.home.tipId).toBe('tour:home');
  });

  it('gives every stop a sentence of Pulse in French and in English, and each tour its own memory', () => {
    const ids = new Set<string>();
    for (const tour of Object.keys(SCREEN_TOURS) as TourId[]) {
      ids.add(SCREEN_TOURS[tour].tipId);
      for (const stop of SCREEN_TOURS[tour].stops) {
        expect([stop.id, Boolean(MASCOT_MESSAGES[stop.message])]).toEqual([stop.id, true]);
        expect([stop.id, Boolean(MASCOT_MESSAGES_EN[stop.message])]).toEqual([stop.id, true]);
      }
    }
    expect(ids.size).toBe(4);
  });

  it('shows the two ways of swiping, deleting included, on the À faire tour', () => {
    expect(SCREEN_TOURS.todo.stops.map(stop => stop.message)).toContain('TOUR_TODO_SWIPE');
    expect(MASCOT_MESSAGES.TOUR_TODO_SWIPE.tu.warm.plain).toMatch(/supprimer/);
  });

  it('gives a tour of one stop on a tab other than home, never on home', () => {
    // The Planning in Month view: only the view bar is there
    expect(planTour({ planViews: rect }, screen, SCREEN_TOURS.planning.stops, 1)).toEqual(['planViews']);
    expect(planTour({ pillars: rect }, screen)).toEqual([]);
  });
});
