'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Images, 
  BarChart3, 
  Upload,
  FileText,
  Menu,
  X,
  Zap
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Trades', href: '/trades', icon: TrendingUp },
  { name: 'Gallery', href: '/gallery', icon: Images },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'IPC Test', href: '/ipc-test', icon: Zap },
];

export function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Trade Journal</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-baseline space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'bg-blue-50 text-black hover:bg-blue-100'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    <Icon className={cn(
                      'h-4 w-4',
                      isActive
                        ? 'text-black'
                        : 'text-gray-700'
                    )} />
                    <span className={cn(
                      'font-medium',
                      isActive
                        ? 'text-black'
                        : 'text-gray-700'
                    )}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200',
                    isActive
                      ? 'bg-blue-50 text-black hover:bg-blue-100'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5',
                    isActive
                      ? 'text-black'
                      : 'text-gray-700'
                  )} />
                  <span className={cn(
                    'font-medium',
                    isActive
                      ? 'text-black'
                      : 'text-gray-700'
                  )}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}