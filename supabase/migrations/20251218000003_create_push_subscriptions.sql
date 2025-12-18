-- Create push_subscriptions table for Web Push notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on push_subscriptions table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all subscriptions (for sending notifications)
CREATE POLICY "Admins can view all subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.uid()
      AND members.role IN ('admin', 'superadmin')
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
