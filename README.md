# Tech Incidents Archive - Backend Documentation

This repository contains the Supabase Edge Functions that power the Tech Incidents Archive backend. These functions allow users to create and manage technical incidents through the API, and perform authentication operations such as registrations, logins and password resets.

## System Architecture

The backend is built using Supabase Edge Functions deployed on Deno, providing serverless function execution with direct access to your Supabase database. The application uses TypeScript for type safety and follows RESTful API patterns.

## Edge Functions

### 1. `tech-incidents`

This edge function handles CRUD operations for technical incidents.

#### Capabilities:
- **GET**: Fetches all incidents ordered by date
- **POST**: Creates a new incident with optional artifact attachments
- **PUT**: Updates an existing incident
- **DELETE**: Removes one or multiple incidents

#### Artifact Handling:
- Supports code artifacts (stored as text)
- Supports image artifacts (uploaded to Supabase Storage)
- Proper error handling and validation

#### Example Requests:

```javascript
// Fetch all incidents
const response = await fetch('https://yourapp.functions.supabase.co/tech-incidents', {
  method: 'GET',
  credentials: 'include'
});

// Create a new incident
const response = await fetch('https://yourapp.functions.supabase.co/tech-incidents', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    addition: {
      incident_name: 'Server Outage',
      description: 'Main database server crashed',
      severity: 'high',
      incident_date: '2025-03-20T14:30:00',
      artifactType: 'code'
    },
    fileData: null // For code artifacts
  })
});
```

### 2. `authentication`

Manages user authentication flows, session handling, and cookie-based authentication.

#### Capabilities:
- **POST /signup**: Creates a new user account
- **POST /signin**: Authenticates users and sets secure cookies
- **POST /signout**: Logs users out and clears auth cookies
- **GET /user**: Returns the currently authenticated user

#### Security Features:
- HTTP-only cookies for secure token storage
- Session refresh logic with proper token rotation
- CORS handling for secure cross-origin requests

#### Example Requests:

```javascript
// Sign in
const response = await fetch('https://yourapp.functions.supabase.co/authentication/signin', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword'
  })
});

// Get current user
const response = await fetch('https://yourapp.functions.supabase.co/authentication/user', {
  method: 'GET',
  credentials: 'include'
});
```

### 3. `validate-auth`

A middleware-like function that validates user authentication and provides access to protected resources.

#### Capabilities:
- Session validation and token verification
- Automatic token refresh for expired sessions
- User-specific data access validation

#### Example Requests:

```javascript
// Get authenticated user data
const response = await fetch('https://yourapp.functions.supabase.co/validate-auth', {
  method: 'GET',
  credentials: 'include'
});

// Create a new protected resource (authenticated endpoint)
const response = await fetch('https://yourapp.functions.supabase.co/validate-auth', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: 'Protected resource data'
  })
});
```

### 4. `password-recovery`

Handles the password reset flow for users who have forgotten their passwords.

#### Capabilities:
- **POST /password-recovery**: Initiates password reset via email
- **POST /confirm**: Completes the password reset process

#### Security Considerations:
- Proper validation of reset tokens
- Secure password update mechanism
- User-friendly error handling

#### Example Requests:

```javascript
// Request password reset
const response = await fetch('https://yourapp.functions.supabase.co/password-recovery', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com'
  })
});

// Confirm password reset
const response = await fetch('https://yourapp.functions.supabase.co/password-recovery/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'newSecurePassword',
    token: 'resetTokenFromEmail'
  })
});
```

## Database Schema

The backend interacts with the following Supabase table:

### `tech_incidents`
- `id`: UUID (primary key)
- `created_at`: Timestamp
- `incident_name`: String (required)
- `incident_date`: Timestamp
- `description`: Text
- `severity`: String (low/moderate/high/critical)
- `artifactType`: String ('image' or 'code')
- `artifactContent`: JSON (stores content or URL for artifacts)

## Storage Buckets

- `incident-artifacts`: Stores uploaded images and other binary artifacts

## Environment Variables

The following environment variables must be set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin-level operations

## Security Considerations

1. All authentication tokens are stored in HTTP-only cookies for CSRF protection
2. Input validation is performed on all endpoints

## Development Setup

1. Install the Supabase CLI
2. Clone the repository
3. Set up local environment variables
4. Run `supabase functions serve` to test locally

## Deployment

Deploy functions to your Supabase project:

```bash
supabase functions deploy tech-incidents
supabase functions deploy authentication
supabase functions deploy validate-auth
supabase functions deploy password-recovery
```

## How to Use

To use this backend, ensure your frontend meets these requirements:

1. Include credentials in all fetch requests (`credentials: 'include'`)
2. Handle 401 Unauthorised responses by redirecting to the login page
3. Implement proper forms for incident creation and management
4. Provide user authentication flows