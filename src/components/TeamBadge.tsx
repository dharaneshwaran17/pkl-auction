export function TeamBadge({
  name,
  logoUrl,
  color,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: "h-9 w-9 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-base",
  }[size];

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0 shadow-md`}
      />
    );
  }
  return (
    <div
      className={`flex ${sizeClasses} items-center justify-center rounded-full font-bold text-black flex-shrink-0 shadow-md`}
      style={{ background: color ?? "#FF6B00" }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
