"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createAgentAction, type CreateAgentState } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initial: CreateAgentState = {};

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
  const [state, action] = useActionState(createAgentAction, initial);

  React.useEffect(() => {
    if (state.success) {
      toast.success("Агент создан. Эти email и пароль можно отдать ему для входа.");
      formRef.current?.reset();
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
  );
}
