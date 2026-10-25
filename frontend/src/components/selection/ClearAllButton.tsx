export function ClearAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-corporate underline-offset-2 hover:underline"
    >
      Limpiar todo
    </button>
  );
}
