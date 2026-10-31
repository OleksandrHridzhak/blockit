import { curiosityStories } from '@/features/curiosity/content';

export function generateStaticParams() {
  return curiosityStories.map(story => ({ id: story.id }));
}

export { default } from '@/features/curiosity/StoryScreen';
