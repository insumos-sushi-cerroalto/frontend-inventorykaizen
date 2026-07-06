// src/Login.jsx
import { useState } from "react";
import { login } from "./api/auth";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(username, password);
      onLogin();
    } catch (err) {
      console.error("Error de login:", err);
      setError("Credenciales incorrectas. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Principal */}
        <div className="bg-white rounded-lg shadow-2xl p-8 md:p-10">
          {/* Logo/Título */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Portal de Acceso
            </h1>
            <p className="text-gray-600 text-sm">
              Sistema ERP para la gestión de tu empresa. Inicia sesión para continuar.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                required
              />
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                required
              />
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium flex items-center">
                  <span className="mr-2">⚠️</span>
                  {error}
                </p>
              </div>
            )}

            {/* Botón Enviar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <span>🔐</span>
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-xs">
              © 2026 Insumos Sushi. Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* Información Adicional */}
        <div className="mt-6 text-center text-white text-sm">
          <p>¿Necesitas ayuda? Contacta al administrador</p>
          <p>Puede tomar algunos minutos si accedes por primera vez</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
