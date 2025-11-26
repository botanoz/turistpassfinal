-- =====================================================
-- Advanced Admin Features
-- =====================================================
-- Description: Admin alerts, time filters, manual discounts, SLA tracking,
--              performance metrics, and automated reports
-- Date: 2025-01-25
-- =====================================================

-- ============================================
-- 1. ADMIN ALERTS/NOTIFICATIONS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert Type & Severity
  type TEXT CHECK (type IN (
    'order_issue',           -- Order problems
    'low_stock',             -- Low inventory/pass availability
    'support_urgent',        -- Urgent support tickets
    'payment_failed',        -- Payment failures
    'system_error',          -- System errors
    'performance_issue',     -- Performance degradation
    'sla_breach',            -- SLA violations
    'revenue_drop',          -- Significant revenue decrease
    'high_refund_rate',      -- Unusual refund rate
    'security_alert',        -- Security concerns
    'custom'                 -- Custom alerts
  )) NOT NULL,

  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',

  -- Alert Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,

  -- Related Entity
  related_entity_type TEXT, -- e.g., 'order', 'customer', 'ticket'
  related_entity_id UUID,

  -- Status
  status TEXT CHECK (status IN ('unread', 'read', 'acknowledged', 'resolved', 'dismissed')) DEFAULT 'unread',

  -- Assignment
  assigned_to UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Resolution
  resolved_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Auto-generated or Manual
  is_auto_generated BOOLEAN DEFAULT true,
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_alerts_type ON admin_alerts(type);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON admin_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON admin_alerts(status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_assigned ON admin_alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON admin_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unread ON admin_alerts(status) WHERE status = 'unread';

-- RLS
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all alerts
CREATE POLICY "Admins can view alerts"
  ON admin_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can create alerts
CREATE POLICY "Admins can create alerts"
  ON admin_alerts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can update alerts
CREATE POLICY "Admins can update alerts"
  ON admin_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE TRIGGER admin_alerts_updated_at
  BEFORE UPDATE ON admin_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 2. MANUAL DISCOUNT APPLICATION SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS manual_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Discount Details
  code TEXT UNIQUE NOT NULL, -- Auto-generated or manual
  name TEXT NOT NULL,
  description TEXT,

  -- Discount Type
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')) NOT NULL,
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),

  -- Application Rules
  applies_to TEXT CHECK (applies_to IN ('order', 'pass', 'customer')) NOT NULL,
  target_id UUID, -- Specific order/pass/customer ID (NULL = can be used anywhere)

  -- Usage Limits
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  single_use BOOLEAN DEFAULT true,

  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Status
  status TEXT CHECK (status IN ('active', 'used', 'expired', 'cancelled')) DEFAULT 'active',

  -- Reason & Notes
  reason TEXT, -- Why this discount was given
  admin_notes TEXT,

  -- Created By
  created_by UUID NOT NULL REFERENCES admin_profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_manual_discounts_code ON manual_discounts(code);
CREATE INDEX IF NOT EXISTS idx_manual_discounts_status ON manual_discounts(status);
CREATE INDEX IF NOT EXISTS idx_manual_discounts_target ON manual_discounts(target_id);
CREATE INDEX IF NOT EXISTS idx_manual_discounts_created_by ON manual_discounts(created_by);
CREATE INDEX IF NOT EXISTS idx_manual_discounts_valid ON manual_discounts(valid_from, valid_until);

-- RLS
ALTER TABLE manual_discounts ENABLE ROW LEVEL SECURITY;

-- Admins can manage discounts
CREATE POLICY "Admins can manage manual discounts"
  ON manual_discounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Customers can view their own discounts
CREATE POLICY "Customers can view own discounts"
  ON manual_discounts FOR SELECT
  USING (
    status = 'active' AND
    (target_id IS NULL OR target_id = auth.uid())
  );

-- Auto-update timestamp
CREATE TRIGGER manual_discounts_updated_at
  BEFORE UPDATE ON manual_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 3. SUPPORT SLA TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS support_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SLA Configuration
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) NOT NULL UNIQUE,

  -- Response Time (in minutes)
  first_response_time INTEGER NOT NULL, -- Minutes to first response
  resolution_time INTEGER NOT NULL,     -- Minutes to resolution

  -- Business Hours
  business_hours_only BOOLEAN DEFAULT true,

  -- Escalation
  escalation_enabled BOOLEAN DEFAULT true,
  escalation_time INTEGER, -- Minutes before escalation

  -- Status
  active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SLA config
