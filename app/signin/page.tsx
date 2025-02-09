'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Nav } from "@/components/nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {SupabaseClient} from '@supabase/auth-helpers-nextjs';
import {Router} from 'next/router';

function TabComponent({
  email,
  password,
  setEmail,
  setPassword,
  error,
  setError,
  supabase,
  router,
}: {
  email: string;
  password: string;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  supabase: SupabaseClient;
  router: any;
}) {  
  const searchParams = useSearchParams();

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long.';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character.';
    }
    return null;
  };

  const handleSignIn = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/');
    } catch (error) {
      setError('Invalid login credentials');
    }
  };

  const handleRegister = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setError(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setError('Registration successful! Please check your email to confirm your account.');
    } catch (error) {
      console.log(error)
      setError('Error during registration. Please try again.');
    }
  };

  return (
    <Tabs defaultValue={searchParams.get('tab') || 'signin'} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      <TabsContent value="signin">
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full bg-blue-400 hover:bg-blue-500">
            Sign In
          </Button>
        </form>
      </TabsContent>
      <TabsContent value="register">
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <Input
              id="register-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600">
            Register
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  return (
    <div className="min-h-screen bg-background px-5 md:px-10">
      <Nav />
      <main className="container py-12">
        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle>Welcome to Plagiacheck</CardTitle>
            <CardDescription>Sign in or create an account to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p>Loading...</p>}>
              <TabComponent
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
                error={error}
                setError={setError}
                supabase={supabase}
                router={router}
              />
            </Suspense>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

