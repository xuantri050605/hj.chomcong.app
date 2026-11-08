export interface CellStyle {
  font?: {
    name?: string;
    sz?: number;
    bold?: boolean;
    italic?: boolean;
    color?: { rgb?: string };
  };
  fill?: {
    fgColor?: { rgb?: string };
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'center' | 'bottom';
    wrapText?: boolean;
  };
  border?: {
    top?: { style: string; color?: { rgb?: string } };
    bottom?: { style: string; color?: { rgb?: string } };
    left?: { style: string; color?: { rgb?: string } };
    right?: { style: string; color?: { rgb?: string } };
  };
  numFmt?: string;
}

export const HOJEONG_COLORS = {
  primaryRed: 'D71920', // Brand Primary Red
  darkRed: 'A80F17', // Brand Deep Red
  lightRed: 'FEE2E2', // Light pastel red for summary/totals
  zebraRow: 'FFF8F8', // Subtle alternating row tint
  white: 'FFFFFF',
  textDark: '1E293B', // Slate 800
  textMuted: '64748B', // Slate 500
  borderGray: 'CBD5E1', // Slate 300
  borderLight: 'E2E8F0', // Slate 200
  borderDark: '94A3B8', // Slate 400
};

const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: HOJEONG_COLORS.borderGray } },
  bottom: { style: 'thin', color: { rgb: HOJEONG_COLORS.borderGray } },
  left: { style: 'thin', color: { rgb: HOJEONG_COLORS.borderGray } },
  right: { style: 'thin', color: { rgb: HOJEONG_COLORS.borderGray } },
};

const BORDER_TOTAL = {
  top: { style: 'thin', color: { rgb: HOJEONG_COLORS.primaryRed } },
  bottom: { style: 'double', color: { rgb: HOJEONG_COLORS.primaryRed } },
  left: { style: 'thin', color: { rgb: HOJEONG_COLORS.borderGray } },
  right: { style: 'thin', color: { rgb: HOJEONG_COLORS.borderGray } },
};

export const EXCEL_STYLES = {
  companyHeader: {
    font: { name: 'Arial', sz: 14, bold: true, color: { rgb: HOJEONG_COLORS.primaryRed } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  },
  companySubtext: {
    font: { name: 'Arial', sz: 9, italic: true, color: { rgb: HOJEONG_COLORS.textMuted } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  },
  reportTitle: {
    font: { name: 'Arial', sz: 16, bold: true, color: { rgb: HOJEONG_COLORS.darkRed } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
  },
  metaLabel: {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: HOJEONG_COLORS.textDark } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  },
  metaValue: {
    font: { name: 'Arial', sz: 10, bold: false, color: { rgb: HOJEONG_COLORS.textDark } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
  },
  tableHeader: {
    font: { name: 'Arial', sz: 9.5, bold: true, color: { rgb: HOJEONG_COLORS.white } },
    fill: { fgColor: { rgb: HOJEONG_COLORS.primaryRed } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: HOJEONG_COLORS.darkRed } },
      bottom: { style: 'medium', color: { rgb: HOJEONG_COLORS.darkRed } },
      left: { style: 'thin', color: { rgb: HOJEONG_COLORS.white } },
      right: { style: 'thin', color: { rgb: HOJEONG_COLORS.white } },
    },
  },
  dataCellCenter: (isZebra = false): CellStyle => ({
    font: { name: 'Arial', sz: 9.5, color: { rgb: HOJEONG_COLORS.textDark } },
    fill: isZebra ? { fgColor: { rgb: HOJEONG_COLORS.zebraRow } } : { fgColor: { rgb: HOJEONG_COLORS.white } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: BORDER_THIN,
  }),
  dataCellLeft: (isZebra = false): CellStyle => ({
    font: { name: 'Arial', sz: 9.5, color: { rgb: HOJEONG_COLORS.textDark } },
    fill: isZebra ? { fgColor: { rgb: HOJEONG_COLORS.zebraRow } } : { fgColor: { rgb: HOJEONG_COLORS.white } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    border: BORDER_THIN,
  }),
  dataCellHour: (isZebra = false, hasValue = false): CellStyle => ({
    font: {
      name: 'Arial',
      sz: 9.5,
      bold: hasValue,
      color: { rgb: hasValue ? HOJEONG_COLORS.textDark : HOJEONG_COLORS.textMuted },
    },
    fill: isZebra ? { fgColor: { rgb: HOJEONG_COLORS.zebraRow } } : { fgColor: { rgb: HOJEONG_COLORS.white } },
    alignment: { horizontal: 'right' as const, vertical: 'center' as const },
    border: BORDER_THIN,
    numFmt: '0.00',
  }),
  totalLabel: {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: HOJEONG_COLORS.primaryRed } },
    fill: { fgColor: { rgb: HOJEONG_COLORS.lightRed } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: BORDER_TOTAL,
  },
  totalHour: {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: HOJEONG_COLORS.primaryRed } },
    fill: { fgColor: { rgb: HOJEONG_COLORS.lightRed } },
    alignment: { horizontal: 'right' as const, vertical: 'center' as const },
    border: BORDER_TOTAL,
    numFmt: '0.00',
  },
};
