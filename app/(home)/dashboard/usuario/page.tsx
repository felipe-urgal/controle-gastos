"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineFolderOpen,
} from "react-icons/hi";
import { toast } from "react-toastify";
import Breadcrumb from "@/app/components/Breadcrumb";
import 'react-toastify/dist/ReactToastify.css';
import { Eye, EyeOff } from "lucide-react";
import Modal from "@/app/components/Modal";
import ProtectedRoute from "@/app/components/ProtectedRoute";

interface Categoria {
  id: string;
  nome: string;
  userId: string;
}

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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [editandoCategoria, setEditandoCategoria] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const itensPorPagina = 5;
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<string | null>(null);

  const carregarCategorias = useCallback(async (pagina: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/categorias?userId=${user?.id}&pagina=${pagina}&limite=${itensPorPagina}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar categorias');
      }
      
      const { data } = await response.json();
      setCategorias(data.categorias || []);
      setTotalPaginas(Math.ceil(data.total / itensPorPagina));
      setPaginaAtual(pagina);
    } catch (error) {
      toast.error((error as Error).message);
      setCategorias([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);
  
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || ""
      });
      carregarCategorias();
    }
  }, [user, carregarCategorias]);


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

  // Funções para CRUD de categorias

  const adicionarCategoria = async () => {
    if (!novaCategoria.trim()) {
      toast.error("O nome da categoria não pode estar vazio");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nome: novaCategoria,
          userId: user?.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar categoria');
      }

      // const { data } = await response.json();
      carregarCategorias(1); // Recarrega a primeira página
      setNovaCategoria("");
      toast.success("Categoria adicionada com sucesso!");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const iniciarEdicao = (categoria: Categoria) => {
    setEditandoCategoria(categoria.id);
    setNomeEditado(categoria.nome);
  };

  const cancelarEdicao = () => {
    setEditandoCategoria(null);
    setNomeEditado("");
  };

  const salvarEdicao = async (id: string) => {
    if (!nomeEditado.trim()) {
      toast.error("O nome da categoria não pode estar vazio");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/categorias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          nome: nomeEditado,
          userId: user?.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar categoria');
      }

      await response.json(); // Removida a atribuição à variável não utilizada
      setCategorias(categorias.map(cat => cat.id === id ? {...cat, nome: nomeEditado} : cat));
      setEditandoCategoria(null);
      toast.success("Categoria atualizada com sucesso!");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      recarregarCategorias();
    }
  };

  const solicitarExclusao = (id: string) => {
    setCategoriaParaExcluir(id);
    setModalAberto(true);
  };

  const excluirCategoria = async () => {
    if (!categoriaParaExcluir) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/categorias`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoriaParaExcluir }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.transacoesCount > 0) {
          throw new Error(`Esta categoria possui ${errorData.transacoesCount} transações vinculadas e não pode ser excluída`);
        }
        throw new Error(errorData.error || 'Erro ao excluir categoria');
      }

      setCategorias(categorias.filter(cat => cat.id !== categoriaParaExcluir));
      toast.success("Categoria excluída com sucesso!");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setModalAberto(false);
      setCategoriaParaExcluir(null);
      recarregarCategorias();
    }
  };

  const recarregarCategorias = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/categorias?userId=${user?.id}&pagina=${paginaAtual}&limite=${itensPorPagina}`
      );
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const { data } = await response.json();
      setCategorias(data.categorias || []);
    } catch (error) {
      console.error("Falha ao recarregar categorias:", error);
      toast.error("Falha ao atualizar categorias");
      setCategorias([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        <Breadcrumb showMonthLink={true} userLink={true} />

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
              <button
                onClick={() => setActiveTab("categorias")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === "categorias" ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Minhas Categorias
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

            {activeTab === "categorias" && (
              <div className="max-w-3xl mx-auto px-2 sm:px-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">Minhas Categorias</h2>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button
                      onClick={recarregarCategorias}
                      disabled={isLoading}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
                      title="Recarregar categorias"
                    >
                      <HiOutlineRefresh className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Formulário de adição - Mobile otimizado */}
                <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100 mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                      type="text"
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value)}
                      placeholder="Nome da nova categoria"
                      className={`flex-1 p-2 sm:p-3 border ${
                        isLoading ? 'bg-gray-50' : 'bg-white'
                      } border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                      onKeyDown={(e) => e.key === 'Enter' && !isLoading && adicionarCategoria()}
                      disabled={isLoading}
                    />
                    <button
                      onClick={adicionarCategoria}
                      disabled={!novaCategoria.trim() || isLoading}
                      className={`flex items-center justify-center gap-1 sm:gap-2 ${
                        isLoading ? 'bg-blue-400' : 'bg-blue-600'
                      } text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors`}
                    >
                      {isLoading ? (
                        <HiOutlineRefresh className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <>
                          <HiOutlinePlus className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-sm sm:text-base">Adicionar</span>
                        </>
                      )}
                    </button>
                  </div>
                  {novaCategoria.length > 30 && (
                    <p className="mt-1 text-xs text-red-500">
                      Nome muito longo (máx. 30 caracteres)
                    </p>
                  )}
                </div>

                {/* Lista de categorias - Mobile friendly */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  {isLoading && categorias.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <HiOutlineRefresh className="mx-auto w-6 h-6 sm:w-8 sm:h-8 text-gray-400 animate-spin" />
                      <p className="mt-2 text-sm sm:text-base text-gray-500">Carregando categorias...</p>
                    </div>
                  ) : categorias.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <HiOutlineFolderOpen className="mx-auto w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                      <p className="mt-2 text-sm sm:text-base text-gray-500">Nenhuma categoria cadastrada</p>
                      <p className="text-xs sm:text-sm text-gray-400">
                        Comece adicionando sua primeira categoria acima
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {Array.isArray(categorias) &&
                        categorias.map((categoria) => (
                          <li
                            key={`cat-${categoria.id}`}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            {editandoCategoria === categoria.id ? (
                              <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch">
                                <input
                                  type="text"
                                  value={nomeEditado}
                                  onChange={(e) => setNomeEditado(e.target.value)}
                                  className={`flex-1 p-2 sm:p-3 border ${
                                    isLoading ? 'bg-gray-50' : 'bg-white'
                                  } border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isLoading) salvarEdicao(categoria.id)
                                    if (e.key === 'Escape') cancelarEdicao()
                                  }}
                                  disabled={isLoading}
                                />
                                <div className="flex justify-end sm:justify-start gap-1 sm:gap-2">
                                  <button
                                    onClick={() => salvarEdicao(categoria.id)}
                                    disabled={
                                      !nomeEditado.trim() ||
                                      nomeEditado === categoria.nome ||
                                      isLoading
                                    }
                                    className="p-1 sm:p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full disabled:text-green-300 disabled:hover:bg-transparent transition-colors"
                                    title="Salvar alterações"
                                  >
                                    <HiOutlineCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                  <button
                                    onClick={cancelarEdicao}
                                    disabled={isLoading}
                                    className="p-1 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors disabled:text-red-300 disabled:hover:bg-transparent"
                                    title="Cancelar edição"
                                  >
                                    <HiOutlineX className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                                <span className="font-medium text-gray-800 text-sm sm:text-base break-all">
                                  {categoria.nome}
                                </span>
                                {!isLoading && (
                                  <div className="flex gap-1 sm:gap-2 self-end sm:self-auto">
                                    <button
                                      onClick={() => iniciarEdicao(categoria)}
                                      disabled={isLoading}
                                      className="p-1 sm:p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                                      title="Editar categoria"
                                    >
                                      <HiOutlinePencil className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                    <button
                                      onClick={() => solicitarExclusao(categoria.id)}
                                      disabled={isLoading}
                                      className="p-1 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                      title="Excluir categoria"
                                    >
                                      <HiOutlineTrash className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                {/* Paginação mobile-friendly */}
                {/* Paginação mobile-friendly */}
                {totalPaginas > 1 && (
                  <div className="flex flex-col items-center mt-4 sm:mt-6 gap-3">
                    <div className="text-xs sm:text-sm text-gray-500 text-center">
                      Página {paginaAtual} de {totalPaginas}
                    </div>
                    <nav className="flex items-center gap-1">
                      <button
                        onClick={() => carregarCategorias(paginaAtual - 1)}
                        disabled={paginaAtual === 1 || isLoading}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      
                      {/* Always show first page */}
                      {paginaAtual > 2 && (
                        <button
                          key={1}
                          onClick={() => carregarCategorias(1)}
                          disabled={isLoading}
                          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded border ${
                            1 === paginaAtual
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          1
                        </button>
                      )}

                      {/* Show ellipsis if needed */}
                      {paginaAtual > 3 && (
                        <span className="px-1 text-gray-500">...</span>
                      )}

                      {/* Show current page and neighbors */}
                      {[
                        paginaAtual - 1,
                        paginaAtual,
                        paginaAtual + 1
                      ]
                      .filter(page => page > 0 && page <= totalPaginas)
                      .map(page => (
                        <button
                          key={page}
                          onClick={() => carregarCategorias(page)}
                          disabled={isLoading}
                          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded border ${
                            page === paginaAtual
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      {/* Show ellipsis if needed */}
                      {paginaAtual < totalPaginas - 2 && (
                        <span className="px-1 text-gray-500">...</span>
                      )}

                      {/* Always show last page if not already shown */}
                      {paginaAtual < totalPaginas - 1 && (
                        <button
                          key={totalPaginas}
                          onClick={() => carregarCategorias(totalPaginas)}
                          disabled={isLoading}
                          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded border ${
                            totalPaginas === paginaAtual
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {totalPaginas}
                        </button>
                      )}
                      
                      <button
                        onClick={() => carregarCategorias(paginaAtual + 1)}
                        disabled={paginaAtual === totalPaginas || isLoading}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próxima
                      </button>
                    </nav>
                    
                    <div className="text-xs sm:text-sm text-gray-500 text-center">
                      Mostrando {((paginaAtual - 1) * itensPorPagina) + 1}-
                      {Math.min(
                        paginaAtual * itensPorPagina,
                        categorias.length + ((paginaAtual - 1) * itensPorPagina)
                      )}{' '}
                      de {totalPaginas * itensPorPagina} categorias
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Modal
          isOpen={modalAberto}
          onClose={() => {
            setModalAberto(false);
            setCategoriaParaExcluir(null);
          }}
          onConfirm={excluirCategoria}
          mensagem="Tem certeza que deseja excluir esta categoria?"
        />
      </div>
    </ProtectedRoute>
  );
}