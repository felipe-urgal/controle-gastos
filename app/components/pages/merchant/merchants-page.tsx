'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaEdit, FaPlus, FaStore, FaTrash } from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { Button, Input } from '@/app/components/ui';
import { merchantService } from '@/app/services/merchant-service';
import type { MerchantDTO } from '@/app/types/merchant';

export default function MerchantsPage() {
  const [items, setItems] = useState<MerchantDTO[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<MerchantDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await merchantService.getAll({ limit: 100 });
      setItems(response.data?.items ?? []);
    } catch (caught: any) {
      setError(caught?.response?.data?.error?.message ?? caught?.message ?? 'Erro ao carregar estabelecimentos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    merchantService
      .getAll({ limit: 100 })
      .then((response) => {
        if (active) setItems(response.data?.items ?? []);
      })
      .catch((caught: any) => {
        if (!active) return;
        setError(
          caught?.response?.data?.error?.message ??
            caught?.message ??
            'Erro ao carregar estabelecimentos',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return items;
    return items.filter((item) => item.name.toLocaleLowerCase('pt-BR').includes(query));
  }, [items, search]);

  function startEdit(item: MerchantDTO) {
    setEditing(item);
    setName(item.name);
    setError(null);
  }

  function resetForm() {
    setEditing(null);
    setName('');
  }

  async function save() {
    const normalized = name.trim();
    if (normalized.length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await merchantService.update(editing.id, { name: normalized });
      } else {
        await merchantService.create({ name: normalized });
      }
      resetForm();
      await load();
    } catch (caught: any) {
      setError(caught?.response?.data?.error?.message ?? caught?.message ?? 'Erro ao salvar estabelecimento');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: MerchantDTO) {
    setError(null);
    try {
      await merchantService.update(item.id, { isActive: !item.isActive });
      await load();
    } catch (caught: any) {
      setError(caught?.response?.data?.error?.message ?? caught?.message ?? 'Erro ao atualizar estabelecimento');
    }
  }

  async function remove(item: MerchantDTO) {
    if (!window.confirm(`Excluir "${item.name}"? As transações serão preservadas e ficarão sem estabelecimento.`)) {
      return;
    }

    setError(null);
    try {
      await merchantService.delete(item.id);
      if (editing?.id === item.id) resetForm();
      await load();
    } catch (caught: any) {
      setError(caught?.response?.data?.error?.message ?? caught?.message ?? 'Erro ao excluir estabelecimento');
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--orbit-primary)]">Organização</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">Estabelecimentos</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Padronize onde suas transações aconteceram sem alterar a descrição original.
            </p>
          </div>
          <p className="text-sm text-[var(--text-muted)]">{items.length} cadastrado(s)</p>
        </header>

        {error ? (
          <div role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
            {error}
          </div>
        ) : null}

        <section className="ds-panel mt-4 p-4 sm:p-5" aria-labelledby="merchant-form-heading">
          <div className="flex items-center gap-2">
            <FaStore className="text-[var(--orbit-primary)]" aria-hidden="true" />
            <h2 id="merchant-form-heading" className="font-semibold text-[var(--foreground)]">
              {editing ? 'Editar estabelecimento' : 'Novo estabelecimento'}
            </h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Input
              label="Nome"
              value={name}
              maxLength={120}
              disabled={saving}
              placeholder="Ex.: iFood, Supermercado Central"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void save();
                }
              }}
            />
            <div className="flex gap-2">
              {editing ? (
                <Button type="button" variant="secondary" disabled={saving} onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
              <Button type="button" isLoading={saving} onClick={() => void save()} icon={editing ? <FaEdit /> : <FaPlus />}>
                {editing ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </section>

        <section className="ds-panel mt-4 overflow-hidden" aria-labelledby="merchant-list-heading">
          <div className="border-b border-[var(--border)] p-4 sm:p-5">
            <h2 id="merchant-list-heading" className="font-semibold text-[var(--foreground)]">Seus estabelecimentos</h2>
            <div className="mt-3">
              <Input
                aria-label="Buscar estabelecimentos"
                placeholder="Buscar por nome"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <p className="p-5 text-sm text-[var(--text-muted)]">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="p-5 text-sm text-[var(--text-muted)]">Nenhum estabelecimento encontrado.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((item) => (
                <article key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="break-words text-[var(--foreground)]">{item.name}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.isActive ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'}`}>
                        {item.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {item.transactionsCount} transação(ões) vinculada(s)
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(item)} icon={<FaEdit />}>
                      Editar
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => void toggleActive(item)}>
                      {item.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => void remove(item)} icon={<FaTrash />}>
                      Excluir
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