INSERT INTO support_sla_config (priority, first_response_time, resolution_time, escalation_time) VALUES
  ('low', 1440, 4320, 2880),      -- 24h response, 72h resolution, 48h escalation
  ('normal', 480, 1440, 720),     -- 8h response, 24h resolution, 12h escalation
  ('high', 120, 480, 240),        -- 2h response, 8h resolution, 4h escalation
  ('urgent', 30, 120, 60)         -- 30min response, 2h resolution, 1h escalation
ON CONFLICT (priority) DO NOTHING;

-- Add SLA fields to support_tickets
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS sla_first_response_due TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_resolution_due TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_first_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_first_response_breached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sla_resolution_breached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_to UUID REFERENCES admin_profiles(id) ON DELETE SET NULL;

-- Function to calculate SLA deadlines
CREATE OR REPLACE FUNCTION calculate_sla_deadlines(
  ticket_created TIMESTAMPTZ,
  ticket_priority TEXT
)
RETURNS TABLE (
  first_response_due TIMESTAMPTZ,
  resolution_due TIMESTAMPTZ
) AS $$
DECLARE
  config RECORD;
BEGIN
  SELECT * INTO config
  FROM support_sla_config
  WHERE priority = ticket_priority
  LIMIT 1;

  IF config IS NULL THEN
    -- Default fallback
    RETURN QUERY SELECT
      ticket_created + INTERVAL '24 hours',
      ticket_created + INTERVAL '72 hours';
  ELSE
    RETURN QUERY SELECT
      ticket_created + (config.first_response_time || ' minutes')::INTERVAL,
      ticket_created + (config.resolution_time || ' minutes')::INTERVAL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set SLA deadlines on ticket creation
CREATE OR REPLACE FUNCTION set_sla_deadlines()
RETURNS TRIGGER AS $$
DECLARE
  deadlines RECORD;
BEGIN
  SELECT * INTO deadlines
  FROM calculate_sla_deadlines(NEW.created_at, NEW.priority);

  NEW.sla_first_response_due := deadlines.first_response_due;
  NEW.sla_resolution_due := deadlines.resolution_due;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_set_sla
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_sla_deadlines();

-- Function to check and update SLA breaches
CREATE OR REPLACE FUNCTION check_sla_breaches()
RETURNS void AS $$
BEGIN
  -- Check first response breaches
  UPDATE support_tickets
  SET sla_first_response_breached = true
  WHERE status IN ('open', 'in_progress')
    AND sla_first_response_at IS NULL
    AND sla_first_response_due < NOW()
    AND sla_first_response_breached = false;

  -- Check resolution breaches
  UPDATE support_tickets
  SET sla_resolution_breached = true
  WHERE status IN ('open', 'in_progress')
    AND sla_resolution_due < NOW()
    AND sla_resolution_breached = false;

  -- Create alerts for breaches
  INSERT INTO admin_alerts (type, severity, title, message, related_entity_type, related_entity_id, is_auto_generated)
  SELECT
    'sla_breach',
    CASE
      WHEN priority = 'urgent' THEN 'critical'
      WHEN priority = 'high' THEN 'high'
      ELSE 'medium'
    END,
    'SLA Breach: Ticket #' || ticket_number,
    'Support ticket has breached SLA deadline',
    'ticket',
    id,
    true
  FROM support_tickets
  WHERE (sla_first_response_breached = true OR sla_resolution_breached = true)
    AND NOT EXISTS (
      SELECT 1 FROM admin_alerts
      WHERE related_entity_id = support_tickets.id
        AND type = 'sla_breach'
        AND created_at > NOW() - INTERVAL '1 hour'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. PERFORMANCE METRICS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metric Type
  metric_type TEXT CHECK (metric_type IN (
    'page_load_time',
    'api_response_time',
    'database_query_time',
    'error_rate',
    'uptime',
    'concurrent_users',
    'conversion_rate',
    'bounce_rate',
    'customer_satisfaction',
    'support_resolution_time',
    'order_processing_time',
    'custom'
  )) NOT NULL,

  -- Metric Value
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT, -- e.g., 'ms', 'seconds', 'percentage', 'count'

  -- Context
  endpoint TEXT,
  user_agent TEXT,
  ip_address INET,

  -- Additional Data
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded ON performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);

