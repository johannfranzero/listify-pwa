import { listItemsApi } from '../api';
import { IListItemRepository } from './types';
import type { Tables, TablesInsert, TablesUpdate } from '../../types/database';

/**
 * Concrete implementation of IListItemRepository backed by Supabase.
 * Currently delegates to listItemsApi which handles optimistic offline queuing.
 */
export class SupabaseListItemRepository implements IListItemRepository {
  async getByList(listId: string): Promise<Tables<'list_items'>[]> {
    return listItemsApi.getByList(listId);
  }

  async create(item: TablesInsert<'list_items'>): Promise<Tables<'list_items'>> {
    return listItemsApi.create(item);
  }

  async update(id: string, updates: TablesUpdate<'list_items'>, listId?: string): Promise<void> {
    return listItemsApi.update(id, updates, listId);
  }

  async delete(id: string, listId?: string): Promise<void> {
    return listItemsApi.delete(id, listId);
  }

  async clearCompleted(listId: string): Promise<void> {
    return listItemsApi.clearCompleted(listId);
  }
}

// Default export instance for immediate use. In a fully DI-driven app,
// this would be provided through context or a factory.
export const listItemRepository = new SupabaseListItemRepository();
