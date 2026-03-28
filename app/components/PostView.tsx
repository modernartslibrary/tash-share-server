import Link from 'next/link';
import { Post, TASHComment } from '../types';

// 작품 카테고리 라벨 반환
function getCategoryLabel(type: string | undefined) {
  if (!type) return '작품';
  switch (type.toLowerCase()) {
    case 'movie': return '영화';
    case 'tv': return 'TV 프로그램';
    case 'album': return '앨범';
    case 'track': return '곡';
    case 'book': return '책';
    default: return '작품';
  }
}

// 상대 시간 포맷
function formatTimeAgo(dateString: string | undefined) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}개월 전`;
  return `${Math.floor(diffInSeconds / 31536000)}년 전`;
}

// 댓글 아이템 컴포넌트
function CommentItem({ comment }: { comment: TASHComment }) {
  return (
    <div className="flex flex-col">
      <div className="flex gap-3">
        <Link href={`/profile/${comment.user_id}`}>
          <img
            src={comment.profiles?.avatar_url || '/icons/default_profile.jpg'}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            alt="avatar"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href={`/profile/${comment.user_id}`}>
              <span className="font-medium text-[15px] text-black">{comment.profiles?.username}</span>
            </Link>
            <span className="text-[12px] text-[#A0A0A0] font-normal">{formatTimeAgo(comment.created_at)}</span>
          </div>
          <p className="text-[15px] text-[#1A1A1A] leading-normal mb-2 whitespace-pre-wrap block tracking-tighter">
            {comment.content}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 link-trigger cursor-pointer">
              <img src="/icons/like_button_no.png" className="w-[14px] h-[14px] object-contain" alt="like" />
              <span className="text-[13px] font-medium text-[#666]">{comment.likes_count || 0}</span>
            </div>
            <button className="text-[13px] font-medium text-[#666] link-trigger">답글 달기</button>
          </div>
        </div>
      </div>

      {/* 대댓글 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 mt-6 flex flex-col gap-6 relative">
          <div className="absolute left-[-20px] top-0 bottom-7 w-[1px] bg-gray-100" />
          {comment.replies.map((reply: TASHComment) => (
            <div key={reply.id} className="flex gap-3 relative">
              <Link href={`/profile/${reply.user_id}`}>
                <img
                  src={reply.profiles?.avatar_url || '/icons/default_profile.jpg'}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  alt="avatar"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/profile/${reply.user_id}`}>
                    <span className="font-medium text-[15px] text-black">{reply.profiles?.username}</span>
                  </Link>
                  <span className="text-[12px] text-[#A0A0A0] font-normal">{formatTimeAgo(reply.created_at)}</span>
                </div>
                <p className="text-[15px] text-[#1A1A1A] leading-normal mb-2 whitespace-pre-wrap block tracking-tighter">
                  {reply.content}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 link-trigger cursor-pointer">
                    <img src="/icons/like_button_no.png" className="w-[14px] h-[14px] object-contain" alt="like" />
                    <span className="text-[13px] font-medium text-[#666]">{reply.likes_count || 0}</span>
                  </div>
                  <button className="text-[13px] font-medium text-[#666] link-trigger">답글 달기</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 포스트 뷰 메인 컴포넌트
export default function PostView({ data }: { data: Post }) {
  return (
    <div className="py-2">
      {/* 유저 정보 섹션 */}
      <div className="flex items-center mb-4 px-5">
        <Link href={`/profile/${data.user_id}`} className="flex items-center">
          <img
            src={data.profiles?.avatar_url || '/icons/default_profile.jpg'}
            className="w-10 h-10 rounded-full border border-gray-100 object-cover mr-3"
            alt="avatar"
          />
          <div className="flex items-center gap-2">
            <span className="font-medium text-[17px] text-black leading-tight">{data.profiles?.username}</span>
            <span className="text-[13px] text-[#A0A0A0]">{formatTimeAgo(data.created_at)}</span>
          </div>
        </Link>
      </div>

      {/* 작품 미리보기 섹션 */}
      <div className="flex items-center mb-1 px-5 gap-4">
        <Link href={`/${data.works?.work_type}/${data.works?.id}`} className="flex items-center gap-4 w-full">
          <div className="w-20 h-20 flex-shrink-0 overflow-hidden">
            <img
              src={data.works?.image_url}
              className="w-full h-full object-cover block"
              alt="work"
            />
          </div>

          <div className="flex flex-col justify-center py-1">
            <span className="font-medium text-[16px] text-black leading-tight mb-1 line-clamp-2">
              {data.works?.work_title}
            </span>
            <p className="text-[13px] text-[#8E8E8E] font-normal mb-1.5 leading-tight">
              {getCategoryLabel(data.works?.work_type)} · {data.works?.artist_name}{data.works?.work_year ? `, ${data.works.work_year}` : ''}
            </p>
            {data.rating && (
              <div className="flex items-center gap-1.5">
                <img src="/icons/star_icon.png" className="w-3 h-3 object-contain" alt="star" />
                <span className="text-[12px] font-normal text-black">{data.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* 본문 섹션 */}
      <div className="text-[16px] leading-[1.2] whitespace-pre-wrap text-[#1A1A1A] px-5 mb-2 tracking-normal">
        {data.content}
      </div>

      {/* 통계 섹션 */}
      <div className="flex items-center gap-4 px-5 mb-4">
        <div className="flex items-center gap-1.5 link-trigger cursor-pointer">
          <img src="/icons/like_button_no.png" className="w-[20px] h-[20px] object-contain" alt="like" />
          <span className="text-[14px] font-medium text-black">{data.likes_count || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 link-trigger cursor-pointer">
          <img src="/icons/post_comment.png" className="w-[20px] h-[20px] object-contain" alt="comment icon" />
          <span className="text-[14px] font-medium text-black">{data.comments_count || 0}</span>
        </div>
      </div>

      {/* 댓글 섹션 */}
      <div className="px-5 pt-2 pb-12">
        <h3 className="text-[17px] font-medium text-black mb-2">댓글</h3>

        {data.comments && data.comments.length > 0 ? (
          <div className="flex flex-col gap-6">
            {data.comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-gray-400 py-4 text-center">첫 댓글을 남겨보세요.</p>
        )}
      </div>
    </div>
  );
}
