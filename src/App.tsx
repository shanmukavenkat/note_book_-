import React, { useEffect, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { Link2, Trash2, LogIn, LogOut, Share2, Star, StarOff } from 'lucide-react';
import { supabase } from './lib/supabase';

type Link = {
  id: string;
  name: string;
  url: string;
  creator_email: string;
  created_at: string;
  is_favorited?: boolean;
};

type Favorite = {
  id: string;
  link_id: string;
  user_id: string;
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelayedContent, setShowDelayedContent] = useState(false);
  const [newLink, setNewLink] = useState({ name: '', url: '' });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authData, setAuthData] = useState({ email: '', password: '' });
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchLinks();
        fetchFavorites();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchLinks();
        fetchFavorites();
      }
    });

    const timer = setTimeout(() => {
      setShowDelayedContent(true);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
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

  const fetchFavorites = async () => {
    if (!session) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      toast.error('Error fetching favorites');
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
    setFavorites([]);
    setShowDelayedContent(true);
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
          creator_email: session.user.email,
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

  const deleteLink = async (id: string, creatorEmail: string) => {
    if (session?.user?.email !== creatorEmail) {
      toast.error('You can only delete your own links');
      return;
    }

    try {
      const { error } = await supabase.from('links').delete().eq('id', id);
      if (error) throw error;
      setLinks(links.filter((link) => link.id !== id));
      toast.success('Link deleted successfully!');
    } catch (error) {
      toast.error('Error deleting link');
    }
  };

  const toggleFavorite = async (linkId: string) => {
    if (!session) {
      toast.error('Please sign in first');
      return;
    }

    const isFavorited = favorites.some(fav => fav.link_id === linkId);

    try {
      if (isFavorited) {
        // Delete favorite
        const { error } = await supabase
          .from('favorites')
          .delete()
          .match({ link_id: linkId, user_id: session.user.id });

        if (error) throw error;
        setFavorites(favorites.filter(fav => fav.link_id !== linkId));
        toast.success('Removed from favorites');
      } else {
        // Check if favorite already exists
        const { data: existingFavorite } = await supabase
          .from('favorites')
          .select('*')
          .match({ link_id: linkId, user_id: session.user.id })
          .single();

        if (!existingFavorite) {
          // Create new favorite
          const { data, error } = await supabase
            .from('favorites')
            .insert([{ link_id: linkId, user_id: session.user.id }])
            .select()
            .single();

          if (error) throw error;
          if (data) {
            setFavorites([...favorites, data]);
            toast.success('Added to favorites');
          }
        }
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.code === '23505') { // Unique constraint violation
        toast.error('Already in favorites');
      } else {
        toast.error('Error updating favorites');
      }
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-800">Loading entries...</p>
          <div className={`transition-opacity duration-500 ${showDelayedContent ? 'opacity-100' : 'opacity-0'}`}>
            <img
              src="https://res.cloudinary.com/dg3jizjwv/image/upload/v1738217167/GOwyySDaMAIeHZZ_wtcwca.jpg"
              alt="Loading"
              className="mx-auto my-4 rounded-lg shadow-lg"
            />
            <p className="text-lg font-medium text-red-600">Rataleda🤣🤣🤣......</p>
            <p className="text-base font-medium text-blue-500">
              Sign up ayi, Sign in avu
            </p>
            <p className="text-base font-medium text-teal-500">
            Discover something new and exciting here! 🤩🚀 What could it be? Let’s find out together! 🤔✨            </p>
          </div>
        </div>
      );
    }

    if (!session) {
      return (
        <div className="text-center">
          <img
            src="https://res.cloudinary.com/dg3jizjwv/image/upload/v1738217167/GOwyySDaMAIeHZZ_wtcwca.jpg"
            alt="Loading"
            className="mx-auto my-4 rounded-lg shadow-lg"
          />
          <p className="text-lg font-medium text-red-600">Rataleda🤣🤣🤣......</p>
          <p className="text-base font-medium text-blue-500">
            Sign up ayi, Sign in avu
          </p>
        </div>
      );
    }

    return links.map((link) => {
      const isFavorited = favorites.some(fav => fav.link_id === link.id);
      
      return (
        <div
          key={link.id}
          className="p-6 newspaper-border bg-white"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <Link2 className="text-gray-800" size={20} />
              <div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="newspaper-link text-lg block"
                >
                  {link.name}
                </a>
                <span className="text-sm text-gray-600">
                  Added by: {link.creator_email}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleFavorite(link.id)}
                className="text-gray-800 hover:text-black transition-colors"
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                {isFavorited ? <Star size={20} fill="currentColor" /> : <StarOff size={20} />}
              </button>
              <button
                onClick={() => shareLink(link)}
                className="text-gray-800 hover:text-black transition-colors"
                aria-label="Share link"
              >
                <Share2 size={20} />
              </button>
              {session?.user?.email === link.creator_email && (
                <button
                  onClick={() => deleteLink(link.id, link.creator_email)}
                  className="text-gray-800 hover:text-black transition-colors"
                  aria-label="Delete link"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    });
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
              <LogIn size={16} /> Sign In / Sign Up
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
          {renderContent()}
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