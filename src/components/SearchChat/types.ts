export interface SearchItem {
  id: number;
  name: string;
  description: string;
}

export interface SearchCategory {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: SearchItem[];
}