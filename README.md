# Symmie, the symptom tracker

Symmie is a symptom diary that runs as a Progressive Web App (PWA): it installs from a link on an
Android phone, works without a network connection, and keeps every entry on the phone. Nothing is
sent to a server.

It is meant for people who live with a recurring condition, or who are working out what triggers one,
and want to see patterns without a clinical tool. Logging a normal day takes a few taps, and the
result can be printed or exported for a doctor visit.

Symmie shows descriptive statistics only. It is not a medical device and does not give medical advice.

## Features

- **Local lock.** On first run you choose a username and password; later runs ask for them to unlock
  the diary. The password is stored as a salted PBKDF2-SHA256 hash, on the phone only.
- **Your own symptoms.** Each symptom has a name and a type fixed at creation: a strength from 1 to 10
  (10 is the worst), or yes/no. Symptoms can be renamed and archived; archived symptoms leave the log
  screen but stay in the graphs and exports.
- **Fast logging.** One symptom per screen; a tap saves the value and moves to the next symptom.
  "Same as yesterday" copies the previous day's value. A strip of recent days lets you fill in an
  earlier day.
- **Day note.** One free-text note per day, shown with that day's values.
- **Evolution graph.** The five most often logged symptoms on one graph, by day, week or month (the
  last 10 of each).
- **Patterns.** Averages by weekday and by time of year, and the symptom pairs that move together most
  strongly (Pearson correlation). A pattern needs at least 14 days of data before it is shown.
- **Doctor summary.** A printable page for a chosen date range with the graph, the day notes and each
  symptom's average, highest value and number of days logged.
- **Export and backup.** A CSV export of a date range, and a full backup file that can be restored on
  another phone.

## Privacy and its limits

- All data is stored in the browser's IndexedDB on the phone. There is no account, no server and no
  sync between devices.
- The username and password lock the screen; they do not encrypt the data. Someone who can read the
  phone's browser storage can read the diary.
- Clearing the browser's data for the site, or losing the phone, loses the diary unless a backup file
  was saved.

## Running it locally

Requires a current Node.js LTS release.

```sh
npm ci
npm run dev        # development server; the app is at http://localhost:5173/app/
npm test           # Vitest unit and component tests
npm run typecheck  # tsc -b
npm run lint       # ESLint
npm run build      # production build into dist/
```

`npm run build` writes the app to `dist/app/` and copies the static landing page from `landing/` to
`dist/index.html`. Any static host that serves over HTTPS works; `vercel.json` adds the one redirect
the app needs (`/app` to `/app/`).

## Repository layout

| Path | What it holds |
|---|---|
| `src/domain/` | Pure functions: dates, statistics, patterns, CSV, backup validation, password policy |
| `src/data/` | IndexedDB and in-memory storage behind the `DiaryRepository` and `CredentialStore` interfaces; password hashing |
| `src/state/` | React context providers for the session, the diary and the clock |
| `src/features/` | Screens: lock, log, analysis, summary, settings |
| `src/ui/` | Shared components and design tokens |
| `src/pwa/` | Service worker registration and the install button |
| `landing/` | The static landing page served at the site root |
| `docs/code-design/` | The design of the React client, with diagrams |
| `prototype/`, `prototype-b/`, `prototype-landing/` | Clickable HTML prototypes the app was designed from; each has its own README |

## Status

A personal project, published as is. Issues and pull requests may not get a response.

## License

No license is granted. The source is published for reading; all rights are reserved.
