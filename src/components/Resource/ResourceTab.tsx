import { useState } from 'react';
import type { User, ResourceCategory, ResourceRequest } from '../../types';
import { Lock } from 'lucide-react';
import {
  getUsers,
  createResourceRequest,
  getPendingRequestsForUser,
  getSentRequests,
  completeResourceRequest,
} from '../../store';

interface Props {
  currentUser: User;
}

const CATEGORIES: ResourceCategory[] = ['기출 문제', '작품 자료', '기타 자료'];

export default function ResourceTab({ currentUser }: Props) {
  const [mode, setMode] = useState<'send' | 'received'>('send');

  // Send mode state
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('기출 문제');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [detail, setDetail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const allUsers = getUsers().filter(u => u.id !== currentUser.id);
  const pendingReceived = getPendingRequestsForUser(currentUser.id);
  const sentRequests = getSentRequests(currentUser.id);

  function handleSubmit() {
    if (!selectedRecipientId || !detail.trim()) return;
    const recipient = allUsers.find(u => u.id === selectedRecipientId);
    if (!recipient) return;

    const request: ResourceRequest = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      requesterId: currentUser.id,
      requesterName: currentUser.username,
      recipientId: recipient.id,
      recipientName: recipient.username,
      category: selectedCategory,
      detail: detail.trim(),
      status: '대기중',
    };
    createResourceRequest(request);
    setDetail('');
    setSelectedRecipientId('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  }

  function handleComplete(id: string) {
    completeResourceRequest(id);
    // Force re-render by toggling mode
    setMode('received');
  }

  if (currentUser.restrictions?.noResourceRequest) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Lock className="w-10 h-10 text-gray-200" />
        <p className="text-sm font-semibold text-gray-400">접근이 제한되었습니다</p>
        <p className="text-xs text-gray-300">자료 요청 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setMode('send')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            mode === 'send' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          요청 보내기
        </button>
        <button
          onClick={() => setMode('received')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            mode === 'received' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          받은 요청
          {pendingReceived.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-red-500 text-white rounded-full">
              {pendingReceived.length}
            </span>
          )}
        </button>
      </div>

      {mode === 'send' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            {/* Category selector */}
            <div>
              <p className="label">자료 유형</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-sm rounded-full font-medium transition-all border ${
                      selectedCategory === cat
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Member selector */}
            <div>
              <p className="label">받는 사람</p>
              {allUsers.length === 0 ? (
                <p className="text-sm text-gray-400">다른 스터디원이 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {allUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedRecipientId(user.id)}
                      className={`px-3 py-1.5 text-sm rounded-full font-medium transition-all border ${
                        selectedRecipientId === user.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {user.username}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detail textarea */}
            <div>
              <label className="label">요청 내용</label>
              <textarea
                className="textarea-field"
                rows={4}
                placeholder="어떤 자료가 필요한지 구체적으로 적어주세요"
                value={detail}
                onChange={e => setDetail(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!selectedRecipientId || !detail.trim()}
                className="btn-primary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitted ? '요청 완료!' : '요청 보내기'}
              </button>
            </div>
          </div>

          {/* Sent requests */}
          {sentRequests.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">내가 보낸 요청</p>
              <div className="space-y-2">
                {sentRequests.slice().reverse().map(req => (
                  <div key={req.id} className="card flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-700">{req.recipientName}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {req.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{req.detail}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        req.status === '대기중'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'received' && (
        <div>
          {pendingReceived.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">받은 요청이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {pendingReceived.map(req => (
                <div key={req.id} className="card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{req.requesterName}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {req.category}
                      </span>
                    </div>
                    <button
                      onClick={() => handleComplete(req.id)}
                      className="shrink-0 text-xs bg-green-600 text-white px-3 py-1 rounded-full font-medium hover:bg-green-700 transition"
                    >
                      완료
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{req.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
