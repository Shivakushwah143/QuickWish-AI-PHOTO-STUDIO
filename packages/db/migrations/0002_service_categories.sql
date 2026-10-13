CREATE TABLE service_categories(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text UNIQUE NOT NULL CHECK(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 80),
 description text NOT NULL CHECK(length(description) BETWEEN 10 AND 600),
 cover_image_url text NOT NULL,
 image_alt text NOT NULL CHECK(length(image_alt) BETWEEN 10 AND 240),
 display_order integer NOT NULL DEFAULT 0,
 published boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE styles ADD COLUMN category_id uuid REFERENCES service_categories(id);
CREATE INDEX service_categories_public_order ON service_categories(published,display_order,name);
CREATE INDEX styles_category_id ON styles(category_id);

INSERT INTO service_categories(slug,name,description,cover_image_url,image_alt,display_order,published) VALUES
 ('garba-festive','Garba & Festive','Festive outfit transformations for Garba, Dandiya and celebration-ready portraits.','/images/showcase/garba-transformation.png','Before, reference and after example for a Garba and festive outfit transformation.',10,true),
 ('birthday-collage','Birthday Collage','Paid personalized birthday collage designs created from submitted photos.','/images/showcase/birthday-collage.png','Before photos, collage reference and finished personalized birthday collage example.',20,true),
 ('traditional-wear','Traditional Wear','Traditional outfit transformations such as sherwani and occasion-ready portraits.','/images/showcase/traditional-transformation.png','Before, reference and after example for a traditional wear transformation.',30,true),
 ('smart-casual','Smart Casual','Premium shirt, trouser and smart casual transformations for polished portraits.','/images/showcase/smart-casual-transformation.png','Before, reference and after example for a smart casual transformation.',40,true)
ON CONFLICT(slug) DO NOTHING;

UPDATE styles SET category_id=(SELECT id FROM service_categories WHERE slug='traditional-wear')
 WHERE category_id IS NULL AND lower(category) LIKE '%traditional%';
UPDATE styles SET category_id=(SELECT id FROM service_categories WHERE slug='smart-casual')
 WHERE category_id IS NULL;
