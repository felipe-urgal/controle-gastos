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
  FaUser,
  FaEnvelope,
  FaKey,
  FaShieldAlt
} from "react-icons/fa";

// components
import { ProtectedRoute, Input, Button, Tabs, TabsList, TabsTrigger, TabsContent, Loading, DeleteAccountModal } from "@/app/components";

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
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 overflow-hidden shadow-xl h-auto">
        <Tabs 
          defaultValue="dados" 
          value={activeTab} 
          onValueChange={setActiveTab}
        >
          <div className="bg-gray-800/40 border-b border-gray-700/30 p-1">
            <TabsList className="flex">
              <TabsTrigger 
                value="dados" 
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:shadow-sm"
              >
                <FaUser className="w-4 h-4" />
                <span className="hidden sm:inline">Meus Dados</span>
              </TabsTrigger>
              <TabsTrigger 
                value="senha" 
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 data-[state=active]:shadow-sm"
              >
                <FaShieldAlt className="w-4 h-4" />
                <span className="hidden sm:inline">Segurança</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* DADOS */}
          <TabsContent value="dados" className="px-4 pb-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-2">
              <div>
                <h2 className="text-xl font-semibold text-white">Informações Pessoais</h2>
                <p className="text-gray-400 text-sm">Gerencie suas informações de perfil</p>
              </div>
              <div className="flex gap-2">
                {!editMode ? (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => setEditMode(true)}
                      size='sm'
                      icon={<FaPencilAlt size={12} />}
                    >
                      Editar
                    </Button>
                    <DeleteAccountModal />
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      size='sm'
                      icon={<FaCheck size={12} />}
                    >
                      {isLoading ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setEditMode(false)}
                      disabled={isLoading}
                      size='sm'
                      icon={<FaTimes size={12} />}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="">
              <div className="grid grid-cols-1 gap-2">
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Nome
                  </label>
                  {editMode ? (
                    <Input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      icon={<FaUser size={12} className="text-gray-500"/>}
                      className="bg-gray-800/50 border-gray-700"
                      size='sm'
                    />
                  ) : (
                    <div className="flex items-center p-2 bg-gray-800/50 rounded-md border border-gray-700 text-white text-sm">
                      <FaUser className="h-3 w-3 mr-3 text-gray-500" />
                      {user?.name}
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Email
                  </label>
                  {editMode ? (
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      icon={<FaEnvelope size={12} className="text-gray-500"/>}
                      className="bg-gray-800/50 border-gray-700"
                      size='sm'
                    />
                  ) : (
                    <div className="flex items-center p-2 bg-gray-800/50 rounded-md border border-gray-700 text-white text-sm">
                      <FaEnvelope className="h-3 w-3 mr-3 text-gray-500" />
                      {user?.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SENHA */}
          <TabsContent value="senha" className="px-4 pb-3">
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-white">Alterar Senha</h2>
              <p className="text-gray-400 text-sm">Proteja sua conta com uma senha segura</p>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Senha Atual
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite sua senha atual"
                    disabled={isLoading}
                    icon={<FaLock size={12} className="text-gray-500" />}
                    className="bg-gray-800/50 border-gray-700 pr-12"
                    size='sm'
                  />
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Nova Senha
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite a nova senha"
                    disabled={isLoading}
                    icon={<FaKey size={12} className="text-gray-500" />}
                    className="bg-gray-800/50 border-gray-700 pr-12"
                    size='sm'
                  />
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
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirme a nova senha"
                    disabled={isLoading}
                    icon={<FaKey size={12} className="text-gray-500" />}
                    className="bg-gray-800/50 border-gray-700 pr-12"
                    size='sm'
                  />
                </div>
              </div>

              <div className="">
                <Button
                  onClick={handleChangePassword}
                  disabled={isLoading}
                  variant='primary'
                  icon={<FaLock size={12} />}
                  size="sm"
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