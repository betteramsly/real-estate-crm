"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createAgentAction, type CreateAgentState } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initial: CreateAgentState = {};

type IssuedLogin = {
  full_name: string;
  email: string;
  password: string;
};

function loginCopyText(issued: IssuedLogin) {
  const lines = [
    "MANTAEV CAPITAL",
    issued.full_name ? issued.full_name : null,
    `Логин: ${issued.email}`,
    `Пароль: ${issued.password}`,
  ].filter(Boolean);
  return lines.join("\n");
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="md:self-end">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Создать агента
    </Button>
  );
}

export function AddAgentForm() {
  const formRef = React.useRef<HTMLFormElement>(null);
  const pendingLogin = React.useRef<IssuedLogin | null>(null);
  const [issued, setIssued] = React.useState<IssuedLogin | null>(null);
  const [copied, setCopied] = React.useState(false);
  const hideTimer = React.useRef<number>(0);
  const [state, dispatch] = useActionState(createAgentAction, initial);

  React.useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const hideIssued = React.useCallback(() => {
    window.clearTimeout(hideTimer.current);
    setIssued(null);
    setCopied(false);
  }, []);

  const action = (formData: FormData) => {
    pendingLogin.current = {
      full_name: String(formData.get("full_name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };
    dispatch(formData);
  };

  React.useEffect(() => {
    if (state.success && pendingLogin.current) {
      setIssued(pendingLogin.current);
      window.clearTimeout(hideTimer.current);
      setCopied(false);
      toast.success("Агент создан. Скопируйте логин и пароль, чтобы отдать ему.");
      formRef.current?.reset();
      pendingLogin.current = null;
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  const copyLogin = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(loginCopyText(issued));
      setCopied(true);
      toast.success("Логин и пароль скопированы");
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(hideIssued, 1600);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={action}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="space-y-2">
          <Label htmlFor="agent_full_name">ФИО</Label>
          <Input
            id="agent_full_name"
            name="full_name"
            placeholder="Иван Иванов"
            autoComplete="off"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent_email">Email</Label>
          <Input
            id="agent_email"
            name="email"
            type="email"
            placeholder="agent@company.ru"
            autoComplete="off"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent_password">Пароль</Label>
          <PasswordInput
            id="agent_password"
            name="password"
            placeholder="не короче 8 символов"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <SubmitButton />
      </form>

      {issued ? (
        <div className="relative flex flex-col gap-3 rounded-2xl border bg-muted/30 p-4 pr-12 sm:flex-row sm:items-end sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            aria-label="Скрыть данные для входа"
            onClick={hideIssued}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">Данные для входа</p>
            <p className="text-xs text-muted-foreground">
              Отдайте агенту и закройте блок. Пароль больше нигде не хранится.
            </p>
            {issued.full_name ? (
              <p className="pt-1 text-sm">{issued.full_name}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Логин: <span className="text-foreground">{issued.email}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Пароль: <span className="text-foreground">{issued.password}</span>
            </p>
          </div>
          <Button
            type="button"
            onClick={copyLogin}
            className="relative min-w-56 shrink-0"
          >
            <span className={cn("inline-flex items-center gap-2", copied && "invisible")}>
              <Copy className="h-4 w-4" />
              Скопировать логин и пароль
            </span>
            <span
              className={cn(
                "absolute inset-0 inline-flex items-center justify-center gap-2",
                !copied && "invisible",
              )}
            >
              <Check className="h-4 w-4" />
              Скопировано
            </span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
