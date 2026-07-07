import { SIGAP_COPYRIGHT } from "@/lib/constants";

type AppCopyrightProps = {
  className?: string;
  centered?: boolean;
};

export function AppCopyright({ className = "", centered }: AppCopyrightProps) {
  return (
    <p className={`app-copyright${centered ? " centered" : ""}${className ? ` ${className}` : ""}`}>
      {SIGAP_COPYRIGHT}
    </p>
  );
}
