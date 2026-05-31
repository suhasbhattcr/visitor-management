-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- seed_users.sql  â€”  Visitor Management System
--
-- User ID convention:
--   Residents : <flat-lowercase><2-digit-sequence>
--               e.g. flat A101, person 1 â†’ a10101
--                    flat A101, person 2 â†’ a10102
--   Security  : security1 â€¦ security5
--
-- Columns: id, role, first_name, last_name, email, phone, unit, gate, pin
-- Default PIN: 1234
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Add new columns if running against an existing schema (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(60) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  VARCHAR(60) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email      VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone      VARCHAR(20);
-- Remove old name column if it exists
ALTER TABLE users DROP COLUMN IF EXISTS name;
-- Make email unique (safe to run multiple times)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Wipe all existing users and reseed
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- â”€â”€ Security Officers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO users (id, role, first_name, last_name, email, phone, gate, unit, pin) VALUES
  ('security1','security','Ramesh',  'Kumar',  'ramesh.kumar@gatepass.local',    '9000000001','Main Gate',    NULL,'1234'),
  ('security2','security','Priya',   'Nair',   'priya.nair@gatepass.local',      '9000000002','Gate A',       NULL,'1234'),
  ('security3','security','Suresh',  'Rao',    'suresh.rao@gatepass.local',      '9000000003','Gate B',       NULL,'1234'),
  ('security4','security','Anita',   'Sharma', 'anita.sharma@gatepass.local',    '9000000004','Back Gate',    NULL,'1234'),
  ('security5','security','Vijay',   'Singh',  'vijay.singh@gatepass.local',     '9000000005','Service Gate', NULL,'1234');

-- â”€â”€ Residents â€” Block A â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO users (id, role, first_name, last_name, email, phone, unit, gate, pin) VALUES
  -- A101
  ('a10101','resident','Arjun',   'Sharma',    'arjun.sharma@gatepass.local',    '9100000101','A101',NULL,'1234'),
  ('a10102','resident','Priya',   'Sharma',    'priya.sharma@gatepass.local',    '9100000102','A101',NULL,'1234'),
  -- A102
  ('a10201','resident','Rohit',   'Patel',     'rohit.patel@gatepass.local',     '9100000201','A102',NULL,'1234'),
  ('a10202','resident','Sneha',   'Patel',     'sneha.patel@gatepass.local',     '9100000202','A102',NULL,'1234'),
  -- A103
  ('a10301','resident','Vikram',  'Nair',      'vikram.nair@gatepass.local',     '9100000301','A103',NULL,'1234'),
  ('a10302','resident','Deepa',   'Nair',      'deepa.nair@gatepass.local',      '9100000302','A103',NULL,'1234'),
  -- A104
  ('a10401','resident','Suresh',  'Gupta',     'suresh.gupta@gatepass.local',    '9100000401','A104',NULL,'1234'),
  ('a10402','resident','Meena',   'Gupta',     'meena.gupta@gatepass.local',     '9100000402','A104',NULL,'1234'),
  -- A105
  ('a10501','resident','Arun',    'Kumar',     'arun.kumar@gatepass.local',      '9100000501','A105',NULL,'1234'),
  ('a10502','resident','Lakshmi', 'Kumar',     'lakshmi.kumar@gatepass.local',   '9100000502','A105',NULL,'1234'),
  -- A106
  ('a10601','resident','Karthik', 'Reddy',     'karthik.reddy@gatepass.local',   '9100000601','A106',NULL,'1234'),
  ('a10602','resident','Anjali',  'Reddy',     'anjali.reddy@gatepass.local',    '9100000602','A106',NULL,'1234'),
  -- A107
  ('a10701','resident','Mohan',   'Das',       'mohan.das@gatepass.local',       '9100000701','A107',NULL,'1234'),
  ('a10702','resident','Kavitha', 'Das',       'kavitha.das@gatepass.local',     '9100000702','A107',NULL,'1234'),
  -- A108
  ('a10801','resident','Rajesh',  'Singh',     'rajesh.singh@gatepass.local',    '9100000801','A108',NULL,'1234'),
  ('a10802','resident','Pooja',   'Singh',     'pooja.singh@gatepass.local',     '9100000802','A108',NULL,'1234'),
  -- A109
  ('a10901','resident','Ganesh',  'Iyer',      'ganesh.iyer@gatepass.local',     '9100000901','A109',NULL,'1234'),
  ('a10902','resident','Radha',   'Iyer',      'radha.iyer@gatepass.local',      '9100000902','A109',NULL,'1234'),
  -- A110
  ('a11001','resident','Sanjay',  'Mehta',     'sanjay.mehta@gatepass.local',    '9100001001','A110',NULL,'1234'),
  ('a11002','resident','Sunita',  'Mehta',     'sunita.mehta@gatepass.local',    '9100001002','A110',NULL,'1234');

-- â”€â”€ Residents â€” Block B â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO users (id, role, first_name, last_name, email, phone, unit, gate, pin) VALUES
  -- B201
  ('b20101','resident','Amit',    'Joshi',     'amit.joshi@gatepass.local',      '9200000101','B201',NULL,'1234'),
  ('b20102','resident','Rina',    'Joshi',     'rina.joshi@gatepass.local',      '9200000102','B201',NULL,'1234'),
  -- B202
  ('b20201','resident','Deepak',  'Verma',     'deepak.verma@gatepass.local',    '9200000201','B202',NULL,'1234'),
  ('b20202','resident','Nisha',   'Verma',     'nisha.verma@gatepass.local',     '9200000202','B202',NULL,'1234'),
  -- B203
  ('b20301','resident','Manoj',   'Pillai',    'manoj.pillai@gatepass.local',    '9200000301','B203',NULL,'1234'),
  ('b20302','resident','Usha',    'Pillai',    'usha.pillai@gatepass.local',     '9200000302','B203',NULL,'1234'),
  -- B204
  ('b20401','resident','Rahul',   'Bose',      'rahul.bose@gatepass.local',      '9200000401','B204',NULL,'1234'),
  ('b20402','resident','Ananya',  'Bose',      'ananya.bose@gatepass.local',     '9200000402','B204',NULL,'1234'),
  -- B205
  ('b20501','resident','Sunil',   'Tiwari',    'sunil.tiwari@gatepass.local',    '9200000501','B205',NULL,'1234'),
  ('b20502','resident','Swati',   'Tiwari',    'swati.tiwari@gatepass.local',    '9200000502','B205',NULL,'1234'),
  -- B206
  ('b20601','resident','Pradeep', 'Rao',       'pradeep.rao@gatepass.local',     '9200000601','B206',NULL,'1234'),
  ('b20602','resident','Geetha',  'Rao',       'geetha.rao@gatepass.local',      '9200000602','B206',NULL,'1234'),
  -- B207
  ('b20701','resident','Ashok',   'Kulkarni',  'ashok.kulkarni@gatepass.local',  '9200000701','B207',NULL,'1234'),
  ('b20702','resident','Shobha',  'Kulkarni',  'shobha.kulkarni@gatepass.local', '9200000702','B207',NULL,'1234'),
  -- B208
  ('b20801','resident','Naresh',  'Shah',      'naresh.shah@gatepass.local',     '9200000801','B208',NULL,'1234'),
  ('b20802','resident','Hetal',   'Shah',      'hetal.shah@gatepass.local',      '9200000802','B208',NULL,'1234'),
  -- B209
  ('b20901','resident','Vivek',   'Chaudhary', 'vivek.chaudhary@gatepass.local', '9200000901','B209',NULL,'1234'),
  ('b20902','resident','Ritu',    'Chaudhary', 'ritu.chaudhary@gatepass.local',  '9200000902','B209',NULL,'1234'),
  -- B210
  ('b21001','resident','Sachin',  'Pandey',    'sachin.pandey@gatepass.local',   '9200001001','B210',NULL,'1234'),
  ('b21002','resident','Suman',   'Pandey',    'suman.pandey@gatepass.local',    '9200001002','B210',NULL,'1234');

-- â”€â”€ Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
SELECT role, COUNT(*) AS total FROM users GROUP BY role ORDER BY role;
SELECT id, first_name, last_name, email, unit, gate FROM users ORDER BY role DESC, id LIMIT 10;

