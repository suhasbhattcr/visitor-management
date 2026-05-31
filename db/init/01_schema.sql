CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  delivery_person_name VARCHAR(120) NOT NULL,
  company VARCHAR(120) NOT NULL,
  phone_number VARCHAR(40) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  parcel_image TEXT,
  gate VARCHAR(50),
  visitor_category VARCHAR(40) NOT NULL DEFAULT 'DELIVERY',
  vehicle_number VARCHAR(40),
  exited_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT deliveries_approval_status_check CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT deliveries_delivery_status_check CHECK (delivery_status IN ('PENDING', 'EXITED'))
);

CREATE INDEX IF NOT EXISTS idx_deliveries_unit ON deliveries(unit);
CREATE INDEX IF NOT EXISTS idx_deliveries_approval_status ON deliveries(approval_status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at DESC);

-- Composite indexes for the most common multi-column query patterns
CREATE INDEX IF NOT EXISTS idx_deliveries_unit_created ON deliveries(unit, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_gate_created ON deliveries(gate, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_approval_created ON deliveries(approval_status, created_at DESC);

CREATE TABLE IF NOT EXISTS visitor_preregistrations (
  id SERIAL PRIMARY KEY,
  unit VARCHAR(20) NOT NULL,
  visitor_name VARCHAR(120) NOT NULL,
  company VARCHAR(120),
  purpose VARCHAR(200),
  expected_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preregistrations_unit ON visitor_preregistrations(unit);
CREATE INDEX IF NOT EXISTS idx_preregistrations_date ON visitor_preregistrations(expected_date);

CREATE TABLE IF NOT EXISTS unit_instructions (
  unit VARCHAR(20) PRIMARY KEY,
  instructions TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist (
  id SERIAL PRIMARY KEY,
  person_name VARCHAR(120) NOT NULL,
  phone_number VARCHAR(40),
  reason TEXT,
  added_by VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_name ON watchlist(LOWER(person_name));
CREATE INDEX IF NOT EXISTS idx_watchlist_phone ON watchlist(phone_number);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY,
  thread_key VARCHAR(120) NOT NULL,
  sender_role VARCHAR(20) NOT NULL,
  sender_unit VARCHAR(20),
  sender_name VARCHAR(60),
  recipient_role VARCHAR(20) NOT NULL,
  recipient_unit VARCHAR(20),
  text TEXT NOT NULL DEFAULT '',
  attachment JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_thread_created ON chat_messages(thread_key, created_at DESC);

-- ─── Users (residents + security officers) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           VARCHAR(40)  PRIMARY KEY,
  role         VARCHAR(20)  NOT NULL,              -- 'resident' | 'security'
  first_name   VARCHAR(60)  NOT NULL DEFAULT '',
  last_name    VARCHAR(60)  NOT NULL DEFAULT '',
  email        VARCHAR(120) UNIQUE,
  phone        VARCHAR(20),
  unit         VARCHAR(20),                        -- flat code for residents
  gate         VARCHAR(40),                        -- gate assignment for security
  pin          VARCHAR(80)  NOT NULL,              -- 4-digit PIN (plain for MVP)
  last_seen_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_unit  ON users(unit);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ── Security Officers ───────────────────────────────────────────────────────
INSERT INTO users (id, role, first_name, last_name, email, phone, gate, pin) VALUES
  ('security1','security','Ramesh',  'Kumar',    'ramesh.kumar@gatepass.local',    '9000000001','Main Gate',    '1234'),
  ('security2','security','Priya',   'Nair',     'priya.nair@gatepass.local',      '9000000002','Gate A',       '1234'),
  ('security3','security','Suresh',  'Rao',      'suresh.rao@gatepass.local',      '9000000003','Gate B',       '1234'),
  ('security4','security','Anita',   'Sharma',   'anita.sharma@gatepass.local',    '9000000004','Back Gate',    '1234'),
  ('security5','security','Vijay',   'Singh',    'vijay.singh@gatepass.local',     '9000000005','Service Gate', '1234')
ON CONFLICT (id) DO NOTHING;

-- ── Residents — Block A ─────────────────────────────────────────────────────
INSERT INTO users (id, role, first_name, last_name, email, phone, unit, pin) VALUES
  -- Flat A101
  ('a10101','resident','Arjun',   'Sharma',    'arjun.sharma@gatepass.local',    '9100000101','A101','1234'),
  ('a10102','resident','Priya',   'Sharma',    'priya.sharma@gatepass.local',    '9100000102','A101','1234'),
  -- Flat A102
  ('a10201','resident','Rohit',   'Patel',     'rohit.patel@gatepass.local',     '9100000201','A102','1234'),
  ('a10202','resident','Sneha',   'Patel',     'sneha.patel@gatepass.local',     '9100000202','A102','1234'),
  -- Flat A103
  ('a10301','resident','Vikram',  'Nair',      'vikram.nair@gatepass.local',     '9100000301','A103','1234'),
  ('a10302','resident','Deepa',   'Nair',      'deepa.nair@gatepass.local',      '9100000302','A103','1234'),
  -- Flat A104
  ('a10401','resident','Suresh',  'Gupta',     'suresh.gupta@gatepass.local',    '9100000401','A104','1234'),
  ('a10402','resident','Meena',   'Gupta',     'meena.gupta@gatepass.local',     '9100000402','A104','1234'),
  -- Flat A105
  ('a10501','resident','Arun',    'Kumar',     'arun.kumar@gatepass.local',      '9100000501','A105','1234'),
  ('a10502','resident','Lakshmi', 'Kumar',     'lakshmi.kumar@gatepass.local',   '9100000502','A105','1234'),
  -- Flat A106
  ('a10601','resident','Karthik', 'Reddy',     'karthik.reddy@gatepass.local',   '9100000601','A106','1234'),
  ('a10602','resident','Anjali',  'Reddy',     'anjali.reddy@gatepass.local',    '9100000602','A106','1234'),
  -- Flat A107
  ('a10701','resident','Mohan',   'Das',       'mohan.das@gatepass.local',       '9100000701','A107','1234'),
  ('a10702','resident','Kavitha', 'Das',       'kavitha.das@gatepass.local',     '9100000702','A107','1234'),
  -- Flat A108
  ('a10801','resident','Rajesh',  'Singh',     'rajesh.singh@gatepass.local',    '9100000801','A108','1234'),
  ('a10802','resident','Pooja',   'Singh',     'pooja.singh@gatepass.local',     '9100000802','A108','1234'),
  -- Flat A109
  ('a10901','resident','Ganesh',  'Iyer',      'ganesh.iyer@gatepass.local',     '9100000901','A109','1234'),
  ('a10902','resident','Radha',   'Iyer',      'radha.iyer@gatepass.local',      '9100000902','A109','1234'),
  -- Flat A110
  ('a11001','resident','Sanjay',  'Mehta',     'sanjay.mehta@gatepass.local',    '9100001001','A110','1234'),
  ('a11002','resident','Sunita',  'Mehta',     'sunita.mehta@gatepass.local',    '9100001002','A110','1234')
ON CONFLICT (id) DO NOTHING;

-- ── Residents — Block B ─────────────────────────────────────────────────────
INSERT INTO users (id, role, first_name, last_name, email, phone, unit, pin) VALUES
  -- Flat B201
  ('b20101','resident','Amit',    'Joshi',     'amit.joshi@gatepass.local',      '9200000101','B201','1234'),
  ('b20102','resident','Rina',    'Joshi',     'rina.joshi@gatepass.local',      '9200000102','B201','1234'),
  -- Flat B202
  ('b20201','resident','Deepak',  'Verma',     'deepak.verma@gatepass.local',    '9200000201','B202','1234'),
  ('b20202','resident','Nisha',   'Verma',     'nisha.verma@gatepass.local',     '9200000202','B202','1234'),
  -- Flat B203
  ('b20301','resident','Manoj',   'Pillai',    'manoj.pillai@gatepass.local',    '9200000301','B203','1234'),
  ('b20302','resident','Usha',    'Pillai',    'usha.pillai@gatepass.local',     '9200000302','B203','1234'),
  -- Flat B204
  ('b20401','resident','Rahul',   'Bose',      'rahul.bose@gatepass.local',      '9200000401','B204','1234'),
  ('b20402','resident','Ananya',  'Bose',      'ananya.bose@gatepass.local',     '9200000402','B204','1234'),
  -- Flat B205
  ('b20501','resident','Sunil',   'Tiwari',    'sunil.tiwari@gatepass.local',    '9200000501','B205','1234'),
  ('b20502','resident','Swati',   'Tiwari',    'swati.tiwari@gatepass.local',    '9200000502','B205','1234'),
  -- Flat B206
  ('b20601','resident','Pradeep', 'Rao',       'pradeep.rao@gatepass.local',     '9200000601','B206','1234'),
  ('b20602','resident','Geetha',  'Rao',       'geetha.rao@gatepass.local',      '9200000602','B206','1234'),
  -- Flat B207
  ('b20701','resident','Ashok',   'Kulkarni',  'ashok.kulkarni@gatepass.local',  '9200000701','B207','1234'),
  ('b20702','resident','Shobha',  'Kulkarni',  'shobha.kulkarni@gatepass.local', '9200000702','B207','1234'),
  -- Flat B208
  ('b20801','resident','Naresh',  'Shah',      'naresh.shah@gatepass.local',     '9200000801','B208','1234'),
  ('b20802','resident','Hetal',   'Shah',      'hetal.shah@gatepass.local',      '9200000802','B208','1234'),
  -- Flat B209
  ('b20901','resident','Vivek',   'Chaudhary', 'vivek.chaudhary@gatepass.local', '9200000901','B209','1234'),
  ('b20902','resident','Ritu',    'Chaudhary', 'ritu.chaudhary@gatepass.local',  '9200000902','B209','1234'),
  -- Flat B210
  ('b21001','resident','Sachin',  'Pandey',    'sachin.pandey@gatepass.local',   '9200001001','B210','1234'),
  ('b21002','resident','Suman',   'Pandey',    'suman.pandey@gatepass.local',    '9200001002','B210','1234')
ON CONFLICT (id) DO NOTHING;

