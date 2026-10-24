import { NewPage } from '@/app/components/base-pages';
import AccountForm from '@/app/components/pages/account/form';

export default function New() {
  return (
    <NewPage
      backUrl="/contas"
      title="Nova conta"
      sidebarAligned
      breadcrumb={[{ label: 'Contas', href: '/contas' }, { label: 'Nova conta' }]}
    >
      <AccountForm isEditing={false} />
    </NewPage>
  );
}
