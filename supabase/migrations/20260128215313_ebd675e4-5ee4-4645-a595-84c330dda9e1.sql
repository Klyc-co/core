-- Create products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_type text NOT NULL,
  name text NOT NULL,
  short_description text,
  value_propositions text,
  target_audience text,
  product_line_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create product_lines table
CREATE TABLE public.product_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key from products to product_lines
ALTER TABLE public.products
ADD CONSTRAINT products_product_line_id_fkey
FOREIGN KEY (product_line_id) REFERENCES public.product_lines(id) ON DELETE SET NULL;

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products RLS policies
CREATE POLICY "Users can view their own products"
ON public.products FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products"
ON public.products FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
ON public.products FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
ON public.products FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on product_lines
ALTER TABLE public.product_lines ENABLE ROW LEVEL SECURITY;

-- Product lines RLS policies
CREATE POLICY "Users can view their own product lines"
ON public.product_lines FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own product lines"
ON public.product_lines FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product lines"
ON public.product_lines FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product lines"
ON public.product_lines FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_lines_updated_at
BEFORE UPDATE ON public.product_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();