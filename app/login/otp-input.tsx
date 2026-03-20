"use client";

import { useRef, useState } from "react";

const LENGTH = 4;

export function OTPInput({
  action,
  error,
}: {
  action: (fd: FormData) => void;
  error: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (digit && i < LENGTH - 1) inputs.current[i + 1]?.focus();
    if (next.every(Boolean)) {
      if (hiddenRef.current) hiddenRef.current.value = next.join("");
      formRef.current?.requestSubmit();
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    const next = Array(LENGTH).fill("");
    pasted.split("").forEach((d, i) => { next[i] = d; });
    setDigits(next);
    const lastFilled = Math.min(pasted.length, LENGTH - 1);
    inputs.current[lastFilled]?.focus();
    if (pasted.length === LENGTH) {
      if (hiddenRef.current) hiddenRef.current.value = next.join("");
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col items-center gap-8">
      <input type="hidden" name="passcode" ref={hiddenRef} />
      <div className="flex gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            autoFocus={i === 0}
            autoComplete="one-time-code"
            className="w-12 h-14 text-center text-2xl rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:border-ring focus:bg-muted/80 caret-transparent transition-colors"
          />
        ))}
      </div>
      {error && (
        <p className="text-xs text-destructive -mt-4">Incorrect passcode.</p>
      )}
    </form>
  );
}
