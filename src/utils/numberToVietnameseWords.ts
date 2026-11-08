/**
 * Converts a number (VND amount) to Vietnamese words.
 * E.g. 15200000 -> "Mười lăm triệu hai trăm nghìn đồng chẵn"
 */
const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(n: number, showZeroHundred: boolean): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;

  let result = '';

  if (hundreds > 0 || showZeroHundred) {
    result += `${DIGITS[hundreds]} trăm `;
  }

  if (tens === 0 && ones > 0) {
    if (hundreds > 0 || showZeroHundred) {
      result += 'lẻ ';
    }
    result += DIGITS[ones];
  } else if (tens === 1) {
    result += 'mười ';
    if (ones === 5) {
      result += 'lăm';
    } else if (ones > 0) {
      result += DIGITS[ones];
    }
  } else if (tens > 1) {
    result += `${DIGITS[tens]} mươi `;
    if (ones === 1) {
      result += 'mốt';
    } else if (ones === 5) {
      result += 'lăm';
    } else if (ones > 0) {
      result += DIGITS[ones];
    }
  }

  return result.trim();
}

export function numberToVietnameseWords(amount: number): string {
  if (!amount || amount === 0) {
    return 'Không đồng chẵn';
  }

  const isNegative = amount < 0;
  let num = Math.abs(Math.round(amount));

  const groups: number[] = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const showZeroHundred = i < groups.length - 1;
      const groupText = readThreeDigits(groupVal, showZeroHundred);
      words += `${groupText} ${UNITS[i]} `;
    }
  }

  words = words.trim();
  if (!words) {
    return 'Không đồng';
  }

  // Capitalize first letter
  const formatted = words.charAt(0).toUpperCase() + words.slice(1);
  return `${isNegative ? 'Âm ' : ''}${formatted} đồng chẵn.`;
}
