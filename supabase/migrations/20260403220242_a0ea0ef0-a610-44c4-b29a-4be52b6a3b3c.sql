
-- Enums
CREATE TYPE public.expense_category AS ENUM (
  'payroll','contractors','benefits','payroll_tax','software',
  'marketing_paid','marketing_content','marketing_events',
  'legal','accounting','consulting','office','equipment','travel','other'
);

CREATE TYPE public.tax_type AS ENUM ('federal','state','self_employment','other');
CREATE TYPE public.cash_flow_type AS ENUM ('cash_in','cash_out');

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  category expense_category NOT NULL,
  vendor text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  is_recurring boolean DEFAULT false,
  is_tax_deductible boolean DEFAULT false,
  receipt_ref text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on expenses" ON public.expenses FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Monthly budgets
CREATE TABLE public.monthly_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  category text NOT NULL,
  budget_amount numeric NOT NULL DEFAULT 0,
  UNIQUE(month, category)
);
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on monthly_budgets" ON public.monthly_budgets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Tax payments
CREATE TABLE public.tax_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_type tax_type NOT NULL,
  quarter text NOT NULL,
  due_date date NOT NULL,
  amount_due numeric NOT NULL DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  paid_date date
);
ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on tax_payments" ON public.tax_payments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Cash flow entries
CREATE TABLE public.cash_flow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  type cash_flow_type NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  bank_balance_after numeric
);
ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on cash_flow_entries" ON public.cash_flow_entries FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
