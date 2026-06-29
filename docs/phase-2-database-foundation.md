# ViankaX Phase 2 Database Foundation

Phase 2 moves the platform from dummy/localStorage data toward a real Supabase backend.

## Architecture Layers

### Layer 1: Core Backend

Stores the operational records.

- `clients`
- `jobs`
- `applicants`
- `applicant_documents`
- `screening_answers`

### Layer 2: Automation Engine

Stores workflow movement and system actions.

- `automation_events`
- `pipeline_stage_history`
- notification events later through serverless functions
- scheduling events later through Cal.com, Calendly, or calendar sync

### Layer 3: AI Engine

Stores AI-generated interpretation and hiring intelligence.

- `candidate_scores`
- `ai_recommendations`
- `voice_interviews`
- resume parsing outputs later
- screening evaluation outputs later

## Environment Variables

Copy `apps/web/.env.example` to `apps/web/.env.local` after creating the Supabase project.

Only use the public anon key in the Vite frontend:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not place service role keys in frontend code.

## Setup Order

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `docs/supabase-schema.sql`.
4. Create storage buckets:
   - `resumes`
   - `licenses`
   - `government-ids`
   - `certifications`
   - `voice-interviews`
5. Add the frontend environment variables.
6. Connect the application form to insert records.
7. Connect document uploads to Supabase Storage.
8. Replace dashboard dummy data with database reads.

## Phase 2 Boundary

This phase prepares the database and client foundation. Real AI, SMS, email, scheduling, and voice integrations should come after the database records are stable.
