import Image from "next/image";

const SIZES = {
  sm: 32,
  md: 40,
  lg: 72,
  xl: 128,
} as const;

type SigapLogoProps = {
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
};

export function SigapLogo({ size = "md", className = "", priority }: SigapLogoProps) {
  const px = SIZES[size];
  return (
    <Image
      src="/logo.png"
      alt="SIGAP"
      width={px}
      height={px}
      className={`sigap-logo sigap-logo-${size}${className ? ` ${className}` : ""}`}
      priority={priority}
    />
  );
}
