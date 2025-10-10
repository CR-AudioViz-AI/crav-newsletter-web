import { router } from '../trpc';
import { campaignsRouter } from './campaigns';

export const appRouter = router({
  campaigns: campaignsRouter,
});

export type AppRouter = typeof appRouter;
