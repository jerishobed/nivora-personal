import React, { useState } from 'react';
import { Target, Plus, Trash2, Edit3, Check, Sparkles, X, Trophy, TrendingUp } from 'lucide-react';
import { Goal } from '../types';
import { formatCurrency } from '../lib/firebase';

interface GoalsSectionProps {
  goals: Goal[];
  currency: string;
  onSaveGoal: (goal: Partial<Goal> & { title: string; targetAmount: number }) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

const GOAL_CATEGORIES: { id: Goal['category']; label: string; icon: string }[] = [
  { id: 'savings', label: 'Emergency & Savings', icon: '🛡️' },
  { id: 'investment', label: 'Wealth & Investment', icon: '📈' },
  { id: 'travel', label: 'Travel & Experiences', icon: '✈️' },
  { id: 'wellness', label: 'Health & Wellness', icon: '🌿' },
  { id: 'education', label: 'Learning & Growth', icon: '📚' },
  { id: 'other', label: 'Personal Project', icon: '🎯' }
];

export const GoalsSection: React.FC<GoalsSectionProps> = ({
  goals,
  currency,
  onSaveGoal,
  onDeleteGoal
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [category, setCategory] = useState<Goal['category']>('savings');
  const [targetDate, setTargetDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openNewGoal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('0');
    setCategory('savings');
    setTargetDate('');
    setIsModalOpen(true);
  };

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setCategory(goal.category);
    setTargetDate(goal.targetDate || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;
    if (!title.trim() || isNaN(target) || target <= 0) return;

    try {
      setIsSaving(true);
      await onSaveGoal({
        id: editingGoal?.id,
        title: title.trim(),
        targetAmount: target,
        currentAmount: current,
        category,
        targetDate: targetDate || undefined
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save goal error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="nivora-goals-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-[#f3e8dc] text-[#7b4a27] flex items-center justify-center shadow-2xs">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#1f1b18]">
              Smart Life &amp; Financial Goals
            </h3>
            <p className="text-[11px] sm:text-xs text-[#756b63]">
              Track milestone targets aligned with your reflections and budget.
            </p>
          </div>
        </div>

        <button
          id="add-goal-btn"
          onClick={openNewGoal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goal</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white/80 border border-[#e8ddd2] rounded-[20px] p-6 text-center shadow-2xs">
          <Trophy className="w-8 h-8 text-[#7b4a27] mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-bold text-[#1f1b18]">No Active Goals Set Yet</h4>
          <p className="text-xs text-[#756b63] max-w-sm mx-auto mt-1 mb-4">
            Create your first milestone (e.g. Emergency Fund, Trip, Wellness Retreat) to track mindful progress.
          </p>
          <button
            onClick={openNewGoal}
            className="px-4 py-2 rounded-[12px] bg-[#f3e8dc] text-[#7b4a27] text-xs font-semibold hover:bg-[#ebd9c7] transition-colors cursor-pointer"
          >
            Create First Milestone Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) || 0;
            const categoryObj = GOAL_CATEGORIES.find((c) => c.id === goal.category) || GOAL_CATEGORIES[0];
            const isCompleted = pct >= 100;

            return (
              <div
                key={goal.id}
                className="bg-white/90 border border-[#e8ddd2] rounded-[20px] p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#756b63] bg-[#f5f1eb] px-2.5 py-0.5 rounded-full">
                      <span>{categoryObj.icon}</span>
                      <span>{categoryObj.label}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditGoal(goal)}
                        className="p-1 text-[#756b63] hover:text-[#7b4a27] transition-colors cursor-pointer"
                        title="Edit Goal"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="p-1 text-[#756b63] hover:text-[#c62828] transition-colors cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-[#1f1b18]">{goal.title}</h4>
                  {goal.targetDate && (
                    <span className="text-[10px] text-[#756b63]">Target: {goal.targetDate}</span>
                  )}
                </div>

                <div>
                  {/* Amount Progress */}
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-[#7b4a27]">
                      {formatCurrency(goal.currentAmount, currency)}
                    </span>
                    <span className="text-[#756b63]">
                      Goal: {formatCurrency(goal.targetAmount, currency)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[#f0e8df] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-[#2e7d32]' : 'bg-[#7b4a27]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px]">
                    <span className="font-semibold text-[#756b63]">{pct}% Achieved</span>
                    {isCompleted && (
                      <span className="text-[#2e7d32] font-bold inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Target Reached!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Create/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#e8ddd2] rounded-[24px] w-full max-w-md p-6 shadow-xl relative"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-[#756b63] hover:text-[#1f1b18] p-1.5 rounded-full hover:bg-[#f5f1eb] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#1f1b18] mb-1">
              {editingGoal ? 'Edit Milestone Goal' : 'New Milestone Goal'}
            </h3>
            <p className="text-xs text-[#756b63] mb-4">
              Set clear targets to stay intentional with savings and life goals.
            </p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#756b63] mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, Japan Trip"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-[#756b63] mb-1">
                    Target Amount ({currency})
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="2500"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#756b63] mb-1">
                    Current Amount ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-[#756b63] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs focus:outline-hidden focus:border-[#7b4a27]"
                  >
                    {GOAL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#756b63] mb-1">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs focus:outline-hidden focus:border-[#7b4a27]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-[14px] bg-[#f5f1eb] hover:bg-[#eee7de] text-[#756b63] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !title.trim() || !targetAmount}
                  className="flex-1 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
