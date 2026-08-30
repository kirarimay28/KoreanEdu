import { useState } from 'react';
import type { User, CheckStatus, ChecklistItem } from '../../types';
import { isPrivileged } from '../../types';
import {
  getUsers, getAssignmentCheck, getAssignmentChecksForWeek, upsertAssignmentCheck,
  getChecklistConfig, saveChecklistConfig,
} from '../../store';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Settings, Plus, X, Check, Pencil } from 'lucide-react';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  currentUser: User;
}

const STATUS_OPTIONS: { value: CheckStatus; label: string }[] = [
  { value: 'O',    label: 'O' },
  { value: '△',   label: '△' },
  { value: 'X',    label: 'X' },
  { value: 'none', label: '없음' },
];

const STATUS_STYLE: Record<string, string> = {
  'O':    'bg-green-500 text-white border-green-500',
  '△':   'bg-amber-400 text-white border-amber-400',
  'X':    'bg-red-400 text-white border-red-400',
  'none': 'bg-gray-200 text-gray-500 border-gray-200',
  '':     'bg-white text-gray-300 border-gray-200',
};

function getWeekStart(offset = 0): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = now.getDay() || 7;
  now.setDate(now.getDate() - day + 1 + offset * 7);
  return now.toISOString().split('T')[0];
}

function formatWeekLabel(weekKey: string): string {
  const d = new Date(weekKey + 'T00:00:00');
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getMonth() + 1}/${dt.getDate()}`;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${fmt(d)} ~ ${fmt(end)}`;
}

function calcCompletion(checks: Record<string, CheckStatus>, items: ChecklistItem[]): { pct: number; total: number } {
  let total = 0;
  let score = 0;
  for (const item of items) {
    const s = checks[item.id] ?? '';
    if (s === 'none') continue;
    total++;
    if (s === 'O') score += 1;
    else if (s === '△') score += 0.5;
  }
  return { pct: total === 0 ? 100 : Math.round((score / total) * 100), total };
}

function groupItems(items: ChecklistItem[]) {
  const result: Array<{ group?: string; items: ChecklistItem[] }> = [];
  for (const item of items) {
    const last = result[result.length - 1];
    if (item.group && last?.group === item.group) {
      last.items.push(item);
    } else {
      result.push({ group: item.group, items: [item] });
    }
  }
  return result;
}

function PctBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-9 text-right ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</span>
    </div>
  );
}

