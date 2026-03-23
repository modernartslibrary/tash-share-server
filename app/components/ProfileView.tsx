'use client';

import React, { useState, useMemo } from 'react';
import { Post, List, Profile } from '../types';

interface ProfileViewProps {
  data: Profile;
}

export default function ProfileView({ data }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'lists' | 'archives'>('posts');
  const [activeFilter, setActiveFilter] = useState<string>(''); // Empty string means 'All'
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

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
    if (!activeFilter) return data.initial_archives;
    return data.initial_archives.filter((archive: Post) =>
      filterMap[activeFilter]?.includes(archive.works?.work_type || '')
    );
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
      return <PostGrid posts={items} />;
    } else {
      return <PostList posts={items} />;
    }
  };

  return (
    <div className="flex flex-col bg-white min-h-screen pb-32">
      {/* Header Section */}
      <div className="flex justify-between items-start pt-8 pb-4 px-[16px] mb-1">
        <div className="flex flex-col flex-1">
          <h1 className="text-[25px] font-bold tracking-tight leading-tight text-black mb-[2px]">
            {data.nickname || data.username}
          </h1>
          <p className="text-[14px] text-black font-normal mb-[2px]">
            {data.username}
          </p>
          <div className="flex items-center text-[11px] text-black font-normal">
            <span>팔로워 {data.followers_count || 0}</span>
            <span className="mx-1">·</span>
            <span>작품 {data.works_count || 0}</span>
          </div>
        </div>

        <div className="w-[80px] h-[80px] overflow-hidden rounded-full border border-gray-100 ml-4">
          <img src={data.avatar_url || "/icons/default_profile.jpg"} className="w-full h-full object-cover" alt="profile avatar" />
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-y border-gray-50 h-[64px] mb-2 px-2">
        <TabIcon
          icon="/icons/tab_posts.png"
          active={activeTab === 'posts'}
          onClick={() => setActiveTab('posts')}
        />
        <TabIcon
          icon="/icons/tab_lists.png"
          active={activeTab === 'lists'}
          onClick={() => setActiveTab('lists')}
        />
        <TabIcon
          icon="/icons/tab_archive.png"
          active={activeTab === 'archives'}
          onClick={() => setActiveTab('archives')}
        />
      </div>

      {/* Sub Filters Row */}
      <div className="flex items-center px-[16px] py-3 mb-1 overflow-x-auto no-scrollbar gap-2">
        <div className="flex gap-2">
          {['음악', '영화', 'TV', '책'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(prev => prev === filter ? '' : filter)}
              className={`h-[36px] px-4 rounded-full text-[14px] font-normal border transition-all flex items-center justify-center ${activeFilter === filter
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
            onClick={() => setViewType(prev => prev === 'grid' ? 'list' : 'grid')}
          >
            <img
              src={viewType === 'grid' ? "/icons/profile_post_list.png" : "/icons/profile_post_grid.png"}
              className="w-[20px] h-[20px]"
              alt="toggle view"
            />
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      <div className="flex flex-col min-h-[400px]">
        {renderContent()}
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center px-8 z-50 pointer-events-none">
        <button
          className="w-full max-w-[420px] bg-black text-white h-[64px] rounded-full text-[17px] font-black shadow-2xl active:scale-95 transition-all pointer-events-auto"
          onClick={() => window.open('https://link.tash.kr/app', '_blank')}
        >
          앱에서 열기
        </button>
      </div>
    </div>
  );
}

interface TabIconProps {
  icon: string;
  active: boolean;
  onClick: () => void;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, active, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 flex flex-col items-center justify-center relative h-full outline-none"
  >
    <img
      src={icon}
      className={`w-[24px] h-[24px] object-contain transition-all opacity-100 ${active ? 'scale-110' : ''}`}
      alt="tab icon"
    />
    {active && <div className="absolute bottom-0 w-8 h-[2px] bg-black rounded-t-full"></div>}
  </button>
);

const PostGrid = ({ posts }: { posts: Post[] }) => (
  <div className="grid grid-cols-3 gap-[1px] bg-gray-50 border-t border-gray-50">
    {posts.map((post) => (
      <div key={post.id} className="aspect-square bg-white relative overflow-hidden group">
        <img
          src={post.works?.image_url || '/icons/default_profile.jpg'}
          className="w-full h-full object-cover"
          alt={post.works?.work_title || "post thumbnail"}
        />
      </div>
    ))}
  </div>
);

const PostList = ({ posts }: { posts: Post[] }) => (
  <div className="flex flex-col bg-white">
    {posts.map((post) => (
      <div key={post.id} className="p-[16px] border-b border-gray-50/50">
        <div className="flex items-start mb-4 relative">
          <div className="w-[80px] h-[80px] rounded-lg overflow-hidden bg-gray-50 mr-4 flex-shrink-0">
            <img src={post.works?.image_url || '/icons/default_profile.jpg'} className="w-full h-full object-cover rounded-lg border border-gray-100" alt={post.works?.work_title || "work image"} />
          </div>
          <div className="flex flex-col pt-0.5 flex-1">
            <h3 className="text-[17px] font-normal text-black leading-tight mb-1 line-clamp-1">
              {post.works?.work_title || "제목 없음"}
            </h3>
            <p className="text-[14px] text-gray-400 font-normal mb-1.5">
              {post.works?.work_type || "기타"} · {post.works?.artist_name || "알 수 없음"}, {post.works?.work_year || ""}
            </p>
            {post.rating && (
              <div className="flex items-center text-black text-[14px]">
                <img src="/icons/star_icon.png" className="w-[13px] h-[13px] mr-1" alt="rating star" />
                <span>{post.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-[16px] text-black font-normal leading-relaxed mb-4 whitespace-pre-wrap">
          {post.content}
        </p>

        <div className="flex items-center text-[13px] text-black font-normal">
          <div className="flex items-center mr-6">
            <img src="/icons/like_button_no.png" className="w-[20px] h-[20px] mr-1.5 opacity-80" alt="like icon" />
            <span className="text-[15px]">{post.likes_count || 0}</span>
          </div>
          <div className="flex items-center mr-6">
            <img src="/icons/post_comment.png" className="w-[22px] h-[22px] mr-1.5 opacity-80" alt="comment icon" />
            <span className="text-[15px]">{post.comments_count || 0}</span>
          </div>
          <div className="ml-auto text-gray-400">
            {new Date(post.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ListSection = ({ lists }: { lists: List[] }) => {
  if (!lists || lists.length === 0) {
    return <div className="py-24 text-center text-black font-normal text-[15px]">리스트가 비어 있습니다.</div>;
  }

  return (
    <div className="flex flex-col px-5 gap-1 pt-2">
      {lists.map((list) => (
        <div key={list.id} className="flex items-center py-4 border-b border-gray-50 active:bg-gray-50 px-2 rounded-lg transition-colors">
          <img
            src={list.cover_url || '/icons/default_profile.jpg'}
            className="w-16 h-16 rounded-2xl object-cover mr-4 shadow-sm border border-gray-100"
            alt={list.title || "list cover"}
          />
          <div className="flex flex-col">
            <h3 className="text-[17px] font-normal text-black mb-0.5">{list.title}</h3>
            <p className="text-[14px] text-black font-normal">작품 {list.profiles?.works_count || 0}개</p>
          </div>
        </div>
      ))}
    </div>
  );
};
