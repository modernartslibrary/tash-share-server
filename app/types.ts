export interface Work {
  id: string;
  work_title: string;
  artist_name: string;
  work_year: string | number;
  image_url: string;
  work_type: string;
  display_artist_name?: string;
  biography?: string;
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
}

export interface Artist {
  id: string;
  name: string;
  profile_path?: string;
  biography?: string;
}

export type TASHData = Work | Profile | Post | List | Artist;
