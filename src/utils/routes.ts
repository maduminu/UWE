import { PageId } from '../components/layout/Navbar';

export const pageToPath = (page: PageId, slug?: string): string => {
  switch (page) {
    case 'home':
      return '/';
    case 'about':
      return '/about';
    case 'vision':
      return '/vision';
    case 'product':
      return '/programs';
    case 'course-detail':
      return slug ? `/programs/${slug}` : '/programs';
    case 'demos':
      return '/demos';
    case 'careers':
      return '/careers';
    case 'contact':
      return '/contact';
    case 'program-videos':
      return '/videos';
    case 'posters':
      return '/posters';
    case 'dashboard':
      return '/dashboard';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
};

export const pathToPage = (pathname: string): PageId => {
  const cleanPath = pathname.replace(/\/$/, '') || '/';

  if (cleanPath === '/') return 'home';
  if (cleanPath === '/about') return 'about';
  if (cleanPath === '/vision') return 'vision';
  if (cleanPath === '/programs') return 'product';
  if (cleanPath.startsWith('/programs/')) return 'course-detail';
  if (cleanPath === '/demos') return 'demos';
  if (cleanPath === '/careers') return 'careers';
  if (cleanPath === '/contact') return 'contact';
  if (cleanPath === '/videos' || cleanPath === '/program-videos') return 'program-videos';
  if (cleanPath === '/posters') return 'posters';
  if (cleanPath === '/dashboard') return 'dashboard';
  if (cleanPath.startsWith('/admin')) return 'admin';

  return 'home';
};
