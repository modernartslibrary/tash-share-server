'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Post, List, Profile } from '../types';

interface ProfileViewProps {
  data: Profile;
}

export default function ProfileView({ data }: ProfileViewProps) {
  const searchParams = useSearchParams();

  // URL 파라미터에서 초기 상태 읽기
  const [activeTab, setActiveTab] = useState<'posts' | 'lists' | 'archives'>(
    () => (searchParams.get('tab') as any) || 'posts'
  );
  const [activeFilter, setActiveFilter] = useState(() => searchParams.get('filter') || '');
  const [postsView, setPostsView] = useState<'grid' | 'list'>(
    () => (searchParams.get('posts_view') as any) || 'grid'
  );
  const [archivesView, setArchivesView] = useState<'grid' | 'list'>(
    () => (searchParams.get('archives_view') as any) || 'grid'
  );

  const viewType = activeTab === 'archives' ? archivesView : postsView;

  // URL 파라미터 동기화 헬퍼 (history.replaceState 사용으로 라우터 재랜더링 방지)
  const syncParams = (newParams: Record<string, string | null>) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  };

  const handleTabChange = (tab: 'posts' | 'lists' | 'archives') => {
    setActiveTab(tab);
    setActiveFilter(''); // 탭 전환 시 필터 초기화
    syncParams({ tab, filter: null });
  };

  const handleFilterChange = (filter: string) => {
    const newValue = filter === activeFilter ? '' : filter;
    setActiveFilter(newValue);
    syncParams({ filter: newValue === '' ? null : newValue });
  };

  const handleViewTypeChange = (view: 'grid' | 'list') => {
    if (activeTab === 'archives') {
      setArchivesView(view);
      syncParams({ archives_view: view });
    } else {
      setPostsView(view);
      syncParams({ posts_view: view });
    }
  };

  // Mappings for filtering by work_type
  const filterMap: Record<string, string[]> = useMemo(() => ({
    '음악': ['album', 'track', 'music'],
    '영화': ['movie'],
    'TV': ['tv'],
    '책': ['book']
  }), []);

  const filteredPosts = useMemo(() => {
    if (!data.initial_posts) return [];
    if (!activeFilter) return data.initial_posts;
    return data.initial_posts.filter((post: Post) =>
      filterMap[activeFilter]?.includes(post.works?.work_type || '')
    );
  }, [data.initial_posts, activeFilter, filterMap]);

  const filteredArchives = useMemo(() => {
    if (!data.initial_archives) return [];
    if (activeFilter === '인물') {
      return data.initial_archives.filter(a => a.item_type === 'artist');
    }
    return data.initial_archives.filter((archive) => {
      if (archive.item_type === 'artist') return !activeFilter; // 전체(필터 없음)일 때만 포함
      return !activeFilter || filterMap[activeFilter]?.includes(archive.works?.work_type || '');
    });
  }, [data.initial_archives, activeFilter, filterMap]);

  const renderContent = () => {
    if (activeTab === 'lists') {
      return <ListSection lists={data.initial_lists || []} />;
    }

    const items = activeTab === 'posts' ? filteredPosts : filteredArchives;

    if (items.length === 0) {
      return <div className="py-24 text-center text-black font-normal text-[15px]">해당 기록이 아직 없습니다.</div>;
    }

    if (viewType === 'grid') {
      return <PostGrid posts={items} isArchive={activeTab === 'archives'} />;
    } else {
      return <PostList posts={items} hideStats={activeTab === 'archives'} isArchive={activeTab === 'archives'} />;
    }
  };

  return (
    <div className="flex flex-col bg-white min-h-screen pb-32">
      {/* Header Section */}
      <div className="flex justify-between items-start pt-6 pb-2 px-[16px] mb-1">
        <div className="flex flex-col flex-1">
          <h1 className="text-[20px] font-bold tracking-tight leading-tight text-black mb-[1px]">
            {data.nickname || data.username}
          </h1>
          <p className="text-[13px] text-black font-normal mb-[2px]">
            {data.username}
          </p>
          <div className="flex items-center text-[11px] text-gray-400 font-normal">
            <span>팔로워 {data.followers_count || 0}</span>
            <span className="mx-1">·</span>
            <span>작품 {data.works_count || 0}</span>
          </div>
        </div>

        <div className="w-[64px] h-[64px] overflow-hidden rounded-full border border-gray-100 ml-4">
          <img src={data.avatar_url || "/icons/default_profile.jpg"} className="w-full h-full object-cover" alt="profile avatar" />
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex h-[64px] mb-2 px-2">
        <TabIcon
          icon="/icons/tab_posts.png"
          active={activeTab === 'posts'}
          onClick={() => handleTabChange('posts')}
        />
        <TabIcon
          icon="/icons/tab_lists.png"
          active={activeTab === 'lists'}
          onClick={() => handleTabChange('lists')}
        />
        <TabIcon
          icon="/icons/tab_archive.png"
          active={activeTab === 'archives'}
          onClick={() => handleTabChange('archives')}
        />
      </div>

      {/* Sub Filters Row */}
      {activeTab !== 'lists' && (
        <div className="flex items-center px-[16px] py-2 mb-1 overflow-x-auto no-scrollbar gap-1.5">
          <div className="flex gap-1.5">
            {(activeTab === 'archives'
              ? ['음악', '영화', 'TV', '책', '인물']
              : ['음악', '영화', 'TV', '책']
            ).map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`h-[30px] px-4 rounded-full text-[12px] font-normal border transition-all flex items-center justify-center ${activeFilter === filter
                  ? 'bg-black border-black text-white'
                  : 'bg-white border-black text-black'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center pl-2">
            <button
              className="p-1"
              onClick={() => handleViewTypeChange(viewType === 'grid' ? 'list' : 'grid')}
            >
              <img
                src={viewType === 'grid' ? "/icons/profile_post_list.png" : "/icons/profile_post_grid.png"}
                className="w-[18px] h-[18px]"
                alt="toggle view"
              />
            </button>
          </div>
        </div>
      )}

      {/* Content Rendering */}
      <div className="flex flex-col min-h-[400px]">
        {renderContent()}
      </div>
    </div>
  );
}

interface TabIconProps {
  icon: string;
  active: boolean;
  onClick: () => void;
}

const TabIcon = ({ icon, active, onClick }: TabIconProps) => (
  <button
    onClick={onClick}
    className="flex-1 flex flex-col items-center justify-center relative h-full outline-none"
  >
    <img
      src={icon}
      className={`w-[20px] h-[20px] object-contain transition-all opacity-100 ${active ? 'scale-110' : ''}`}
      alt="tab icon"
    />
    {active && <div className="absolute bottom-0 w-[26px] h-[1.5px] bg-black"></div>}
  </button>
);

const PostGrid = ({ posts, isArchive }: { posts: Post[], isArchive?: boolean }) => (
  <div className="grid grid-cols-3 gap-0">
    {(posts || []).map((post) => {
      const isArtist = post.item_type === 'artist';
      const href = isArchive
        ? (isArtist ? `/artist/${post.artist_id}` : `/work/${post.work_id}`)
        : `/post/${post.id}`;
      const imageUrl = isArtist
        ? (post.artist_profile_path
          ? (post.artist_profile_path.startsWith('http') ? post.artist_profile_path : `https://image.tmdb.org/t/p/w200${post.artist_profile_path}`)
          : '/icons/default_profile.jpg')
        : (post.works?.image_url || '/icons/default_profile.jpg');

      return (
        <Link key={isArtist ? `${post.artist_id}-${post.created_at}` : post.id} href={href}>
          <div className="aspect-square bg-white relative overflow-hidden group cursor-pointer active:opacity-80 transition-opacity">
            <img
              src={imageUrl}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              alt={isArtist ? (post.artist_name || "artist") : (post.works?.work_title || "post thumbnail")}
            />
          </div>
        </Link>
      );
    })}
  </div>
);

