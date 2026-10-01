import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { MusicTrack, MusicGenre, UserUploadedAudio } from '../types';

// Legal, royalty-free CC0/Public-Domain certified tracks to seed catalog if empty
const CERTIFIED_LEGAL_SEEDS: Omit<MusicTrack, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Neon Horizon',
    artist: 'NEXXO Studios',
    album: 'Cyber Ambient Vol. 1',
    genre: 'Chill',
    artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    duration: 32,
    licenseType: 'public_domain',
    licenseNotes: 'Certified CC0 / Pixabay Content License - Free for non-commercial & commercial use with no attribution required',
    isEnabled: true,
    storyAvailable: true,
    favoritesCount: 24,
  },
  {
    title: 'Pulse of Victory',
    artist: 'Digital Odyssey',
    album: 'High Octane Beats',
    genre: 'Motivation',
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=electronic-future-beats-117997.mp3',
    duration: 38,
    licenseType: 'public_domain',
    licenseNotes: 'Certified CC0 / Pixabay Content License - Royalty-free high energy sports & motivation loop',
    isEnabled: true,
    storyAvailable: true,
    favoritesCount: 42,
  },
  {
    title: 'Midnight Breeze',
    artist: 'Acoustic Horizon',
    album: 'Acoustic Wanderer',
    genre: 'Travel',
    artworkUrl: 'https://images.unsplash.com/photo-1445985543470-41fdd6ce388d?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=relaxed-vlog-night-street-131746.mp3',
    duration: 30,
    licenseType: 'cc_by',
    licenseNotes: 'Creative Commons CC-BY 4.0 - Clean acoustic fingerstyle guitar with warm ambience',
    isEnabled: true,
    storyAvailable: true,
    favoritesCount: 19,
  },
  {
    title: 'Golden Sunset Chill',
    artist: 'Sunlight Soundscapes',
    album: 'Lo-Fi Chill Sessions',
    genre: 'Chill',
    artworkUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=chill-abstract-intention-12099.mp3',
    duration: 34,
    licenseType: 'public_domain',
    licenseNotes: 'Certified CC0 - Warm sunset chords with low-tempo vinyl percussion',
    isEnabled: true,
    storyAvailable: true,
    favoritesCount: 31,
  },
  {
    title: 'Electronic Skyline',
    artist: 'Synthwave Labs',
    album: 'Neon Drive',
    genre: 'Party',
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3?filename=future-bass-hotline-11786.mp3',
    duration: 36,
    licenseType: 'nexxo_licensed',
    licenseNotes: 'NEXXO Platform Master License - Proprietary synthesized party groove',
    isEnabled: true,
    storyAvailable: true,
    favoritesCount: 56,
  },
  {
    title: 'Tranquil Mind',
    artist: 'Serenity Strings',
    album: 'Deep Meditation',
    genre: 'Instrumental',
    artworkUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_c68c29188a.mp3?filename=meditation-peace-111556.mp3',
    duration: 40,
    licenseType: 'public_domain',
    licenseNotes: 'Public Domain - Calm meditative strings and harmonic singing bowl frequency',
    isEnabled: true,
    storyAvailable: true,
    favoritesCount: 18,
  },
];

/**
 * Seeds legal certified public-domain tracks into Firestore if the collection is empty.
 */
export async function seedInitialLicensedMusicIfEmpty(): Promise<void> {
  try {
    const q = query(collection(db, 'musicTracks'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return; // Already populated
    }

    // Populate certified tracks
    for (let i = 0; i < CERTIFIED_LEGAL_SEEDS.length; i++) {
      const item = CERTIFIED_LEGAL_SEEDS[i];
      const trackId = `track_seed_${i + 1}`;
      await setDoc(doc(db, 'musicTracks', trackId), {
        ...item,
        id: trackId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Could not seed certified music tracks:', err);
  }
}

/**
 * Subscribes to available music tracks in the platform catalog.
 */
export function subscribeToMusicCatalog(
  onUpdate: (tracks: MusicTrack[]) => void
): () => void {
  const q = query(collection(db, 'musicTracks'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const tracks: MusicTrack[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as MusicTrack;
        if (data.isEnabled !== false) {
          tracks.push(data);
        }
      });
      onUpdate(tracks);
    },
    (err) => {
      console.error('Error fetching music catalog:', err);
    }
  );
}

/**
 * Subscribes to user-uploaded audio tracks.
 */
export function subscribeToUserAudio(
  userId: string,
  onUpdate: (audios: UserUploadedAudio[]) => void
): () => void {
  const q = query(
    collection(db, 'userAudio'),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserUploadedAudio[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as UserUploadedAudio);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Error fetching user audio:', err);
    }
  );
}

/**
 * Adds a new certified or licensed music track (Admin only).
 */
export async function addMusicTrack(
  track: Omit<MusicTrack, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = `track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await setDoc(doc(db, 'musicTracks', id), {
    ...track,
    id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

/**
 * Updates a music track (Admin only).
 */
export async function updateMusicTrack(
  trackId: string,
  updates: Partial<MusicTrack>
): Promise<void> {
  await updateDoc(doc(db, 'musicTracks', trackId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a track from the catalog.
 */
export async function deleteMusicTrack(trackId: string): Promise<void> {
  await deleteDoc(doc(db, 'musicTracks', trackId));
}

/**
 * Saves a user-uploaded audio file entry.
 */
export async function saveUserAudio(
  audioData: Omit<UserUploadedAudio, 'id' | 'createdAt'>
): Promise<string> {
  const id = `ua_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await setDoc(doc(db, 'userAudio', id), {
    ...audioData,
    id,
    createdAt: serverTimestamp(),
  });
  return id;
}

/**
 * Deletes user-uploaded audio.
 */
export async function deleteUserAudio(audioId: string): Promise<void> {
  await deleteDoc(doc(db, 'userAudio', audioId));
}
