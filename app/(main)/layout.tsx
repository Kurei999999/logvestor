import { Metadata } from 'next';
import { Navigation } from '@/components/navigation';

export const metadata: Metadata = {
  title: 'Trade Journal Local',
  description: 'Local file-based investment record management system',
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}