const PostList = ({ posts, hideStats, isArchive }: { posts: Post[], hideStats?: boolean, isArchive?: boolean }) => (
  <div className="flex flex-col bg-white">
    {(posts || []).map((post) => {
      const isArtist = post.item_type === 'artist';
      const href = isArchive
        ? (isArtist ? `/artist/${post.artist_id}` : `/work/${post.work_id}`)
        : `/post/${post.id}`;
      const imageUrl = isArtist
        ? (post.artist_profile_path
          ? (post.artist_profile_path.startsWith('http') ? post.artist_profile_path : `https://image.tmdb.org/t/p/w200${post.artist_profile_path}`)
          : '/icons/default_profile.jpg')
        : (post.works?.image_url || '/icons/default_profile.jpg');

      return (
        <Link key={isArtist ? `${post.artist_id}-${post.created_at}` : post.id} href={href}>
          <div className={`${hideStats ? 'py-0' : 'py-2'} px-[16px] cursor-pointer active:bg-gray-50 transition-colors`}>
            <div className="flex items-center mb-0.5 relative">
              <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 mr-3 flex-shrink-0">
                <img src={imageUrl} className="w-full h-full object-cover border border-gray-100" alt={isArtist ? post.artist_name : post.works?.work_title} />
              </div>
              <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                <h3 className="text-[15px] font-normal text-black leading-tight line-clamp-1">
                  {isArtist ? post.artist_name : (post.works?.work_title || "제목 없음")}
                </h3>
                <p className={`font-normal ${hideStats ? 'text-[11px] text-gray-400' : 'text-[14px] text-gray-500'}`}>
                  {isArtist ? "인물" : (post.works?.work_type || "기타")} {isArtist ? "" : `· ${post.works?.artist_name || "알 수 없음"}, ${post.works?.work_year || ""}`}
                </p>
                {!isArtist && post.rating && (
                  <div className="flex items-center text-black text-[13px] mt-0.5">
                    <img src="/icons/star_icon.png" className="w-[11px] h-[11px] mr-1" alt="rating star" />
                    <span>{post.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {post.content && (
              <p className="text-[14px] text-black font-normal leading-snug mb-3 whitespace-pre-wrap">
                {post.content}
              </p>
            )}

            {!hideStats && (
              <div className="flex items-center text-[12px] text-black font-normal">
                <div className="flex items-center mr-5">
                  <img src="/icons/like_button_no.png" className="w-[18px] h-[18px] mr-1.5 opacity-80" alt="like icon" />
                  <span className="text-[13px]">{post.likes_count || 0}</span>
                </div>
                <div className="flex items-center mr-5">
                  <img src="/icons/post_comment.png" className="w-[20px] h-[20px] mr-1.5 opacity-80" alt="comment icon" />
                  <span className="text-[13px]">{post.comments_count || 0}</span>
                </div>
                <div className="ml-auto text-gray-400" suppressHydrationWarning>
                  {new Date(post.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                </div>
              </div>
            )}
          </div>
        </Link>
      );
    })}
  </div>
);

const formatWorkCount = (workCounts?: Record<string, number>) => {
  if (!workCounts || Object.keys(workCounts).length === 0) return "작품 0개";

  const entries = Object.entries(workCounts);
  entries.sort((a, b) => b[1] - a[1]);

  const [type, count] = entries[0];

  let label = "작품";
  let unit = "개";

  if (type === 'movie') {
    label = "영화";
    unit = "편";
  } else if (type === 'tv') {
    label = "TV";
    unit = "편";
  } else if (['album', 'track', 'music'].includes(type)) {
    label = "음악";
    unit = "개";
  } else if (type === 'book') {
    label = "책";
    unit = "개";
  }

  return `${label} ${count}${unit}`;
};

const ListSection = ({ lists }: { lists: List[] }) => {
  if (!lists || lists.length === 0) {
    return <div className="py-24 text-center text-black font-normal text-[15px]">리스트가 비어 있습니다.</div>;
  }

  return (
    <div className="flex flex-col px-5 gap-0 pt-0.5">
      {(lists || []).map((list) => (
        <Link key={list.id} href={`/list/${list.id}`}>
          <div className="flex items-center py-1.5 active:bg-gray-50 px-2 transition-colors cursor-pointer">
            <img
              src={list.cover_url || '/icons/default_profile.jpg'}
              className="w-[60px] h-[60px] object-cover mr-4 border border-gray-100"
              alt={list.title || "list cover"}
            />
            <div className="flex flex-col">
              <h3 className="text-[15px] font-normal text-black mb-0.5">{list.title}</h3>
              <p className="text-[11px] text-gray-400 font-normal">{formatWorkCount(list.work_counts)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
