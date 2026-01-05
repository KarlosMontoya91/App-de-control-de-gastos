import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ComposedChart, Area
} from 'recharts';
import { 
  Wallet, Plus, Home, PieChart as
  Settings, ArrowRight, ArrowUpRight, ArrowDownLeft, Check, User, Calendar, Info, AlertCircle, Camera,
  AlertTriangle, Pencil, X, Save, HardDrive, Target, PiggyBank, Zap, Trash2, History, TrendingUp, BarChart3
} from 'lucide-react';

// --- TYPES & DATA MODEL ---

type Frequency = 'quincenal' | 'mensual' | 'semanal';
type TransactionType = 'expense' | 'income';
type TimeFilter = 'week' | 'month' | 'year';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO string
  note: string;
  type: TransactionType;
}

interface RecurringHistoryItem {
  month: string; // Formato YYYY-MM
  spent: number;
  limit: number;
}

interface RecurringExpense {
  id: string;
  name: string;
  amount: number; // Tope / Presupuesto
  spent: number;  // Acumulado actual
  category: string;
  dayOfMonth: number; // Día de corte/reinicio
  isPaid?: boolean;
  lastResetDate?: string; // Fecha del último reinicio de ciclo
  history?: RecurringHistoryItem[]; // Historial de meses pasados
}

interface BudgetCategory {
  id: string;
  name: string;
  limit: number;
  spent: number; 
  color: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon?: string;
}

interface UserConfig {
  hasCompletedOnboarding: boolean;
  name: string;
  avatar?: string;
  monthlyIncome: number;
  payFrequency: Frequency;
  currency: string;
  savingsRulePercent: number;
}

interface UserProfile {
  id: string;
  config: UserConfig;
  transactions: Transaction[];
  recurring: RecurringExpense[];
  budgets: BudgetCategory[];
  goals: SavingsGoal[];
}

// --- UTILS & HELPERS ---

const generateId = () => Math.random().toString(36).substr(2, 9);
const formatCurrency = (amount: number, currency = 'MXN') => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);

const DEFAULT_CATEGORIES = [
  { name: 'Vivienda', color: '#60A5FA' }, 
  { name: 'Alimentos', color: '#34D399' }, 
  { name: 'Transporte', color: '#F87171' }, 
  { name: 'Entretenimiento', color: '#A78BFA' }, 
  { name: 'Servicios', color: '#FBBF24' }, 
  { name: 'Salud', color: '#F472B6' }, 
  { name: 'Otros', color: '#94A3B8' }, 
];

const COLORS = ['#60A5FA', '#34D399', '#F87171', '#A78BFA', '#FBBF24', '#F472B6', '#94A3B8', '#FB923C', '#A3E635'];


// --- UI COMPONENTS ---

const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-slate-900 border border-slate-800 rounded-xl shadow-sm ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, onClick, variant = 'primary', className = "", disabled = false, type="button" 
}: { 
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; className?: string; disabled?: boolean; type?: "button" | "submit" 
}) => {
  const base = "px-4 py-3 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-yellow-400 text-slate-950 hover:bg-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.3)]",
    secondary: "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700",
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className={`w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all placeholder:text-slate-600 ${props.className}`} 
  />
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">
    {children}
  </label>
);

