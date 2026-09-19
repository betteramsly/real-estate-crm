"use client";

import * as React from "react";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { createPropertyFeedbackAction } from "@/lib/actions/property-feedback";
import {
  PROPERTY_FEEDBACK_BODY_MAX,
  PROPERTY_FEEDBACK_BODY_MIN,
  validatePropertyFeedbackBody,
} from "@/lib/property-feedback";

export function PropertyFeedbackButton({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [pending, start] = React.useTransition();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const parsed = validatePropertyFeedbackBody(body);
  const remaining = PROPERTY_FEEDBACK_BODY_MIN - body.trim().length;

  const submit = () => {
    if (pending) return;
    start(async () => {
      const result = await createPropertyFeedbackAction(propertyId, body);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Отправлено админу");
      setBody("");
      setOpen(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setBody("");
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/70 px-3 text-xs font-medium text-white backdrop-blur transition-colors duration-200 ease-luxury hover:bg-black/80"
        >
          <PenLine className="h-3.5 w-3.5" />
          Предложить
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Предложить</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Textarea
            ref={textareaRef}
            name="body"
            value={body}
            rows={4}
            maxLength={PROPERTY_FEEDBACK_BODY_MAX}
            placeholder="Чего не хватает или что поправить в этой карточке?"
            onChange={(event) => setBody(event.target.value)}
            className="min-h-[6.5rem] w-full min-w-0 resize-none text-base md:text-sm"
          />
          <DialogFooter className="items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {remaining > 0
                ? `Ещё ${remaining}`
                : `${body.trim().length}/${PROPERTY_FEEDBACK_BODY_MAX}`}
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !parsed.ok}
              className="min-w-[7.5rem]"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отправить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
