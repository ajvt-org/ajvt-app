import Image from "next/image";
import { LOGO_SRC } from "@/lib/logo";
import { association } from "@/lib/texts";

interface LogoProps {
  size: number;
  className?: string;
  priority?: boolean;
  captured?: boolean;
}

export default function Logo({ size, className = "", priority, captured }: LogoProps) {
  if (captured) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO_SRC}
        alt={association.logoAlt}
        width={size}
        height={size}
        className={className}
      />
    );
  }

  return (
    <Image
      src={LOGO_SRC}
      alt={association.logoAlt}
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
