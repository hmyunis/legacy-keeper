
import { useMemo, useState } from 'react';
import { 
  Database, 
  GitBranch, 
  ShieldCheck, 
  Users, 
  Clock, 
  Sparkles,
  Search
} from 'lucide-react';

export interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  icon: any;
  steps: string[];
}

export const HELP_DATA: HelpArticle[] = [
  {
    id: 'vault-1',
    category: 'Vault Preservation',
    title: 'Uploading Archival Media',
    icon: Database,
    content: 'The Vault is the core of your legacy. Learn how to securely upload and categorize artifacts.',
    steps: [
      'Navigate to the Vault module from the sidebar.',
      'Click "Preserve Memory" to open the upload portal.',
      'Drag and drop files or select them from your device.',
      'Add a title, date, and "The Story" to provide historical context.',
      'Click Preserve to initialize archival storage.'
    ]
  },
  {
    id: 'vault-2',
    category: 'Vault Preservation',
    title: 'AI Deep Scan & Tagging',
    icon: Sparkles,
    content: 'Leverage our AI engine to automatically identify faces and detect locations.',
    steps: [
      'Open any media item from your vault.',
      'Click the "AI Deep Scan" button.',
      'Once complete, click the detected face thumbnails.',
      'Select a family member from your lineage to link the biometric data.',
      'Tags are automatically generated to improve vault searchability.'
    ]
  },
  {
    id: 'tree-1',
    category: 'Lineage Mapping',
    title: 'Building the Family Tree',
    icon: GitBranch,
    content: 'Visualize generations and connect branches of your family history.',
    steps: [
      'Access the Family Tree module.',
      'Click "Add Relative" to create a new profile for an ancestor or descendant.',
      'Fill in their birth details and a brief biography.',
      'Use the "Link Kin" tool to establish Parent, Spouse, or Sibling relationships.',
      'Adjust zoom controls to see your entire lineage at once.'
    ]
  },
  {
    id: 'members-1',
    category: 'Member Governance',
    title: 'Inviting Family Members',
    icon: Users,
    content: 'Collaborate with your relatives by inviting them to the vault.',
    steps: [
      'Go to the Members page (Admin only).',
      'Click "Invite Member" and enter their archival email.',
      'Select a Role: Administrator, Contributor, or Viewer.',
      'Once they accept, their status will move from Pending to Active.'
    ]
  },
  {
    id: 'security-1',
    category: 'System Security',
    title: 'Understanding Audit Logs',
    icon: ShieldCheck,
    content: 'Monitor all interactions within your vault for total accountability.',
    steps: [
      'The System Registry maintains a verifiable ledger of every action.',
      'Filter logs by Category (Uploads, Access, Management) to find specific events.',
      'Search for actors or resources to track modifications.',
      'Download a full Audit Record for offline verification.'
    ]
  },
  {
    id: 'timeline-1',
    category: 'Chronological Navigation',
    title: 'Exploring the Timeline',
    icon: Clock,
    content: 'Browse your family history through a linear chronological path.',
    steps: [
      'The Timeline automatically sorts media by "Date Taken".',
      'Use the Era filters (e.g., 1950s) to jump to specific decades.',
      'Scroll through "The Harrington Chronicle" to see how your legacy evolved.',
      'Each card provides a snapshot of the story, location, and people involved.'
    ]
  }
];

export const useHelp = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return HELP_DATA;
    const query = searchQuery.toLowerCase();
    return HELP_DATA.filter(article => 
      article.title.toLowerCase().includes(query) || 
      article.category.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const categories = useMemo(() => {
    return Array.from(new Set(HELP_DATA.map(a => a.category)));
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    filteredArticles,
    categories
  };
};
