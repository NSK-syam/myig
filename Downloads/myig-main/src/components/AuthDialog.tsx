import { FormEvent, useState } from "react";
import { Loader2, LogIn, Mail } from "lucide-react";
import { useLocation } from "react-router-dom";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type AuthDialogProps = {
  triggerClassName?: string;
  triggerLabel?: string;
};

const AuthDialog = ({
  triggerClassName,
  triggerLabel = "Sign in",
}: AuthDialogProps) => {
  const location = useLocation();
  const { signInWithMagicLink } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      await signInWithMagicLink(email.trim(), `${location.pathname}${location.search}${location.hash}`);
      setEmailSent(true);
      toast({
        title: "Check your inbox",
        description: "We sent you a magic link to sign in to SearchOutfit.",
      });
    } catch (error) {
      toast({
        title: "Sign-in failed",
        description: error instanceof Error ? error.message : "Could not start the sign-in flow.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEmailSent(false);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className={triggerClassName ?? "flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-sm hover:bg-card transition-colors"}
          type="button"
        >
          <LogIn className="w-4 h-4" />
          <span>{triggerLabel}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to SearchOutfit</DialogTitle>
          <DialogDescription>
            Save your favorites and unlock unlimited signed-in searches across your devices.
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className="rounded-sm border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Magic link sent</p>
            <p className="mt-1">
              Open the email we sent to <span className="text-foreground">{email}</span> and tap the link to finish signing in.
            </p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="email"
                className="pl-10"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </div>
            <DialogFooter>
              <Button className="w-full" disabled={submitting || !email.trim()} type="submit">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Email me a sign-in link"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
