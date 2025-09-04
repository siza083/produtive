import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckSquare, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    
    if (isLogin) {
      await signIn(email, password);
    } else {
      await signUp(email, password, name);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckSquare className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Produtive</h1>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta gratuita'}
          </p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isLogin ? 'Login' : 'Cadastro'}</CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Entre com seu e-mail e senha para acessar sua conta'
                : 'Preencha os dados abaixo para criar sua conta'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {!isLogin && (
                  <p className="text-sm text-muted-foreground">
                    Mínimo de 6 caracteres
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !email || !password || (!isLogin && !name)}
              >
                {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail('');
                  setPassword('');
                  setName('');
                }}
                className="p-0 h-auto"
              >
                {isLogin ? 'Criar conta gratuita' : 'Fazer login'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
          </p>
        </div>
      </div>
    </div>
  );
}