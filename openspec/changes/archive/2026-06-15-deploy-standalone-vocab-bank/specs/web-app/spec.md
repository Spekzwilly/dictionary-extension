## ADDED Requirements

### Requirement: Public deployment with client-side route serving

The web app SHALL be deployed to a public HTTPS URL and SHALL serve the SPA's `index.html` for all application routes, so client-side routing works on direct navigation and refresh. Deployment SHALL update automatically when changes land on the `main` branch.

#### Scenario: Deployed app is reachable

- **WHEN** a user opens the public deployment URL
- **THEN** the web app SHALL load and route to the login page when signed out

#### Scenario: Deep link survives refresh

- **WHEN** a user navigates directly to `/vocab` or `/review`, or refreshes while on one of those routes
- **THEN** the host SHALL serve the SPA and the client SHALL render that route (not a 404)

#### Scenario: Auto-deploy on main

- **WHEN** changes are pushed to the `main` branch
- **THEN** the public deployment SHALL rebuild and update automatically

### Requirement: Production authentication redirect

The deployed web app SHALL complete Google OAuth against its production origin and return the user to the deployed app signed in.

#### Scenario: Sign in on the deployed app

- **WHEN** a signed-out user signs in with Google on the deployed app
- **THEN** after consent the browser SHALL return to the deployed origin with a Supabase session established
- **THEN** the user's vocab bank SHALL load from Supabase
