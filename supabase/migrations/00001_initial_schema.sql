-- 1. ENUMS
CREATE TYPE side_type AS ENUM ('LEFT', 'RIGHT');
CREATE TYPE visit_status AS ENUM ('Donated', 'Promised', 'Come Later', 'Not at Home', 'Not Donating');
CREATE TYPE payment_method_type AS ENUM ('Cash', 'UPI');

-- 2. FESTIVALS (Year-specific activity anchor)
CREATE TABLE festivals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ, -- Soft delete protection
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STREETS (Persistent)
CREATE TABLE streets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    deleted_at TIMESTAMPTZ, -- Soft delete protection
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. HOUSES (Persistent Physical Location)
CREATE TABLE houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street_id UUID NOT NULL REFERENCES streets(id) ON DELETE RESTRICT,
    side side_type NOT NULL,
    sequence_number TEXT NOT NULL,
    sequence_order INT NOT NULL, -- For proper numeric sorting (e.g., L1, L2, L10)
    door_number TEXT,
    photo_path TEXT,
    deleted_at TIMESTAMPTZ, -- Soft delete protection
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (street_id, side, sequence_number)
);

-- 5. FAMILIES (Persistent Units within Houses)
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    floor_info TEXT,
    deleted_at TIMESTAMPTZ, -- Soft delete protection
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. VISITS (Festival-Specific History)
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE RESTRICT,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
    volunteer_id UUID NOT NULL REFERENCES auth.users(id),
    status visit_status NOT NULL,
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id, festival_id, family_id) -- Required for strict cross-festival/family integrity in payments
);

-- 7. COMMITMENTS (Festival-Specific Pledges)
CREATE TABLE commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE RESTRICT,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id, festival_id, family_id) -- Required for strict cross-festival/family integrity in payments
);

-- 8. PAYMENTS (Festival-Specific Financial Transactions)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE RESTRICT,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
    commitment_id UUID,
    visit_id UUID,
    volunteer_id UUID NOT NULL REFERENCES auth.users(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method payment_method_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Strict integrity constraints: payment must map to the SAME festival and family as its commitment/visit
    FOREIGN KEY (commitment_id, festival_id, family_id) REFERENCES commitments(id, festival_id, family_id) ON DELETE RESTRICT,
    FOREIGN KEY (visit_id, festival_id, family_id) REFERENCES visits(id, festival_id, family_id) ON DELETE RESTRICT
);

-- 9. AUDIT LOGS (Database Trigger Controlled)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Function for generic audit triggers
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
        VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
        VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to critical operational tables
CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_commitments
    AFTER INSERT OR UPDATE OR DELETE ON commitments
    FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_visits
    AFTER INSERT OR UPDATE OR DELETE ON visits
    FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 10. INDEXES (Optimized for frequent queries)
CREATE INDEX idx_houses_street_side_order ON houses(street_id, side, sequence_order);
CREATE INDEX idx_families_house ON families(house_id);
CREATE INDEX idx_visits_festival_family ON visits(festival_id, family_id);
CREATE INDEX idx_commitments_festival_family ON commitments(festival_id, family_id);
CREATE INDEX idx_payments_festival_family ON payments(festival_id, family_id);

-- Enable RLS
ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE streets ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Operational Data RLS (Volunteers)
CREATE POLICY "Volunteers operational access" ON streets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Volunteers operational access" ON houses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Volunteers operational access" ON families FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Volunteers operational access" ON visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Volunteers operational access" ON commitments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Volunteers operational access" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Volunteers operational access" ON festivals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Audit Log RLS (Strict Read-Only for Clients, Inserts handled by Security Definer Trigger)
CREATE POLICY "Volunteers can read audit logs" ON audit_logs FOR SELECT TO authenticated USING (true);

-- Storage Setup (Private Bucket)
INSERT INTO storage.buckets (id, name, public) VALUES ('house-photos', 'house-photos', false);

-- Complete Lifecycle Storage Policies for Volunteers
CREATE POLICY "Volunteers can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'house-photos');
CREATE POLICY "Volunteers can view photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'house-photos');
CREATE POLICY "Volunteers can update photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'house-photos');
CREATE POLICY "Volunteers can delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'house-photos');
