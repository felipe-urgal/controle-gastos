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
} from "react-icons/fa";

// components
import { toast } from "react-toastify";
import Breadcrumb from "@/app/components/Breadcrumb";
import "react-toastify/dist/ReactToastify.css";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

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

        <Tabs defaultValue="dados" className="bg-gray-800">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 overflow-hidden border-b border-gray-700">
            <TabsTrigger value="dados" className="border-r border-gray-700">
              <FaUser className="w-4 h-4" />
              Meus Dados
            </TabsTrigger>
            <TabsTrigger value="senha" className="">
              <FaKey className="w-4 h-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          {/* DADOS */}
          <TabsContent value="dados" className="flex items-center justify-center">
            <div className="w-full bg-gray-800 p-3 border border-gray-800 transition-all mb-4">
              <div className="flex justify-end items-center mb-3">
                {!editMode ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setEditMode(true)}
                    className="gap-2"
                  >
                    <FaPencilAlt size={16} />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      
                      variant="success"
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <FaCheck size={16} />
                      {isLoading ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditMode(false)}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <FaTimes size={16} />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  {editMode ? (
                    <Input
                      label="Nome"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      icon={<FaUser size={16}/>}
                    />
                  ) : (
                    <div className="flex items-center p-2 bg-gray-800 rounded-md border border-gray-600/50 text-gray-600/50">
                      <FaUser className="h-4 w-4 mr-3" />
                      {user?.name}
                    </div>
                  )}
                </div>

                <div>
                  {editMode ? (
                    <Input
                      label="Email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      icon={<FaEnvelope size={16}/>}
                    />
                  ) : (
                    <div className="flex items-center p-2 bg-gray-800 rounded-md border border-gray-600/50 text-gray-600/50">
                      <FaEnvelope className="h-4 w-4 mr-3" />
                      {user?.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SENHA */}
          <TabsContent value="senha" className="flex items-center justify-center">
            <div className="w-full bg-gray-800 p-3 shadow-xl border border-gray-800 transition-all">
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
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
                      icon={<FaLock size={16} />}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
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

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
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
                      icon={<FaKey size={16} />}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                      onClick={() => togglePasswordVisibility("new")}
                    >
                      {showPasswordFields.new ? (
                        <FaEyeSlash size={16} />
                      ) : (
                        <FaEye size={16} />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    A senha deve conter pelo menos 8 caracteres.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
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
                      icon={<FaKey size={16} />}
                    />
                    
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
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

                <div className="pt-2 text-right">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    variant='primary'
                    icon={<FaLock size={17} />}
                  >
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