import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any superadmin exists
    const { data: existingAdmins, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role', 'superadmin')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing admins:', checkError);
      throw new Error('Gagal menyemak superadmin sedia ada');
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Superadmin sudah wujud. Function ini hanya boleh digunakan untuk setup awal.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get email and password from request
    const { email, password, fullName } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email dan password diperlukan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password mestilah sekurang-kurangnya 6 aksara' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating superadmin user:', email);

    // Create user with admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || 'Superadmin',
      },
    });

    if (authError) {
      console.error('Error creating user:', authError);
      throw new Error(`Gagal mencipta pengguna: ${authError.message}`);
    }

    const userId = authData.user.id;
    console.log('User created with ID:', userId);

    // Update profile (should be auto-created by trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName || 'Superadmin',
        must_change_password: false,
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Not critical, continue
    }

    // Assign superadmin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'superadmin',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw new Error('Gagal menetapkan role superadmin');
    }

    console.log('Superadmin created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Superadmin berjaya dicipta!',
        email: email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in setup-superadmin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
