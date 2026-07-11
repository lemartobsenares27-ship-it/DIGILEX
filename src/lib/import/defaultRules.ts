export interface CategorizationRule {
  keywords: string[]
  category: string
  department: string
}

export const DEFAULT_CATEGORIZATION_RULES: CategorizationRule[] = [
  { keywords: ['FACEBOOK', 'FB ADS', 'META'], category: 'Facebook Ad Spend', department: 'Sales & Marketing' },

  { keywords: ['NINJA VAN', 'NINJAVAN'], category: 'Shipping / Courier Fee', department: 'Logistics' },
  { keywords: ['J&T', 'J AND T', 'JT EXPRESS'], category: 'Shipping / Courier Fee', department: 'Logistics' },
  { keywords: ['ENTREGO'], category: 'Shipping / Courier Fee', department: 'Logistics' },
  { keywords: ['GOGOXPRESS', 'GOGO XPRESS'], category: 'Shipping / Courier Fee', department: 'Logistics' },
  { keywords: ['LBC'], category: 'Shipping / Courier Fee', department: 'Logistics' },

  { keywords: ['SSS', 'SOCIAL SECURITY'], category: 'SSS Contribution (Employer)', department: 'Admin' },
  { keywords: ['PHILHEALTH', 'PHIC'], category: 'PhilHealth (Employer)', department: 'Admin' },
  { keywords: ['HDMF', 'PAG-IBIG', 'PAGIBIG'], category: 'Pag-IBIG (Employer)', department: 'Admin' },
  { keywords: ['BIR', 'BUREAU OF INTERNAL'], category: 'Withholding Tax', department: 'Admin' },

  { keywords: ['PAYROLL', 'SALARY'], category: 'Salaries & Wages', department: 'Admin' },

  { keywords: ['BOTCAKE', 'BOT CAKE'], category: 'Software Subscriptions', department: 'Sales & Marketing' },
  { keywords: ['HEYGEN', 'HEY GEN'], category: 'Software Subscriptions', department: 'Sales & Marketing' },
  { keywords: ['ELEVENLABS', 'ELEVEN LABS'], category: 'Software Subscriptions', department: 'Sales & Marketing' },
  { keywords: ['PANCAKE'], category: 'Software Subscriptions', department: 'Sales & Marketing' },

  { keywords: ['MERALCO', 'ELECTRIC'], category: 'Rent & Utilities', department: 'Admin' },
  { keywords: ['PLDT', 'GLOBE', 'CONVERGE', 'INTERNET'], category: 'Rent & Utilities', department: 'Admin' },

  { keywords: ['GCASH'], category: 'GCash Transfer', department: 'Admin' },

  { keywords: ['CREDIT CARD', 'CC PAYMENT'], category: 'Credit Card Payment', department: 'Executives' },
  { keywords: ['INTEREST', 'FINANCE CHARGE'], category: 'Credit Card Interest', department: 'Executives' },
  { keywords: ['LOAN', 'LENDING'], category: 'Loans & Debt Payment', department: 'Executives' },
]
