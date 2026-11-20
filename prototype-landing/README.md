# Symmie landing page prototypes

Three alternative landing pages for the site root `/`, in the dark "Night shift" style of `../prototype-b` (same colour tokens, severity ramp, pill buttons, phone frame). Static HTML, CSS and a little inline JS; no build step.

    cd prototype-landing && python3 -m http.server 8082   # then open http://localhost:8082

All three end in the same place: install steps and a link to `/app/`, where the app is installed from.

- **A, One tap** (`a.html`): the hero is a working copy of the log screen. Tap three bands and it reports how long that took. Pitch: speed, "same as yesterday", a paper diary compared with Symmie.
- **B, Your year in colour** (`b.html`): the hero is a heatmap of 371 days; tap a square to read the day. Then weekday bars, correlation pairs and a mock doctor summary. Pitch: patterns, and what you can show a doctor.
- **C, How are you today?** (`c.html`): a 1-10 slider recolours the whole page and changes the message. Then three features, a privacy section and an FAQ (cost, phones, losing the phone, the password, medical advice). Pitch: feeling, privacy, plain answers.

All data is invented. Nothing is stored or sent.
