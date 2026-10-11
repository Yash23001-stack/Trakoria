export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
  type: TransactionType | string;
}

export interface AppConfig {
  currency: string;
  monthlyBudget: number;
  budgets: Record<string, number>;
  budgetItems?: Budget[];
}

export interface DashboardData {
  config: AppConfig;
  transactions: Transaction[];
}

export interface TransactionInput {
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  note: string;
}

export type TransactionUpdateInput = Partial<TransactionInput>;

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date?: string | null;
  spent: number;
  remaining: number;
}

export interface BudgetInput {
  category: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date?: string | null;
}
