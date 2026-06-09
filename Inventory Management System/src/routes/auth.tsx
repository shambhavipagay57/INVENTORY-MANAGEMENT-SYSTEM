import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Boxes, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Stockwise" },
      { name: "description", content: "Sign in or create your Stockwise account." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col px-8 py-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">Stockwise</span>
        </Link>

        <div className="m-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your inventory workspace.
          </p>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value={mode} className="mt-6">
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@company.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signup" ? "Create account" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms and acknowledge our privacy policy.
          </p>
        </div>
      </div>

      {/* Right: hero panel */}
      <div className="relative hidden overflow-hidden border-l border-border lg:block">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(70%_60%_at_70%_30%,oklch(0.66_0.21_290/0.35),transparent_70%)]"
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div />
          <div>
            <p className="max-w-md text-2xl font-medium leading-snug">
              "Stockwise replaced three spreadsheets and our standing 9am inventory call.
              We see stock movement before the warehouse closes its doors."
            </p>
            <p className="mt-4 text-sm text-muted-foreground">— Operations Lead, Mid-market retailer</p>
          </div>
        </div>
      </div>
    </div>
  );
}
