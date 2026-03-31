import AuthDialog from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SearchLimitSheetProps = {
  mode: "auth" | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const SearchLimitSheet = ({ onOpenChange, open }: SearchLimitSheetProps) => {
  const title = "Keep searching with an account";
  const description = "Sign in to keep searching without limits and save your favorite finds.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border-0 bg-background p-6">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <AuthDialog
            triggerClassName="inline-flex h-11 w-full items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
            triggerLabel="Sign in with email"
          />

          <Button className="h-11 w-full rounded-xl" type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchLimitSheet;
