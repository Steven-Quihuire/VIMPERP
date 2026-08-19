export type EcuadorianDocumentType = 'cedula' | 'ruc' | 'pasaporte';

const isValidModulo11CheckDigit = (
  value: string,
  weights: readonly number[],
) => {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(value[index]) * weight,
    0,
  );
  const remainder = 11 - (sum % 11);
  const expectedDigit = remainder === 10 ? 0 : remainder === 11 ? 1 : remainder;

  return Number(value[weights.length]) === expectedDigit;
};

export const isValidEcuadorianCedula = (value: string) => {
  if (!/^\d{10}$/.test(value)) {
    return false;
  }

  const province = Number(value.slice(0, 2));
  const thirdDigit = Number(value[2]);

  if (province < 1 || province > 24 || thirdDigit > 5) {
    return false;
  }

  const sum = Array.from(value.slice(0, 9)).reduce((total, digit, index) => {
    const product = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (product > 9 ? product - 9 : product);
  }, 0);

  const checkDigit = (10 - (sum % 10)) % 10;
  return Number(value[9]) === checkDigit;
};

export const isValidEcuadorianRuc = (value: string) => {
  if (!/^\d{13}$/.test(value) || value.slice(10) === '000') {
    return false;
  }

  if (isValidEcuadorianCedula(value.slice(0, 10))) {
    return true;
  }

  const province = Number(value.slice(0, 2));
  const thirdDigit = Number(value[2]);

  if (province < 1 || province > 24) {
    return false;
  }

  if (thirdDigit === 9) {
    return isValidModulo11CheckDigit(value, [4, 3, 2, 7, 6, 5, 4, 3, 2]);
  }

  if (thirdDigit === 6) {
    return isValidModulo11CheckDigit(value, [3, 2, 7, 6, 5, 4, 3, 2, 1]);
  }

  return false;
};

export const isValidEcuadorianPassport = (value: string) =>
  /^[A-Za-z]{1,3}\d{5,8}$/.test(value);

export const detectEcuadorianDocumentType = (
  value: string,
): EcuadorianDocumentType | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    if (normalized.length === 10) {
      return isValidEcuadorianCedula(normalized) ? 'cedula' : null;
    }
    if (normalized.length === 13) {
      return isValidEcuadorianRuc(normalized) ? 'ruc' : null;
    }
    return null;
  }

  return isValidEcuadorianPassport(normalized) ? 'pasaporte' : null;
};
