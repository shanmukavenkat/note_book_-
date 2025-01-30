/*
  # Enhanced Links Platform Schema

  1. New Tables
    - `favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `link_id` (uuid, references links)
      - `created_at` (timestamptz)

  2. Changes to Existing Tables
    - `links` table:
      - Add `creator_email` column
      - Remove user_id foreign key constraint
      - Update RLS policies for public access

  3. Security
    - Enable RLS on `favorites` table
    - Add policies for authenticated users to manage their favorites
    - Update link policies for public access
*/

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  link_id uuid REFERENCES links NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, link_id)
);

-- Add creator_email to links
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'links' AND column_name = 'creator_email'
  ) THEN
    ALTER TABLE links ADD COLUMN creator_email text;
    ALTER TABLE links ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Enable RLS on favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Favorites policies
CREATE POLICY "Users can read their own favorites"
  ON favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update links policies for public access
CREATE POLICY "Anyone can read links"
  ON links
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add links"
  ON links
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete their own links"
  ON links
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);