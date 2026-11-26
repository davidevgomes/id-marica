export function cpfDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isCpfValid(value: string): boolean {
  if (!/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(value)) return false;
  const digits = cpfDigits(value);
  if (/^(\d)\1+$/.test(digits)) return false;
  return [9, 10].every((position) => {
    const sum = Array.from(digits.slice(0, position)).reduce(
      (total, digit, index) => total + Number(digit) * (position + 1 - index), 0
    );
    return ((sum * 10) % 11) % 10 === Number(digits[position]);
  });
}

export const CONTRACT_LIMIT = 2 * 1024 * 1024;
export const MIN_CITIZEN_PASSWORD = 10;