const ProgressBar = ({ value, max, colorOverride, isGoal = false }: { value: number; max: number; colorOverride?: string; isGoal?: boolean }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  let colorClass = "bg-green-500";
  if (!colorOverride) {
      if (isGoal) {
          colorClass = percentage < 50 ? "bg-yellow-400" : "bg-green-500";
      } else {
          if (percentage > 100) colorClass = "bg-red-500"; 
          else if (percentage > 85) colorClass = "bg-yellow-400"; 
          if (value > max) colorClass = "bg-red-500";
      }
  }

  return (
    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
      <div 
        className={`h-full ${colorOverride || colorClass} transition-all duration-700 ease-out`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// --- SPLASH SCREEN ---

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 4500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-out fade-out duration-1000 delay-[3.5s] fill-mode-forwards pointer-events-none">
       <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="bg-yellow-400 p-5 rounded-3xl mb-6 shadow-[0_0_50px_rgba(250,204,21,0.4)] animate-bounce-slow">
             <Wallet size={64} className="text-slate-950" strokeWidth={2} />
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tighter mb-2">Saldo<span className="text-yellow-400">Mensual</span></h1>
          <p className="text-slate-400 text-sm tracking-[0.3em] uppercase opacity-80">Control Inteligente</p>
       </div>
       <div className="absolute bottom-10 text-slate-600 text-xs">
          Cargando tus finanzas...
       </div>
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function FinanceApp() {
  const [users, setUsers] = useState<{[id: string]: UserProfile}>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [view, setView] = useState<'onboarding' | 'dashboard' | 'budget' | 'recurring' | 'alerts' | 'reports' | 'settings' | 'goals'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  // Edit Recurring Modal
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [historyRecurring, setHistoryRecurring] = useState<RecurringExpense | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Edit Goal Modal
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [isConfirmingDeleteGoal, setIsConfirmingDeleteGoal] = useState(false);

  // Partial Payment Modal State
  const [payRecurringId, setPayRecurringId] = useState<string | null>(null);
  const [payRecurringAmount, setPayRecurringAmount] = useState('');

  // Add Money to Goal Modal State
  const [goalDepositId, setGoalDepositId] = useState<string | null>(null);
  const [goalDepositAmount, setGoalDepositAmount] = useState('');

  // General Chart State
  const [generalChartFilter, setGeneralChartFilter] = useState<TimeFilter>('month');

  // Helper to check for recurring resets
  const checkRecurringResets = (profile: UserProfile): UserProfile => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const updatedRecurring = profile.recurring.map(r => {
      const lastReset = r.lastResetDate || '';
      let shouldReset = false;
      
      if (!lastReset) {
         return { ...r, lastResetDate: currentMonthStr };
      }

      if (lastReset !== currentMonthStr) {
          if (today.getDate() >= r.dayOfMonth) {
              shouldReset = true;
          }
      }

      if (shouldReset) {
          const historyItem: RecurringHistoryItem = {
              month: lastReset, 
              spent: r.spent,
              limit: r.amount
          };
          const newHistory = [...(r.history || []), historyItem];
          
          return {
              ...r,
              spent: 0,
              isPaid: false,
              lastResetDate: currentMonthStr, 
              history: newHistory
          };
      }
      return r;
    });

    return { ...profile, recurring: updatedRecurring };
  };

  // Persistence Load (LOCAL DATABASE)
  useEffect(() => {
    const savedData = localStorage.getItem('saldomensual_db_v2'); 
    if (savedData) {
      const parsed = JSON.parse(savedData);
      let loadedUsers = parsed.users || {};
      
      const currentId = parsed.currentUserId;
      if (currentId && loadedUsers[currentId]) {
          loadedUsers[currentId] = checkRecurringResets(loadedUsers[currentId]);
      }

      setUsers(loadedUsers);
      setCurrentUserId(parsed.currentUserId || null);
    } else {
      const newId = generateId();
      const initialUser: UserProfile = {
        id: newId,
        config: { hasCompletedOnboarding: false, name: '', monthlyIncome: 0, payFrequency: 'quincenal', currency: 'MXN', savingsRulePercent: 10 },
        transactions: [],
        recurring: [],
        budgets: [],
        goals: []
      };
      setUsers({ [newId]: initialUser });
      setCurrentUserId(newId);
    }
  }, []);

  // Persistence Save
  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('saldomensual_db_v2', JSON.stringify({ users, currentUserId }));
    }
  }, [users, currentUserId]);

  const userData = currentUserId ? users[currentUserId] : null;

  useEffect(() => {
    if (userData && !userData.config.hasCompletedOnboarding) {
      setView('onboarding');
      setShowSplash(false);
    }
  }, [userData]);

  const updateUser = (updates: Partial<UserProfile>) => {
    if (!currentUserId) return;
    setUsers(prev => ({
      ...prev,
      [currentUserId]: { ...prev[currentUserId], ...updates }
    }));
  };

  // --- ACTIONS ---

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    if (!userData) return;
    const newT = { ...t, id: generateId() };
    const updatedTransactions = [newT, ...userData.transactions];
    
    let updatedBudgets = [...userData.budgets];
    if (t.type === 'expense') {
      updatedBudgets = updatedBudgets.map(b => 
        b.name === t.category ? { ...b, spent: b.spent + t.amount } : b
      );
    }

    updateUser({ 
      transactions: updatedTransactions,
      budgets: updatedBudgets,
    });
    setView('dashboard');
    setIsModalOpen(false);
  };

  const addRecurringPayment = (id: string, amount: number) => {
    if (!userData) return;
    const updatedRecurring = userData.recurring.map(r => {
      if (r.id === id) {
          const newSpent = r.spent + amount;
          return { ...r, spent: newSpent, isPaid: newSpent >= r.amount };
      }
      return r;
    });
    updateUser({ recurring: updatedRecurring });
    setPayRecurringId(null);
    setPayRecurringAmount('');
  };

  const editRecurringExpense = (id: string, name: string, amount: number, day: number) => {
    if (!userData) return;
    const updatedRecurring = userData.recurring.map(r => {
      if (r.id === id) {
          return { ...r, name, amount, dayOfMonth: day, isPaid: r.spent >= amount };
      }
      return r;
    });
    updateUser({ recurring: updatedRecurring });
    setEditingRecurring(null);
  };

  const deleteRecurringExpense = (id: string) => {
    if (!userData) return;
    const updatedRecurring = userData.recurring.filter(r => r.id !== id);
    updateUser({ recurring: updatedRecurring });
    setEditingRecurring(null);
    setIsConfirmingDelete(false);
  };

  const editGoal = (id: string, name: string, target: number) => {
    if (!userData) return;
    const updatedGoals = userData.goals.map(g => {
        if (g.id === id) return { ...g, name, targetAmount: target };
        return g;
    });
    updateUser({ goals: updatedGoals });
    setEditingGoal(null);
  };

  const deleteGoal = (id: string) => {
    if (!userData) return;
    const updatedGoals = userData.goals.filter(g => g.id !== id);
    updateUser({ goals: updatedGoals });
    setEditingGoal(null);
    setIsConfirmingDeleteGoal(false);
  };

  const addGoalDeposit = (id: string, amount: number) => {
    if (!userData) return;
    const updatedGoals = userData.goals.map(g => {
        if (g.id === id) {
            return { ...g, currentAmount: g.currentAmount + amount };
        }
        return g;
    });
    updateUser({ goals: updatedGoals });
    setGoalDepositId(null);
    setGoalDepositAmount('');
  };

  const updateBudgetLimit = (id: string, newLimit: number) => {
    if (!userData) return;
    const updatedBudgets = userData.budgets.map(b => 
      b.id === id ? { ...b, limit: newLimit } : b
    );
    updateUser({ budgets: updatedBudgets });
  };

  const addBudgetCategory = (name: string, limit: number) => {
    if (!userData) return;
    const color = COLORS[userData.budgets.length % COLORS.length];
    const newBudget: BudgetCategory = {
      id: generateId(),
      name,
      limit,
      spent: 0,
      color
    };
    updateUser({ budgets: [...userData.budgets, newBudget] });
    setIsCategoryModalOpen(false);
  };

  const addRecurringExpense = (name: string, amount: number, day: number) => {
    if (!userData) return;
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const newRecurring: RecurringExpense = {
      id: generateId(),
      name,
      amount, // Limit
      spent: 0,
      category: 'Servicios',
      dayOfMonth: day,
      isPaid: false,
      lastResetDate: currentMonthStr,
      history: []
    };
    updateUser({ recurring: [...userData.recurring, newRecurring] });
    setIsRecurringModalOpen(false);
  };

  const addGoal = (name: string, target: number) => {
    if (!userData) return;
    const newGoal: SavingsGoal = {
        id: generateId(),
        name,
        targetAmount: target,
        currentAmount: 0,
    };
    updateUser({ goals: [...userData.goals, newGoal] });
    setIsGoalModalOpen(false);
  };

  // --- SUB-VIEWS ---

  const OnboardingWizard = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<UserProfile>>({
      config: userData?.config,
      recurring: [],
      budgets: [],
      goals: []
    });

    const recurringTotal = formData.recurring?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const income = formData.config?.monthlyIncome || 0;
    const estimatedAvailable = income - recurringTotal;

    const handleFinish = () => {
      if (!userData) return;
      const disposable = (formData.config?.monthlyIncome || 0) - (formData.recurring?.reduce((a,b)=>a+b.amount,0) || 0);
      const budgetPerCategory = Math.floor((disposable * 0.9) / DEFAULT_CATEGORIES.length); 

      const initialBudgets = DEFAULT_CATEGORIES.map(cat => ({
        id: generateId(),
        name: cat.name,
        limit: budgetPerCategory > 0 ? budgetPerCategory : 1000, 
        spent: 0,
        color: cat.color
      }));

      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      const initRecurring = (formData.recurring || []).map(r => ({ ...r, lastResetDate: currentMonthStr, history: [] }));

      updateUser({
        config: { 
          ...userData.config, 
          ...formData.config, 
          hasCompletedOnboarding: true, 
          name: formData.config?.name || 'Usuario', 
        },
        recurring: initRecurring,
        budgets: initialBudgets,
        goals: [{ id: generateId(), name: 'Fondo de Emergencia', targetAmount: (formData.config?.monthlyIncome || 0) * 3, currentAmount: 0 }]
      });
      setView('dashboard');
    };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Saldo<span className="text-yellow-400">Mensual</span></h1>
            <p className="text-slate-400">Configuración Inicial</p>
          </div>
          <Card className="p-6 space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">1. Datos Básicos</h2>
                <Input placeholder="Tu nombre" value={formData.config?.name || ''} onChange={e => setFormData({...formData, config: {...formData.config!, name: e.target.value}})} />
                <Input type="number" placeholder="Ingreso Mensual Neto" value={formData.config?.monthlyIncome || ''} onChange={e => setFormData({...formData, config: {...formData.config!, monthlyIncome: Number(e.target.value)}})} />
                <Button className="w-full mt-4" onClick={() => setStep(2)}>Siguiente</Button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">2. Gastos Fijos (Estimados)</h2>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {formData.recurring?.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-white text-sm">{r.name}</span>
                      <span className="text-white font-mono text-sm">{formatCurrency(r.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <Input id="rec-name" placeholder="Ej: Netflix" className="text-sm" />
                   <Input id="rec-amount" type="number" placeholder="$ Tope" className="text-sm" />
                </div>
                <Button variant="secondary" className="w-full py-2 text-sm" onClick={() => {
                   const name = (document.getElementById('rec-name') as HTMLInputElement).value;
                   const amount = Number((document.getElementById('rec-amount') as HTMLInputElement).value);
                   if(name && amount) {
                     setFormData({
                       ...formData, 
                       recurring: [...(formData.recurring || []), { id: generateId(), name, amount, spent: 0, category: 'Servicios', dayOfMonth: 1 }]
                     });
                     (document.getElementById('rec-name') as HTMLInputElement).value = '';
                     (document.getElementById('rec-amount') as HTMLInputElement).value = '';
                   }
                }}>+ Agregar</Button>
                <Button className="w-full mt-4" onClick={() => setStep(3)}>Siguiente</Button>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-semibold text-white">3. Resumen</h2>
                <div className="bg-slate-800/50 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Ingreso Mensual</span>
                        <span className="text-white font-medium">{formatCurrency(income)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-3">
                        <span className="text-slate-400">Gastos Fijos (Est.)</span>
                        <span className="text-red-400 font-medium">-{formatCurrency(recurringTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-yellow-400 font-bold">Disponible p/ Gastos</span>
                        <span className="text-yellow-400 font-bold text-lg">{formatCurrency(estimatedAvailable)}</span>
                    </div>
                </div>
                <Button className="w-full mt-6" onClick={handleFinish}>
                   <Check size={18} /> Finalizar Setup
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    if (!userData) return null;
    
    const variableSpent = userData.transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = userData.transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const fixedSpent = userData.recurring.reduce((acc, r) => acc + r.spent, 0);
    
    const currentBalance = (userData.config.monthlyIncome + totalIncome) - fixedSpent - variableSpent;

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          updateUser({ config: { ...userData.config, avatar: reader.result as string } });
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="space-y-6 pb-24 animate-in fade-in">
        {/* Header with Avatar */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-4">
             {/* Avatar Circle */}
             <div className="relative group w-14 h-14">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center shadow-lg">
                    {userData.config.avatar ? (
                        <img src={userData.config.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User size={24} className="text-slate-400"/>
                    )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-all z-10 backdrop-blur-sm">
                    <Camera size={18} className="text-white"/>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
             </div>
             
             <div>
               <h1 className="text-xl font-bold text-white leading-tight">Hola, {userData.config.name}</h1>
               <div className="flex items-center gap-2">
                 <p className="text-slate-400 text-xs flex items-center gap-1">
                   <Calendar size={10} />
                   {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                 </p>
                 <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                    <HardDrive size={10} className="text-yellow-400" />
                    <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider">Base Local</span>
                 </div>
               </div>
             </div>
          </div>

          <button onClick={() => setView('settings')} className={`p-2 bg-slate-900 rounded-full border border-slate-800 text-slate-400 hover:text-white transition-colors`}>
            <Settings size={20} />
          </button>
        </div>

        <Card className="p-6 bg-gradient-to-br from-yellow-500 to-amber-600 border-none relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <p className="text-yellow-900 font-medium mb-1 text-sm uppercase tracking-wider opacity-80">Disponible Real</p>
            <h2 className="text-4xl font-bold text-slate-900 tracking-tighter">{formatCurrency(currentBalance)}</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-slate-900/80 text-xs font-bold">
              <span className="bg-white/20 px-2 py-1 rounded">Ingresos: {formatCurrency(userData.config.monthlyIncome + totalIncome)}</span>
            </div>
          </div>
        </Card>

        {/* --- GRID SHORTCUTS --- */}
        <div className="grid grid-cols-2 gap-3">
             <Card onClick={() => setView('recurring')} className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group">
                <div className="bg-blue-500/10 w-fit p-2 rounded-lg text-blue-400 group-hover:bg-blue-500/20 mb-2">
                   <Zap size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Fijos</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide">
                     Servicios, Recibos
                  </p>
                </div>
             </Card>

             <Card onClick={() => setView('goals')} className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group">
                <div className="bg-green-500/10 w-fit p-2 rounded-lg text-green-400 group-hover:bg-green-500/20 mb-2">
                   <Target size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Metas</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide">Ahorros</p>
                </div>
             </Card>

             <Card onClick={() => setView('budget')} className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group">
                <div className="bg-yellow-500/10 w-fit p-2 rounded-lg text-yellow-400 group-hover:bg-yellow-500/20 mb-2">
                   <Wallet size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Sobres</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide">Gastos Variables</p>
                </div>
             </Card>

             <Card onClick={() => setView('reports')} className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group">
                <div className="bg-purple-500/10 w-fit p-2 rounded-lg text-purple-400 group-hover:bg-purple-500/20 mb-2">
                   <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Análisis</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide">Reportes</p>
                </div>
             </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4 mt-2">
             <h3 className="text-lg font-bold text-white">Movimientos Recientes</h3>
             <button onClick={() => setView('reports')} className="text-xs text-yellow-400">Ver reporte</button>
          </div>
          <div className="space-y-2">
            {userData.transactions.length === 0 ? (
               <div className="text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-lg text-sm bg-slate-900/50">
                 No hay movimientos recientes
               </div>
            ) : userData.transactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl items-center">
                <div className="flex gap-3 items-center">
                   <div className={`p-2 rounded-full h-fit ${t.type==='expense'?'bg-red-500/10 text-red-500':'bg-green-500/10 text-green-500'}`}>
                     {t.type==='expense'?<ArrowUpRight size={16}/>:<ArrowDownLeft size={16}/>}
                   </div>
                   <div>
                     <p className="text-white text-sm font-medium">{t.category}</p>
                     <p className="text-slate-500 text-xs">{t.note || new Date(t.date).toLocaleDateString()}</p>
                   </div>
                </div>
                <span className={`font-mono font-bold ${t.type==='expense'?'text-white':'text-green-400'}`}>
                  {t.type==='expense'?'-':'+'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const BudgetView = () => {
    if (!userData) return null;
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');

    const startEditing = (b: BudgetCategory) => {
      setEditingId(b.id);
      setEditAmount(b.limit.toString());
    };

    const saveEdit = (id: string) => {
      if(editAmount) {
         updateBudgetLimit(id, Number(editAmount));
         setEditingId(null);
      }
    };

    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-white">Presupuestos (Sobres)</h1>
        <p className="text-slate-400 text-sm -mt-4">Control de gastos variables por categoría</p>
        
        <div className="space-y-4">
          {userData.budgets.map(b => {
            const percent = (b.spent / b.limit) * 100;
            const isOver = b.spent > b.limit;
            const isNearLimit = percent > 85 && !isOver;
            // const overAmount = b.spent - b.limit;
            const isEditing = editingId === b.id;

            let statusColor = "bg-green-500";
            if (isOver) statusColor = "bg-red-500";
            else if (isNearLimit) statusColor = "bg-yellow-400";

            return (
              <Card key={b.id} className="p-4 relative overflow-visible transition-all hover:border-slate-700">
                {isOver && !isEditing && (
                  <div className="absolute -top-2 -right-2 group z-10">
                    <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg border-2 border-slate-900 animate-bounce cursor-help">
                       <AlertTriangle size={16} />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end mb-2">
                   <div>
                     <h3 className="text-white font-bold text-lg flex items-center gap-2">
                       {b.name}
                     </h3>
                     <p className={`text-xs ${isOver ? 'text-red-400 font-bold' : isNearLimit ? 'text-yellow-400' : 'text-slate-400'}`}>
                       {isOver ? 'Excedido' : isNearLimit ? 'Cerca del límite' : 'En orden'}
                     </p>
                   </div>
                   
                   <div className="text-right flex items-center gap-2">
                     {isEditing ? (
                       <div className="flex items-center gap-1">
                          <input 
                            autoFocus
                            type="number" 
                            className="w-20 bg-slate-800 border border-slate-600 text-white px-2 py-1 rounded text-sm text-right"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                          />
                          <button onClick={() => saveEdit(b.id)} className="p-1 bg-green-500 text-white rounded hover:bg-green-600"><Save size={14}/></button>
                          <button onClick={() => setEditingId(null)} className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"><X size={14}/></button>
                       </div>
                     ) : (
                       <div className="flex items-center gap-2 group">
                         <div>
                            <span className={`text-sm font-mono ${isOver ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                              {formatCurrency(b.spent)}
                            </span>
                            <span className="text-slate-500 text-xs"> / {formatCurrency(b.limit)}</span>
                         </div>
                         <button 
                           onClick={() => startEditing(b)} 
                           className="text-slate-600 hover:text-yellow-400 transition-colors p-1"
                         >
                           <Pencil size={12} />
                         </button>
                       </div>
                     )}
                   </div>
                </div>

                <ProgressBar value={b.spent} max={b.limit} colorOverride={statusColor} />
              </Card>
            )
          })}
          
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="w-full py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-yellow-400 hover:border-yellow-400/50 hover:bg-yellow-400/5 transition-all flex items-center justify-center gap-2"
          >
             <Plus size={20} />
             <span>Agregar Nuevo Sobre</span>
          </button>
        </div>
      </div>
    );
  };

  const RecurringView = () => {
    if (!userData) return null;
    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-white">Gastos Fijos & Servicios</h1>
        <p className="text-slate-400 text-sm -mt-4">Controla pagos como Gasolina, Luz o Renta.</p>
        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-2 items-start text-xs text-blue-300 mb-2">
            <Info size={14} className="mt-0.5 shrink-0" />
            <p>Los gastos se reinician automáticamente después de su día de corte mensual, guardando el historial.</p>
        </div>

        <div className="space-y-4">
          {userData.recurring.length === 0 && (
            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No hay gastos fijos configurados.
            </div>
          )}
          {userData.recurring.map(r => {
            const isFull = r.spent >= r.amount;
            return (
                <Card key={r.id} className="p-4 relative">
                   <div className="absolute top-2 right-2 flex gap-2">
                       <button 
                          onClick={() => setHistoryRecurring(r)}
                          className="p-1.5 text-slate-500 hover:text-blue-400 rounded hover:bg-slate-800"
                       >
                           <History size={14} />
                       </button>
                       <button 
                         onClick={() => {
                             setEditingRecurring(r);
                             setIsConfirmingDelete(false);
                         }}
                         className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-slate-800"
                       >
                           <Pencil size={14} />
                       </button>
                   </div>
                   <div className="flex justify-between items-start mb-2 pr-16">
                      <div className="flex gap-3">
                         <div className={`p-2 rounded-lg h-fit ${isFull ? 'bg-green-500/10 text-green-500' : 'bg-slate-800 text-slate-400'}`}>
                             {isFull ? <Check size={20} /> : <Zap size={20} />}
                         </div>
                         <div>
                             <h3 className="text-white font-bold">{r.name}</h3>
                             <p className="text-xs text-slate-400">Vence día {r.dayOfMonth}</p>
                         </div>
                      </div>
                      <div className="text-right">
                          <p className="text-white font-mono font-bold">{formatCurrency(r.spent)}</p>
                          <p className="text-xs text-slate-500">de {formatCurrency(r.amount)}</p>
                      </div>
                   </div>

                   <ProgressBar value={r.spent} max={r.amount} />
                   
                   <div className="mt-3 flex justify-between items-center">
                       <p className={`text-xs font-bold ${isFull ? 'text-green-500' : r.spent > r.amount ? 'text-red-500' : 'text-slate-500'}`}>
                           {isFull 
                             ? (r.spent > r.amount ? `Excedido por ${formatCurrency(r.spent - r.amount)}` : 'Completado') 
                             : `Restan ${formatCurrency(r.amount - r.spent)}`
                           }
                       </p>
                       <button 
                         onClick={() => setPayRecurringId(r.id)}
                         className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg flex items-center gap-1 transition-colors"
                       >
                           <Plus size={12} /> Abonar
                       </button>
                   </div>
                </Card>
            );
          })}
          
          <button 
            onClick={() => setIsRecurringModalOpen(true)}
            className="w-full py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4"
          >
             <Plus size={16} />
             <span>Agregar Nuevo Gasto Fijo</span>
          </button>
        </div>

        {/* Modal Historial de Gasto Fijo */}
        {historyRecurring && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                 <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <History size={18} className="text-blue-400"/>
                        Historial: {historyRecurring.name}
                    </h2>
                    <button onClick={() => setHistoryRecurring(null)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                 </div>

                 {!historyRecurring.history || historyRecurring.history.length === 0 ? (
                     <p className="text-slate-500 text-sm text-center py-6">Aún no hay historial registrado para este servicio.</p>
                 ) : (
                    <>
                       <div className="h-40 w-full">
                           <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={historyRecurring.history}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => val.split('-')[1]} />
                                  <RechartsTooltip 
                                     contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                     formatter={(val: number) => formatCurrency(val)}
                                  />
                                  <Bar dataKey="spent" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                               </BarChart>
                           </ResponsiveContainer>
                       </div>
                       
                       <div className="space-y-3">
                          {historyRecurring.history.slice().reverse().map((h, idx) => {
                             const diff = h.spent - h.limit;
                             const isOver = diff > 0;
                             return (
                               <div key={idx} className="bg-slate-800/50 p-3 rounded-lg">
                                  <div className="flex justify-between text-xs mb-1">
                                     <span className="text-slate-300 font-bold">{h.month}</span>
                                     <span className={isOver ? "text-red-400" : "text-green-400"}>
                                        {isOver ? `+${formatCurrency(diff)}` : `Ahorro: ${formatCurrency(Math.abs(diff))}`}
                                     </span>
                                  </div>
                                  <ProgressBar value={h.spent} max={h.limit} />
                                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                     <span>Gastado: {formatCurrency(h.spent)}</span>
                                     <span>Tope: {formatCurrency(h.limit)}</span>
                                  </div>
                               </div>
                             )
                          })}
                       </div>
                    </>
                 )}
             </div>
          </div>
        )}

        {/* Modal Pago Parcial Gasto Fijo */}
        {payRecurringId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                   <h2 className="text-lg font-bold text-white">Registrar Pago</h2>
                   <p className="text-slate-400 text-sm">¿Cuánto pagaste hoy para este servicio?</p>
                   <Input 
                      autoFocus 
                      type="number" 
                      placeholder="Monto ($)" 
                      value={payRecurringAmount} 
                      onChange={e => setPayRecurringAmount(e.target.value)} 
                   />
                   <div className="flex gap-2 pt-2">
                     <Button variant="secondary" className="flex-1" onClick={() => setPayRecurringId(null)}>Cancelar</Button>
                     <Button className="flex-1" onClick={() => { 
                         if(payRecurringAmount) addRecurringPayment(payRecurringId, Number(payRecurringAmount)); 
                     }}>Registrar</Button>
                   </div>
                </div>
            </div>
        )}

        {/* Modal Editar Gasto Fijo */}
        {editingRecurring && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4 relative">
                   <h2 className="text-lg font-bold text-white">Editar Gasto Fijo</h2>
                   
                   {!isConfirmingDelete ? (
                       <>
                           <div>
                               <Label>Nombre del Gasto</Label>
                               <Input id="edit-rec-name" defaultValue={editingRecurring.name} />
                           </div>
                           <div>
                               <Label>Monto Presupuesto</Label>
                               <Input id="edit-rec-amount" type="number" defaultValue={editingRecurring.amount} />
                           </div>
                           <div>
                               <Label>Día de Pago</Label>
                               <Input id="edit-rec-day" type="number" defaultValue={editingRecurring.dayOfMonth} />
                           </div>
                           
                           <div className="flex gap-2 pt-4">
                             <Button variant="secondary" className="flex-1" onClick={() => setEditingRecurring(null)}>Cancelar</Button>
                             <Button className="flex-1" onClick={() => { 
                                 const name = (document.getElementById('edit-rec-name') as HTMLInputElement).value;
                                 const amount = Number((document.getElementById('edit-rec-amount') as HTMLInputElement).value);
                                 const day = Number((document.getElementById('edit-rec-day') as HTMLInputElement).value);
                                 if(name && amount && day) editRecurringExpense(editingRecurring.id, name, amount, day); 
                             }}>Guardar</Button>
                           </div>

                           <div className="pt-2 border-t border-slate-800 mt-2">
                                <button 
                                    onClick={() => setIsConfirmingDelete(true)}
                                    className="w-full text-red-500 text-sm py-2 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Eliminar Gasto
                                </button>
                           </div>
                       </>
                   ) : (
                       <div className="py-4 space-y-4 text-center">
                           <div className="mx-auto w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-2">
                               <AlertCircle size={24} />
                           </div>
                           <h3 className="text-white font-bold">¿Estás seguro?</h3>
                           <p className="text-slate-400 text-sm">Esta acción eliminará el gasto fijo "{editingRecurring.name}" permanentemente.</p>
                           <div className="flex gap-2 pt-4">
                                <Button variant="secondary" className="flex-1" onClick={() => setIsConfirmingDelete(false)}>Cancelar</Button>
                                <Button variant="danger" className="flex-1" onClick={() => deleteRecurringExpense(editingRecurring.id)}>Sí, Eliminar</Button>
                           </div>
                       </div>
                   )}
                </div>
            </div>
        )}
      </div>
    );
  };

  const ReportsView = () => {
    if (!userData) return null;
    
    // 1. Data for General Expense Chart (Filtered)
    const generalChartData = useMemo(() => {
        const today = new Date();
        const expenses = userData.transactions.filter(t => t.type === 'expense');
        
        if (generalChartFilter === 'week') {
            // Group by day for the last 7 days? Or by week number? Let's do last 7 days for better visualization
            const last7Days = Array.from({length: 7}, (_, i) => {
                const d = new Date();
                d.setDate(today.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });
            return last7Days.map(dateStr => {
                const dayExpenses = expenses.filter(t => t.date.startsWith(dateStr));
                const total = dayExpenses.reduce((sum, t) => sum + t.amount, 0);
                // Format date to "Lun 10"
                const dateObj = new Date(dateStr);
                const name = dateObj.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
                return { name, total };
            });
        } else if (generalChartFilter === 'month') {
            // Group by Week inside the current month? Or last 6 months? 
            // Let's do Last 6 Months for "Month" view
            const data = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const monthExpenses = expenses.filter(t => t.date.startsWith(monthStr));
                const total = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
                const name = d.toLocaleDateString('es-MX', { month: 'short' });
                data.push({ name, total });
            }
            return data;
        } else {
            // Year view: Group by Month for current year
            const currentYear = today.getFullYear();
            const data = [];
            for (let i = 0; i < 12; i++) {
                const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
                const monthExpenses = expenses.filter(t => t.date.startsWith(monthStr));
                const total = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
                const d = new Date(currentYear, i, 1);
                const name = d.toLocaleDateString('es-MX', { month: 'short' });
                data.push({ name, total });
            }
            return data;
        }
    }, [userData.transactions, generalChartFilter]);


    // 2. Data for Fixed Expenses Stacked Chart (Tower)
    const fixedExpensesChartData = useMemo(() => {
        // Aggregate history from all recurring expenses
        const monthlyData: {[key: string]: { spent: number, limit: number }} = {};
        
        userData.recurring.forEach(r => {
             (r.history || []).forEach(h => {
                 if (!monthlyData[h.month]) monthlyData[h.month] = { spent: 0, limit: 0 };
                 monthlyData[h.month].spent += h.spent;
                 monthlyData[h.month].limit += h.limit;
             });
        });

        // Add current month progress? 
        // Optional: It might look weird if the month isn't finished. Let's stick to history.
        
        return Object.keys(monthlyData).sort().slice(-6).map(month => ({
            name: month.split('-')[1], // Month number
            Gasto: monthlyData[month].spent,
            Presupuesto: monthlyData[month].limit
        }));

    }, [userData.recurring]);


    // 3. Current Month Pie Chart Data
    const barData = userData.budgets.map(b => ({
      name: b.name,
      Presupuesto: b.limit,
      Gasto: b.spent,
    }));

    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-white">Análisis Financiero</h1>

        {/* --- 1. General Expenses Chart (Time Filter) --- */}
        <Card className="p-4">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <BarChart3 size={16} className="text-yellow-400"/>
                    Gasto General
                </h3>
                <div className="flex bg-slate-800 rounded-lg p-0.5">
                    {(['week', 'month', 'year'] as TimeFilter[]).map((f) => (
                        <button
                           key={f}
                           onClick={() => setGeneralChartFilter(f)}
                           className={`text-[10px] px-2 py-1 rounded-md transition-all ${generalChartFilter === f ? 'bg-yellow-400 text-slate-900 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                            {f === 'week' ? 'Sem' : f === 'month' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>
             </div>
             
             <div className="h-56 w-full text-xs">
                 <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={generalChartData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                         <XAxis dataKey="name" stroke="#94a3b8" />
                         <YAxis stroke="#cbd5e1" width={40} tickFormatter={(val) => `$${val/1000}k`} />
                         <RechartsTooltip 
                             cursor={{fill: 'rgba(255,255,255,0.05)'}}
                             contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                             formatter={(val: number) => formatCurrency(val)}
                         />
                         <Bar dataKey="total" fill="#F87171" radius={[4, 4, 0, 0]} name="Gasto Total" />
                     </BarChart>
                 </ResponsiveContainer>
             </div>
        </Card>


        {/* --- 2. Fixed Expenses Tower Chart (Budget vs Actual) --- */}
        {fixedExpensesChartData.length > 0 && (
             <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Zap size={16} className="text-blue-400" />
                    <h3 className="text-white font-bold text-sm">Historial Fijos: Presupuesto vs Real</h3>
                </div>
                <div className="h-56 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={fixedExpensesChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" label={{ value: 'Mes', position: 'insideBottom', offset: -5 }} />
                            <YAxis stroke="#cbd5e1" width={40} />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                            />
                            <Legend verticalAlign="top" height={36} />
                            {/* Budget as an Area behind */}
                            <Area type="monotone" dataKey="Presupuesto" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.1} />
                            {/* Spent as a Bar */}
                            <Bar dataKey="Gasto" fill="#60A5FA" barSize={20} radius={[4, 4, 0, 0]} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
             </Card>
        )}

        {/* --- 3. Current Month Variable Expenses --- */}
        <h2 className="text-xl font-bold text-white mt-8 mb-2">Desglose Mensual (Sobres)</h2>
        
        <Card className="p-4">
          <h3 className="text-white mb-4 font-bold text-sm">Gasto Real vs Presupuesto</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#94a3b8" hide />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" width={80} />
                <RechartsTooltip 
                   cursor={{fill: 'rgba(255,255,255,0.05)'}}
                   contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                />
                <Legend />
                <Bar dataKey="Gasto" fill="#F87171" radius={[0, 4, 4, 0]} barSize={10} name="Gastado" />
                <Bar dataKey="Presupuesto" fill="#334155" radius={[0, 4, 4, 0]} barSize={10} name="Límite" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-white mb-4 font-bold text-sm">Distribución por Categoría</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={userData.budgets.map(b => ({ name: b.name, value: b.spent, color: b.color }))} 
                  cx="50%" cy="50%" 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {userData.budgets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const SettingsView = () => {
     return (
       <div className="pb-24 space-y-4">
         <div className="flex items-center gap-2 mb-6">
           <button onClick={() => setView('dashboard')} className={`p-2 hover:bg-slate-800 rounded-full`}>
              <ArrowRight className="rotate-180" size={20}/>
           </button>
           <h1 className="text-2xl font-bold text-white">Ajustes</h1>
         </div>
         <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white">Reiniciar App</span>
              <button onClick={() => {
                 localStorage.removeItem('saldomensual_db_v2');
                 window.location.reload();
              }} className="text-red-400 text-sm">Borrar Datos Locales</button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">Estado de la Nube</span>
              <span className="text-yellow-400 text-sm font-bold flex items-center gap-1"><HardDrive size={14}/> Guardado Local</span>
            </div>
         </Card>
       </div>
     );
  };

  // ... (Other Modals remain the same: AddTransactionModal, AddCategoryModal, AddRecurringModal, GoalsView)
  
  // Need to include GoalsView and Modal components here since we are inside the main component scope 
  // and I didn't include them in the snippet above to save space, but they must be present.
  // RE-INCLUDING THEM for completeness to avoid errors.

  const GoalsView = () => {
      if (!userData) return null;
      return (
        <div className="space-y-6 pb-24">
          <h1 className="text-2xl font-bold text-white">Metas de Ahorro</h1>
          <p className="text-slate-400 text-sm -mt-4">Define tus objetivos y hazlos realidad.</p>
  
          <div className="space-y-4">
            {userData.goals.length === 0 && (
              <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No hay metas activas.
              </div>
            )}
            {userData.goals.map(g => {
              const percent = (g.currentAmount / g.targetAmount) * 100;
              return (
                  <Card key={g.id} className="p-4 relative">
                     <div className="absolute top-2 right-2">
                       <button 
                         onClick={() => {
                             setEditingGoal(g);
                             setIsConfirmingDeleteGoal(false);
                         }}
                         className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-slate-800"
                       >
                           <Pencil size={14} />
                       </button>
                     </div>

                     <div className="flex justify-between items-start mb-2 pr-8">
                        <div className="flex gap-3">
                           <div className="p-2 rounded-lg h-fit bg-purple-500/10 text-purple-400">
                               <Target size={20} />
                           </div>
                           <div>
                               <h3 className="text-white font-bold">{g.name}</h3>
                               <p className="text-xs text-green-400 font-bold">{percent.toFixed(0)}% Completado</p>
                           </div>
                        </div>
                        <div className="text-right">
                            <p className="text-white font-mono font-bold">{formatCurrency(g.currentAmount)}</p>
                            <p className="text-xs text-slate-500">Meta: {formatCurrency(g.targetAmount)}</p>
                        </div>
                     </div>
  
                     <ProgressBar value={g.currentAmount} max={g.targetAmount} isGoal={true} />
                     
                     <div className="mt-3 flex justify-end">
                         <button 
                           onClick={() => setGoalDepositId(g.id)}
                           className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-lg shadow-purple-900/20"
                         >
                             <PiggyBank size={14} /> Depositar Ahorro
                         </button>
                     </div>
                  </Card>
              );
            })}
            
            <button 
              onClick={() => setIsGoalModalOpen(true)}
              className="w-full py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4"
            >
               <Plus size={16} />
               <span>Crear Nueva Meta</span>
            </button>
          </div>

          {/* Modal Deposito Meta */}
          {goalDepositId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                   <h2 className="text-lg font-bold text-white">Abonar a Meta</h2>
                   <p className="text-slate-400 text-sm">¡Excelente! ¿Cuánto vas a ahorrar hoy?</p>
                   <Input 
                      autoFocus 
                      type="number" 
                      placeholder="Monto ($)" 
                      value={goalDepositAmount} 
                      onChange={e => setGoalDepositAmount(e.target.value)} 
                   />
                   <div className="flex gap-2 pt-2">
                     <Button variant="secondary" className="flex-1" onClick={() => setGoalDepositId(null)}>Cancelar</Button>
                     <Button className="flex-1" onClick={() => { 
                         if(goalDepositAmount) addGoalDeposit(goalDepositId, Number(goalDepositAmount)); 
                     }}>Guardar</Button>
                   </div>
                </div>
            </div>
          )}

          {/* Modal Nueva Meta */}
          {isGoalModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                   <h2 className="text-lg font-bold text-white">Nueva Meta de Ahorro</h2>
                   <Input id="goal-name" autoFocus placeholder="Nombre (ej: Viaje a la Playa)" />
                   <Input id="goal-target" type="number" placeholder="Monto Objetivo ($)" />
                   <div className="flex gap-2 pt-2">
                     <Button variant="secondary" className="flex-1" onClick={() => setIsGoalModalOpen(false)}>Cancelar</Button>
                     <Button className="flex-1" onClick={() => { 
                         const name = (document.getElementById('goal-name') as HTMLInputElement).value;
                         const target = (document.getElementById('goal-target') as HTMLInputElement).value;
                         if(name && target) addGoal(name, Number(target)); 
                     }}>Crear</Button>
                   </div>
                </div>
              </div>
          )}

          {/* Modal Editar Meta */}
          {editingGoal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4 relative">
                   <h2 className="text-lg font-bold text-white">Editar Meta</h2>
                   
                   {!isConfirmingDeleteGoal ? (
                       <>
                           <div>
                               <Label>Nombre de la Meta</Label>
                               <Input id="edit-goal-name" defaultValue={editingGoal.name} />
                           </div>
                           <div>
                               <Label>Monto Objetivo</Label>
                               <Input id="edit-goal-target" type="number" defaultValue={editingGoal.targetAmount} />
                           </div>
                           
                           <div className="flex gap-2 pt-4">
                             <Button variant="secondary" className="flex-1" onClick={() => setEditingGoal(null)}>Cancelar</Button>
                             <Button className="flex-1" onClick={() => { 
                                 const name = (document.getElementById('edit-goal-name') as HTMLInputElement).value;
                                 const target = Number((document.getElementById('edit-goal-target') as HTMLInputElement).value);
                                 if(name && target) editGoal(editingGoal.id, name, target); 
                             }}>Guardar</Button>
                           </div>

                           <div className="pt-2 border-t border-slate-800 mt-2">
                                <button 
                                    onClick={() => setIsConfirmingDeleteGoal(true)}
                                    className="w-full text-red-500 text-sm py-2 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Eliminar Meta
                                </button>
                           </div>
                       </>
                   ) : (
                       <div className="py-4 space-y-4 text-center">
                           <div className="mx-auto w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-2">
                               <AlertCircle size={24} />
                           </div>
                           <h3 className="text-white font-bold">¿Estás seguro?</h3>
                           <p className="text-slate-400 text-sm">Esta acción eliminará la meta "{editingGoal.name}" permanentemente.</p>
                           <div className="flex gap-2 pt-4">
                                <Button variant="secondary" className="flex-1" onClick={() => setIsConfirmingDeleteGoal(false)}>Cancelar</Button>
                                <Button variant="danger" className="flex-1" onClick={() => deleteGoal(editingGoal.id)}>Sí, Eliminar</Button>
                           </div>
                       </div>
                   )}
                </div>
            </div>
          )}
        </div>
      );
    };

  const AlertsView = () => {
    if (!userData) return null;
    const alerts = [];
    
    userData.budgets.forEach(b => {
      if(b.spent > b.limit) {
        alerts.push({
          type: 'critical',
          title: `Presupuesto Excedido: ${b.name}`,
          msg: `Te has pasado por ${formatCurrency(b.spent - b.limit)}. Reduce gastos en otras áreas.`
        });
      } else if (b.spent > b.limit * 0.85) {
        alerts.push({
          type: 'warning',
          title: `Cuidado con ${b.name}`,
          msg: `Has consumido el ${(b.spent/b.limit*100).toFixed(0)}% de este sobre.`
        });
      }
    });

    userData.recurring.forEach(r => {
        if (r.history && r.history.length > 0) {
            const lastMonth = r.history[r.history.length - 1];
            if (lastMonth.spent > lastMonth.limit) {
                alerts.push({
                   type: 'warning',
                   title: `Exceso Pasado: ${r.name}`,
                   msg: `El mes pasado gastaste ${formatCurrency(lastMonth.spent - lastMonth.limit)} de más en ${r.name}.`
                });
            } else if (lastMonth.spent < lastMonth.limit * 0.8) {
                alerts.push({
                   type: 'info',
                   title: `Ahorro Detectado: ${r.name}`,
                   msg: `¡Bien hecho! El mes pasado ahorraste en ${r.name}.`
                });
            }
        }
    });

    if(userData.goals.length > 0 && userData.goals.some(g => g.currentAmount === 0)) {
        alerts.push({ type: 'info', title: 'Metas sin fondos', msg: 'No has comenzado a ahorrar para algunas metas.' });
    }

    const unpaidCount = userData.recurring.filter(r => r.spent < r.amount).length;
    if(unpaidCount > 0) {
       alerts.push({ type: 'warning', title: 'Gastos Fijos Incompletos', msg: `Tienes ${unpaidCount} gastos fijos sin completar el presupuesto.` });
    }

    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-white">Centro de Alertas</h1>
        
        <div className="space-y-4">
          {alerts.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Check size={48} className="mb-4 text-green-500/50" />
                <p>Todo está bajo control.</p>
             </div>
          ) : alerts.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-xl border flex gap-4 ${
               alert.type === 'critical' ? 'bg-red-500/10 border-red-500/30' : 
               alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' : 
               'bg-blue-500/10 border-blue-500/30'
            }`}>
               <div className={`p-2 rounded-lg h-fit ${
                 alert.type === 'critical' ? 'bg-red-500 text-white' : 
                 alert.type === 'warning' ? 'bg-yellow-500 text-slate-900' : 
                 'bg-blue-500 text-white'
               }`}>
                 <AlertCircle size={20} />
               </div>
               <div>
                 <h3 className={`font-bold text-sm ${
                   alert.type === 'critical' ? 'text-red-400' : 
                   alert.type === 'warning' ? 'text-yellow-400' : 
                   'text-blue-400'
                 }`}>{alert.title}</h3>
                 <p className="text-slate-300 text-xs mt-1">{alert.msg}</p>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const AddTransactionModal = () => {
    if (!isModalOpen) return null;
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].name);
    const [type, setType] = useState<TransactionType>('expense');

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-slate-900 w-full max-w-md sm:rounded-2xl rounded-t-2xl border-t sm:border border-slate-800 shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-white font-bold">Nuevo Movimiento</h2>
            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">Cerrar</button>
          </div>
          <form onSubmit={(e) => {
             e.preventDefault();
             if(!amount) return;
             addTransaction({ amount: Number(amount), category, note, type, date: new Date().toISOString() });
          }} className="p-6 space-y-6">
            <div className="flex bg-slate-800 p-1 rounded-lg">
              <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'expense' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Gasto</button>
              <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'income' ? 'bg-green-500 text-white' : 'text-slate-400'}`}>Ingreso</button>
            </div>
            <div>
              <Label>Monto</Label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400">$</span>
                <Input type="number" autoFocus value={amount} onChange={e => setAmount(e.target.value)} className="pl-8 text-2xl font-bold py-4" placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Categoría</Label>
              <div className="grid grid-cols-3 gap-2">
                {userData?.budgets.map(cat => (
                  <button type="button" key={cat.id} onClick={() => setCategory(cat.name)} className={`text-xs py-2 px-1 rounded border transition-colors ${category === cat.name ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10' : 'border-slate-800 text-slate-400'}`}>{cat.name}</button>
                ))}
              </div>
            </div>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Nota (Opcional)" />
            <Button type="submit" className="w-full py-4 text-lg">Guardar</Button>
          </form>
        </div>
      </div>
    );
  };

  const AddCategoryModal = () => {
    if (!isCategoryModalOpen) return null;
    const [name, setName] = useState('');
    const [limit, setLimit] = useState('');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
           <h2 className="text-lg font-bold text-white">Nuevo Sobre / Presupuesto</h2>
           <Input autoFocus placeholder="Nombre (ej: Ahorro Coche)" value={name} onChange={e => setName(e.target.value)} />
           <Input type="number" placeholder="Límite Mensual / Meta" value={limit} onChange={e => setLimit(e.target.value)} />
           <div className="flex gap-2 pt-2">
             <Button variant="secondary" className="flex-1" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
             <Button className="flex-1" onClick={() => { if(name && limit) addBudgetCategory(name, Number(limit)); }}>Crear</Button>
           </div>
        </div>
      </div>
    );
  };

  const AddRecurringModal = () => {
    if (!isRecurringModalOpen) return null;
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [day, setDay] = useState('');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
           <h2 className="text-lg font-bold text-white">Nuevo Gasto Fijo</h2>
           <p className="text-slate-400 text-xs">Ej: Renta, Gasolina, Luz</p>
           <Input autoFocus placeholder="Nombre (ej: Gasolina)" value={name} onChange={e => setName(e.target.value)} />
           <Input type="number" placeholder="Monto Presupuesto" value={amount} onChange={e => setAmount(e.target.value)} />
           <Input type="number" placeholder="Día de pago aprox (1-31)" value={day} onChange={e => setDay(e.target.value)} />
           <div className="flex gap-2 pt-2">
             <Button variant="secondary" className="flex-1" onClick={() => setIsRecurringModalOpen(false)}>Cancelar</Button>
             <Button className="flex-1" onClick={() => { if(name && amount && day) addRecurringExpense(name, Number(amount), Number(day)); }}>Crear</Button>
           </div>
        </div>
      </div>
    );
  };

  // --- RENDER ---

  if (view === 'onboarding') return <OnboardingWizard />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-yellow-400/30">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      <div className="max-w-md mx-auto min-h-screen bg-slate-950 shadow-2xl relative">
        <main className="p-4 pt-8">
          {view === 'dashboard' && <Dashboard />}
          {view === 'budget' && <BudgetView />}
          {view === 'recurring' && <RecurringView />}
          {view === 'goals' && <GoalsView />}
          {view === 'alerts' && <AlertsView />}
          {view === 'reports' && <ReportsView />}
          {view === 'settings' && <SettingsView />}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 safe-area-bottom">
          <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
            <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 p-2 ${view === 'dashboard' ? 'text-yellow-400' : 'text-slate-500'}`}>
              <Home size={20} />
              <span className="text-[10px]">Inicio</span>
            </button>
            <button onClick={() => setView('budget')} className={`flex flex-col items-center gap-1 p-2 ${view === 'budget' ? 'text-yellow-400' : 'text-slate-500'}`}>
              <Wallet size={20} />
              <span className="text-[10px]">Sobres</span>
            </button>
            <div className="relative -top-5">
              <button onClick={() => setIsModalOpen(true)} className="w-14 h-14 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
                <Plus size={28} strokeWidth={3} />
              </button>
            </div>
            {/* Shortcuts in Nav */}
            <button onClick={() => setView('recurring')} className={`flex flex-col items-center gap-1 p-2 ${view === 'recurring' ? 'text-yellow-400' : 'text-slate-500'}`}>
              <Zap size={20} />
              <span className="text-[10px]">Fijos</span>
            </button>
            <button onClick={() => setView('reports')} className={`flex flex-col items-center gap-1 p-2 ${view === 'reports' ? 'text-yellow-400' : 'text-slate-500'}`}>
              <TrendingUp size={20} />
              <span className="text-[10px]">Análisis</span>
            </button>
          </div>
        </nav>
        <AddTransactionModal />
        <AddCategoryModal />
        <AddRecurringModal />
      </div>
    </div>
  );
}