# APA1 Supa Task Backend

This is where you'll design and deploy your API for access by your frontend

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [curl](https://curl.se/) for testing functions locally

## Getting Started

Before starting with this project please set up an account with [Supabase](https://supabase.com/)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Install Dependencies

`npm install`

**Very important, if you are working on your project in cloud spaces prefix all your supabase commands with `npx`**

### 3. Authenticate with Supabase
The first step is to authenticate with Supabase:

```bash
supabase login
```

This will open a browser window where you can authenticate with Supabase and generate an access token.

### 4. Link

Once authenticated, link your local project to your Supabase project:

```bash
supabase link --project-ref your_project_id
```

### 5. Working with Edge Functions

**Creating a New Edge Function**

```bash
supabase functions new my-function-name
```

This creates a new function in supabase/functions/my-function-name/

**Deploying your Edge functions**

```bash
supabase functions deploy
```
