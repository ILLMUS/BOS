import { z } from "zod";

export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 10 characters", test: (v) => v.length >= 10 },
  { id: "upper", label: "One uppercase letter (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter (a-z)", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number (0-9)", test: (v) => /[0-9]/.test(v) },
  {
    id: "symbol",
    label: "One symbol (!@#$…)",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
  {
    id: "nospaces",
    label: "No leading or trailing spaces",
    test: (v) => v.length > 0 && v === v.trim(),
  },
];

const COMMON_PASSWORDS = [
  "password",
  "password1",
  "passw0rd",
  "qwerty",
  "welcome",
  "letmein",
  "admin",
  "123456",
  "12345678",
  "iloveyou",
  "master flow",
  "masterflow",
];

export const passwordSchema = z
  .string()
  .max(72, { message: "Password must be 72 characters or fewer." })
  .superRefine((value, ctx) => {
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Password requirement not met: ${rule.label.toLowerCase()}.` });
      }
    }
    const lower = value.toLowerCase();
    if (COMMON_PASSWORDS.some((c) => lower.includes(c))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is too common or guessable. Choose something unique.",
      });
    }
    if (/(.)\1{3,}/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password cannot repeat the same character 4 or more times in a row.",
      });
    }
  });

export function passwordStrength(value: string) {
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const bonus = value.length >= 16 ? 1 : 0;
  const score = Math.min(100, Math.round(((passed + bonus) / (PASSWORD_RULES.length + 1)) * 100));
  const label = score < 40 ? "Weak" : score < 70 ? "Fair" : score < 100 ? "Strong" : "Excellent";
  return { score, label };
}

export function validatePasswordPair(password: string, confirm: string): string[] {
  const result = passwordSchema.safeParse(password);
  const errors = result.success ? [] : result.error.issues.map((i) => i.message);
  if (confirm.length > 0 && password !== confirm) {
    errors.push("Passwords do not match.");
  }
  return errors;
}
