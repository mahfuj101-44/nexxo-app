import React, { useState } from 'react';
import { X, Globe2, Shield } from 'lucide-react';
import { NexxoUser } from '../../types';
import { createCommunity } from '../../lib/communityService';

interface CreateCommunityModalProps {
  currentUser: NexxoUser;
  onClose: () => void;
  onCommunityCreated: (communityId: string) => void;
}

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  currentUser,
  onClose,
  onCommunityCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Community name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const communityId = await createCommunity({
        name: name.trim(),
        description: description.trim(),
        photoURL: photoURL.trim(),
        ownerId: currentUser.id,
        isPrivate,
      });

      onCommunityCreated(communityId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create community.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
            <Globe2 className="h-5 w-5" />
            <h2 className="text-lg text-slate-900 dark:text-white">Create NEXXO Community</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
              Community Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI Researchers Network, Global Developers"
              maxLength={60}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What brings members together in this community?"
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 resize-none placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
              Community Banner / Avatar URL
            </label>
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Private Community</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Only approved members can view and join</p>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            {isSubmitting ? 'Creating Community...' : 'Create Community'}
          </button>
        </form>
      </div>
    </div>
  );
};
