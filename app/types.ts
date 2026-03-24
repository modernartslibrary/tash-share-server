export interface Credit {
  id: string;
  name: string;
  profile_path?: string;
  role: string;
  character_name?: string;
}

export interface Track {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  duration_ms: number;
  track_number: number;
  album_id?: string;
  album_name?: string;
  album_image?: string;
}

export interface Work {
  id: string;
  work_title: string;
  artist_name: string;
  work_year: string | number;
  image_url: string;
  work_type: 'album' | 'track' | 'movie' | 'tv' | 'book';
  display_artist_name?: string;
  biography?: string;
  genres?: string[];
  production_countries?: string[];
  runtime_minutes?: number;
  total_episodes?: number;
  rating_avg?: number;
  rating_count?: number;
  credits?: Credit[];
  tracks_cache?: Track[];
  parent_album_cache?: {
    id: string;
    title: string;
    poster_path: string;
    artist_names_display: string;
    release_date?: string;
    total_tracks?: number;
  };
}

export interface Profile {
  id: string;
  username: string;
  nickname?: string;
  avatar_url?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  works_count?: number;
  initial_posts?: Post[];
  initial_lists?: List[];
  initial_archives?: Post[];
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  rating?: number;
  likes_count?: number;
  comments_count?: number;
  works?: Work;
  profiles?: Profile;
  image_url?: string;
}

export interface List {
  id: string;
  title: string;
  cover_url: string;
  user_id: string;
  profiles?: Profile;
  created_at?: string;
  works_count?: number;
  work_counts?: Record<string, number>;
  is_liked?: boolean;
}

export interface Artist {
  id: string;
  name: string;
  profile_path?: string;
  biography?: string;
}

export type TASHData = Work | Profile | Post | List | Artist;
