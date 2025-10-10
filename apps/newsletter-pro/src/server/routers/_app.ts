import { router } from '../trpc';
import { campaignsRouter } from './campaigns';
import { campaignsRouterSupabase } from './campaigns-supabase';
import { listsRouter } from './lists';
import { templatesRouter } from './templates';

export const appRouter = router({
  campaigns: campaignsRouter,
  campaignsSupabase: campaignsRouterSupabase,
  lists: listsRouter,
  templates: templatesRouter,
});

export type AppRouter = typeof appRouter;
