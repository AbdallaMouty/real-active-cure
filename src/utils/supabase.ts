import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

export const supabaseAdmin = createClient(
  "https://vxfchvbzkhfwslqrdlsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZmNodmJ6a2hmd3NscXJkbHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDczNDIzMiwiZXhwIjoyMDcwMzEwMjMyfQ.hCeBIOmkMbBpNZsCOasnhk6TfW-Rr1NT-TRbrJXyHgs"
);
