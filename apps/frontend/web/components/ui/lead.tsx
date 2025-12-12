interface LeadProps {
  title: string;
  description: string;
}

export function Lead({ title, description }: LeadProps) {
  return (
    <div className="text-center space-y-2 mb-6 sm:mb-8">
      <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
      <p className="text-xs sm:text-sm text-balance text-muted-foreground font-light">{description}</p>
    </div>
  );
}