function StatusButton({ status, label, selected, onClick }: { status: CheckStatus; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-7 text-xs font-bold rounded-lg border transition-all ${selected ? STATUS_STYLE[status] : 'bg-white text-gray-300 border-gray-200 hover:border-gray-300'}`}
    >
      {label}
    </button>
  );
}

type ItemForm = { id: string; category: string; group: string; label: string; description: string };

function CategoryHeader({
  cat, onRename, onRemove,
}: { cat: string; onRename: (old: string, next: string) => void; onRemove: (cat: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(cat);

  function save() {
    const trimmed = value.trim();
    if (trimmed) onRename(cat, trimmed);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input
            className="flex-1 text-xs font-bold border border-primary-300 rounded-lg px-2 py-1 focus:outline-none"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
          />
          <button onClick={save} className="p-1 rounded text-green-500 hover:bg-green-50"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} className="p-1 rounded text-gray-400 hover:bg-gray-100"><X className="w-3.5 h-3.5" /></button>
        </>
      ) : (
        <>
          <p className="flex-1 text-[11px] font-bold text-primary-500 uppercase tracking-wide">{cat}</p>
          <button onClick={() => { setValue(cat); setEditing(true); }} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3 h-3" /></button>
          <button onClick={() => onRemove(cat)} className="p-1 rounded hover:bg-red-50 text-red-400"><X className="w-3 h-3" /></button>
        </>
      )}
    </div>
  );
}

export default function CheckListTab({ currentUser }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editCats, setEditCats] = useState<string[]>([]);
  const [editItems, setEditItems] = useState<ChecklistItem[]>([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [itemForm, setItemForm] = useState<ItemForm | null>(null);

  const weekKey = getWeekStart(weekOffset);
  const myEntry = getAssignmentCheck(currentUser.id, weekKey);
  const myChecks: Record<string, CheckStatus> = myEntry?.checks ?? {};

  const config = getChecklistConfig();
  const items = config.items;
  const categories = config.categories;

  function handleCheck(itemId: string, value: CheckStatus) {
    const next = value === (myChecks[itemId] ?? '') ? '' : value;
    const updated = { ...myChecks, [itemId]: next as CheckStatus };
    upsertAssignmentCheck(currentUser.id, currentUser.username, weekKey, updated);
    setTick(t => t + 1);
  }

  const { pct: myPct } = calcCompletion(myChecks, items);
  const allUsers = getUsers().filter(u => u.id !== currentUser.id);
  const weekEntries = getAssignmentChecksForWeek(weekKey);

  // ─── Edit mode helpers ────────────────────────────────────

  function enterEditMode() {
    setEditCats([...categories]);
    setEditItems(items.map(i => ({ ...i })));
    setItemForm(null);
    setNewCatInput('');
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setItemForm(null);
  }

  function saveEdit() {
    saveChecklistConfig(editCats, editItems);
    setEditMode(false);
    setItemForm(null);
    setTick(t => t + 1);
  }

  function addCategory() {
    const name = newCatInput.trim();
    if (!name || editCats.includes(name)) return;
    setEditCats(c => [...c, name]);
    setNewCatInput('');
  }

  function removeCategory(cat: string) {
    if (!window.confirm(`'${cat}' 과목과 그 항목을 모두 삭제할까요?`)) return;
    setEditCats(c => c.filter(x => x !== cat));
    setEditItems(it => it.filter(i => i.category !== cat));
    if (itemForm?.category === cat) setItemForm(null);
  }

  function renameCategory(oldName: string, newName: string) {
    if (newName === oldName) return;
    if (editCats.includes(newName)) return;
    setEditCats(c => c.map(x => x === oldName ? newName : x));
    setEditItems(it => it.map(i => i.category === oldName ? { ...i, category: newName } : i));
    if (itemForm?.category === oldName) setItemForm(f => f ? { ...f, category: newName } : f);
  }

  function openAddItem(cat: string) {
    setItemForm({ id: '', category: cat, group: '', label: '', description: '' });
  }

  function openEditItem(item: ChecklistItem) {
    setItemForm({ id: item.id, category: item.category, group: item.group ?? '', label: item.label, description: item.description });
  }

  function removeItem(id: string) {
    setEditItems(it => it.filter(i => i.id !== id));
    if (itemForm?.id === id) setItemForm(null);
  }

  function submitItemForm() {
    if (!itemForm) return;
    const label = itemForm.label.trim();
    if (!label) return;
    const item: ChecklistItem = {
      id: itemForm.id || crypto.randomUUID(),
      category: itemForm.category,
      group: itemForm.group.trim() || undefined,
      label,
      description: itemForm.description.trim(),
    };
    if (itemForm.id) {
      setEditItems(it => it.map(i => i.id === itemForm.id ? item : i));
    } else {
      setEditItems(it => [...it, item]);
    }
    setItemForm(null);
  }

  // ─── Edit Mode UI ─────────────────────────────────────────

  if (editMode) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">체크리스트 편집</p>
          <div className="flex gap-2">
            <button onClick={cancelEdit} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">취소</button>
            <button onClick={saveEdit} className="text-xs px-3 py-1.5 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600">저장</button>
          </div>
        </div>

        <div className="space-y-4">
          {editCats.map(cat => (
            <div key={cat} className="card">
              <CategoryHeader cat={cat} onRename={renameCategory} onRemove={removeCategory} />

              <div className="mt-3 space-y-2">
                {editItems.filter(i => i.category === cat).map(item => (
                  <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                      {item.group && <p className="text-[10px] text-blue-400 mt-0.5">그룹: {item.group}</p>}
                      {item.description && <p className="text-[10px] text-gray-400 mt-0.5">{item.description}</p>}
                    </div>
                    <button onClick={() => openEditItem(item)} className="p-1 rounded hover:bg-gray-200 text-gray-400"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => removeItem(item.id)} className="p-1 rounded hover:bg-red-50 text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}

                {/* Inline item form */}
                {itemForm && itemForm.category === cat && (
                  <div className="p-3 rounded-lg border border-primary-200 bg-primary-50/30 space-y-2">
                    <div>
                      <label className="text-[10px] text-gray-500 font-semibold">항목명 *</label>
                      <input
                        className="mt-0.5 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
                        value={itemForm.label}
                        onChange={e => setItemForm(f => f ? { ...f, label: e.target.value } : f)}
                        placeholder="항목 이름"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-semibold">그룹 (선택)</label>
                      <input
                        className="mt-0.5 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
                        value={itemForm.group}
                        onChange={e => setItemForm(f => f ? { ...f, group: e.target.value } : f)}
                        placeholder="예: 수능 기출 풀이"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-semibold">설명 (선택)</label>
                      <input
                        className="mt-0.5 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
                        value={itemForm.description}
                        onChange={e => setItemForm(f => f ? { ...f, description: e.target.value } : f)}
                        placeholder="부가 설명"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => setItemForm(null)} className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500">취소</button>
                      <button onClick={submitItemForm} className="text-xs px-3 py-1 rounded-lg bg-primary-500 text-white font-semibold">
                        {itemForm.id ? '수정 완료' : '추가'}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => openAddItem(cat)}
                  className="w-full text-xs text-gray-400 py-1.5 rounded-lg border border-dashed border-gray-200 hover:border-primary-300 hover:text-primary-500 transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 항목 추가
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add category */}
        <div className="card">
          <p className="text-xs font-semibold text-gray-600 mb-2">과목 추가</p>
          <div className="flex gap-2">
            <input
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
              value={newCatInput}
              onChange={e => setNewCatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
              placeholder="새 과목명"
            />
            <button onClick={addCategory} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold">추가</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Normal Mode UI ───────────────────────────────────────

  return (
    <div className="space-y-5" key={tick}>
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-600">{formatWeekLabel(weekKey)}</span>
        <button
          onClick={() => setWeekOffset(o => o + 1)}
          disabled={weekOffset >= 0}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Admin edit button */}
      {isPrivileged(currentUser) && (
        <div className="flex justify-end">
          <button
            onClick={enterEditMode}
            className="flex items-center gap-1 text-xs text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <Settings className="w-3.5 h-3.5" /> 체크리스트 편집
          </button>
        </div>
      )}

      {/* My checklist */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-800">내 체크리스트</p>
          <NameWithCrown name={currentUser.username} className="text-xs text-gray-400" />
        </div>

        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wide mb-2">{cat}</p>
              <div className="space-y-2">
                {groupItems(items.filter(i => i.category === cat)).map((g, gi) => (
                  <div key={gi}>
                    {g.group && <p className="text-[10px] font-bold text-gray-400 mb-1.5 mt-1">{g.group}</p>}
                    <div className={`space-y-2 ${g.group ? 'pl-2 border-l-2 border-gray-100' : ''}`}>
                      {g.items.map(item => (
                        <div key={item.id} className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                            {item.description && <p className="text-[10px] text-gray-400 mt-0.5">{item.description}</p>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {STATUS_OPTIONS.map(opt => (
                              <StatusButton
                                key={opt.value}
                                status={opt.value}
                                label={opt.label}
                                selected={(myChecks[item.id] ?? '') === opt.value}
                                onClick={() => handleCheck(item.id, opt.value)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 mb-1.5">완성도 ('과제 없음' 제외)</p>
          <PctBar pct={myPct} />
        </div>
      </div>

      {/* Member overview */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">멤버 완성도</p>
        <div className="space-y-2">
          {allUsers.map(user => {
            const entry = weekEntries.find(e => e.userId === user.id);
            const checks = entry?.checks ?? {};
            const { pct } = calcCompletion(checks, items);
            const isExpanded = expandedMember === user.id;

            return (
              <div key={user.id} className="card p-3">
                <button
                  className="w-full flex items-center gap-3"
                  onClick={() => setExpandedMember(isExpanded ? null : user.id)}
                >
                  <NameWithCrown name={user.username} className="text-sm font-semibold text-gray-700 flex-1 text-left" />
                  {!entry ? (
                    <span className="text-[10px] text-gray-300 mr-1">미입력</span>
                  ) : (
                    <div className="w-32"><PctBar pct={pct} /></div>
                  )}
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    {categories.map(cat => (
                      <div key={cat}>
                        <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wide mb-1.5">{cat}</p>
                        <div className="space-y-1.5">
                          {groupItems(items.filter(i => i.category === cat)).map((g, gi) => (
                            <div key={gi}>
                              {g.group && <p className="text-[10px] font-bold text-gray-400 mb-1 mt-0.5">{g.group}</p>}
                              <div className={`space-y-1.5 ${g.group ? 'pl-2 border-l-2 border-gray-100' : ''}`}>
                                {g.items.map(item => {
                                  const s = checks[item.id] ?? '';
                                  return (
                                    <div key={item.id} className="flex items-center gap-2">
                                      <span className="flex-1 text-xs text-gray-600">{item.label}</span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${STATUS_STYLE[s]}`}>
                                        {s === 'none' ? '없음' : s === '' ? '―' : s}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {allUsers.length === 0 && (
            <p className="text-xs text-gray-300 text-center py-4">다른 멤버가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
