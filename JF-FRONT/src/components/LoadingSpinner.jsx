"use client";

const LoadingSpinner = ({ mensaje = "Cargando..." }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" aria-live="polite" aria-busy="true">
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-xl flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" role="status" />
        <p className="text-sm">{mensaje}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
