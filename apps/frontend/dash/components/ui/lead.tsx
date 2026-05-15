interface LeadProps {
  title: string;
  description: string;
}

export function Lead({ title, description }: LeadProps) {
  return (
    <div className="text-center space-y-1 mb-6 sm:mb-8">
      <h1 className="text-xl sm:text-2xl font-semibold leading-tight tracking-wider">{title}</h1>
      <p className="text-xs sm:text-sm text-balance text-muted-foreground font-light leading-tight">{description}</p>
    </div>
  );
}