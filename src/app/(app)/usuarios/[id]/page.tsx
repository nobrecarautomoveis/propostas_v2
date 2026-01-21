'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { UserForm } from '@/components/users/user-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useUserMutations } from '@/hooks/use-users';
import { getUserById } from '@/services/users.service';
import type { User } from '@/lib/supabase';

interface EditUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null | undefined>(undefined);
  const { updateUser } = useUserMutations();

  // Buscar usuário para edição
  useEffect(() => {
    async function fetchUser() {
      if (currentUser) {
        try {
          const user = await getUserById(id);
          setUserToEdit(user);
        } catch (error) {
          console.error('Erro ao buscar usuário:', error);
          setUserToEdit(null);
        }
      }
    }
    fetchUser();
  }, [currentUser, id]);

  const handleSubmit = async (data: any) => {
    if (!currentUser) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {
        name: data.name,
        role: data.role,
      };

      if (data.password) {
        updateData.password = data.password;
      }

      await updateUser(id, updateData);
      toast.success('Usuário atualizado com sucesso!');
      router.push('/usuarios');
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error(error.message || 'Erro ao atualizar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return <div>Acesso negado. Você precisa ser um administrador.</div>;
  }

  if (userToEdit === undefined) {
    return <div>Carregando...</div>;
  }

  if (!userToEdit) {
    return <div>Usuário não encontrado.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => router.push('/usuarios')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Usuário</CardTitle>
          <CardDescription>Editar informações do usuário {userToEdit.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            onSubmit={handleSubmit}
            initialData={userToEdit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}