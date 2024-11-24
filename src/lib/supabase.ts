import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcqlkcoxvvtrrlcvbmol.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjcWxrY294dnZ0cnJsY3ZibW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NTMyOTcsImV4cCI6MjA0ODAyOTI5N30.qELNipRHdmYieqQz8wzImnxv6vlPw4k8Xd26Hpm8C70';

export const supabase = createClient(supabaseUrl, supabaseKey);