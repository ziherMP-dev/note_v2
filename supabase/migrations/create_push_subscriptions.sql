-- Create push_subscriptions table
CREATE TABLE push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own push subscriptions"
    ON push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id);

-- Create index
CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id); 