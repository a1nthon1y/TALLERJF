"use client";

const LoadingSpinner = ({ mensaje = "Cargando..." }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-700">{mensaje}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner; 