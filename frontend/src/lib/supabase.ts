import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://nblgkcnsjziezqdiozxo.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibGdrY25zanppZXpxZGlvenhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NjgzNTgsImV4cCI6MjEwNTM0NDM1OH0.pqa4cMC1wSv-5yQltbTOkiGR33yjKBMwXugqWRxFzOQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
