import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Demo configuration
const DEMO_SCHOOL_NAME = 'SK DEMO MALAYSIA'
const DEMO_PASSWORD = 'demo123'

// Demo users configuration
const demoUsers = [
  { email: 'ketua@demo.com', fullName: 'AHMAD BIN IBRAHIM', role: 'ketua_penasihat', category: null, unitName: null },
  // Sukan Dan Permainan (2 guru)
  { email: 'guru1@demo.com', fullName: 'SITI AMINAH BINTI HASSAN', role: 'guru', category: 'sukan_permainan', unitName: 'BOLA SEPAK' },
  { email: 'guru2@demo.com', fullName: 'MOHD RAZAK BIN ALI', role: 'guru', category: 'sukan_permainan', unitName: 'BOLA JARING' },
  // Unit Uniform (2 guru)
  { email: 'guru3@demo.com', fullName: 'NURUL HUDA BINTI OMAR', role: 'guru', category: 'unit_uniform', unitName: 'PENGAKAP' },
  { email: 'guru4@demo.com', fullName: 'AZMAN BIN YUSOF', role: 'guru', category: 'unit_uniform', unitName: 'KADET REMAJA SEKOLAH' },
  // Persatuan Dan Kelab (2 guru)
  { email: 'guru5@demo.com', fullName: 'FARAH DIANA BINTI AHMAD', role: 'guru', category: 'persatuan_kelab', unitName: 'KELAB SAINS' },
  { email: 'guru6@demo.com', fullName: 'HAFIZ BIN RAHMAN', role: 'guru', category: 'persatuan_kelab', unitName: 'PERSATUAN BAHASA MELAYU' },
]

// Student names for demo
const studentNames = [
  'ADAM DANISH', 'AISYAH NABILAH', 'AHMAD FARHAN', 'AINUL MARDHIAH', 'AMIR HAMZAH',
  'AMIRA SOFEA', 'ARIF DANIAL', 'BALQIS HUMAIRA', 'DANISH IRFAN', 'DINA SYAFIQAH',
  'FAIZ ADHAM', 'FATIMAH ZAHRA', 'HAFIZ IKHWAN', 'HANNAH SOFIA', 'HARITH ADAM',
  'HUSNA AQILAH', 'IMAN HAKIMI', 'IRDINA BATRISYIA', 'IZYAN NAZURAH', 'KHAIRUL ANWAR',
  'LINA MARIAM', 'MIKHAIL HAZIQ', 'NABILA AISYAH', 'NAIM HAKIM', 'NAUFAL AMSYAR',
  'NUR ADRIANA', 'NUR ALYA', 'NUR AQILAH', 'NUR FATEHA', 'PUTERI BALQIS'
]

