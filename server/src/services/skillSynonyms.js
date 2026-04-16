/**
 * skillSynonyms.js
 * Master skill dictionary for the SkillSwap NLP service.
 *
 * synonyms: maps any alias → canonical skill name
 * clusters: groups canonical skills into topic buckets for suggestions
 */

const synonyms = {
  // JavaScript Ecosystem
  js: 'JavaScript', javascript: 'JavaScript', 'java script': 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript',
  react: 'React', reactjs: 'React', 'react.js': 'React',
  next: 'Next.js', nextjs: 'Next.js', 'next.js': 'Next.js',
  vue: 'Vue.js', vuejs: 'Vue.js', 'vue.js': 'Vue.js',
  angular: 'Angular', angularjs: 'Angular',
  svelte: 'Svelte', sveltekit: 'SvelteKit',
  node: 'Node.js', nodejs: 'Node.js', 'node.js': 'Node.js',
  express: 'Express.js', expressjs: 'Express.js',
  deno: 'Deno', bun: 'Bun',

  // Markup & Styling
  html: 'HTML', html5: 'HTML',
  css: 'CSS', css3: 'CSS',
  sass: 'Sass', scss: 'Sass',
  tailwind: 'Tailwind CSS', tailwindcss: 'Tailwind CSS',
  bootstrap: 'Bootstrap',

  // Python Ecosystem
  python: 'Python', py: 'Python',
  django: 'Django', flask: 'Flask', fastapi: 'FastAPI',

  // AI / ML
  ml: 'Machine Learning', 'machine learning': 'Machine Learning',
  ai: 'Artificial Intelligence', 'artificial intelligence': 'Artificial Intelligence',
  dl: 'Deep Learning', 'deep learning': 'Deep Learning',
  nlp: 'Natural Language Processing', 'natural language processing': 'Natural Language Processing',
  ds: 'Data Science', 'data science': 'Data Science',
  tf: 'TensorFlow', tensorflow: 'TensorFlow',
  pytorch: 'PyTorch', 'torch': 'PyTorch',
  keras: 'Keras', sklearn: 'Scikit-learn', 'scikit-learn': 'Scikit-learn',
  cv: 'Computer Vision', 'computer vision': 'Computer Vision',
  llm: 'Large Language Models', gpt: 'GPT / LLMs',
  'data analysis': 'Data Analysis', pandas: 'Pandas', numpy: 'NumPy',

  // Cloud & DevOps
  aws: 'AWS', 'amazon web services': 'AWS',
  gcp: 'Google Cloud', 'google cloud platform': 'Google Cloud',
  azure: 'Azure', 'microsoft azure': 'Azure',
  docker: 'Docker', k8s: 'Kubernetes', kubernetes: 'Kubernetes',
  ci: 'CI/CD', cicd: 'CI/CD', 'ci/cd': 'CI/CD',
  devops: 'DevOps', terraform: 'Terraform', ansible: 'Ansible',
  linux: 'Linux', bash: 'Bash / Shell', shell: 'Bash / Shell',

  // Databases
  sql: 'SQL', mysql: 'MySQL', postgres: 'PostgreSQL', postgresql: 'PostgreSQL',
  mongo: 'MongoDB', mongodb: 'MongoDB',
  redis: 'Redis', firebase: 'Firebase', supabase: 'Supabase',
  prisma: 'Prisma', 'graphql': 'GraphQL',

  // Mobile
  rn: 'React Native', 'react native': 'React Native',
  flutter: 'Flutter', dart: 'Dart',
  ios: 'iOS Development', android: 'Android Development',
  swift: 'Swift', kotlin: 'Kotlin',

  // Design
  figma: 'Figma', sketch: 'Sketch', xd: 'Adobe XD',
  photoshop: 'Photoshop', illustrator: 'Illustrator', aftereffects: 'After Effects',
  ui: 'UI Design', ux: 'UX Design', 'ui/ux': 'UI/UX Design',
  'graphic design': 'Graphic Design', branding: 'Branding',
  '3d': '3D Modeling', blender: 'Blender', maya: 'Autodesk Maya',

  // Business & Marketing
  seo: 'SEO', sem: 'SEM', ppc: 'Paid Advertising',
  'content marketing': 'Content Marketing', copywriting: 'Copywriting',
  'social media': 'Social Media Marketing', 'email marketing': 'Email Marketing',
  excel: 'Microsoft Excel', 'google sheets': 'Google Sheets',
  'project management': 'Project Management', agile: 'Agile / Scrum', scrum: 'Agile / Scrum',

  // Languages (Spoken)
  spanish: 'Spanish', french: 'French', german: 'German',
  japanese: 'Japanese', mandarin: 'Mandarin Chinese', chinese: 'Mandarin Chinese',
  hindi: 'Hindi', arabic: 'Arabic', portuguese: 'Portuguese',
  italian: 'Italian', korean: 'Korean',

  // Music
  guitar: 'Guitar', piano: 'Piano', drums: 'Drums', violin: 'Violin',
  singing: 'Singing / Vocals', vocals: 'Singing / Vocals',
  'music production': 'Music Production', 'music theory': 'Music Theory',
  dj: 'DJing', ableton: 'Ableton Live',

  // Other Creative / Life Skills
  photography: 'Photography', videography: 'Videography',
  'video editing': 'Video Editing', 'photo editing': 'Photo Editing',
  yoga: 'Yoga', cooking: 'Cooking', baking: 'Baking',
  fitness: 'Fitness / Training', meditation: 'Meditation',
  writing: 'Creative Writing', fiction: 'Creative Writing',
};

