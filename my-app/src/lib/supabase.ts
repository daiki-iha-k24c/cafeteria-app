import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kfhgwyqofgnmzpgmedrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmaGd3eXFvZmdubXpwZ21lZHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NjYzMTMsImV4cCI6MjA5NzA0MjMxM30.POYd9yV319Zn1m-DwGaBvGijgXdSokjooBa_2ii1KxE';

export const supabase = createClient(supabaseUrl, supabaseKey);