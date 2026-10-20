CREATE TABLE users (id uuid PRIMARY KEY, username text NOT NULL UNIQUE);
CREATE TABLE exercise_definitions (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), data jsonb NOT NULL);
CREATE TABLE workout_templates (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), version integer NOT NULL CHECK (version > 0), data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE workout_sessions (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), data jsonb NOT NULL, digest text NOT NULL, source text NOT NULL DEFAULT 'manual', external_id text, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX session_external_source ON workout_sessions(user_id, source, external_id);
CREATE INDEX session_user_date ON workout_sessions(user_id, created_at DESC);
CREATE TABLE auth_sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL);
CREATE TABLE login_attempts (bucket bigint PRIMARY KEY, attempts integer NOT NULL);
