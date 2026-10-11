export type PasswordStrength = 'empty' | 'weak' | 'acceptable' | 'strong';

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordFeedback = {
  strength: PasswordStrength;
  label: string;
  message: string;
  isValid: boolean;
};

export function passwordFeedback(password: string): PasswordFeedback {
  if (!password) {
    return {
      strength: 'empty',
      label: 'No password entered',
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters with at least one number.`,
      isValid: false,
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      strength: 'weak',
      label: 'Too short',
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      isValid: false,
    };
  }

  if (!/\d/.test(password)) {
    return {
      strength: 'weak',
      label: 'Needs a number',
      message: 'Add at least one number.',
      isValid: false,
    };
  }

  const variety = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (password.length >= 12 && variety >= 3) {
    return {
      strength: 'strong',
      label: 'Strong',
      message: 'Good length and variety. Avoid reusing passwords.',
      isValid: true,
    };
  }

  return {
    strength: 'acceptable',
    label: 'Acceptable',
    message: 'Meets the configured minimum. A longer unique password is safer.',
    isValid: true,
  };
}

export function passwordMismatch(password: string, confirmation: string): string {
  return password && confirmation && password !== confirmation
    ? 'Passwords do not match.'
    : '';
}
