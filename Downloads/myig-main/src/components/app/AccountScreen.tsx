import { Link } from "react-router-dom";
import { ArrowLeft, LogOut, ShieldAlert, UserRound } from "lucide-react";

import AuthDialog from "@/components/AuthDialog";
import { useAuth } from "@/components/AuthProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AccountScreen = () => {
  const { deleteAccount, signOut, user } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ description: "Your SearchOutfit session has ended.", title: "Signed out" });
    } catch (error) {
      toast({
        description: error instanceof Error ? error.message : "Please try again.",
        title: "Could not sign out",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast({ description: "Your account and saved data were deleted.", title: "Account deleted" });
    } catch (error) {
      toast({
        description: error instanceof Error ? error.message : "Please try again.",
        title: "Could not delete account",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col gap-5 px-4 pb-10 pt-24 sm:px-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        to="/"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
            <UserRound className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Account</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email ?? "Sign in to sync saved items and unlock unlimited searches."}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {user ? (
            <>
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
                <p className="mt-1 text-sm font-medium text-foreground">{user.email}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Unlimited searches are unlocked while you stay signed in.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-1">
                <Button className="h-11 rounded-2xl" type="button" variant="outline" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="h-11 rounded-2xl" type="button" variant="destructive">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Delete account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your SearchOutfit account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes your account, saved items, and search access history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleDeleteAccount()}>
                      Confirm delete account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <div className="rounded-2xl bg-secondary/40 p-4">
              <p className="text-sm text-muted-foreground">
                Sign in to sync saved items and unlock unlimited searches.
              </p>
              <div className="mt-4">
                <AuthDialog
                  triggerClassName="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
                  triggerLabel="Sign in with email"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-background p-6 shadow-sm">
        <p className="text-sm font-medium text-foreground">Legal</p>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <Link className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" to="/privacy">
            Privacy Policy
          </Link>
          <Link className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" to="/terms">
            Terms of Use
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AccountScreen;
