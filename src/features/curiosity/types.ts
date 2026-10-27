export interface StorySource { title: string; url: string }
export interface StorySection { heading: string; paragraphs: string[] }
export interface Discovery {
  kind: 'choice' | 'reveal' | 'connection';
  prompt: string;
  options?: [string, string];
  answer?: number;
  explanation: string;
}
export interface CuriosityStory {
  id: string;
  category: string;
  title: string;
  imageKey: 'laptop' | 'ocean' | 'history' | 'octopus' | 'space' | 'memory' | 'plant' | 'ice';
  imageAlt: string;
  readingMinutes: 2 | 3;
  hook: string;
  discovery: Discovery;
  deepDive: { title: string; paragraphs: string[] };
  article: { intro: string; sections: StorySection[] };
  sources: StorySource[];
}
