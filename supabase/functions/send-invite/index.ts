import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  team_id: string;
  team_name: string;
  email: string;
  inviter_name: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send invite function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { team_id, team_name, email, inviter_name, role }: InviteEmailRequest = await req.json();
    
    console.log('Sending invite email:', { team_id, team_name, email, inviter_name, role });

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader || '',
        },
      },
    });

    // Get current user info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('Current user:', user?.id);
    console.log('User error:', userError);
    
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('Authentication required');
    }
    
    // Check if user is admin of the team
    const { data: teamCheck, error: teamError } = await supabase
      .rpc('check_team_admin', { team_uuid: team_id, user_uuid: user.id });
    
    console.log('Team admin check:', teamCheck, teamError);
    
    if (!teamCheck) {
      console.error('User is not admin of team');
      throw new Error('Only team admins can send invitations');
    }
    
    // Create or get existing invitation
    let { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .upsert({
        team_id,
        invited_email: email,
        role,
        invited_by: user.id
      }, {
        onConflict: 'team_id,invited_email'
      })
      .select('invite_token')
      .single();

    if (inviteError) {
      console.error('team_invitations upsert error:', inviteError); // log detalhado

      // tentar reaproveitar convite pendente já existente
      const { data: existing, error: selErr } = await supabase
        .from('team_invitations')
        .select('invite_token')
        .eq('team_id', team_id)
        .eq('invited_email', email)
        .single();

      if (selErr) console.error('team_invitations select existing error:', selErr);
      invitation = existing ?? null;
    }

    if (!invitation) {
      return new Response(JSON.stringify({ 
        error: "Failed to create invitation", 
        detail: inviteError 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate invitation link using token
    const baseUrl = 'https://b2fb113a-66f8-4b8e-857e-de3744bd5b6e.sandbox.lovable.dev';
    const inviteLink = `${baseUrl}/accept-invite?token=${invitation.invite_token}`;
    
    console.log('Generated invite link:', inviteLink);

    const emailResponse = await resend.emails.send({
      from: "Produtive <onboarding@resend.dev>",
      to: [email],
      subject: `Convite para participar da equipe "${team_name}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Produtive</h1>
          </div>
          
          <h2 style="color: #1f2937; margin-bottom: 20px;">Você foi convidado para uma equipe!</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
            Olá! <strong>${inviter_name}</strong> convidou você para participar da equipe 
            <strong>"${team_name}"</strong> como <strong>${role === 'admin' ? 'Administrador' : 'Membro'}</strong>.
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
            O Produtive é uma plataforma de gerenciamento de tarefas que ajuda equipes a 
            organizarem suas atividades e colaborarem de forma eficiente.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600; 
                      display: inline-block;">
              Aceitar Convite
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            Se você não conseguir clicar no botão, copie e cole este link no seu navegador:<br>
            <a href="${inviteLink}" style="color: #2563eb; word-break: break-all;">${inviteLink}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Se você não esperava este convite, pode ignorar este email com segurança.
          </p>
        </div>
      `,
    });

    console.log("Email response:", emailResponse);

    // Check if there's an error in the Resend response
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      
      // Check for domain verification error
      if (emailResponse.error.message && emailResponse.error.message.includes('verify a domain')) {
        throw new Error('DOMAIN_NOT_VERIFIED');
      }
      
      throw new Error(`Email service error: ${emailResponse.error.message || 'Unknown error'}`);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invite function:", error);
    
    // Check for specific domain verification error
    if (error.message === 'DOMAIN_NOT_VERIFIED') {
      return new Response(
        JSON.stringify({ 
          error: "DOMAIN_NOT_VERIFIED",
          message: "Para enviar convites, é necessário verificar um domínio no Resend. Acesse https://resend.com/domains para configurar." 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Generic error response to prevent information disclosure
    return new Response(
      JSON.stringify({ error: "Unable to send invitation. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);