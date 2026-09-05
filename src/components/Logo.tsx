import Image from "next/image";
import { LOGO_MARKS, type LogoMark } from "@/lib/logo";
import { association } from "@/lib/texts";

interface LogoProps {
  mark: LogoMark;
  size: number;
  className?: string;
  priority?: boolean;
  captured?: boolean;
}

export default function Logo({ mark, size, className = "", priority, captured }: LogoProps) {
  const src = LOGO_MARKS[mark];

  if (captured) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={association.logoAlt} width={size} height={size} className={className} />
    );
  }

  return (
    <Image
      src={src}
      alt={association.logoAlt}
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
