import { z } from 'zod';
import { IdSchema, NewsAudienceEnum } from '@smartapp/core';

// /members/news/new: ?item= from Menu's "Tell customers", ?audience= from a member group, ?id= to edit,
// ?copy= to start from a past news.
export const NewsComposeSearchSchema = z.object({
  item: IdSchema.optional().catch(undefined),
  audience: NewsAudienceEnum.optional().catch(undefined),
  id: IdSchema.optional().catch(undefined),
  copy: IdSchema.optional().catch(undefined),
});
export type NewsComposeSearch = z.infer<typeof NewsComposeSearchSchema>;
