import { createClient } from '@supabase/supabase-js';

const NEW_SUPABASE_URL = 'https://nblgkcnsjziezqdiozxo.supabase.co';
const NEW_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibGdrY25zanppZXpxZGlvenhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NjgzNTgsImV4cCI6MjEwNTM0NDM1OH0.pqa4cMC1wSv-5yQltbTOkiGR33yjKBMwXugqWRxFzOQ';

// Ignora variáveis de ambiente da Vercel que apontem para projetos legados/desativados
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isLegacy = rawUrl && (
  rawUrl.includes('mowvgolilvzzqeyrzitw') || 
  rawUrl.includes('eornunjxcmtyrdrihiqk')
);

const supabaseUrl = (!rawUrl || isLegacy) ? NEW_SUPABASE_URL : rawUrl;
const supabaseAnonKey = (!rawKey || isLegacy) ? NEW_SUPABASE_KEY : rawKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
