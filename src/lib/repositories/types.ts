import type { Tables, TablesInsert, TablesUpdate } from '../../types/database';

export interface IListItemRepository {
  getByList(listId: string): Promise<Tables<'list_items'>[]>;
  create(item: TablesInsert<'list_items'>): Promise<Tables<'list_items'>>;
  update(id: string, updates: TablesUpdate<'list_items'>, listId?: string): Promise<void>;
  delete(id: string, listId?: string): Promise<void>;
  clearCompleted(listId: string): Promise<void>;
}
