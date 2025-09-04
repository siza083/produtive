
// supabase/functions/send-invite/index.ts
// Edge Function (Deno) para enviar convites via Resend com React Email
// - Valida entrada (teamId + email)
// - Insere convite "pending" respeitando RLS (JWT do chamador)
// - Reaproveita token existente em caso de unique_violation (23505)
// - Envia e-mail com template React Email: `${APP_URL}/accept-invite?token=...`
//
// Ajuste a tabela usada para convites definindo a env INVITES_TABLE
//   - INVITES_TABLE = "team_invitations"  (padrão recomendado)
//   - ou "team_members" (se o projeto usar pending dentro de team_members)
//
// Requer envs: SUPABASE_URL, SUPABASE_ANON_KEY, APP_URL, RESEND_API_KEY
//
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { TeamInviteEmail } from './_templates/team-invite.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    // Compat: aceita vários nomes de campo para e-mail e teamId
    const teamId: string = body.teamId ?? body.team_id ?? "";
    const emailRaw: string = body.invitedEmail ?? body.toEmail ?? body.email ?? "";
    const role: string = body.role ?? "member";
    const teamName: string = body.teamName ?? "";

    const email = String(emailRaw).trim().toLowerCase();

    if (!teamId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing teamId or email", received: { teamId, emailRaw } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const APP_URL = Deno.env.get("APP_URL")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

    if (!APP_URL || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing APP_URL or RESEND_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client com JWT do chamador → respeita RLS
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // Se precisar alternar, defina INVITES_TABLE no ambiente
    const TABLE = Deno.env.get("INVITES_TABLE") ?? "team_invitations"; // ou "team_members"

    // 1) Tenta INSERT (preferível ao upsert) → se UNIQUE, reaproveita
    let { data: pending, error: insErr } = await supabase
      .from(TABLE)
      .insert({ team_id: teamId, invited_email: email, role, status: "pending" })
      .select("invite_token")
      .maybeSingle();

    if (insErr) {
      console.error(`${TABLE} insert error:`, insErr);

      // 23505 = unique_violation → buscar convite pendente existente
      if (insErr.code === "23505") {
        const { data: existingArr, error: selErr } = await supabase
          .from(TABLE)
          .select("invite_token")
          .eq("team_id", teamId)
          .eq("invited_email", email)
          .eq("status", "pending")
          .limit(1); // sem .single()
        if (selErr) console.error(`${TABLE} select pending error:`, selErr);
        pending = Array.isArray(existingArr) ? existingArr[0] : null;
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to create invitation", detail: insErr }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!pending?.invite_token) {
      return new Response(
        JSON.stringify({ error: "No pending invite available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviteLink = `${APP_URL}/accept-invite?token=${pending.invite_token}`;

    // 2) Buscar dados do convidante (opcional)
    let inviterName = '';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', user.id)
          .single();
        inviterName = inviterProfile?.name || '';
      }
    } catch (err) {
      console.warn('Could not fetch inviter name:', err);
    }

    // 3) Renderizar template React Email
    const html = await renderAsync(
      React.createElement(TeamInviteEmail, {
        teamName: teamName || "Produtive",
        inviteLink,
        inviterName,
      })
    );

    // 4) Enviar e-mail via Resend com novo SDK
    const { error: emailError } = await resend.emails.send({
      from: "Produtive <onboarding@resend.dev>", // PRODUÇÃO: usar domínio verificado
      to: [email],
      subject: `Convite para ${teamName || "sua equipe"} — Produtive`,
      html,
    });

    if (emailError) {
      throw new Error(`Resend error: ${JSON.stringify(emailError)}`);
    }

    return new Response(JSON.stringify({ ok: true, inviteLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in send-invite:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
