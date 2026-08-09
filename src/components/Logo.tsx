import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 80, className = "" }: LogoProps) {
  return (
    <Image
      src="/version-final.png"
      alt="رابطة شباب قرية التاكلالت"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
