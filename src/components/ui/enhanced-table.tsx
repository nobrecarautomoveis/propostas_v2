/**
 * 🎨 ENHANCED TABLE - Componente de Tabela Padronizada
 * 
 * Baseado no padrão otimizado da tabela de propostas
 * Reutilizável em todo o sistema
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TABLE, USER, BADGE, TYPOGRAPHY, RESPONSIVE } from '@/lib/design-tokens';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// 📊 TIPOS DE DADOS PARA COLUNAS
export interface TableColumn {
  key: string;
  label: string;
  width?: keyof typeof TABLE.columnWidth;
  responsive?: keyof typeof RESPONSIVE;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

// 👤 COMPONENTE DE USUÁRIO PADRONIZADO
interface UserCellProps {
  user: {
    name: string;
    email?: string;
    avatar?: string;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function UserCell({ user, size = 'md' }: UserCellProps) {
  const avatarSize = USER.avatar[size];
  
  return (
    <div className={USER.container}>
      <div className={cn(
        avatarSize,
        'rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0'
      )}>
        <span className={cn(TYPOGRAPHY.size.xs, TYPOGRAPHY.weight.medium, 'text-primary')}>
          {user.name ? user.name.charAt(0).toUpperCase() : '?'}
        </span>
      </div>
      <div className={USER.info}>
        <span className={USER.name}>{user.name || 'Não encontrado'}</span>
        {user.email && (
          <span className={USER.email}>{user.email}</span>
        )}
      </div>
    </div>
  );
}

// 🏷️ COMPONENTE DE BADGE DE TIPO PADRONIZADO
interface TypeBadgeProps {
  type: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
}

export function TypeBadge({ type, variant = 'info' }: TypeBadgeProps) {
  const variantKey = variant === 'primary' ? 'default' : variant;
  return (
    <span className={cn(
      'inline-block px-2 py-1 rounded-md font-medium',
      BADGE.size.md,
      BADGE.variant[variantKey as keyof typeof BADGE.variant]
    )}>
      {type}
    </span>
  );
}

// 📅 COMPONENTE DE DATA COMPACTA
interface DateCellProps {
  date: Date | string;
  format?: 'short' | 'full';
}

export function DateCell({ date, format = 'short' }: DateCellProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const formatDate = (date: Date) => {
    if (format === 'short') {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <span className={cn(TYPOGRAPHY.size.sm)}>
      {formatDate(dateObj)}
    </span>
  );
}

// 💰 COMPONENTE DE VALOR MONETÁRIO
interface ValueCellProps {
  value: string | number;
  currency?: string;
}

export function ValueCell({ value, currency = 'R$' }: ValueCellProps) {
  return (
    <span className={cn(TYPOGRAPHY.size.sm, TYPOGRAPHY.weight.medium)}>
      {value || 'N/A'}
    </span>
  );
}

// 📊 COMPONENTE DE TABELA ENHANCED
interface EnhancedTableProps {
  columns: TableColumn[];
  data: any[];
  renderCell: (item: any, column: TableColumn) => React.ReactNode;
  onRowClick?: (item: any) => void;
  className?: string;
  emptyMessage?: string;
}

export function EnhancedTable({
  columns,
  data,
  renderCell,
  onRowClick,
  className,
  emptyMessage = 'Nenhum item encontrado'
}: EnhancedTableProps) {
  return (
    <div className={cn(TABLE.container, className)}>
      <Table>
        <TableHeader className={TABLE.header}>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  TABLE.headerCell,
                  column.width && TABLE.columnWidth[column.width],
                  column.responsive && RESPONSIVE[column.responsive],
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <TableRow
                key={item._id || item.id || index}
                className={cn(
                  TABLE.row,
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      TABLE.bodyCell,
                      column.responsive && RESPONSIVE[column.responsive],
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {renderCell(item, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className={cn(TABLE.bodyCell, 'text-center', TYPOGRAPHY.color.secondary)}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// 🎯 EXEMPLO DE USO:
/*
const columns: TableColumn[] = [
  { key: 'id', label: 'ID', width: 'id' },
  { key: 'user', label: 'Usuário', width: 'user', responsive: 'hideOnTablet' },
  { key: 'type', label: 'Tipo', width: 'type' },
  { key: 'date', label: 'Data', width: 'date' },
  { key: 'status', label: 'Status', width: 'status' },
  { key: 'actions', label: '', width: 'actions' }
];

const renderCell = (item: any, column: TableColumn) => {
  switch (column.key) {
    case 'user':
      return <UserCell user={item.user} />;
    case 'type':
      return <TypeBadge type={item.type} variant="info" />;
    case 'date':
      return <DateCell date={item.date} />;
    case 'status':
      return <Badge variant="default">{item.status}</Badge>;
    default:
      return item[column.key];
  }
};

<EnhancedTable
  columns={columns}
  data={items}
  renderCell={renderCell}
  onRowClick={(item) => console.log('Clicked:', item)}
/>
*/