-- Partitioning by month (for better performance with large data)
-- Note: This requires manual partition management or pg_partman extension

-- Function to get performance summary
CREATE OR REPLACE FUNCTION get_performance_summary(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  metric_type TEXT,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.metric_type,
    AVG(pm.metric_value) as avg_value,
    MIN(pm.metric_value) as min_value,
    MAX(pm.metric_value) as max_value,
    COUNT(*) as count
  FROM performance_metrics pm
  WHERE pm.recorded_at >= start_date
    AND pm.recorded_at <= end_date
  GROUP BY pm.metric_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect performance issues
CREATE OR REPLACE FUNCTION detect_performance_issues()
RETURNS void AS $$
DECLARE
  slow_queries INTEGER;
  high_error_rate NUMERIC;
BEGIN
  -- Check for slow queries (avg > 1000ms in last hour)
  SELECT COUNT(*) INTO slow_queries
  FROM performance_metrics
  WHERE metric_type = 'api_response_time'
    AND metric_value > 1000
    AND recorded_at > NOW() - INTERVAL '1 hour';

  IF slow_queries > 10 THEN
    INSERT INTO admin_alerts (type, severity, title, message, is_auto_generated)
    VALUES (
      'performance_issue',
      'high',
      'Slow API Response Times Detected',
      format('%s slow queries detected in the last hour', slow_queries),
      true
    );
  END IF;

  -- Check for high error rate (> 5% in last hour)
  SELECT AVG(metric_value) INTO high_error_rate
  FROM performance_metrics
  WHERE metric_type = 'error_rate'
    AND recorded_at > NOW() - INTERVAL '1 hour';

  IF high_error_rate > 5 THEN
    INSERT INTO admin_alerts (type, severity, title, message, is_auto_generated)
    VALUES (
      'performance_issue',
      'critical',
      'High Error Rate Detected',
      format('Error rate at %.2f%% in the last hour', high_error_rate),
      true
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. AUTOMATED REPORTS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS automated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report Configuration
  name TEXT NOT NULL,
  description TEXT,

  -- Report Type
  report_type TEXT CHECK (report_type IN (
    'daily_sales',
    'weekly_summary',
    'monthly_performance',
    'customer_analytics',
    'support_metrics',
    'revenue_breakdown',
    'pass_performance',
    'venue_analytics',
    'custom'
  )) NOT NULL,

  -- Schedule
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')) NOT NULL,
  schedule_time TIME DEFAULT '09:00:00', -- Time of day to generate
  schedule_day_of_week INTEGER, -- 0=Sunday, 6=Saturday (for weekly)
  schedule_day_of_month INTEGER, -- 1-31 (for monthly)

  -- Recipients
  recipient_emails TEXT[] DEFAULT '{}',
  recipient_admin_ids UUID[], -- Admin IDs to notify

  -- Report Content
  include_charts BOOLEAN DEFAULT true,
  include_tables BOOLEAN DEFAULT true,
  time_range TEXT CHECK (time_range IN ('last_day', 'last_week', 'last_month', 'last_quarter', 'custom')) DEFAULT 'last_week',

  -- Filters
  filters JSONB DEFAULT '{}'::jsonb,

  -- Status
  status TEXT CHECK (status IN ('active', 'paused', 'disabled')) DEFAULT 'active',
  last_generated_at TIMESTAMPTZ,
  next_generation_at TIMESTAMPTZ,

  -- Created By
  created_by UUID NOT NULL REFERENCES admin_profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated reports history
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automated_report_id UUID NOT NULL REFERENCES automated_reports(id) ON DELETE CASCADE,

  -- Report Data
  report_data JSONB NOT NULL,
  file_url TEXT, -- If report is stored as PDF/Excel

  -- Generation Info
  time_range_start TIMESTAMPTZ,
  time_range_end TIMESTAMPTZ,

  -- Delivery Status
  sent_to TEXT[],
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  error_message TEXT,

  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automated_reports_status ON automated_reports(status);
CREATE INDEX IF NOT EXISTS idx_automated_reports_next_gen ON automated_reports(next_generation_at);
CREATE INDEX IF NOT EXISTS idx_generated_reports_automated ON generated_reports(automated_report_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated ON generated_reports(generated_at DESC);

-- RLS
ALTER TABLE automated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Admins can manage reports
CREATE POLICY "Admins can manage automated reports"
  ON automated_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

CREATE POLICY "Admins can view generated reports"
  ON generated_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Function to generate daily sales report
CREATE OR REPLACE FUNCTION generate_daily_sales_report(
  report_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS JSONB AS $$
DECLARE
  report_data JSONB;
BEGIN
  SELECT json_build_object(
    'date', report_date,
    'summary', (
      SELECT json_build_object(
        'total_orders', COUNT(*),
        'total_revenue', COALESCE(SUM(total_amount), 0),
        'avg_order_value', COALESCE(AVG(total_amount), 0),
        'completed_orders', COUNT(*) FILTER (WHERE status = 'completed'),
        'cancelled_orders', COUNT(*) FILTER (WHERE status = 'cancelled')
      )
      FROM orders
      WHERE DATE(created_at) = report_date
    ),
    'top_passes', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          oi.pass_name,
          SUM(oi.quantity) as quantity_sold,
          SUM(oi.total_price) as revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE DATE(o.created_at) = report_date
          AND o.status = 'completed'
        GROUP BY oi.pass_name
        ORDER BY revenue DESC
        LIMIT 5
      ) t
    ),
    'hourly_breakdown', (
      SELECT json_agg(row_to_json(h))
      FROM (
        SELECT
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE DATE(created_at) = report_date
          AND status = 'completed'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      ) h
    )
  ) INTO report_data;

  RETURN report_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. HELPER FUNCTIONS FOR ADMIN FEATURES
-- ============================================

-- Get unread alert count
CREATE OR REPLACE FUNCTION get_unread_alerts_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM admin_alerts
    WHERE status = 'unread'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active manual discounts count
CREATE OR REPLACE FUNCTION get_active_manual_discounts_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM manual_discounts
    WHERE status = 'active'
      AND (valid_until IS NULL OR valid_until > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get SLA breach count
CREATE OR REPLACE FUNCTION get_sla_breach_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM support_tickets
    WHERE (sla_first_response_breached = true OR sla_resolution_breached = true)
      AND status IN ('open', 'in_progress')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced dashboard stats with new metrics
CREATE OR REPLACE FUNCTION get_enhanced_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'orders', (
      SELECT json_build_object(
        'total', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'completed_today', COUNT(*) FILTER (WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE)
      )
      FROM orders
    ),
    'alerts', (
      SELECT json_build_object(
        'total', COUNT(*),
        'unread', COUNT(*) FILTER (WHERE status = 'unread'),
        'critical', COUNT(*) FILTER (WHERE severity = 'critical' AND status IN ('unread', 'acknowledged'))
      )
      FROM admin_alerts
    ),
    'support', (
      SELECT json_build_object(
        'total_open', COUNT(*),
        'sla_breached', COUNT(*) FILTER (WHERE sla_first_response_breached = true OR sla_resolution_breached = true),
        'urgent', COUNT(*) FILTER (WHERE priority = 'urgent'),
        'avg_response_time_minutes', AVG(
          EXTRACT(EPOCH FROM (sla_first_response_at - created_at)) / 60
        ) FILTER (WHERE sla_first_response_at IS NOT NULL)
      )
      FROM support_tickets
      WHERE status IN ('open', 'in_progress')
    ),
    'discounts', (
      SELECT json_build_object(
        'active_manual', COUNT(*),
        'total_used_today', SUM(current_uses) FILTER (WHERE DATE(updated_at) = CURRENT_DATE)
      )
      FROM manual_discounts
      WHERE status = 'active'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE admin_alerts IS 'System and manual alerts for administrators';
COMMENT ON TABLE manual_discounts IS 'Admin-created one-time or targeted discounts';
COMMENT ON TABLE support_sla_config IS 'SLA configuration for support tickets by priority';
COMMENT ON TABLE performance_metrics IS 'System performance metrics and monitoring data';
COMMENT ON TABLE automated_reports IS 'Scheduled automated report configurations';
COMMENT ON TABLE generated_reports IS 'History of generated reports';

COMMENT ON FUNCTION check_sla_breaches IS 'Check and update SLA breach status for support tickets';
COMMENT ON FUNCTION detect_performance_issues IS 'Detect and alert on performance issues';
COMMENT ON FUNCTION generate_daily_sales_report IS 'Generate comprehensive daily sales report';
COMMENT ON FUNCTION get_enhanced_dashboard_stats IS 'Get enhanced dashboard statistics including alerts and SLA metrics';
