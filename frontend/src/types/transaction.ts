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
