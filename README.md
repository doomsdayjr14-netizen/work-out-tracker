# FORM — Workout & Nutrition Tracker

A standalone, responsive web app for tracking workouts, logging meals, and receiving browser notifications for significant progress.

## Features

- Start and finish workout sessions
- Log exercise weight and repetitions
- Calculate total session volume and sets
- In-app and browser notifications for significant strength gains
- Workout-specific meal recommendations
- Daily calorie and macronutrient tracking
- Workout history and streak overview
- Local browser storage (no account or backend required)
- Installable progressive web app with offline caching

## Run locally

Serve the project with any static server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Notifications

Use **Start workout**, log a set above a previous exercise baseline, and allow notification permission. Notification support is best on localhost or HTTPS.

## Deployment

Upload the project to GitHub Pages or deploy the repository as a static site. It has no build step or external dependencies.
