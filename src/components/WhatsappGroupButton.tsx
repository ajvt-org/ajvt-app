import IconLabel from "@/components/IconLabel";
import { myProfile } from "@/lib/texts";

export default function WhatsappGroupButton({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
      <IconLabel name="whatsapp">{myProfile.whatsappGroup}</IconLabel>
    </a>
  );
}
