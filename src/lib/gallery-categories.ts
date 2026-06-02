/**
 * Gallery categories — mirrored from src/content/gallery/.
 * Used to pre-populate the user's category list so they can
 * organize their own badges using the same taxonomy.
 */
export interface GalleryCategory {
  name: string;
  slug: string;
  description: string;
}

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    name: 'AI & Bots',
    slug: 'ai-bots',
    description: 'Artificial intelligence, chatbots, and automation tools',
  },
  {
    name: 'Blockchain & Crypto',
    slug: 'blockchain-crypto',
    description: 'Blockchain platforms, cryptocurrencies, and Web3',
  },
  {
    name: 'Blog & Publishing',
    slug: 'blog',
    description: 'Blogging platforms, CMS, and publishing tools',
  },
  {
    name: 'Browsers',
    slug: 'browsers',
    description: 'Web browsers and privacy-focused alternatives',
  },
  {
    name: 'CAD & 3D',
    slug: 'cad',
    description: 'CAD software, 3D modeling, and engineering tools',
  },
  {
    name: 'CI / CD',
    slug: 'ci-cd',
    description: 'Continuous integration and deployment tools',
  },
  {
    name: 'Cloud Storage',
    slug: 'cloud-storage',
    description: 'Cloud storage and file hosting services',
  },
  {
    name: 'Databases',
    slug: 'databases',
    description: 'Relational, NoSQL, and analytics databases',
  },
  {
    name: 'Design',
    slug: 'design',
    description: 'Design tools, creative software, and prototyping',
  },
  {
    name: 'Dev Community',
    slug: 'dev-community',
    description: 'Developer forums, Q&A, and community platforms',
  },
  {
    name: 'DevOps & Cloud',
    slug: 'devops',
    description: 'Containerization, orchestration, monitoring, and cloud platforms',
  },
  {
    name: 'Documentation',
    slug: 'documentation',
    description: 'Documentation platforms, wikis, and knowledge bases',
  },
  {
    name: 'Education',
    slug: 'education',
    description: 'Online learning platforms and educational resources',
  },
  {
    name: 'Funding & Sponsorship',
    slug: 'funding',
    description: 'Payment platforms, sponsorship, and donation services',
  },
  {
    name: 'IDEs & Editors',
    slug: 'ides',
    description: 'Code editors, IDEs, and development environments',
  },
  {
    name: 'Programming Languages',
    slug: 'languages',
    description: 'Popular programming and scripting languages',
  },
  {
    name: 'Project Health',
    slug: 'project-health',
    description: 'Badges for repository status, CI/CD, and code quality metrics',
  },
  {
    name: 'Social & Communication',
    slug: 'social',
    description: 'Social media, messaging, and communication platforms',
  },
  {
    name: 'Frameworks & Libraries',
    slug: 'tech-stack',
    description: 'Web frameworks, libraries, and runtime platforms',
  },
];