/**
 * Skill clusters — used for suggestion context.
 * Key: cluster label. Value: array of canonical skill names.
 */
const clusters = {
  'Frontend': ['React', 'Vue.js', 'Angular', 'Svelte', 'SvelteKit', 'Next.js', 'HTML', 'CSS', 'Sass', 'Tailwind CSS', 'Bootstrap', 'JavaScript', 'TypeScript', 'UI Design', 'UI/UX Design'],
  'Backend': ['Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Python', 'Java', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'Prisma'],
  'AI / ML': ['Machine Learning', 'Deep Learning', 'Artificial Intelligence', 'Natural Language Processing', 'Data Science', 'Computer Vision', 'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'Python', 'Large Language Models', 'GPT / LLMs'],
  'Cloud & DevOps': ['AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes', 'CI/CD', 'DevOps', 'Terraform', 'Ansible', 'Linux', 'Bash / Shell'],
  'Mobile': ['React Native', 'Flutter', 'iOS Development', 'Android Development', 'Swift', 'Kotlin', 'Dart'],
  'Design': ['Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'After Effects', 'UI Design', 'UX Design', 'UI/UX Design', 'Graphic Design', 'Branding', '3D Modeling', 'Blender'],
  'Business': ['SEO', 'SEM', 'Paid Advertising', 'Content Marketing', 'Copywriting', 'Social Media Marketing', 'Email Marketing', 'Microsoft Excel', 'Google Sheets', 'Project Management', 'Agile / Scrum'],
  'Languages': ['Spanish', 'French', 'German', 'Japanese', 'Mandarin Chinese', 'Hindi', 'Arabic', 'Portuguese', 'Italian', 'Korean'],
  'Music': ['Guitar', 'Piano', 'Drums', 'Violin', 'Singing / Vocals', 'Music Production', 'Music Theory', 'DJing', 'Ableton Live'],
  'Creative': ['Photography', 'Videography', 'Video Editing', 'Photo Editing', 'Creative Writing', 'Graphic Design', 'Illustration'],
  'Lifestyle': ['Yoga', 'Cooking', 'Baking', 'Fitness / Training', 'Meditation'],
};

module.exports = { synonyms, clusters };
