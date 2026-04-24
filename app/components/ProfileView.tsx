'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Post, List, Profile } from '../types';
import { ArtistFallbackImage, ListFallbackImage, WorkFallbackImage } from './FallbackImage';

interface ProfileViewProps {
  data: Profile;
}

export default function ProfileView({ data }: ProfileViewProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const initialPostsView = searchParams.get('posts_view');
  const initialArchivesView = searchParams.get('archives_view');

  // URL 파라미터에서 초기 상태 읽기
  const [activeTab, setActiveTab] = useState<'posts' | 'lists' | 'archives'>(
    () => (initialTab === 'lists' || initialTab === 'archives' ? initialTab : 'posts')
  );
  const [activeFilter, setActiveFilter] = useState(() => searchParams.get('filter') || '');
  const [postsView, setPostsView] = useState<'grid' | 'list'>(
    () => (initialPostsView === 'list' ? 'list' : 'grid')
  );
  const [archivesView, setArchivesView] = useState<'grid' | 'list'>(
    () => (initialArchivesView === 'list' ? 'list' : 'grid')
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
    if (activeFilter === '리스트') {
      return data.initial_archives.filter(a => a.item_type === 'list');
    }
    return data.initial_archives.filter((archive) => {
      if (archive.item_type === 'artist' || archive.item_type === 'list') {
        return !activeFilter; // 전체(필터 없음)일 때만 포함
      }
      return !activeFilter || filterMap[activeFilter]?.includes(archive.works?.work_type || '');
    });
  }, [data.initial_archives, activeFilter, filterMap]);

  const getEmptyMessage = () => {
    if (activeTab === 'posts') {
      if (!activeFilter) return '아직 포스트가 없습니다';
      if (activeFilter === 'TV') return 'TV/시리즈 카테고리에 해당하는 포스트가 없습니다';
      return `${activeFilter} 카테고리에 해당하는 포스트가 없습니다`;
    }

    if (!activeFilter) return '아직 아카이브한 작품이나 아티스트가 없습니다';
    return `${activeFilter} 카테고리에 아카이브한 항목이 없습니다`;
  };

  const renderContent = () => {
    if (activeTab === 'lists') {
      return <ListSection lists={data.initial_lists || []} />;
    }

    const items = activeTab === 'posts' ? filteredPosts : filteredArchives;

    if (items.length === 0) {
      return <ProfileEmptyState message={getEmptyMessage()} />;
    }

    if (viewType === 'grid') {
      return <PostGrid posts={items} isArchive={activeTab === 'archives'} />;
    } else {
      return <PostList posts={items} hideStats={activeTab === 'archives'} isArchive={activeTab === 'archives'} />;
    }
  };

  return (
    <div className="flex flex-col bg-white min-h-screen pb-3 sm:pb-4">
      {/* Header Section */}
      <div className="flex justify-between items-start pt-6 pb-2 px-[16px] mb-1">
        <div className="flex flex-col flex-1 min-w-0">
          <h1 className="text-[20px] font-bold tracking-tight leading-tight text-black mb-[1px]">
            {data.nickname || data.username}
          </h1>
          <p className="text-[13px] text-black font-normal mb-[2px]">
            {data.username}
          </p>
          {data.bio?.trim() && (
            <div className="mt-1 max-w-[calc(100vw-124px)]">
              <ExpandableProfileBio content={data.bio} />
            </div>
          )}
          <div className="flex items-center text-[11px] text-[#6F6F6F] font-normal">
            <span>팔로워 {data.followers_count || 0}</span>
            <span className="mx-1">·</span>
            <span>작품 {data.works_count || 0}</span>
          </div>
          {data.website?.trim() && (
            <ProfileWebsiteLink website={data.website} />
          )}
        </div>

        <div className="w-[76px] h-[76px] overflow-hidden rounded-full border border-gray-100 ml-4">
          <ListFallbackImage
            src={data.avatar_url}
            className="w-full h-full object-cover"
            alt="profile avatar"
            sizes="76px"
            loading="eager"
          />
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
        <div className="flex items-center gap-2 px-[16px] py-2 mb-1">
          <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <div className="flex gap-1.5">
              {(activeTab === 'archives'
                ? ['음악', '영화', 'TV', '책', '인물', '리스트']
                : ['음악', '영화', 'TV', '책']
              ).map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleFilterChange(filter)}
                  className={`h-[30px] shrink-0 whitespace-nowrap px-4 rounded-full text-[12px] font-normal border transition-all flex items-center justify-center ${activeFilter === filter
                    ? 'bg-black border-black text-white'
                    : 'bg-white border-black text-black'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <button
              className="p-1"
              onClick={() => handleViewTypeChange(viewType === 'grid' ? 'list' : 'grid')}
            >
              <Image
                src={viewType === 'grid' ? "/icons/profile_post_list.png" : "/icons/profile_post_grid.png"}
                className="w-[18px] h-[18px]"
                alt="toggle view"
                width={18}
                height={18}
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
    <Image
      src={icon}
      className={`w-[20px] h-[20px] object-contain transition-all opacity-100 ${active ? 'scale-110' : ''}`}
      alt="tab icon"
      width={20}
      height={20}
    />
    {active && <div className="absolute bottom-0 w-[26px] h-[1.5px] bg-black"></div>}
  </button>
);

const getPostGridKey = (post: Post, index: number) => {
  if (post.item_type === 'artist') {
    return `artist-${post.artist_id || post.artist_slug || index}-${post.created_at}`;
  }

  if (post.item_type === 'list') {
    return `list-${post.list_id || post.list?.id || post.list?.slug || index}-${post.created_at}`;
  }

  const workKey = post.work_id || post.works?.id || post.works?.slug;
  if (workKey) {
    return `work-${workKey}-${post.created_at}`;
  }

  return `post-${post.id || post.slug || index}-${post.created_at}`;
};

const PostGrid = ({ posts, isArchive }: { posts: Post[], isArchive?: boolean }) => (
  <div className="grid grid-cols-3 gap-0">
    {(posts || []).map((post, index) => {
      const isArtist = post.item_type === 'artist';
      const isList = post.item_type === 'list';
      const href = isArchive
        ? (isArtist
            ? `/artist/${post.artist_slug || post.artist_id}`
            : isList
              ? `/list/${post.list?.slug || post.list_id || post.list?.id}`
              : `/work/${post.works?.slug || post.work_id}`)
        : `/post/${post.slug || post.id}`;
      const key = getPostGridKey(post, index);

      return (
        <Link key={key} href={href}>
          <div className="aspect-square bg-white relative overflow-hidden group cursor-pointer active:opacity-80 transition-opacity">
            {isArtist ? (
              <ArtistFallbackImage
                src={post.artist_profile_path}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt={post.artist_name || "artist"}
                sizes="(max-width: 672px) 33vw, 224px"
              />
            ) : isList ? (
              <ListFallbackImage
                src={post.list?.cover_url}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt={post.list?.title || "list"}
                sizes="(max-width: 672px) 33vw, 224px"
              />
            ) : (
              <WorkFallbackImage
                src={post.works?.image_url}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt={post.works?.work_title || "post thumbnail"}
                sizes="(max-width: 672px) 33vw, 224px"
              />
            )}
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
      const isList = post.item_type === 'list';
      const href = isArchive
        ? (isArtist
            ? `/artist/${post.artist_slug || post.artist_id}`
            : isList
              ? `/list/${post.list?.slug || post.list_id || post.list?.id}`
              : `/work/${post.works?.slug || post.work_id}`)
        : `/post/${post.slug || post.id}`;
      const key = isArtist
        ? `${post.artist_id}-${post.created_at}`
        : isList
          ? `${post.list_id || post.list?.id}-${post.created_at}`
          : getPostGridKey(post, 0);

      return (
        <Link
          key={key}
          href={href}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className="py-2 px-[16px] cursor-pointer">
            <div className="flex items-center mb-0.5 relative">
              <div className="w-[76px] h-[76px] overflow-hidden bg-gray-50 mr-3 flex-shrink-0">
                {isArtist ? (
                  <ArtistFallbackImage
                    src={post.artist_profile_path}
                    className={`w-full h-full object-cover ${isArchive ? '' : 'border border-gray-100'}`}
                    alt={post.artist_name || "artist"}
                    sizes="76px"
                  />
                ) : isList ? (
                  <ListFallbackImage
                    src={post.list?.cover_url}
                    className={`w-full h-full object-cover ${isArchive ? '' : 'border border-gray-100'}`}
                    alt={post.list?.title || "list"}
                    sizes="76px"
                  />
                ) : (
                  <WorkFallbackImage
                    src={post.works?.image_url}
                    className={`w-full h-full object-cover ${isArchive ? '' : 'border border-gray-100'}`}
                    alt={post.works?.work_title || "post thumbnail"}
                    sizes="76px"
                  />
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                <h3 className={`${hideStats ? 'text-[16px]' : 'text-[15px]'} font-normal text-black leading-tight line-clamp-1`}>
                  {isArtist ? post.artist_name : isList ? post.list?.title : (post.works?.work_title || "제목 없음")}
                </h3>
                <p className={`font-normal ${hideStats ? 'text-[13px]' : 'text-[14px]'} text-[#6F6F6F] line-clamp-1`}>
                  {(() => {
                    if (isArtist) {
                      const birthYear = post.artist_birth_date?.split('-')[0];
                      return birthYear ? `인물 · ${birthYear}-` : '인물';
                    }
                    if (isList) {
                      return formatWorkCount(post.list?.work_counts);
                    }
                    const type = post.works?.work_type;
                    let label = "기타";
                    if (type === 'movie') label = "영화";
                    else if (type === 'tv') label = "TV";
                    else if (type === 'album') label = "앨범";
                    else if (type === 'track') label = "트랙";
                    else if (type === 'book') label = "책";
                    
                    const details = post.works?.artist_name || "알 수 없음";
                    const year = post.works?.work_year || "";
                    
                    return `${label} · ${details}${year ? `, ${year}` : ''}`;
                  })()}
                </p>
                {!isArtist && post.rating && (
                  <div className="flex items-center text-black text-[13px] mt-0.5">
                    <Image src="/icons/star_icon.png" className="w-[11px] h-[11px] mr-1" alt="rating star" width={11} height={11} />
                    <span>{post.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {post.content && (
              <ExpandablePostContent content={post.content} />
            )}

            {!hideStats && (
              <div className="flex items-center text-[12px] text-black font-normal">
                <div className="flex items-center mr-5">
                  <Image src="/icons/like_button_no.png" className="w-[18px] h-[18px] mr-1.5 opacity-80" alt="like icon" width={18} height={18} />
                  <span className="text-[13px]">{post.likes_count || 0}</span>
                </div>
                <div className="flex items-center mr-5">
                  <Image src="/icons/post_comment.png" className="w-[20px] h-[20px] mr-1.5 opacity-80" alt="comment icon" width={20} height={20} />
                  <span className="text-[13px]">{post.comments_count || 0}</span>
                </div>
                <div className="ml-auto text-[#6F6F6F]" suppressHydrationWarning>
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

const ExpandableProfileBio = ({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  const trimmedContent = content.trim();
  const shouldShowToggle = trimmedContent.length > 64 || trimmedContent.split(/\r?\n/).length > 3;

  if (!trimmedContent) return null;

  return (
    <div className="mb-1.5">
      <p className={`text-[13px] text-black font-normal leading-snug whitespace-pre-wrap ${expanded ? '' : 'line-clamp-3'}`}>
        {trimmedContent}
      </p>
      {shouldShowToggle && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-0.5 text-[12px] text-[#6F6F6F] font-normal"
        >
          {expanded ? '접기' : '더보기'}
        </button>
      )}
    </div>
  );
};

const ProfileWebsiteLink = ({ website }: { website: string }) => {
  const href = resolveProfileWebsiteHref(website);
  const label = website.trim();

  if (!href || !label) return null;

  return (
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
      className="mt-0.5 inline-block max-w-full truncate text-[12px] text-[#6F6F6F] font-normal"
    >
      {label}
    </a>
  );
};

const resolveProfileWebsiteHref = (value: string) => {
  const text = value.trim();
  if (!text) return '';

  if (text.includes('@') && !text.includes('/')) {
    return `mailto:${text}`;
  }

  return text.startsWith('http://') || text.startsWith('https://')
    ? text
    : `https://${text}`;
};

const ExpandablePostContent = ({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  const normalizedContent = content.trim();
  const canToggle = normalizedContent.length > 140;
  const displayContent = expanded || !canToggle
    ? normalizedContent
    : `${normalizedContent.slice(0, 140).trimEnd()}... `;

  const toggleExpanded = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((value) => !value);
  };

  return (
    <div className="mb-3">
      <p className="text-[15px] text-black font-normal leading-normal tracking-[-0.05em] whitespace-pre-wrap">
        {displayContent}
        {canToggle && (
          <span
            role="button"
            tabIndex={0}
            onClick={toggleExpanded}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                toggleExpanded(event);
              }
            }}
            className="inline text-[14px] text-[#6F6F6F]"
          >
            {expanded ? ' 접기' : '더보기'}
          </span>
        )}
      </p>
    </div>
  );
};

const ProfileEmptyState = ({ message }: { message: string }) => (
  <div className="py-24 text-center text-[15px] font-normal text-[#6F6F6F]">
    {message}
  </div>
);

const formatWorkCount = (workCounts?: Record<string, number>) => {
  if (!workCounts || Object.keys(workCounts).length === 0) return "작품 0개";

  const entries = Object.entries(workCounts);
  // 개수가 많은 순서대로 정렬
  entries.sort((a, b) => b[1] - a[1]);

  const labels = entries.map(([type, count]) => {
    let label = "작품";
    let unit = "개";

    if (type === 'movie') {
      label = "영화";
      unit = "편";
    } else if (type === 'tv') {
      label = "TV";
      unit = "편";
    } else if (type === 'album') {
      label = "앨범";
      unit = "개";
    } else if (type === 'track') {
      label = "트랙";
      unit = "곡";
    } else if (type === 'music') {
      label = "음악";
      unit = "곡";
    } else if (type === 'book') {
      label = "책";
      unit = "권";
    }

    return `${label} ${count}${unit}`;
  });

  return labels.join(', ');
};

const ListSection = ({ lists }: { lists: List[] }) => {
  if (!lists || lists.length === 0) {
    return <ProfileEmptyState message="아직 리스트가 없습니다" />;
  }

  return (
    <div className="flex flex-col px-5 gap-0 pt-0.5">
      {(lists || []).map((list) => (
        <Link
          key={list.id}
          href={`/list/${list.slug || list.id}`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className="flex items-center py-2.5 px-2 cursor-pointer">
            <ListFallbackImage
              src={list.cover_url}
              className="w-[76px] h-[76px] object-cover mr-4 border border-gray-100"
              alt={list.title || "list cover"}
              sizes="76px"
            />
            <div className="flex flex-col">
              <h3 className="text-[16px] font-normal text-black mb-1 line-clamp-1">{list.title}</h3>
              <p className="text-[13px] text-[#6F6F6F] font-normal line-clamp-1">{formatWorkCount(list.work_counts)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
