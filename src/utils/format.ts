export function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + ' ₫';
}

export function formatDateISOtoDDMMYYYY(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
