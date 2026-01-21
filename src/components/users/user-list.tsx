'use client'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useUsers, useUserMutations } from '@/hooks/use-users'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, ArrowLeft, PlusCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserForm } from './user-form'

import type { User as SupabaseUser } from '@/lib/supabase';

type User = SupabaseUser & {
  _id?: string;
};

export function UserList() {
  const router = useRouter()
  const { currentUser, isLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { users: rawUsers, isLoading: usersLoading, refetch: refetchUsers } = useUsers({
    requesterId: currentUser?.id
  });

  // Mapear usuários para formato compatível
  const users = rawUsers?.map(u => ({
    ...u,
    _id: u.id,
  }));

  const { createUser, updateUser, deleteUser } = useUserMutations();

  const handleFormSubmit = async (data: any) => {
    if (!currentUser) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Atualiza usuário existente
        const userId = editingUser.id || editingUser._id;
        const updateData: any = {
          name: data.name,
          role: data.role,
        };

        if (data.password) {
          updateData.password = data.password;
        }

        await updateUser(userId!, updateData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Cria novo usuário
        await createUser({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
        });
        toast.success('Usuário criado com sucesso!');
      }

      setIsDialogOpen(false);
      setEditingUser(null);
      refetchUsers();
    } catch (error: any) {
      console.error('Erro ao processar usuário:', error);
      toast.error(error.message || 'Erro ao processar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  }

  const handleNewClick = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  }

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete || !currentUser) return

    try {
      const userId = userToDelete.id || userToDelete._id;
      await deleteUser(userId!)
      toast.success('Usuário excluído com sucesso!')
      setUserToDelete(null);
      refetchUsers();
    } catch (error: any) {
      console.error('Falha ao excluir usuário:', error)
      toast.error(error.message || 'Falha ao excluir usuário.')
    }
  }

  if (isLoading || usersLoading) {
    return <div>Carregando...</div>
  }

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return <div>Acesso negado. Você precisa ser um administrador para ver esta página.</div>
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) setEditingUser(null); }}>        
        <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>          
          <Card>
            <CardHeader>
              <div>
                <div className="mb-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => router.push('/propostas')}>                        
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Usuários</CardTitle>
                    <CardDescription>Gerencie os usuários do sistema.</CardDescription>
                  </div>
                  <div>
                    <Button onClick={handleNewClick}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Novo Usuário
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[200px] font-semibold py-4">Nome</TableHead>
                      <TableHead className="min-w-[250px] font-semibold py-4">Email</TableHead>
                      <TableHead className="w-[120px] font-semibold py-4">Função</TableHead>
                      <TableHead className="w-[60px] py-4"><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.length > 0 ? (
                      users.map((user) => (
                      <TableRow key={user._id} className="hover:bg-muted/50">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-primary">
                                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                              </span>
                            </div>
                            <span className="text-sm font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm py-3 text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditClick(user)}
                              >
                                Editar
                              </DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-red-500"
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={() => handleDeleteClick(user)}
                                >
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso excluirá permanentemente o
                usuário <span className="font-bold">{userToDelete?.name}</span> e removerá seus dados de nossos servidores.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>
                Continuar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Atualize os dados do usuário abaixo.' : 'Preencha os campos abaixo para criar um novo usuário.'}
            </DialogDescription>
          </DialogHeader>
          <UserForm 
            onSubmit={handleFormSubmit} 
            initialData={editingUser || undefined}
            isSubmitting={isSubmitting} 
          />
        </DialogContent>
      </Dialog>
    </>
  )
}