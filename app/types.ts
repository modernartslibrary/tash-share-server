export interface Credit {
  id: string;
  name: string;
  profile_path?: string;
  role: string;
  character_name?: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  slug?: string;
}

export interface RepresentativeCredit {
  id: string;
  name: string;
  profile_path: string | null;
  role: string;
  character_name: string;
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
  slug?: string;
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
    slug?: string;
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

export interface TASHComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string;
  likes_count: number;
  profiles?: Profile;
  replies?: TASHComment[];
}

export interface Post {
  id: string;
  slug?: string;
  content: string;
  created_at: string;
  user_id: string;
  rating?: number;
  likes_count?: number;
  comments_count?: number;
  works?: Work;
  profiles?: Profile;
  image_url?: string;
  work_id?: string; // 아카이브 아이템(work_likes) 대응을 위한 필드 추가
  item_type?: 'work' | 'artist';
  artist_id?: string;
  artist_name?: string;
  artist_profile_path?: string;
  artist_birth_date?: string;
  artist_slug?: string;
  comments?: TASHComment[];
}

export interface List {
  id: string;
  slug?: string;
  title: string;
  cover_url: string;
  user_id: string;
  description?: string;
  profiles?: Profile;
  created_at?: string;
  works_count?: number;
  work_counts?: Record<string, number>;
  is_liked?: boolean;
  items?: Work[];
}

export interface Artist {
  id: string;
  slug?: string;
  name: string;
  profile_path?: string;
  biography?: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  initial_works?: Work[];
  representative_works?: any[]; // JSONB data (compact works)
}

export type TASHData = Work | Profile | Post | List | Artist;
