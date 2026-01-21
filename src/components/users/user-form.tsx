'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import type { User } from '@/lib/supabase';

// Zod schema for form validation
const formSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Email inválido."),
  role: z.enum(["ADMIN", "USER"], { required_error: "Selecione uma função." }),
  password: z.string().optional(),
});

// Type derived from the Zod schema
export type UserFormData = z.infer<typeof formSchema>;

// Component props
type UserFormProps = {
  onSubmit: (data: UserFormData) => void;
  initialData?: User;
  isSubmitting: boolean;
};

export function UserForm({ onSubmit, initialData, isSubmitting }: UserFormProps) {

  const form = useForm<UserFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      role: initialData?.role || 'USER', // Mudança aqui
      password: '',
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        email: initialData.email,
        role: initialData.role,
        password: '',
      });
    } else {
      // Nos valores padrão do formulário
      form.reset({
        name: '',
        email: '',
        role: 'USER',  // Alterado de 'VENDEDOR' para 'USER'
        password: '',
      });
    }
  }, [initialData, form]);

  // Form submission handler
  function handleFormSubmit(values: UserFormData) {
    const dataToSubmit: Partial<UserFormData> & { email: string } = { ...values };
    if (initialData && !values.password) {
      delete dataToSubmit.password;
    }
    onSubmit(dataToSubmit as UserFormData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do usuário" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} disabled={!!initialData} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Senha {initialData ? '(Deixe em branco para não alterar)' : ''}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="******" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Função</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="USER">Usuário</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : initialData ? (
              'Salvar Alterações'
            ) : (
              'Criar Usuário'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}