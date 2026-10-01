import React, { useState } from 'react';
import { X, Radio, Hash } from 'lucide-react';
import { NexxoUser } from '../../types';
import { createChannel } from '../../lib/channelService';

interface CreateChannelModalProps {
  currentUser: NexxoUser;
  onClose: () => void;
  onChannelCreated: (channelId: string) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  currentUser,
  onClose,
  onChannelCreated,
}) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !handle.trim()) {
      setError('Channel name and handle are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const channelId = await createChannel({
        name: name.trim(),
        handle: handle.trim(),
        description: description.trim(),
        photoURL: photoURL.trim(),
        ownerId: currentUser.id,
      });

      onChannelCreated(channelId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create channel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
            <Radio className="h-5 w-5" />
            <h2 className="text-lg text-slate-900 dark:text-white">Create Broadcast Channel</h2>
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
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Channel Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NEXXO Tech Dispatch"
              maxLength={50}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Channel Handle *</label>
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2">
              <span className="text-slate-500 font-mono text-sm mr-1">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="tech_dispatch"
                maxLength={30}
                required
                className="w-full bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none font-mono placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What content will you broadcast to subscribers?"
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 resize-none placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Avatar URL (Optional)</label>
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            {isSubmitting ? 'Creating Channel...' : 'Create Channel'}
          </button>
        </form>
      </div>
    </div>
  );
};
