import { useState } from 'react';
import type { User, QnAPost, QnAComment } from '../../types';
import {
  getQnAPosts, createQnAPost, deleteQnAPost,
  getQnAComments, createQnAComment, deleteQnAComment,
} from '../../store';
import { HelpCircle, ChevronDown, ChevronUp, Plus, X, Send, MessageSquare } from 'lucide-react';

interface Props {
  currentUser: User;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function QnATab({ currentUser }: Props) {
  const [posts, setPosts] = useState<QnAPost[]>(getQnAPosts);
  const [openId, setOpenId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, QnAComment[]>>({});
  const [commentDraft, setCommentDraft] = useState('');
  const [writing, setWriting] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'subadmin';

  function reload() { setPosts(getQnAPosts()); }

  function togglePost(id: string) {
    if (openId === id) {
      setOpenId(null);
      setCommentDraft('');
    } else {
      setOpenId(id);
      setCommentDraft('');
      const loaded = getQnAComments(id);
      setComments(prev => ({ ...prev, [id]: loaded }));
    }
  }

  function reloadComments(postId: string) {
    setComments(prev => ({ ...prev, [postId]: getQnAComments(postId) }));
  }

  function handleCreatePost() {
    if (!draftTitle.trim()) return;
    const post: QnAPost = {
      id: crypto.randomUUID(),
      title: draftTitle.trim(),
      content: draftContent.trim(),
      authorId: currentUser.id,
      authorName: currentUser.username,
      createdAt: new Date().toISOString(),
    };
    createQnAPost(post);
    setDraftTitle('');
    setDraftContent('');
    setWriting(false);
    reload();
  }

  function handleDeletePost(id: string) {
    if (!window.confirm('게시글을 삭제할까요?')) return;
    deleteQnAPost(id);
    if (openId === id) setOpenId(null);
    reload();
  }

  function handleAddComment(postId: string) {
    if (!commentDraft.trim()) return;
    const comment: QnAComment = {
      id: crypto.randomUUID(),
      postId,
      content: commentDraft.trim(),
      authorId: currentUser.id,
      authorName: currentUser.username,
      createdAt: new Date().toISOString(),
    };
    createQnAComment(comment);
    setCommentDraft('');
    reloadComments(postId);
  }

  function handleDeleteComment(postId: string, commentId: string) {
    deleteQnAComment(commentId);
    reloadComments(postId);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary-500" />
          <h2 className="text-sm font-bold text-gray-800">질의응답</h2>
          <span className="text-xs text-gray-400">({posts.length})</span>
        </div>
        <button
          onClick={() => { setWriting(v => !v); }}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          글쓰기
        </button>
      </div>

      {/* Write form */}
      {writing && (
        <div className="card space-y-2 p-4">
          <input
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 font-semibold"
            placeholder="제목"
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            rows={4}
            placeholder="질문 내용을 입력하세요"
            value={draftContent}
            onChange={e => setDraftContent(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setWriting(false); setDraftTitle(''); setDraftContent(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              취소
            </button>
            <button
              onClick={handleCreatePost}
              disabled={!draftTitle.trim()}
              className="text-xs font-semibold bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white px-3 py-1.5 rounded-lg transition"
            >
              등록
            </button>
          </div>
        </div>
      )}

      {/* Post list */}
      {posts.length === 0 && !writing && (
        <div className="card py-12 text-center">
          <p className="text-sm text-gray-400">아직 등록된 질문이 없습니다.</p>
        </div>
      )}

      <div className="space-y-2">
        {posts.map(post => {
          const isOpen = openId === post.id;
          const postComments = comments[post.id] ?? [];
          const canDelete = isAdmin || post.authorId === currentUser.id;

          return (
            <div key={post.id} className="card p-0 overflow-hidden">
              {/* Post header row */}
              <button
                onClick={() => togglePost(post.id)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{post.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {post.authorName} · {formatDate(post.createdAt)}
                    {!isOpen && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5">
                        <MessageSquare className="w-2.5 h-2.5" />
                        {getQnAComments(post.id).length}
                      </span>
                    )}
                  </p>
                </div>
                {canDelete && (
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); handleDeletePost(post.id); }}
                    className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
              </button>

              {/* Expanded: content + comments */}
              {isOpen && (
                <div className="border-t border-gray-100">
                  {post.content && (
                    <div className="px-4 py-3 bg-gray-50">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                    </div>
                  )}

                  {/* Comments */}
                  <div className="divide-y divide-gray-50">
                    {postComments.length === 0 && (
                      <p className="text-xs text-gray-400 px-4 py-2.5 italic">아직 댓글이 없습니다.</p>
                    )}
                    {postComments.map(c => {
                      const canDeleteComment = isAdmin || c.authorId === currentUser.id;
                      return (
                        <div key={c.id} className="flex items-start gap-2 px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-semibold text-gray-600">{c.authorName}</span>
                            <span className="text-[10px] text-gray-400 ml-1.5">{formatDate(c.createdAt)}</span>
                            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                          </div>
                          {canDeleteComment && (
                            <button
                              onClick={() => handleDeleteComment(post.id, c.id)}
                              className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition rounded mt-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Comment input */}
                  <div className="px-4 py-2.5 border-t border-gray-100 flex gap-2 items-end">
                    <textarea
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none min-h-[36px]"
                      rows={1}
                      placeholder="댓글을 입력하세요"
                      value={commentDraft}
                      onChange={e => setCommentDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(post.id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentDraft.trim()}
                      className="flex-shrink-0 p-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white rounded-xl transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
