/**
 * Valida matematicamente CPF (11 dígitos) e CNPJ (14 dígitos) segundo o algoritmo oficial de Módulo 11
 * da Receita Federal, mantendo paridade exata com o motor backend (CsvValidatorService).
 */
export function isValidBrazilianDocument(rawValue: string): boolean {
  const digits: string = rawValue.replace(/\D/g, '');

  if (digits.length !== 11 && digits.length !== 14) {
    return false;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  if (digits.length === 11) {
    return isValidCpfChecksum(digits);
  }

  return isValidCnpjChecksum(digits);
}

function isValidCpfChecksum(cpf: string): boolean {
  let sum1: number = 0;
  for (let i: number = 0; i < 9; i++) {
    sum1 += Number(cpf[i]) * (10 - i);
  }
  const rem1: number = sum1 % 11;
  const digit1: number = rem1 < 2 ? 0 : 11 - rem1;
  if (Number(cpf[9]) !== digit1) {
    return false;
  }

  let sum2: number = 0;
  for (let i: number = 0; i < 10; i++) {
    sum2 += Number(cpf[i]) * (11 - i);
  }
  const rem2: number = sum2 % 11;
  const digit2: number = rem2 < 2 ? 0 : 11 - rem2;
  return Number(cpf[10]) === digit2;
}

function isValidCnpjChecksum(cnpj: string): boolean {
  const weights1: number[] = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2: number[] = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum1: number = 0;
  for (let i: number = 0; i < 12; i++) {
    sum1 += Number(cnpj[i]) * weights1[i];
  }
  const rem1: number = sum1 % 11;
  const digit1: number = rem1 < 2 ? 0 : 11 - rem1;
  if (Number(cnpj[12]) !== digit1) {
    return false;
  }

  let sum2: number = 0;
  for (let i: number = 0; i < 13; i++) {
    sum2 += Number(cnpj[i]) * weights2[i];
  }
  const rem2: number = sum2 % 11;
  const digit2: number = rem2 < 2 ? 0 : 11 - rem2;
  return Number(cnpj[13]) === digit2;
}
