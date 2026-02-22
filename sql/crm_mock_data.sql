create extension if not exists pgcrypto;

create table if not exists job_postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  domain text not null,
  location text,
  job_type text default 'full_time',
  experience_level text default 'entry',
  min_education text default 'high_school',
  salary_range text,
  required_skills text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_job_postings_domain on job_postings(domain);
create index if not exists idx_job_postings_active on job_postings(is_active);

insert into job_postings (
  title,
  company,
  domain,
  location,
  job_type,
  experience_level,
  min_education,
  salary_range,
  required_skills,
  is_active
)
select *
from (
  values
    ('Junior Frontend Developer', 'Northstar Labs', 'web_dev', 'Remote', 'full_time', 'entry', 'high_school', '$55k-$70k', array['javascript', 'react', 'css', 'git'], true),
    ('Full Stack Engineer I', 'BlueRiver Systems', 'web_dev', 'Chicago, IL', 'full_time', 'junior', 'college', '$75k-$92k', array['react', 'node', 'postgresql', 'api'], true),
    ('Data Analyst (SQL)', 'Insight Orbit', 'data_ai', 'New York, NY', 'full_time', 'entry', 'college', '$65k-$82k', array['sql', 'dashboarding', 'excel', 'python'], true),
    ('Junior ML Engineer', 'VectorLoop AI', 'data_ai', 'Remote', 'full_time', 'junior', 'graduate', '$88k-$110k', array['python', 'ml', 'pandas', 'deployment'], true),
    ('React Native Developer', 'AppForge Studio', 'mobile', 'Austin, TX', 'full_time', 'entry', 'college', '$72k-$90k', array['react native', 'typescript', 'api'], true),
    ('Cloud Support Engineer', 'Nimbus Grid', 'cloud_devops', 'Seattle, WA', 'full_time', 'entry', 'college', '$70k-$86k', array['aws', 'linux', 'networking', 'docker'], true),
    ('DevOps Engineer (Junior)', 'PipelineWorks', 'cloud_devops', 'Remote', 'full_time', 'junior', 'college', '$85k-$102k', array['ci/cd', 'docker', 'terraform', 'github actions'], true),
    ('UI/UX Product Designer', 'PixelCart', 'ui_ux', 'San Francisco, CA', 'full_time', 'junior', 'college', '$78k-$98k', array['figma', 'wireframing', 'user research'], true),
    ('SOC Analyst I', 'Sentinel Ridge', 'cybersecurity', 'Austin, TX', 'full_time', 'entry', 'college', '$70k-$88k', array['networking', 'siem', 'incident response', 'linux'], true),
    ('Security Operations Associate', 'RedShield Ops', 'cybersecurity', 'Remote', 'full_time', 'entry', 'college', '$68k-$84k', array['threat detection', 'siem', 'python'], true)
) as seed(
  title,
  company,
  domain,
  location,
  job_type,
  experience_level,
  min_education,
  salary_range,
  required_skills,
  is_active
)
where not exists (
  select 1
  from job_postings jp
  where jp.title = seed.title
    and jp.company = seed.company
);

insert into profiles (
  name,
  phone,
  education_level,
  current_status,
  interest_domain,
  career_goal,
  budget_range,
  specific_course
)
select *
from (
  values
    ('Aisha Khan', '+15550000001', 'college', 'job_seeker', 'data_ai', 'get_job_fast', '100_300', 'SQL + Data Analytics Foundations'),
    ('Rohan Patel', '+15550000002', 'high_school', 'student', 'web_dev', 'switch_career', '0_100', null),
    ('Maya Johnson', '+15550000003', 'graduate', 'working', 'cloud_devops', 'upskill', '300_800', 'DevOps Automation + CI/CD'),
    ('Ibrahim Noor', '+15550000004', 'college', 'job_seeker', 'cybersecurity', 'get_job_fast', '100_300', null),
    ('Sofia Reyes', '+15550000005', 'college', 'student', 'ui_ux', 'freelance', '100_300', 'Product Case Study Portfolio')
) as seed(
  name,
  phone,
  education_level,
  current_status,
  interest_domain,
  career_goal,
  budget_range,
  specific_course
)
where not exists (
  select 1
  from profiles p
  where p.phone = seed.phone
);
