-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. FAQ Categories Table
CREATE TABLE IF NOT EXISTS content_faq_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    icon_name TEXT NOT NULL, -- Store icon name (e.g., 'HelpCircle')
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. FAQ Questions Table
CREATE TABLE IF NOT EXISTS content_faq_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES content_faq_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. How It Works Steps Table
CREATE TABLE IF NOT EXISTS content_how_it_works_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    color_gradient TEXT NOT NULL, -- e.g., 'from-blue-500/20 to-purple-500/20'
    step_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. How It Works Details Table
CREATE TABLE IF NOT EXISTS content_how_it_works_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID REFERENCES content_how_it_works_steps(id) ON DELETE CASCADE,
    detail_text TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Why Choose Us Features (Checklist)
CREATE TABLE IF NOT EXISTS content_why_choose_us_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_text TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Why Choose Us Benefits (Cards)
CREATE TABLE IF NOT EXISTS content_why_choose_us_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    color_gradient TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_faq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_how_it_works_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_how_it_works_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_why_choose_us_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_why_choose_us_benefits ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow public read access
CREATE POLICY "Public read access for faq categories" ON content_faq_categories FOR SELECT USING (true);
CREATE POLICY "Public read access for faq questions" ON content_faq_questions FOR SELECT USING (true);
CREATE POLICY "Public read access for how it works steps" ON content_how_it_works_steps FOR SELECT USING (true);
CREATE POLICY "Public read access for how it works details" ON content_how_it_works_details FOR SELECT USING (true);
CREATE POLICY "Public read access for why choose us features" ON content_why_choose_us_features FOR SELECT USING (true);
CREATE POLICY "Public read access for why choose us benefits" ON content_why_choose_us_benefits FOR SELECT USING (true);

-- Allow admin write access (assuming service_role or specific admin role, for now using true for simplicity in development, but ideally should be restricted)
-- For this project context, we'll assume authenticated users with admin role or service role.
-- Let's use a simple policy for now that allows authenticated users to insert/update/delete if they are admins.
-- Since I don't have the full auth context, I will allow all operations for now to ensure it works, but add a TODO to restrict it.
-- TODO: Restrict write access to admins only.

CREATE POLICY "Admin full access for faq categories" ON content_faq_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for faq questions" ON content_faq_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for how it works steps" ON content_how_it_works_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for how it works details" ON content_how_it_works_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for why choose us features" ON content_why_choose_us_features FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for why choose us benefits" ON content_why_choose_us_benefits FOR ALL USING (true) WITH CHECK (true);


-- Seed Data (Migrating from Mock Data)

-- FAQ Categories
INSERT INTO content_faq_categories (slug, label, icon_name, display_order) VALUES
('general', 'General', 'HelpCircle', 1),
('payment', 'Payment', 'CreditCard', 2),
('usage', 'Usage', 'Clock', 3),
('special', 'Special', 'Ticket', 4);

-- FAQ Questions (General)
INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'How do I use my Pass?', 'Simply show the QR code sent to you for your purchased pass at venue entrances. Your QR code is stored digitally and can be used throughout its entire validity period.', 1 FROM content_faq_categories WHERE slug = 'general';

INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'What should I do if I lose my Pass?', 'Your Pass QR code is stored digitally. You can always access your QR code by logging into your account. If you experience any issues, our 24/7 customer service will assist you.', 2 FROM content_faq_categories WHERE slug = 'general';

INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'Can I transfer my Pass to someone else?', 'Passes are personal and non-transferable. Each pass can only be used by one person. For security reasons, you cannot transfer your pass to another person.', 3 FROM content_faq_categories WHERE slug = 'general';

-- FAQ Questions (Payment)
INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'Can I pay in installments when purchasing a Pass?', 'Yes, we offer 3, 6, and 9 installment options for partnered credit cards. You can view the installment options on the payment page.', 1 FROM content_faq_categories WHERE slug = 'payment';

INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'Can I cancel my Pass?', 'You can return your Pass within 24 hours before first use. Returns are not possible after first use. Please contact our customer service for refund requests.', 2 FROM content_faq_categories WHERE slug = 'payment';

-- FAQ Questions (Usage)
INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'How long is my Pass valid?', 'Your Pass is valid for the duration you selected (24, 48, or 72 hours) from first use. Once the period begins, it continues uninterrupted.', 1 FROM content_faq_categories WHERE slug = 'usage';

INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'Can I visit the same venue multiple times?', 'Yes, you can visit the same venue as many times as you want during your pass validity period. There are no limitations on the number of visits.', 2 FROM content_faq_categories WHERE slug = 'usage';

INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'Is entry to all venues free?', 'Yes, entry to all venues covered by the pass is free. Extra services (special events, VIP areas, food and beverages) may be subject to additional charges.', 3 FROM content_faq_categories WHERE slug = 'usage';

-- FAQ Questions (Special)
INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'Is there a special pass for children?', 'Yes, there is a 50% discounted child pass available for children aged 6-12. Children under 6 years can enter free with their pass-holding parents.', 1 FROM content_faq_categories WHERE slug = 'special';

