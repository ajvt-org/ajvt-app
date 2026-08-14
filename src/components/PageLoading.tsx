export default function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24" role="status">
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "999px",
          border: "3px solid var(--mint-200)",
          borderTopColor: "var(--mint-600)",
        }}
        className="animate-spin"
      />
      <span className="sr-only">جارٍ التحميل</span>
    </div>
  );
}
