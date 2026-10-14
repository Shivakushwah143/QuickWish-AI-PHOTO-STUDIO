CREATE TABLE enquiries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reference text UNIQUE NOT NULL,
 style_id uuid NOT NULL REFERENCES styles(id),
 package_code text NOT NULL REFERENCES packages(code),
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 80),
 phone text NOT NULL,
 email text,
 note text NOT NULL DEFAULT '',
 consent_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 create_key uuid UNIQUE NOT NULL,
 create_hash text NOT NULL
);
CREATE INDEX enquiries_created_at ON enquiries(created_at DESC);
CREATE INDEX enquiries_style ON enquiries(style_id);
