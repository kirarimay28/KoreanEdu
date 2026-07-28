import { useState, useRef } from 'react';
import type { User } from '../../types';
import { changeUsername, changePassword, deleteAccount, updateAvatar } from '../../store';
import { Settings, UserCircle, Lock, Trash2, ChevronRight, X, Camera, ImageOff } from 'lucide-react';
import NameWithCrown from '../common/NameWithCrown';
import Avatar from '../common/Avatar';

interface Props {
  currentUser: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
}

type Section = 'username' | 'password' | 'delete' | null;

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 240;
      const canvas = document.createElement('canvas');
      const ratio = Math.min(SIZE / img.width, SIZE / img.height);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function SettingsTab({ currentUser, onUserUpdate, onLogout }: Props) {
  const [section, setSection] = useState<Section>(null);
  const [currentPw, setCurrentPw] = useState('');
  const [newValue, setNewValue] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setCurrentPw(''); setNewValue(''); setConfirmPw(''); setError('');
  }
  function openSection(s: Section) { setSection(s); resetForm(); setSuccess(''); }

  function handleChangeUsername() {
    if (!newValue.trim()) { setError('새 아이디를 입력하세요.'); return; }
    const res = changeUsername(currentUser.id, currentPw, newValue.trim());
    if (res.ok && res.user) { onUserUpdate(res.user); setSuccess('아이디가 변경되었습니다.'); setSection(null); }
    else setError(res.error ?? '변경에 실패했습니다.');
  }

  function handleChangePassword() {
    if (!newValue.trim()) { setError('새 비밀번호를 입력하세요.'); return; }
    if (newValue !== confirmPw) { setError('비밀번호가 일치하지 않습니다.'); return; }
    const res = changePassword(currentUser.id, currentPw, newValue);
    if (res.ok) { setSuccess('비밀번호가 변경되었습니다.'); setSection(null); }
    else setError(res.error ?? '변경에 실패했습니다.');
  }

  function handleDeleteAccount() {
    if (!window.confirm('정말로 탈퇴하시겠습니까?\n모든 계정 정보가 삭제되며 복구할 수 없습니다.')) return;
    const res = deleteAccount(currentUser.id, currentPw);
    if (res.ok) onLogout();
    else setError(res.error ?? '탈퇴에 실패했습니다.');
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const dataUrl = await compressImage(file);
      const res = updateAvatar(currentUser.id, dataUrl);
      if (res.ok && res.user) { onUserUpdate(res.user); setSuccess('프로필 사진이 변경되었습니다.'); }
    } catch {
      setError('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setAvatarLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function handleRemoveAvatar() {
    const res = updateAvatar(currentUser.id, null);
    if (res.ok && res.user) { onUserUpdate(res.user); setSuccess('프로필 사진이 삭제되었습니다.'); }
  }

  const roleLabel = currentUser.role === 'admin' ? '방장' : currentUser.role === 'subadmin' ? '부방장' : '멤버';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Settings className="w-4 h-4 text-primary-500" />
        <h2 className="text-sm font-bold text-gray-800">설정</h2>
      </div>

      {/* Profile card */}
      <div className="card bg-gradient-to-br from-primary-50 to-pink-50 border-primary-100">
        <div className="flex items-center gap-4">
          {/* Avatar with edit button */}
          <div className="relative flex-shrink-0">
            <Avatar user={currentUser} size="lg" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-md hover:bg-primary-600 transition active:scale-90"
            >
              {avatarLoading
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                : <Camera className="w-3 h-3" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="min-w-0 flex-1">
            <NameWithCrown name={currentUser.username} className="text-base font-bold text-gray-800" />
            <p className="text-xs text-gray-400 mt-0.5">{roleLabel} · 가입일 {currentUser.createdAt.slice(0, 10)}</p>
            {currentUser.resolution && (
              <p className="text-xs text-gray-500 italic mt-1 line-clamp-2">"{currentUser.resolution}"</p>
            )}
          </div>
        </div>

        {/* Avatar actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-primary-100">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            사진 변경
          </button>
          {currentUser.avatarUrl && (
            <button
              onClick={handleRemoveAvatar}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 transition active:scale-95"
            >
              <ImageOff className="w-3.5 h-3.5" />
              삭제
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          ✓ {success}
        </div>
      )}

      {/* Settings list */}
      <div className="card p-0 overflow-hidden divide-y divide-gray-50">
        {[
          { id: 'username' as Section, icon: UserCircle, label: '아이디 변경', sub: currentUser.username, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
          { id: 'password' as Section, icon: Lock, label: '비밀번호 변경', sub: '••••', iconBg: 'bg-green-50', iconColor: 'text-green-500' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => openSection(item.id)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition"
            >
              <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${item.iconColor}`} style={{ width: '18px', height: '18px' }} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Delete account */}
      <button
        onClick={() => openSection('delete')}
        className="w-full flex items-center gap-3 px-4 py-4 bg-red-50 border border-red-100 rounded-2xl hover:bg-red-100 transition"
      >
        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-red-600">회원 탈퇴</p>
          <p className="text-xs text-red-400 mt-0.5">계정을 영구 삭제합니다</p>
        </div>
        <ChevronRight className="w-4 h-4 text-red-300 flex-shrink-0" />
      </button>

      {/* Inline form */}
      {section && (
        <div className="card border-primary-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">
              {section === 'username' ? '아이디 변경' : section === 'password' ? '비밀번호 변경' : '회원 탈퇴'}
            </p>
            <button onClick={() => setSection(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {section === 'delete' && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-600 leading-relaxed">
              ⚠️ 탈퇴 시 계정이 즉시 삭제되며 다시 로그인할 수 없습니다. 작성한 기록은 남아있을 수 있습니다.
            </div>
          )}

          <div>
            <label className="label">현재 비밀번호</label>
            <input
              type="password"
              className="input-field"
              placeholder="현재 비밀번호"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
            />
          </div>

          {section === 'username' && (
            <div>
              <label className="label">새 아이디</label>
              <input
                className="input-field"
                placeholder="변경할 아이디"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          )}

          {section === 'password' && (
            <>
              <div>
                <label className="label">새 비밀번호</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="새 비밀번호"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                />
              </div>
              <div>
                <label className="label">새 비밀번호 확인</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="새 비밀번호 확인"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={
              section === 'username' ? handleChangeUsername
              : section === 'password' ? handleChangePassword
              : handleDeleteAccount
            }
            className={`w-full py-2.5 text-sm font-semibold rounded-xl transition ${
              section === 'delete'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'btn-primary'
            }`}
          >
            {section === 'username' ? '아이디 변경하기' : section === 'password' ? '비밀번호 변경하기' : '탈퇴하기'}
          </button>
        </div>
      )}
    </div>
  );
}
