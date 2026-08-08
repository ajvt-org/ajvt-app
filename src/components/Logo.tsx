import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 80, className = "" }: LogoProps) {
  return (
    <Image
      src="/version-final.png"
      alt="Ø±Ø§Ø¨Ø·Ø© Ø´Ø¨Ø§Ø¨ Ù‚Ø±ÙŠØ© Ø§Ù„ØªØ§ÙƒÙ„Ø§Ù„Øª"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
