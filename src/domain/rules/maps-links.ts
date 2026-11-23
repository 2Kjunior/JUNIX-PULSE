/**
 * The two Google Maps links of a place (sheets 013): open it, or the route to it. They work on
 * the phone (Maps app) and on the web, with no key. The address leaves the phone only when the
 * person taps the button.
 */

const MAPS = 'https://www.google.com/maps';

export function mapsSearchUrl(place: string): string {
  return `${MAPS}/search/?api=1&query=${encodeURIComponent(place.trim())}`;
}

/** The route from where the phone is, Maps offering transit, walking, car and taxis. */
export function mapsDirectionsUrl(place: string): string {
  return `${MAPS}/dir/?api=1&destination=${encodeURIComponent(place.trim())}`;
}
