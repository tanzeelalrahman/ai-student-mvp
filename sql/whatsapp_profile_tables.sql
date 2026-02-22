create extension if not exists pgcrypto;

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  external_user_id text not null unique,
  channel text default 'whatsapp',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table conversations add column if not exists external_user_id text;
alter table conversations add column if not exists channel text default 'whatsapp';
alter table conversations add column if not exists metadata jsonb default '{}'::jsonb;
alter table conversations add column if not exists created_at timestamptz default now();
alter table conversations add column if not exists updated_at timestamptz default now();

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  external_user_id text,
  direction text default 'inbound',
  body text,
  message_sid text unique,
  provider_message_sid text,
  raw_payload jsonb,
  created_at timestamptz default now()
);

alter table messages add column if not exists conversation_id uuid;
alter table messages add column if not exists external_user_id text;
alter table messages add column if not exists direction text default 'inbound';
alter table messages add column if not exists body text;
alter table messages add column if not exists message_sid text;
alter table messages add column if not exists provider_message_sid text;
alter table messages add column if not exists raw_payload jsonb;
alter table messages add column if not exists created_at timestamptz default now();

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  phone text,
  education_level text,
  current_status text,
  interest_domain text,
  career_goal text,
  budget_range text,
  specific_course text
);

alter table profiles add column if not exists created_at timestamptz default now();
alter table profiles add column if not exists name text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists education_level text;
alter table profiles add column if not exists current_status text;
alter table profiles add column if not exists interest_domain text;
alter table profiles add column if not exists career_goal text;
alter table profiles add column if not exists budget_range text;
alter table profiles add column if not exists specific_course text;

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  external_user_id text,
  program_id text,
  program_title text,
  program_duration text,
  program_price_band text,
  program_why text,
  timeline_bullets text[],
  job_plan_summary text,
  summary_text text,
  grok_json jsonb,
  created_at timestamptz default now()
);

alter table recommendations add column if not exists profile_id uuid references profiles(id) on delete set null;
alter table recommendations add column if not exists conversation_id uuid references conversations(id) on delete set null;
alter table recommendations add column if not exists external_user_id text;
alter table recommendations add column if not exists program_id text;
alter table recommendations add column if not exists program_title text;
alter table recommendations add column if not exists program_duration text;
alter table recommendations add column if not exists program_price_band text;
alter table recommendations add column if not exists program_why text;
alter table recommendations add column if not exists timeline_bullets text[];
alter table recommendations add column if not exists job_plan_summary text;
alter table recommendations add column if not exists summary_text text;
alter table recommendations add column if not exists grok_json jsonb;
alter table recommendations add column if not exists created_at timestamptz default now();

create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_external_user_id on messages(external_user_id);
create unique index if not exists idx_messages_message_sid_unique on messages(message_sid) where message_sid is not null;
create index if not exists idx_profiles_interest_domain on profiles(interest_domain);
create index if not exists idx_recommendations_profile_id on recommendations(profile_id);
create index if not exists idx_recommendations_conversation_id on recommendations(conversation_id);
create index if not exists idx_recommendations_external_user_id on recommendations(external_user_id);
create unique index if not exists idx_conversations_external_user_id_unique on conversations(external_user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists conversations_set_updated_at on conversations;
create trigger conversations_set_updated_at
before update on conversations
for each row execute function set_updated_at();
