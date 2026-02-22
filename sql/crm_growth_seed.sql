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
create unique index if not exists idx_job_postings_title_company_unique on job_postings(title, company);
create unique index if not exists idx_profiles_phone_unique on profiles(phone) where phone is not null;

with role_seed (
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
) as (
  values
    ('Junior Frontend Developer', 'Northstar Labs', 'web_dev', 'Remote', 'full_time', 'entry', 'high_school', '$55k-$70k', array['javascript','react','css','git'], true),
    ('React Developer I', 'Violet Systems', 'web_dev', 'Boston, MA', 'full_time', 'junior', 'college', '$72k-$90k', array['react','typescript','api','testing'], true),
    ('Full Stack Engineer I', 'BlueRiver Systems', 'web_dev', 'Chicago, IL', 'full_time', 'junior', 'college', '$75k-$92k', array['react','node','postgresql','api'], true),

    ('Data Analyst (SQL)', 'Insight Orbit', 'data_ai', 'New York, NY', 'full_time', 'entry', 'college', '$65k-$82k', array['sql','dashboarding','excel','python'], true),
    ('BI Analyst', 'Arc Metrics', 'data_ai', 'Remote', 'full_time', 'entry', 'college', '$68k-$85k', array['sql','power bi','tableau','analytics'], true),
    ('Junior ML Engineer', 'VectorLoop AI', 'data_ai', 'Remote', 'full_time', 'junior', 'graduate', '$88k-$110k', array['python','ml','pandas','deployment'], true),

    ('React Native Developer', 'AppForge Studio', 'mobile', 'Austin, TX', 'full_time', 'entry', 'college', '$72k-$90k', array['react native','typescript','api'], true),
    ('Flutter App Engineer', 'Pine Mobile', 'mobile', 'Remote', 'full_time', 'junior', 'college', '$78k-$95k', array['flutter','dart','state management','firebase'], true),

    ('Cloud Support Engineer', 'Nimbus Grid', 'cloud_devops', 'Seattle, WA', 'full_time', 'entry', 'college', '$70k-$86k', array['aws','linux','networking','docker'], true),
    ('DevOps Engineer (Junior)', 'PipelineWorks', 'cloud_devops', 'Remote', 'full_time', 'junior', 'college', '$85k-$102k', array['ci/cd','docker','terraform','github actions'], true),
    ('Site Reliability Engineer I', 'Scale Harbor', 'cloud_devops', 'Remote', 'full_time', 'junior', 'college', '$95k-$118k', array['linux','monitoring','kubernetes','automation'], true),

    ('UI/UX Product Designer', 'PixelCart', 'ui_ux', 'San Francisco, CA', 'full_time', 'junior', 'college', '$78k-$98k', array['figma','wireframing','user research'], true),
    ('UX Research Associate', 'HumanFlow', 'ui_ux', 'Remote', 'full_time', 'entry', 'college', '$70k-$88k', array['research','interviews','persona','testing'], true),

    ('SOC Analyst I', 'Sentinel Ridge', 'cybersecurity', 'Austin, TX', 'full_time', 'entry', 'college', '$70k-$88k', array['networking','siem','incident response','linux'], true),
    ('Security Operations Associate', 'RedShield Ops', 'cybersecurity', 'Remote', 'full_time', 'entry', 'college', '$68k-$84k', array['threat detection','siem','python'], true),
    ('Cybersecurity Engineer (Junior)', 'Fortline', 'cybersecurity', 'Dallas, TX', 'full_time', 'junior', 'college', '$92k-$110k', array['edr','vulnerability management','python','cloud security'], true)
)
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
from role_seed
on conflict (title, company)
do update
set
  domain = excluded.domain,
  location = excluded.location,
  job_type = excluded.job_type,
  experience_level = excluded.experience_level,
  min_education = excluded.min_education,
  salary_range = excluded.salary_range,
  required_skills = excluded.required_skills,
  is_active = excluded.is_active;

with lead_seed (
  name,
  phone,
  education_level,
  current_status,
  interest_domain,
  career_goal,
  budget_range,
  specific_course
) as (
  values
    ('Aisha Khan', '+15550000001', 'college', 'job_seeker', 'data_ai', 'get_job_fast', '100_300', 'SQL + Data Analytics Foundations'),
    ('Rohan Patel', '+15550000002', 'high_school', 'student', 'web_dev', 'switch_career', '0_100', null),
    ('Maya Johnson', '+15550000003', 'graduate', 'working', 'cloud_devops', 'upskill', '300_800', 'DevOps Automation + CI/CD'),
    ('Ibrahim Noor', '+15550000004', 'college', 'job_seeker', 'cybersecurity', 'get_job_fast', '100_300', null),
    ('Sofia Reyes', '+15550000005', 'college', 'student', 'ui_ux', 'freelance', '100_300', 'Product Case Study Portfolio'),

    ('Liam Carter', '+15550000006', 'college', 'job_seeker', 'web_dev', 'get_job_fast', '100_300', 'React + Node Production Apps'),
    ('Nina Verma', '+15550000007', 'graduate', 'working', 'data_ai', 'upskill', '300_800', 'Python for Data + ML Basics'),
    ('Ethan Walker', '+15550000008', 'college', 'working', 'mobile', 'switch_career', '300_800', 'Mobile App Development (React Native)'),
    ('Sara Ahmed', '+15550000009', 'high_school', 'student', 'web_dev', 'freelance', '0_100', null),
    ('Aarav Singh', '+15550000010', 'college', 'job_seeker', 'cloud_devops', 'get_job_fast', '100_300', 'Cloud Fundamentals (AWS + Linux)'),

    ('Noah Brooks', '+15550000011', 'graduate', 'working', 'cybersecurity', 'upskill', '300_800', 'Practical Security Labs'),
    ('Fatima Ali', '+15550000012', 'college', 'job_seeker', 'ui_ux', 'switch_career', '100_300', 'UI/UX Design Foundations'),
    ('David Kim', '+15550000013', 'college', 'student', 'data_ai', 'get_job_fast', '100_300', null),
    ('Priya Nair', '+15550000014', 'graduate', 'working', 'cloud_devops', 'switch_career', '300_800', null),
    ('Marcus Lee', '+15550000015', 'college', 'job_seeker', 'mobile', 'get_job_fast', '100_300', null),

    ('Ananya Shah', '+15550000016', 'college', 'student', 'web_dev', 'upskill', '100_300', 'Portfolio + Interview Sprint'),
    ('Ryan Adams', '+15550000017', 'high_school', 'job_seeker', 'cybersecurity', 'get_job_fast', '0_100', 'Networking + Security Basics'),
    ('Elena Cruz', '+15550000018', 'graduate', 'working', 'data_ai', 'freelance', '300_800', 'AI Project Sprint'),
    ('Zara Malik', '+15550000019', 'college', 'job_seeker', 'ui_ux', 'get_job_fast', '100_300', null),
    ('Owen Miller', '+15550000020', 'college', 'working', 'mobile', 'upskill', '300_800', 'Flutter Cross-Platform Apps')
)
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
from lead_seed
on conflict (phone)
do update
set
  name = excluded.name,
  education_level = excluded.education_level,
  current_status = excluded.current_status,
  interest_domain = excluded.interest_domain,
  career_goal = excluded.career_goal,
  budget_range = excluded.budget_range,
  specific_course = excluded.specific_course;
