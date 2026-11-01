# Pulse mascot: fluidity check on a real phone

What the code already guarantees (audited, step 7):

- Every animation moves a transform (translate, scale, rotate for the arms) through Reanimated on the UI thread. No state changes while the mascot moves.
- There is one animated mascot for the whole app, the companion, which travels from screen to screen. The small ones (suggestion rows 28, home tour 40) are still.
- Reduced motion turns every loop and every move into a fade or a still frame.
- A reaction is played by the companion itself, on the spot. The guide mascot of the onboarding is the only other one, and it is there only during the onboarding.
- Nothing runs in the background: the Reanimated frame loop and the JS timers stop with the app.

## To measure on the phone (10 minutes)

1. `npx expo start`, open the app on the phone, shake it, open the dev menu and turn on **Show Perf Monitor**.
2. Read two numbers: **UI** and **JS** frames per second. Target: 58 or more on both at rest on Home and on Pulse.
3. Go through these and watch both numbers:
   - Home at rest for 30 s, then Pulse at rest for 30 s (the companion must travel to its place on each screen without a jump).
   - Switch tabs quickly ten times.
   - Tick a task (the companion reacts on the spot) and open the Home tour ("Revoir la présentation" in Settings).
   - Onboarding: welcome, discovery (the mascot points at each card), personalisation with the keyboard open.
4. Repeat once with **Settings > Accessibility > Reduce motion** on: nothing should loop.
5. Note the phone model and any dip under 50 fps with the screen it happened on.

If a dip shows up, the first levers are, in this order: the liquid loop (`MASCOT_LIQUID.loopMs`), then the arm swing.
