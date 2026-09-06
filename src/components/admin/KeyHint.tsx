export default function KeyHint({ children }: { children: string }) {
  return (
    <kbd
      dir="ltr"
      className="ms-1.5 px-1 rounded text-[10px] font-black align-middle"
      style={{
        background: "rgba(255,255,255,0.22)",
        border: "1px solid rgba(255,255,255,0.45)",
        fontFamily: "inherit",
      }}
    >
      {children}
    </kbd>
  );
}