const classNames = ['1 ZUHAL', '1 MARIKH', '2 ZUHAL', '2 MARIKH', '3 ZUHAL', '3 MARIKH', '4 ZUHAL', '4 MARIKH', '5 ZUHAL', '5 MARIKH']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    console.log('Starting demo setup/reset...')

    // Step 1: Delete existing demo data
    console.log('Cleaning up existing demo data...')

    const demoEmails = demoUsers.map((u) => u.email)

    // Delete demo rows (safe even if none exist)
    await supabaseAdmin.from('attendance').delete().eq('is_demo', true)
    await supabaseAdmin.from('meetings').delete().eq('is_demo', true)
    await supabaseAdmin.from('students').delete().eq('is_demo', true)
    await supabaseAdmin.from('academic_sessions').delete().eq('is_demo', true)

    // Find existing demo profiles by email (even if is_demo was not set)
    const { data: existingProfiles, error: existingProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id,email')
      .in('email', demoEmails)

    if (existingProfilesError) {
      console.error('Error fetching existing demo profiles:', existingProfilesError)
    }

    const userIdsFromProfiles = (existingProfiles ?? [])
      .map((p) => p.user_id)
      .filter(Boolean) as string[]

    // Also attempt to find auth users by email (in case profile is missing)
    const { data: authUsersPage, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    })

    if (listUsersError) {
      console.error('Error listing users:', listUsersError)
    }

    const userIdsFromAuth = (authUsersPage?.users ?? [])
      .filter((u) => (u.email ? demoEmails.includes(u.email) : false))
      .map((u) => u.id)

    const demoUserIds = Array.from(new Set([...userIdsFromProfiles, ...userIdsFromAuth]))

    if (demoUserIds.length > 0) {
      await supabaseAdmin.from('user_roles').delete().in('user_id', demoUserIds)
      await supabaseAdmin.from('teacher_settings').delete().in('user_id', demoUserIds)
      await supabaseAdmin.from('profiles').delete().in('email', demoEmails)

      for (const userId of demoUserIds) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
    } else {
      // Still ensure no stale demo profiles remain
      await supabaseAdmin.from('profiles').delete().in('email', demoEmails)
    }

    // Delete demo school(s) last to satisfy FKs
    await supabaseAdmin.from('schools').delete().eq('is_demo', true)
    await supabaseAdmin.from('schools').delete().eq('name', DEMO_SCHOOL_NAME)

    console.log('Cleanup complete. Creating fresh demo data...')

    // Step 2: Create demo school
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({ name: DEMO_SCHOOL_NAME, is_demo: true })
      .select()
      .single()

    if (schoolError) throw schoolError
    console.log('Demo school created:', school.id)

    // Step 3: Create demo users
    const createdUsers: { userId: string; email: string; role: string; category: string | null; unitName: string | null }[] = []

    for (const user of demoUsers) {
      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: user.fullName }
      })

      if (authError) {
        console.error('Error creating user:', user.email, authError)
        continue
      }

      console.log('Created auth user:', user.email)

      // Upsert profile (a DB trigger may already create one on user creation)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            user_id: authUser.user.id,
            email: user.email,
            full_name: user.fullName,
            school_id: school.id,
            is_demo: true,
            must_change_password: false,
            kokurikulum_category: user.category,
            unit_name: user.unitName,
            is_active: true,
          },
          { onConflict: 'user_id' }
        )

      if (profileError) {
        console.error('Error creating profile:', profileError)
        continue
      }

      // Create user role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role: user.role
        })

      if (roleError) {
        console.error('Error creating role:', roleError)
        continue
      }

      createdUsers.push({
        userId: authUser.user.id,
        email: user.email,
        role: user.role,
        category: user.category,
        unitName: user.unitName
      })
    }

    // Step 4: Create teacher settings for ketua penasihat
    const ketuaUser = createdUsers.find(u => u.role === 'ketua_penasihat')
    if (ketuaUser) {
      await supabaseAdmin
        .from('teacher_settings')
        .insert({
          user_id: ketuaUser.userId,
          total_meetings: 12,
          class_structure: [
            { form: 1, classes: ['ZUHAL', 'MARIKH'] },
            { form: 2, classes: ['ZUHAL', 'MARIKH'] },
            { form: 3, classes: ['ZUHAL', 'MARIKH'] },
            { form: 4, classes: ['ZUHAL', 'MARIKH'] },
            { form: 5, classes: ['ZUHAL', 'MARIKH'] }
          ]
        })
      console.log('Created teacher settings for ketua')
    }

    // Step 5: Create academic session
    const currentYear = new Date().getFullYear()
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('academic_sessions')
      .insert({
        school_id: school.id,
        year: currentYear,
        is_active: true,
        is_demo: true
      })
      .select()
      .single()

    if (sessionError) throw sessionError
    console.log('Created academic session:', session.id)

    // Step 6: Create students and meetings for each guru
    const guruUsers = createdUsers.filter(u => u.role === 'guru')

    for (const guru of guruUsers) {
      // Create 30 students for this teacher
      const studentsToCreate = studentNames.map((name, index) => {
        const formLevel = (index % 5) + 1
        const classIndex = index % classNames.length
        return {
          full_name: name,
          class_name: classNames[classIndex],
          form_level: formLevel,
          session_id: session.id,
          teacher_id: guru.userId,
          is_demo: true,
          is_active: true
        }
      })

      const { data: students, error: studentsError } = await supabaseAdmin
        .from('students')
        .insert(studentsToCreate)
        .select()

      if (studentsError) {
        console.error('Error creating students:', studentsError)
        continue
      }
      console.log(`Created ${students.length} students for ${guru.email}`)

      // Create 12 meetings for this teacher
      const meetingsToCreate = Array.from({ length: 12 }, (_, i) => {
        const meetingDate = new Date()
        meetingDate.setDate(meetingDate.getDate() - (12 - i) * 14) // Every 2 weeks
        return {
          session_id: session.id,
          teacher_id: guru.userId,
          meeting_number: i + 1,
          meeting_date: meetingDate.toISOString().split('T')[0],
          is_completed: i < 6, // First 6 meetings completed
          is_demo: true
        }
      })

      const { data: meetings, error: meetingsError } = await supabaseAdmin
        .from('meetings')
        .insert(meetingsToCreate)
        .select()

      if (meetingsError) {
        console.error('Error creating meetings:', meetingsError)
        continue
      }
      console.log(`Created ${meetings.length} meetings for ${guru.email}`)

      // Create attendance for completed meetings
      const completedMeetings = meetings.filter(m => m.is_completed)
      for (const meeting of completedMeetings) {
        const attendanceToCreate = students.map(student => ({
          meeting_id: meeting.id,
          student_id: student.id,
          status: Math.random() > 0.15 ? 'hadir' : (Math.random() > 0.5 ? 'tidak_hadir' : 'lewat'),
          is_demo: true
        }))

        await supabaseAdmin.from('attendance').insert(attendanceToCreate)
      }
      console.log(`Created attendance records for ${guru.email}`)
    }

    console.log('Demo setup complete!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data created successfully',
        demoAccounts: [
          { email: 'ketua@demo.com', password: 'demo123', role: 'Ketua Penasihat' },
          { email: 'guru1@demo.com', password: 'demo123', role: 'Guru (Sukan & Permainan)' },
          { email: 'guru2@demo.com', password: 'demo123', role: 'Guru (Sukan & Permainan)' },
          { email: 'guru3@demo.com', password: 'demo123', role: 'Guru (Unit Uniform)' },
          { email: 'guru4@demo.com', password: 'demo123', role: 'Guru (Unit Uniform)' },
          { email: 'guru5@demo.com', password: 'demo123', role: 'Guru (Persatuan & Kelab)' },
          { email: 'guru6@demo.com', password: 'demo123', role: 'Guru (Persatuan & Kelab)' },
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in demo setup:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})