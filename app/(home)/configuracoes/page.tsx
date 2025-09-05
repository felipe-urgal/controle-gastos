"use client";

// Hooks
import { useState, useEffect } from "react";

// context
import { useAuth } from "@/app/context/AuthContext";

// Icons
import { 
  FaPencilAlt, 
  FaCheck, 
  FaTimes, 
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaEnvelope,
  FaKey,
  FaShieldAlt
} from "react-icons/fa";

// components
import { ProtectedRoute, Input, Button, Tabs, TabsList, TabsTrigger, TabsContent, Loading } from "@/app/components";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function UsuarioPage() {
  const { user, updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dados");

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
      });
      setIsLoading(false);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswordFields) => {
    setShowPasswordFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setIsLoading(true);
    try {
      await updateUser({
        name: formData.name,
        email: formData.email,
      });
      toast.success("Dados atualizados com sucesso!");
      setEditMode(false);
    } catch (error) {
      toast.error(`Erro ao atualizar dados: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast.error("Preencha todos os campos de senha");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    setIsLoading(true);
    try {
      await updateUser({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(`Erro ao alterar senha: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />
  }

  return (
    <ProtectedRoute>
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 overflow-hidden shadow-xl">
        <Tabs 
          defaultValue="dados" 
          value={activeTab} 
          onValueChange={setActiveTab}
        >
          <div className="bg-gray-800/40 border-b border-gray-700/30 p-1">
            <TabsList className="flex">
              <TabsTrigger 
                value="dados" 
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:shadow-sm"
              >
                <FaUser className="w-4 h-4" />
                <span className="hidden sm:inline">Meus Dados</span>
              </TabsTrigger>
              <TabsTrigger 
                value="senha" 
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 data-[state=active]:shadow-sm"
              >
                <FaShieldAlt className="w-4 h-4" />
                <span className="hidden sm:inline">Segurança</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* DADOS */}
          <TabsContent value="dados" className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Informações Pessoais</h2>
                <p className="text-gray-400 text-sm">Gerencie suas informações de perfil</p>
              </div>
              <div className="flex gap-2">
                {!editMode ? (
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(true)}
                    className="gap-2 border-gray-600 hover:border-blue-500 hover:text-blue-400"
                  >
                    <FaPencilAlt size={14} />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <FaCheck size={14} />
                      {isLoading ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setEditMode(false)}
                      disabled={isLoading}
                      className="gap-2 text-gray-400 hover:text-gray-300"
                    >
                      <FaTimes size={14} />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Nome
                  </label>
                  {editMode ? (
                    <Input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      icon={<FaUser size={14} className="text-gray-500"/>}
                      className="bg-gray-800/50 border-gray-700"
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-800/50 rounded-md border border-gray-700 text-white">
                      <FaUser className="h-4 w-4 mr-3 text-gray-500" />
                      {user?.name}
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email
                  </label>
                  {editMode ? (
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      icon={<FaEnvelope size={14} className="text-gray-500"/>}
                      className="bg-gray-800/50 border-gray-700"
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-800/50 rounded-md border border-gray-700 text-white">
                      <FaEnvelope className="h-4 w-4 mr-3 text-gray-500" />
                      {user?.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SENHA */}
          <TabsContent value="senha" className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Alterar Senha</h2>
              <p className="text-gray-400 text-sm">Proteja sua conta com uma senha segura</p>
            </div>

            <div className="space-y-5 max-w-2xl">
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Senha Atual
                </label>
                <div className="relative">
                  <Input
                    type={showPasswordFields.current ? "text" : "password"}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite sua senha atual"
                    disabled={isLoading}
                    icon={<FaLock size={14} className="text-gray-500" />}
                    className="bg-gray-800/50 border-gray-700 pr-12"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                    onClick={() => togglePasswordVisibility("current")}
                  >
                    {showPasswordFields.current ? (
                      <FaEyeSlash size={16} />
                    ) : (
                      <FaEye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Nova Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPasswordFields.new ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite a nova senha"
                    disabled={isLoading}
                    icon={<FaKey size={14} className="text-gray-500" />}
                    className="bg-gray-800/50 border-gray-700 pr-12"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                    onClick={() => togglePasswordVisibility("new")}
                  >
                    {showPasswordFields.new ? (
                      <FaEyeSlash size={16} />
                    ) : (
                      <FaEye size={16} />
                    )}
                  </button>
                </div>
                <p className="mt-3 text-xs text-gray-500 bg-gray-900/30 p-2 rounded">
                  A senha deve conter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPasswordFields.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirme a nova senha"
                    disabled={isLoading}
                    icon={<FaKey size={14} className="text-gray-500" />}
                    className="bg-gray-800/50 border-gray-700 pr-12"
                  />
                  
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                    onClick={() => togglePasswordVisibility("confirm")}
                  >
                    {showPasswordFields.confirm ? (
                      <FaEyeSlash size={16} />
                    ) : (
                      <FaEye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={isLoading}
                  variant='primary'
                  icon={<FaLock size={16} />}
                  className="w-full md:w-auto"
                >
                  {isLoading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}