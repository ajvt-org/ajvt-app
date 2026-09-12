type Props = Omit<React.ComponentProps<"input">, "type" | "inputMode" | "dir">;

export default function NumberInput({ className = "input", ...rest }: Props) {
  return <input {...rest} type="number" inputMode="numeric" dir="ltr" className={className} />;
}
