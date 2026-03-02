"use client";

import { User } from "@/app/types/user";

interface UserInfoProps {
  user: User;
  isDeleting: boolean;
}

export default function UserInfo({ user, isDeleting }: UserInfoProps) {
  const createdAt = new Date(user.createdAt).toLocaleDateString("pt-BR");
  const updatedAt = new Date(user.updatedAt).toLocaleDateString("pt-BR");

  return (
    <div 
      className={`transition-opacity duration-300 
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{user.name}</h2>

        <p className="text-sm text-slate-300">{user.email}</p>

        <div className="mt-3 text-sm space-y-1 text-slate-400">
          <p>
            <span className="font-medium text-slate-300">Exibir valores:</span>{" "}
            {user.showValues ? "Sim" : "Não"}
          </p>

          <p>
            <span className="font-medium text-slate-300">Criado em:</span>{" "}
            {createdAt}
          </p>

          <p>
            <span className="font-medium text-slate-300">Atualizado em:</span>{" "}
            {updatedAt}
          </p>
        </div>
      </div>
    </div>
  );
};
