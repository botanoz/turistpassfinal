import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // Redirect /admin to /admin/login
  redirect('/admin/login');
}