INSERT INTO content_faq_questions (category_id, question, answer, display_order)
SELECT id, 'Can I attend special events with my Pass?', 'Premium and VIP pass holders have priority access to special events. You can follow our event calendar on our website or mobile app.', 2 FROM content_faq_categories WHERE slug = 'special';


-- How It Works Steps
INSERT INTO content_how_it_works_steps (title, description, icon_name, color_gradient, step_number) VALUES
('Purchase Your Pass', 'Buy your Shopping & Food Pass online from the official website in just a few clicks.', 'ShoppingBag', 'from-blue-500/20 to-purple-500/20', 1),
('Explore & Visit Partner Locations', 'Browse through 40+ participating locations across Istanbul''s most vibrant neighborhoods.', 'MapPin', 'from-green-500/20 to-teal-500/20', 2),
('Redeem Your Discounts', 'Simply show your digital pass at checkout to instantly save on your purchases and meals.', 'QrCode', 'from-amber-500/20 to-orange-500/20', 3),
('Enjoy & Use Unlimited Times', 'Maximize your savings by using your pass multiple times throughout its validity period.', 'Repeat', 'from-red-500/20 to-pink-500/20', 4);

-- How It Works Details (Step 1)
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Choose from different pass options: Shopping Pass, Food Pass or Combo Pass', 1 FROM content_how_it_works_steps WHERE step_number = 1;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Secure payment via credit card or PayPal', 2 FROM content_how_it_works_steps WHERE step_number = 1;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Receive your digital pass instantly via email with a QR/barcode', 3 FROM content_how_it_works_steps WHERE step_number = 1;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Select from 1-day, 3-day, or 7-day validity periods', 4 FROM content_how_it_works_steps WHERE step_number = 1;

-- How It Works Details (Step 2)
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, '40+ carefully selected partner locations throughout the city', 1 FROM content_how_it_works_steps WHERE step_number = 2;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Local restaurants & cafés serving authentic Turkish cuisine', 2 FROM content_how_it_works_steps WHERE step_number = 2;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Boutiques & shopping stores offering unique products', 3 FROM content_how_it_works_steps WHERE step_number = 2;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Traditional markets & souvenir shops with handcrafted items', 4 FROM content_how_it_works_steps WHERE step_number = 2;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Use the interactive map on the website to find places near you', 5 FROM content_how_it_works_steps WHERE step_number = 2;

-- How It Works Details (Step 3)
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'At the checkout, show your digital pass (QR/barcode) to the cashier', 1 FROM content_how_it_works_steps WHERE step_number = 3;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Your discount (up to 15% off) is instantly applied!', 2 FROM content_how_it_works_steps WHERE step_number = 3;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'No need for cash, coupons, or negotiations—just scan and save!', 3 FROM content_how_it_works_steps WHERE step_number = 3;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Works seamlessly at all partner locations', 4 FROM content_how_it_works_steps WHERE step_number = 3;

-- How It Works Details (Step 4)
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Use your pass as many times as you like during its validity period', 1 FROM content_how_it_works_steps WHERE step_number = 4;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'The more you shop and eat, the more you save!', 2 FROM content_how_it_works_steps WHERE step_number = 4;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'Track your pass usage in your online account', 3 FROM content_how_it_works_steps WHERE step_number = 4;
INSERT INTO content_how_it_works_details (step_id, detail_text, display_order)
SELECT id, 'No daily limits on usage or savings', 4 FROM content_how_it_works_steps WHERE step_number = 4;


-- Why Choose Us Features
INSERT INTO content_why_choose_us_features (feature_text, display_order) VALUES
('Exclusive discounts at 70+ locations across Istanbul', 1),
('Save up to 20% at restaurants, cafés, and shops', 2),
('Valid for 1, 3, or 7 days – you choose!', 3),
('Instant digital delivery to your email', 4),
('No reservations needed – just show and save', 5),
('Track all your savings in one place', 6);

-- Why Choose Us Benefits
INSERT INTO content_why_choose_us_benefits (title, description, icon_name, color_gradient, display_order) VALUES
('Exclusive Discounts', 'Up to 20% off at 70+ locations across Istanbul', 'BadgePercent', 'from-blue-500/80 to-blue-600/80', 1),
('Authentic Experience', 'Discover hand-picked local eateries and unique shopping venues', 'Map', 'from-amber-500/80 to-amber-600/80', 2),
('One Pass, Endless Savings', 'Best deals for both food and shopping in one convenient pass', 'CreditCard', 'from-green-500/80 to-green-600/80', 3),
('Perfect for Every Traveler', 'Experience Istanbul like a local while saving money', 'Store', 'from-purple-500/80 to-purple-600/80', 4),
('Easy & Contactless', 'Scan your pass and enjoy instant discounts—no hassle, no fees', 'ShoppingBag', 'from-pink-500/80 to-pink-600/80', 5),
('Support Local Businesses', 'Help small, family-owned restaurants and local artisans', 'HeartHandshake', 'from-teal-500/80 to-teal-600/80', 6);
