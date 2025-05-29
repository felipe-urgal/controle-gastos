"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { HiOutlinePencil, HiOutlineCheck, HiOutlineX } from "react-icons/hi";
import { toast } from "react-toastify";
import Breadcrumb from "@/app/components/Breadcrumb";
import 'react-toastify/dist/ReactToastify.css';
import { Eye, EyeOff } from "lucide-react";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function UsuarioPage() {
  const { user, updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [activeTab, setActiveTab] = useState("dados");
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || ""
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);

    try {
      await updateUser({
        name: formData.name,
        email: formData.email
      });
      toast.success("Dados atualizados com sucesso!");
      setEditMode(false);
    } catch (error) {
      setIsLoading(false);
      toast.error("Erro ao atualizar dados: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setIsLoading(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setIsLoading(false);
      toast.error("As senhas não coincidem");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setIsLoading(false);
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    try {
      await updateUser({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      toast.error("Erro ao alterar senha: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Breadcrumb/>
      
      <div className="max-w-7xl mx-auto">

        <div className="shadow overflow-hidden">
          {/* Abas */}
          <div className="border-b border-gray-700">
            <nav className="flex -mb-px mx-3">
              <button
                onClick={() => setActiveTab("dados")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm 
                  ${activeTab === "dados" ? 'border rounded-t-lg border-gray-700 border-b-gray-900 text-gray-300' 
                    : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Meus Dados
              </button>
              <button
                onClick={() => setActiveTab("senha")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm 
                  ${activeTab === "senha" ? 'border rounded-t-lg border-gray-700 border-b-gray-900 text-gray-300' 
                    : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Alterar Senha
              </button>
            </nav>
          </div>

          {/* Conteúdo das Abas */}
          <div className="p-4">
            {/* Aba Meus Dados */}
            {activeTab === "dados" && (
              <div>
                <div className="flex justify-end items-center mb-6">
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-800 hover:bg-gray-800 cursor-pointer border border-gray-700 px-3 py-1 text-center rounded-lg"
                    >
                      <HiOutlinePencil className="mr-1" /> Editar
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        disabled={isLoading}
                        onClick={handleSaveProfile}
                        className="disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        <HiOutlineCheck className="mr-1" /> {isLoading ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        disabled={isLoading}
                        onClick={() => setEditMode(false)}
                        className="disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
                      >
                        <HiOutlineX className="mr-1" /> Cancelar
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
                    {editMode ? (
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="disabled:opacity-30 disabled:cursor-not-allowed w-full p-2 border border-gray-300 rounded text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="p-2 bg-gray-900 border border-gray-700 rounded text-gray-700">{user?.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                    {editMode ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="disabled:opacity-30 disabled:cursor-not-allowed w-full p-2 border border-gray-300 rounded text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="p-2 bg-gray-900 border border-gray-700 rounded text-gray-700">{user?.email}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Aba Alterar Senha */}
            {activeTab === "senha" && (
              <div>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nova Senha</label>
                    <div className="relative">
                      <input
                        type={mostrarNovaSenha ? "text" : "password"}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="disabled:opacity-30 disabled:cursor-not-allowed w-full p-2 border border-gray-300 rounded text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Digite a nova senha"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                        aria-label={mostrarNovaSenha ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {mostrarNovaSenha ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      A senha deve ter pelo menos 8 caracteres.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Confirmar Nova Senha</label>
                    <div className="relative">
                      <input
                        type={mostrarConfirmarSenha ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="disabled:opacity-30 disabled:cursor-not-allowed w-full p-2 border border-gray-300 rounded text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Confirme a nova senha"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                        aria-label={mostrarConfirmarSenha ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {mostrarConfirmarSenha ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleChangePassword}
                    className="disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    <HiOutlinePencil className="mr-1" /> {isLoading ? "Alterando..." : "Alterar Senha"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}