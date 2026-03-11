import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, User, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepBusinessTypeProps {
  onNext: (type: string) => void;
}

const types = [
  {
    id: "product",
    label: "Product",
    description: "A physical or digital product brand.",
    icon: ShoppingBag,
  },
  {
    id: "person",
    label: "Person",
    description: "A personal brand, creator, or public figure.",
    icon: User,
  },
  {
    id: "place",
    label: "Place",
    description: "A location, venue, or destination brand.",
    icon: MapPin,
  },
];

const StepBusinessType = ({ onNext }: StepBusinessTypeProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            What best describes your brand?
          </h1>
          <p className="text-muted-foreground">
            This helps Klyc tailor content structure, creative direction, and strategy.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 max-w-xl mx-auto mb-10">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 text-center",
                selected === t.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
                selected === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>
                <t.icon className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{t.label}</h3>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={() => selected && onNext(selected)}
            disabled={!selected}
            size="lg"
            className="h-12 px-10 text-base font-semibold"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepBusinessType;
