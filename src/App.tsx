import React, { useEffect, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { Link2, Trash2, LogIn, LogOut, Share2 } from 'lucide-react';
import { supabase } from './lib/supabase';

type Link = {
  id: string;
  name: string;
  url: string;
  created_at: string;
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLink, setNewLink] = useState({ name: '', url: '' });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authData, setAuthData] = useState({ email: '', password: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchLinks();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchLinks();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      toast.error('Error fetching links');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { email, password } = authData;
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Check your email to confirm your account!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Successfully signed in!');
      }
      setIsAuthModalOpen(false);
      setAuthData({ email: '', password: '' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLinks([]);
    toast.success('Signed out successfully');
  };

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast.error('Please sign in first');
      return;
    }

    try {
      const { data, error } = await supabase.from('links').insert([
        {
          name: newLink.name,
          url: newLink.url,
          user_id: session.user.id,
        },
      ]);

      if (error) throw error;
      toast.success('Link added successfully!');
      setNewLink({ name: '', url: '' });
      fetchLinks();
    } catch (error) {
      toast.error('Error adding link');
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const { error } = await supabase.from('links').delete().eq('id', id);
      if (error) throw error;
      setLinks(links.filter((link) => link.id !== id));
      toast.success('Link deleted successfully!');
    } catch (error) {
      toast.error('Error deleting link');
    }
  };

  const shareLink = async (link: Link) => {
    const shareData = {
      title: link.name,
      text: `Check out this link: ${link.name}`,
      url: link.url
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } else {
        await navigator.clipboard.writeText(link.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      toast.error('Error sharing link');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1e9] p-4">
      <Toaster />
      
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-12 pt-8">
        <h1 className="newspaper-title text-4xl md:text-6xl text-center font-bold mb-6 pb-4">
          ⚡✨ SNVS Hidden Web Treasures
        </h1>
        <div className="flex justify-end">
          {session ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-6 py-3 newspaper-border bg-white hover:bg-gray-50 transition-colors"
            >
              <LogOut size={16} /> Sign Out
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 newspaper-border bg-white hover:bg-gray-50 transition-colors"
            >
              <LogIn size={16} /> Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {session && (
          <form onSubmit={addLink} className="mb-12 p-8 newspaper-border bg-white">
            <h2 className="text-2xl font-bold mb-6 font-playfair">Add New Entry 📝</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Link Name"
                value={newLink.name}
                onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                className="flex-1 px-4 py-2 border-2 border-gray-800 focus:outline-none focus:border-black transition-colors"
                required
              />
              <input
                type="url"
                placeholder="URL"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                className="flex-1 px-4 py-2 border-2 border-gray-800 focus:outline-none focus:border-black transition-colors"
                required
              />
              <button
                type="submit"
                className="px-8 py-2 newspaper-border bg-white hover:bg-gray-50 transition-colors"
              >
                Submit
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-6">
          {loading ? (
            <p className="text-center text-xl">Loading entries...</p>
          ) : links.length > 0 ? (
            links.map((link) => (
              <div
                key={link.id}
                className="p-6 newspaper-border bg-white flex justify-between items-center"
              >
                <div className="flex items-center gap-4">
                  <Link2 className="text-gray-800" size={20} />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="newspaper-link text-lg"
                  >
                    {link.name}
                  </a>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => shareLink(link)}
                    className="text-gray-800 hover:text-black transition-colors"
                    aria-label="Share link"
                  >
                    <Share2 size={20} />
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="text-gray-800 hover:text-black transition-colors"
                    aria-label="Delete link"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xl text-gray-600">No entries found</p>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="auth-modal p-8 newspaper-border max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 newspaper-title pb-4">
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-2">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-800 focus:outline-none focus:border-black transition-colors"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold mb-2">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-800 focus:outline-none focus:border-black transition-colors"
                  required
                />
              </div>
              <div className="flex justify-between items-center pt-4">
                <button
                  type="submit"
                  className="px-8 py-3 newspaper-border bg-white hover:bg-gray-50 transition-colors"
                >
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-sm underline hover:text-gray-600"
                >
                  {authMode === 'signin' ? 'Need an account?' : 'Already have an account?'}
                </button>
              </div>
            </form>
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-2xl font-bold hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;