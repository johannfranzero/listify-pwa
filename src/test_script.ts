import { listItemsApi } from './lib/api.ts';
import { supabase } from './lib/supabase.ts';

async function test() {
  console.log('Testing create + update flow...');
  
  // Fake user id based on what is in list.ts
  const tempId = crypto.randomUUID();
  console.log('tempId:', tempId);
  
  try {
    // We just want to see if `update` throws. Let's try to update a non-existent item.
    await listItemsApi.update(tempId, { completed: true });
    console.log('Update on non-existent item SUCCEEDED (no error thrown)');
  } catch (err) {
    console.error('Update on non-existent item THREW:', err);
  }
}

test();
