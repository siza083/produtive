import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { name?: string; theme?: string; timezone?: string }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // If user just signed up, wait a moment for the trigger to create the profile
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            // Verify the profile was created by the trigger
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            // If profile wasn't created by trigger, create it manually as fallback
            if (!profile) {
              try {
                await supabase.from('profiles').insert({
                  user_id: session.user.id,
                  name: session.user.user_metadata?.name || 
                        session.user.user_metadata?.full_name || 
                        session.user.email?.split('@')[0],
                  timezone: 'America/Sao_Paulo',
                  theme: 'system'
                });
              } catch (error) {
                console.warn('Failed to create profile fallback:', error);
              }
            }
          }, 1000);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: name ? { name } : undefined
      }
    });

    if (error) {
      const errorMessage = error.message.toLowerCase();
      let description = "Ocorreu um erro ao criar sua conta. Tente novamente.";
      
      if (errorMessage.includes("user already registered")) {
        description = "Este e-mail já está cadastrado. Tente fazer login.";
      } else if (errorMessage.includes("password")) {
        description = "A senha deve ter pelo menos 6 caracteres.";
      } else if (errorMessage.includes("email")) {
        description = "Por favor, verifique se o e-mail está correto.";
      }
      
      toast({
        title: "Erro no cadastro",
        description,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Conta criada!",
        description: "Você já pode fazer login com suas credenciais."
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      const errorMessage = error.message.toLowerCase();
      let description = "Ocorreu um erro ao fazer login. Tente novamente.";
      
      if (errorMessage.includes("invalid login credentials")) {
        description = "E-mail ou senha incorretos.";
      } else if (errorMessage.includes("email not confirmed")) {
        description = "Por favor, confirme seu e-mail antes de fazer login.";
      } else if (errorMessage.includes("too many requests")) {
        description = "Muitas tentativas. Aguarde alguns minutos.";
      }
      
      toast({
        title: "Erro no login",
        description,
        variant: "destructive"
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso."
    });
  };

  const updateProfile = async (updates: { name?: string; theme?: string; timezone?: string }) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Perfil atualizado",
        description: "Suas alterações foram salvas com sucesso."
      });
    }

    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}