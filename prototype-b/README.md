# Symmie prototype B: "Night shift"

An alternative design to `../prototype`, covering the same features with the same fake data. Static HTML, CSS and JS; no build step.

    cd prototype-b && python3 -m http.server 8081   # then open http://localhost:8081

Demo login: `anna` / `demo`. Data is kept in localStorage under its own key, so it does not touch prototype A.

What differs from A:
- Dark theme; colour (teal to red) carries the severity everywhere.
- Logging is one symptom per screen: ten full-width colour bands for 1-10, two large halves for yes/no. A tap saves and moves to the next symptom. "Same as yesterday" is a button on each screen, and one pill confirms all of them. The last step shows the day as coloured tiles plus the note.
- A 21-day strip replaces the arrows for changing day; each day shows how much of it is logged.
- Analysis has three parts: Evolution (toggle symptom lines, day/week/month), Year (a heatmap, one square per day, tap a square to open that day) and Patterns (weekday bars, a 12-month wheel, correlation pairs ranked by strength instead of a matrix).
- Navigation is a floating pill. Summary and settings keep A's content in the dark styling; the summary sheet stays white so it prints.
