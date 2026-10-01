import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Search,
  Check,
  Heart,
  Share2,
  Send,
  Sparkles,
  BadgeCheck,
  Eye,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { Channel, ChannelPost, NexxoUser } from '../../types';
import {
  subscribeToChannels,
  subscribeToChannelPosts,
  toggleChannelSubscription,
  createChannelPost,
  togglePostLike,
} from '../../lib/channelService';
import { CreateChannelModal } from './CreateChannelModal';

interface ChannelsViewProps {
  currentUser: NexxoUser;
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({ currentUser }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Post composer state
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Subscribe to all channels
  useEffect(() => {
    const unsub = subscribeToChannels((list) => {
      setChannels(list);
      if (list.length > 0 && !selectedChannel) {
        setSelectedChannel(list[0]);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to selected channel's posts
  useEffect(() => {
    if (!selectedChannel) return;
    const unsub = subscribeToChannelPosts(selectedChannel.id, (p) => {
      setPosts(p);
    });
    return () => unsub();
  }, [selectedChannel?.id]);

  const filteredChannels = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubscribeToggle = async (channel: Channel) => {
    const isSub = channel.subscribers.includes(currentUser.id);
    await toggleChannelSubscription(channel.id, currentUser.id, isSub);
    // Update local selected state
    if (selectedChannel?.id === channel.id) {
      setSelectedChannel((prev) =>
        prev
          ? {
              ...prev,
              subscribers: isSub
                ? prev.subscribers.filter((id) => id !== currentUser.id)
                : [...prev.subscribers, currentUser.id],
              subscribersCount: isSub ? prev.subscribersCount - 1 : prev.subscribersCount + 1,
            }
          : null
      );
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel || !newPostContent.trim()) return;

    setIsPosting(true);
    try {
      await createChannelPost({
        channelId: selectedChannel.id,
        author: currentUser,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        mediaUrl: newPostMedia.trim(),
        mediaType: newPostMedia ? 'image' : undefined,
      });

      setNewPostTitle('');
      setNewPostContent('');
      setNewPostMedia('');
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const isOwner = selectedChannel?.ownerId === currentUser.id;

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Channels Sidebar List */}
      <div
        className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900/60 backdrop-blur-md shrink-0 ${
          selectedChannel ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">NEXXO Channels</h2>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shadow-sm"
            title="Create Channel"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800/80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredChannels.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 px-4">
              No channels found. Be the first to create one!
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isSelected = selectedChannel?.id === channel.id;
              const isSubscribed = channel.subscribers.includes(currentUser.id);

              return (
                <div
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/40 text-slate-900 dark:text-white shadow-2xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center font-bold text-white flex-shrink-0">
                      {channel.photoURL ? (
                        <img src={channel.photoURL} alt="" className="h-full w-full object-cover" />
                      ) : (
                        channel.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold truncate leading-tight text-slate-900 dark:text-white">
                          {channel.name}
                        </span>
                        {channel.isVerified && (
                          <BadgeCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">@{channel.handle}</p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 font-mono">
                    {channel.subscribersCount || channel.subscribers.length}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Channel Post Feed / Selected Channel */}
      {selectedChannel ? (
        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950 overflow-hidden w-full">
          {/* Header */}
          <div className="p-3 sm:p-4 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setSelectedChannel(null)}
                type="button"
                className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Back to Channels"
                title="Back to Channels"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shrink-0">
                {selectedChannel.photoURL ? (
                  <img src={selectedChannel.photoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  selectedChannel.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{selectedChannel.name}</h3>
                  {selectedChannel.isVerified && (
                    <BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  @{selectedChannel.handle} • {selectedChannel.subscribersCount || selectedChannel.subscribers.length} subscribers
                </p>
                {selectedChannel.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl line-clamp-1 hidden sm:block">
                    {selectedChannel.description}
                  </p>
                )}
              </div>
            </div>

            {/* Subscribe / Unsubscribe Button */}
            <button
              onClick={() => handleSubscribeToggle(selectedChannel)}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0 ${
                selectedChannel.subscribers.includes(currentUser.id)
                  ? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {selectedChannel.subscribers.includes(currentUser.id) ? (
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> Subscribed
                </span>
              ) : (
                'Subscribe'
              )}
            </button>
          </div>

          {/* Posts Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Publisher Box (Only if owner) */}
            {isOwner && (
              <form
                onSubmit={handleCreatePost}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  Broadcast New Post
                </span>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Post Headline / Title (Optional)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                />
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Write your broadcast update to subscribers..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none placeholder-slate-400 dark:placeholder-slate-500"
                />
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="url"
                    value={newPostMedia}
                    onChange={(e) => setNewPostMedia(e.target.value)}
                    placeholder="Image URL (Optional)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={isPosting || !newPostContent.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" /> Publish
                  </button>
                </div>
              </form>
            )}

            {posts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
                No updates posted in this channel yet.
              </div>
            ) : (
              posts.map((post) => {
                const hasLiked = post.likes?.includes(currentUser.id);

                return (
                  <div
                    key={post.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3"
                  >
                    {/* Author & Timestamp */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{selectedChannel.name}</span>
                        <span>•</span>
                        <span>
                          {post.createdAt?.toDate
                            ? post.createdAt.toDate().toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Just now'}
                        </span>
                      </div>
                    </div>

                    {post.title && <h4 className="text-base font-bold text-slate-900 dark:text-white">{post.title}</h4>}

                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>

                    {post.mediaUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <img
                          src={post.mediaUrl}
                          alt=""
                          className="w-full max-h-96 object-cover"
                        />
                      </div>
                    )}

                    {/* Bottom Likes and Share */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <button
                        onClick={() =>
                          togglePostLike(selectedChannel.id, post.id, currentUser.id, hasLiked)
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          hasLiked
                            ? 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
                            : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{post.likes?.length || 0}</span>
                      </button>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{post.viewsCount || 1} views</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-slate-500 text-center p-8 bg-slate-50/50 dark:bg-transparent">
          <Radio className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select or Create a Channel</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Subscribe to real-time broadcast channels for official updates, news, and releases.
          </p>
        </div>
      )}

      {/* Create Channel Modal */}
      {isCreateOpen && (
        <CreateChannelModal
          currentUser={currentUser}
          onClose={() => setIsCreateOpen(false)}
          onChannelCreated={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  );
};
