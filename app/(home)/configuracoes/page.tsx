"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { HiOutlinePencil, HiOutlineCheck, HiOutlineX, HiOutlineLockClosed } from "react-icons/hi";
import { toast } from "react-toastify";
import Breadcrumb from "@/app/components/Breadcrumb";
import 'react-toastify/dist/ReactToastify.css';
import { Eye, EyeOff, User, Mail, Key } from "lucide-react";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

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
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || ""
      });
      setIsLoading(false);
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

  const togglePasswordVisibility = (field: keyof typeof showPasswordFields) => {
    setShowPasswordFields(prev => ({
      ...prev,
      [field]: !prev[field]
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
        email: formData.email
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
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
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
        newPassword: passwordData.newPassword
      });
      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      toast.error(`Erro ao alterar senha: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-5xl mx-auto p-6 mt-5 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />
        
        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="dados">
              <User className="w-4 h-4 mr-2" />
              Meus Dados
            </TabsTrigger>
            <TabsTrigger value="senha">
              <Key className="w-4 h-4 mr-2" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-6">
            <div className="bg-gray-900 rounded-lg p-6 shadow">
              <div className="flex justify-between items-center mb-6">
                {!editMode ? (
                  <Button 
                    variant="primary" 
                    onClick={() => setEditMode(true)}
                    className="gap-2"
                  >
                    <HiOutlinePencil size={16} />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <HiOutlineCheck size={16} />
                      {isLoading ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setEditMode(false)}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <HiOutlineX size={16} />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nome</label>
                  {editMode ? (
                    <div className="relative">
                      <Input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="pl-10"
                      />
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  ) : (
                    <div className="flex items-center p-3 bg-gray-800 rounded-md border border-gray-700 text-gray-300">
                      <User className="h-4 w-4 mr-3 text-gray-400" />
                      {user?.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                  {editMode ? (
                    <div className="relative">
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="pl-10"
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  ) : (
                    <div className="flex items-center p-3 bg-gray-800 rounded-md border border-gray-700 text-gray-300">
                      <Mail className="h-4 w-4 mr-3 text-gray-400" />
                      {user?.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="senha" className="mt-6">
            <div className="bg-gray-900 rounded-lg p-6 shadow">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Senha Atual</label>
                  <div className="relative">
                    <Input
                      type={showPasswordFields.current ? "text" : "password"}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Digite sua senha atual"
                      disabled={isLoading}
                      className="pl-10"
                    />
                    <HiOutlineLockClosed className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      onClick={() => togglePasswordVisibility("current")}
                    >
                      {showPasswordFields.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nova Senha</label>
                  <div className="relative">
                    <Input
                      type={showPasswordFields.new ? "text" : "password"}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Digite a nova senha"
                      disabled={isLoading}
                      className="pl-10"
                    />
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      onClick={() => togglePasswordVisibility("new")}
                    >
                      {showPasswordFields.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    A senha deve conter pelo menos 8 caracteres.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Input
                      type={showPasswordFields.confirm ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirme a nova senha"
                      disabled={isLoading}
                      className="pl-10"
                    />
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      onClick={() => togglePasswordVisibility("confirm")}
                    >
                      {showPasswordFields.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <HiOutlineLockClosed size={16} />
                    {isLoading ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}