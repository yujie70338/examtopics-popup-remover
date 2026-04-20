import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'ExamTopics Popup Remover',
    description: 'Automatically removes the delayed popup on ExamTopics discussion pages.',
    version: '1.0.0',
    icons: {
      16: '/icon-16.png',
      48: '/icon-48.png',
      128: '/icon-128.png',
    },
    host_permissions: ['*://www.examtopics.com/*'],
  },
});
