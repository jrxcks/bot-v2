'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/instagram/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.sessionId && data.userId) {
        localStorage.setItem('instagramSessionId', data.sessionId);
        localStorage.setItem('instagramUserId', data.userId);
        localStorage.removeItem('instagramSessionState');
        localStorage.removeItem('instagramState');
        localStorage.removeItem('instagramSession');
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed - Missing session ID');
      }
    } catch (err) {
      setError('Failed to login. Please check your connection and credentials.');
      console.error("Login Error:", err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">InstaBot Login</CardTitle>
          <CardDescription>Enter your Instagram credentials</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    type="text"
                    placeholder="Instagram Username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                />
                </div>
                {error && (
                <p className="text-sm font-medium text-destructive text-center">{error}</p>
                )}
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
                </Button>
            </CardFooter>
         </form>
      </Card>
    </div>
  );
}
