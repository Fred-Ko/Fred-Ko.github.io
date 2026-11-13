import { defineCollection } from 'astro:content';
import { postsLoader } from './lib/posts/loader';
import { postSchema } from './lib/posts/schema';

export const collections = {
  posts: defineCollection({
    loader: postsLoader(new URL('./content/posts/', import.meta.url)),
    schema: postSchema,
  }),
};
