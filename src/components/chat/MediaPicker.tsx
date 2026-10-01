import React, { useState } from 'react';
import {
  Smile,
  Image as ImageIcon,
  Sparkles,
  Search,
  X,
  Flame,
  Heart,
  ThumbsUp,
  PartyPopper
} from 'lucide-react';

interface MediaPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSendMedia: (url: string, type: 'image' | 'sticker', name: string) => void;
  onClose: () => void;
}

type PickerTab = 'emojis' | 'gifs' | 'stickers';

// Curated Emojis by Category
const EMOJI_CATEGORIES = [
  {
    name: 'Smileys & Emotion',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥹', '😊', '😇',
      '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
      '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳',
      '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩',
      '🥺', '😢', '😭', '😮‍💨', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵',
      '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢',
      '🫡', '🤫', '🫠', '🤥', '😶', '😐', '😑', '🫥', '😬', '🙄', '😯',
    ],
  },
  {
    name: 'Hands & Gestures',
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻',
      '👃', '🫀', '🫁', '🧠', '🫱', '🫲', '🫳', '🫴', '🫰', '🫵', '🫶',
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘',
    ],
  },
  {
    name: 'Hearts & Symbols',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥',
      '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎',
      '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓',
      '🔥', '✨', '⚡', '⭐', '🌟', '💫', '💥', '💯', '💢', '💬', '👁️‍🗨️',
    ],
  },
  {
    name: 'Celebrations & Objects',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🚀',
      '💎', '👑', '🔮', '🧿', '🎯', '🎮', '🕹️', '🎲', '🧩', '🎸', '🎹',
      '🎺', '🎻', '🥁', '🎧', '🎤', '🎬', '🎨', '🍿', '☕', '🍕', '🍔',
    ],
  },
];

// Curated verified trending GIFs (reliable CDN images)
const CURATED_GIFS: { category: string; title: string; url: string }[] = [
  {
    category: 'Excited',
    title: 'Party Cat',
    url: 'https://media.giphy.com/media/lJNoBCvQYp7nq/giphy.gif',
  },
  {
    category: 'Excited',
    title: 'Dancing Celebration',
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
  },
  {
    category: 'Love',
    title: 'Heart Floating',
    url: 'https://media.giphy.com/media/26FLdm964upN59bO0/giphy.gif',
  },
  {
    category: 'Love',
    title: 'Puppy Hug',
    url: 'https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif',
  },
  {
    category: 'Laugh',
    title: 'Laughing Dog',
    url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif',
  },
  {
    category: 'Laugh',
    title: 'LOL Popcorn',
    url: 'https://media.giphy.com/media/26n6Gx9moCgs10nUk/giphy.gif',
  },
  {
    category: 'Cheers',
    title: 'Cheers Gatsby',
    url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
  },
  {
    category: 'Cheers',
    title: 'Thumbs Up Cool',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  },
  {
    category: 'Dance',
    title: 'Smooth Groove',
    url: 'https://media.giphy.com/media/mKMGLhoD8L4yc/giphy.gif',
  },
  {
    category: 'Dance',
    title: 'Pixel Robot Dance',
    url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif',
  },
  {
    category: 'Bye',
    title: 'Homer Hedge',
    url: 'https://media.giphy.com/media/a93jwI0wkWTQs/giphy.gif',
  },
  {
    category: 'Bye',
    title: 'Wave Hello',
    url: 'https://media.giphy.com/media/ASd0Ukj0BCcYU/giphy.gif',
  },
];

// High quality expressive Stickers
const STICKER_PACKS = [
  {
    name: 'Cyber Nexxo',
    stickers: [
      {
        id: 's1',
        name: 'Rocket Boost',
        url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=300&auto=format&fit=crop&q=80',
      },
      {
        id: 's2',
        name: 'Neon Glow Heart',
        url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300&auto=format&fit=crop&q=80',
      },
      {
        id: 's3',
        name: 'Lightning Bolt',
        url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80',
      },
      {
        id: 's4',
        name: 'Cyber Skull',
        url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80',
      },
      {
        id: 's5',
        name: 'Digital Matrix',
        url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80',
      },
      {
        id: 's6',
        name: 'Neon Planet',
        url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80',
      },
    ],
  },
];

export const MediaPicker: React.FC<MediaPickerProps> = ({
  onSelectEmoji,
  onSendMedia,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PickerTab>('emojis');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGifCategory, setSelectedGifCategory] = useState<string>('All');

  // Filter emojis
  const filteredEmojiCategories = EMOJI_CATEGORIES.map((cat) => ({
    name: cat.name,
    emojis: cat.emojis.filter((e) => !searchQuery || e.includes(searchQuery)),
  })).filter((cat) => cat.emojis.length > 0);

  // Filter GIFs
  const filteredGifs = CURATED_GIFS.filter((gif) => {
    const matchesCategory =
      selectedGifCategory === 'All' || gif.category === selectedGifCategory;
    const matchesSearch =
      !searchQuery ||
      gif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gif.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const gifCategories = ['All', 'Excited', 'Love', 'Laugh', 'Cheers', 'Dance', 'Bye'];

  return (
    <div className="w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 h-[360px] sm:h-[380px] max-h-[70vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-40">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-3 pt-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('emojis')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'emojis'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gifs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'gifs'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>GIFs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stickers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'stickers'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stickers</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'emojis'
                ? 'Search emojis...'
                : activeTab === 'gifs'
                ? 'Search trending GIFs...'
                : 'Filter stickers...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* GIF Category Chips */}
        {activeTab === 'gifs' && (
          <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1 no-scrollbar text-[11px]">
            {gifCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedGifCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                  selectedGifCategory === cat
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Content View */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* EMOJIS TAB */}
        {activeTab === 'emojis' && (
          <div className="space-y-4">
            {filteredEmojiCategories.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {cat.name}
                </span>
                <div className="grid grid-cols-8 gap-1">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GIFS TAB */}
        {activeTab === 'gifs' && (
          <div className="grid grid-cols-2 gap-2">
            {filteredGifs.map((gif, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onSendMedia(gif.url, 'image', `${gif.title}.gif`);
                  onClose();
                }}
                className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-colors shadow-xs"
              >
                <img
                  src={gif.url}
                  alt={gif.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-medium text-white truncate max-w-[90%]">
                  {gif.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* STICKERS TAB */}
        {activeTab === 'stickers' && (
          <div className="space-y-4">
            {STICKER_PACKS.map((pack) => (
              <div key={pack.name} className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {pack.name} Pack
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {pack.stickers.map((stk) => (
                    <div
                      key={stk.id}
                      onClick={() => {
                        onSendMedia(stk.url, 'sticker', stk.name);
                        onClose();
                      }}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 p-2 cursor-pointer shadow-xs transition-all hover:scale-105"
                    >
                      <img
                        src={stk.url}
                        alt={stk.name}
                        className="w-full h-full object-cover rounded-xl"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold text-white bg-black/70 py-0.5 px-1 truncate">
                        {stk.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
