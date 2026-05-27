const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'letmein',
  'welcome1',
  'iloveyou',
  'admin123',
  'legacykeeper',
]);

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function identityParts(values: Array<string | undefined>) {
  return values
    .flatMap((value) => normalize(value || '').split(/[^a-z0-9]+/))
    .filter((part) => part.length >= 3);
}

export type PasswordValidationResult = {
  isValid: boolean;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
  }>;
};

export function validatePasswordForAuth(
  password: string,
  identity: { email?: string; fullName?: string } = {},
): PasswordValidationResult {
  const normalizedPassword = normalize(password);
  const personalParts = identityParts([identity.email?.split('@')[0], identity.fullName]);
  const isTooPersonal = normalizedPassword.length > 0 && personalParts.some((part) => normalizedPassword.includes(part));

  const checks = [
    {
      id: 'length',
      label: 'Use at least 8 characters.',
      passed: password.length >= 8,
    },
    {
      id: 'numeric',
      label: 'Do not use a numbers-only password.',
      passed: !/^\d+$/.test(password),
    },
    {
      id: 'common',
      label: 'Avoid common passwords such as password123 or qwerty123.',
      passed: !COMMON_PASSWORDS.has(normalizedPassword),
    },
    {
      id: 'personal',
      label: 'Do not include your name or email.',
      passed: !isTooPersonal,
    },
  ];

  return {
    isValid: checks.every((check) => check.passed),
    checks,
  };
}

export function getPasswordErrorMessage(error: unknown) {
  const data = (error as any)?.response?.data;
  const passwordErrors = Array.isArray(data?.password_errors) ? data.password_errors : [];
  if (passwordErrors.length > 0) {
    return passwordErrors.join(' ');
  }
  if (typeof data?.error === 'string') {
    return data.error;
  }
  return '';
}
