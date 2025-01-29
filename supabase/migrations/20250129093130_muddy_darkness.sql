/*
  # Create links table and security policies

  1. New Tables
    - `links`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `url` (text, not null)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `links` table
    - Add policies for:
      - Users can read their own links
      - Users can insert their own links
      - Users can delete their own links
*/

CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own links"
  ON links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own links"
  ON links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own links"
  ON links
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);