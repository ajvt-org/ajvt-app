"use client";

export default function Sheet({
  size = "md",
  onClose,
  children,
}: {
  size?: "sm" | "md";
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${size === "sm" ? "max-w-sm" : "max-w-md"} rounded-t-3xl md:rounded-2xl overflow-y-auto`}
        style={{ background: "var(--mint-50)", maxHeight: "88svh", direction: "rtl" }}
      >
        {children}
      </div>
    </div>
  );
}
