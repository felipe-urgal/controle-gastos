"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX
} from "react-icons/hi";
import { toast } from "react-toastify";
import Breadcrumb from "@/app/components/Breadcrumb"; // Ajuste o caminho conforme sua estrutura
import 'react-toastify/dist/ReactToastify.css';
import { Eye, EyeOff } from "lucide-react";

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
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  

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
    try {
      await updateUser({
        name: formData.name,
        email: formData.email
      });
      toast.success("Dados atualizados com sucesso!");
      setEditMode(false);
    } catch (error) {
      toast.error("Erro ao atualizar dados: " + (error as Error).message);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (passwordData.newPassword.length < 8) {
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
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">

      <Breadcrumb showMonthLink={true} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Abas */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("dados")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === "dados" ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Meus Dados
            </button>
            <button
              onClick={() => setActiveTab("senha")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === "senha" ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Alterar Senha
            </button>
          </nav>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-4 sm:p-6">
          {/* Aba Meus Dados */}
          {activeTab === "dados" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium">Informações Pessoais</h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <HiOutlinePencil className="mr-1" /> Editar
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveProfile}
                      className="flex items-center bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      <HiOutlineCheck className="mr-1" /> Salvar
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex items-center bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
                    >
                      <HiOutlineX className="mr-1" /> Cancelar
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  {editMode ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="p-2 bg-gray-50 rounded">{user?.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  {editMode ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="p-2 bg-gray-50 rounded">{user?.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Aba Alterar Senha */}
          {activeTab === "senha" && (
            <div>
              <h2 className="text-lg font-medium mb-6">Alterar Senha</h2>
              
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                  <div className="relative">
                    <input
                      type={mostrarSenhaAtual ? "text" : "password"}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full p-2 border border-gray-300 rounded pr-10"
                      placeholder="Digite sua senha atual"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                      aria-label={mostrarSenhaAtual ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {mostrarSenhaAtual ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={mostrarNovaSenha ? "text" : "password"}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full p-2 border border-gray-300 rounded pr-10"
                      placeholder="Digite a nova senha"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                  <div className="relative">
                    <input
                      type={mostrarConfirmarSenha ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full p-2 border border-gray-300 rounded pr-10"
                      placeholder="Confirme a nova senha"
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
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Alterar Senha
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}