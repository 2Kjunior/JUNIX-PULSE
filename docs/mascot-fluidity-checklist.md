# Pulse mascot: fluidity check on a real phone

What the code already guarantees (audited, step 7):

- Every animation moves a transform (translate, scale, rotate for the arms) through Reanimated on the UI thread. No state changes while the mascot moves.
- The three looping animations (bob, liquid, arm swing) run only on a mascot that is `animated` and on a screen that is shown. A tab that is behind another one rests (`useScreenFocused`).
- Only the two large mascots of the tabs (Home 56, Pulse 96) loop. The small ones (suggestion rows 28, home tour 40) are still.
- Reduced motion turns every loop and every move into a fade or a still frame.
- A reaction (cameo) and the guide mascot of the onboarding are short-lived and single.
- Nothing runs in the background: the Reanimated frame loop and the JS timers stop with the app.

## To measure on the phone (10 minutes)

1. `npx expo start`, open the app on the phone, shake it, open the dev menu and turn on **Show Perf Monitor**.
2. Read two numbers: **UI** and **JS** frames per second. Target: 58 or more on both at rest on Home and on Pulse.
3. Go through these and watch both numbers:
   - Home at rest for 30 s, then Pulse at rest for 30 s (the Home mascot must stop moving when Pulse is shown).
   - Switch tabs quickly ten times.
   - Tick a task (cameo) and open the Home tour ("Revoir la présentation" in Settings).
   - Onboarding: welcome, discovery (the mascot points at each card), personalisation with the keyboard open.
4. Repeat once with **Settings > Accessibility > Reduce motion** on: nothing should loop.
5. Note the phone model and any dip under 50 fps with the screen it happened on.

If a dip shows up, the first levers are, in this order: `animated={false}` on the Pulse tab mascot, then the liquid loop (`MASCOT_LIQUID.loopMs`), then the arm swing.
