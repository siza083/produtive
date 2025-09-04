import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: { name?: string; photo_url?: string; timezone?: string; theme?: string }) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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
        
        // Create profile if it doesn't exist (first login)
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (!profile) {
              await supabase.from('profiles').insert({
                user_id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
              });
            }
          }, 0);
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

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        let message = 'Erro ao fazer login';
        if (error.message.includes('Invalid login credentials')) {
          message = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'Email não confirmado. Verifique sua caixa de entrada';
        }
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
        return { error };
      }

      toast({
        title: 'Sucesso',
        description: 'Login realizado com sucesso!',
      });
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name || email.split('@')[0],
          }
        }
      });

      if (error) {
        let message = 'Erro ao criar conta';
        if (error.message.includes('User already registered')) {
          message = 'Este email já está cadastrado';
        } else if (error.message.includes('Password should be at least')) {
          message = 'A senha deve ter pelo menos 6 caracteres';
        }
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
        return { error };
      }

      toast({
        title: 'Sucesso',
        description: 'Conta criada com sucesso! Verifique seu email para confirmar.',
      });
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logout realizado',
      description: 'Você foi desconectado com sucesso',
    });
  };

  const updateProfile = async (data: { name?: string; photo_url?: string; timezone?: string; theme?: string }) => {
    if (!user) return { error: new Error('Usuário não autenticado') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao atualizar perfil',
          variant: 'destructive',
        });
        return { error };
      }

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso!',
      });
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}