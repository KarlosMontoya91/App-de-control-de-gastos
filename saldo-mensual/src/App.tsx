import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Wallet, Plus, Home, PieChart as PieIcon,
  Settings, ArrowRight, ArrowUpRight, ArrowDownLeft,
  CreditCard, Bell, Check, User, Calendar, AlertCircle, Camera,
  AlertTriangle, Pencil, X, Save
} from 'lucide-react';

// --- TYPES & DATA MODEL ---

type Frequency = 'quincenal' | 'mensual' | 'semanal';
type TransactionType = 'expense' | 'income';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO string
  note: string;
  type: TransactionType;
}

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  isPaid?: boolean; // Track monthly payment status
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
  { name: 'Vivienda', color: '#60A5FA' }, // Blue
  { name: 'Alimentos', color: '#34D399' }, // Emerald
  { name: 'Transporte', color: '#F87171' }, // Red
  { name: 'Entretenimiento', color: '#A78BFA' }, // Purple
  { name: 'Servicios', color: '#FBBF24' }, // Amber
  { name: 'Salud', color: '#F472B6' }, // Pink
  { name: 'Otros', color: '#94A3B8' }, // Slate
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

const ProgressBar = ({ value, max, colorOverride }: { value: number; max: number; colorOverride?: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  let colorClass = "bg-green-500";
  if (percentage > 100) colorClass = "bg-red-500"; 
  else if (percentage > 85) colorClass = "bg-yellow-400"; 
  
  if (value > max) colorClass = "bg-red-500"; 

  return (
    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colorOverride || colorClass} transition-all duration-500 ease-out`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// --- SPLASH SCREEN ---

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-out fade-out duration-1000 delay-[1.5s] fill-mode-forwards pointer-events-none">
       <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-yellow-400 p-4 rounded-2xl mb-4 shadow-[0_0_30px_rgba(250,204,21,0.3)]">
             <Wallet size={48} className="text-slate-950" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tighter">Saldo<span className="text-yellow-400">Mensual2</span></h1>
          <p className="text-slate-500 mt-2 text-sm tracking-widest uppercase">Tu control financiero</p>
       </div>
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function FinanceApp() {
  const [users, setUsers] = useState<{[id: string]: UserProfile}>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [view, setView] = useState<'onboarding' | 'dashboard' | 'budget' | 'recurring' | 'alerts' | 'reports' | 'settings'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    document.title = "SaldoMensual2026";
  }, []);

  // New State for Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  // Persistence Load
  useEffect(() => {
    const savedData = localStorage.getItem('finflow_2026_db');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setUsers(parsed.users || {});
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
      localStorage.setItem('finflow_2026_db', JSON.stringify({ users, currentUserId }));
    }
  }, [users, currentUserId]);

  const userData = currentUserId ? users[currentUserId] : null;

  useEffect(() => {
    if (userData && !userData.config.hasCompletedOnboarding) {
      setView('onboarding');
      setShowSplash(false); // Skip splash for onboarding
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

    let updatedGoals = [...userData.goals];
    if (t.type === 'expense' && t.category === 'Ahorro' && updatedGoals.length > 0) {
       updatedGoals[0].currentAmount += t.amount;
    }

    updateUser({ 
      transactions: updatedTransactions,
      budgets: updatedBudgets,
      goals: updatedGoals
    });
    setView('dashboard');
    setIsModalOpen(false);
  };

  const toggleRecurringPaid = (id: string) => {
    if (!userData) return;
    const updatedRecurring = userData.recurring.map(r => 
      r.id === id ? { ...r, isPaid: !r.isPaid } : r
    );
    updateUser({ recurring: updatedRecurring });
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
    // Pick a random color from palette
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
    const newRecurring: RecurringExpense = {
      id: generateId(),
      name,
      amount,
      dayOfMonth: day,
      category: 'Servicios',
      isPaid: false
    };
    updateUser({ recurring: [...userData.recurring, newRecurring] });
    setIsRecurringModalOpen(false);
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

      updateUser({
        config: { 
          ...userData.config, 
          ...formData.config, 
          hasCompletedOnboarding: true, 
          name: formData.config?.name || 'Karlos Montoya', 
        },
        recurring: formData.recurring || [],
        budgets: initialBudgets,
        goals: [{ id: generateId(), name: 'Fondo de Emergencia', targetAmount: (formData.config?.monthlyIncome || 0) * 3, currentAmount: 0 }]
      });
      setView('dashboard');
    };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Saldo<span className="text-yellow-400">Mensual2</span></h1>
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
                <h2 className="text-xl font-semibold text-white">2. Gastos Fijos (Tarjetas/Servicios)</h2>
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
                   <Input id="rec-amount" type="number" placeholder="$0" className="text-sm" />
                </div>
                <Button variant="secondary" className="w-full py-2 text-sm" onClick={() => {
                   const name = (document.getElementById('rec-name') as HTMLInputElement).value;
                   const amount = Number((document.getElementById('rec-amount') as HTMLInputElement).value);
                   if(name && amount) {
                     setFormData({
                       ...formData, 
                       recurring: [...(formData.recurring || []), { id: generateId(), name, amount, category: 'Servicios', dayOfMonth: 1 }]
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
                        <span className="text-slate-400">Gastos Fijos Total</span>
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
    
    // VARIABLES SPENT: Only transactions
    const variableSpent = userData.transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = userData.transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    
    // LOGIC CHANGE: Only subtract PAID fixed expenses from the available balance
    const paidFixedExpenses = userData.recurring.filter(r => r.isPaid).reduce((acc, r) => acc + r.amount, 0);
    
    // Formula: (Base Income + Extra Income) - (Paid Fixed) - (Variable Spent)
    const currentBalance = (userData.config.monthlyIncome + totalIncome) - paidFixedExpenses - variableSpent;

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
               <p className="text-slate-400 text-xs flex items-center gap-1">
                 <Calendar size={10} />
                 {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
               </p>
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
                   <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Fijos</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide">
                     {userData.recurring.filter(r => !r.isPaid).length} Pendientes
                  </p>
                </div>
             </Card>

             <Card onClick={() => setView('alerts')} className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group">
                <div className="bg-red-500/10 w-fit p-2 rounded-lg text-red-400 group-hover:bg-red-500/20 mb-2">
                   <Bell size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Alertas</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide">Avisos</p>
                </div>
             </Card>

             <Card onClick={() => setView('budget')} className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group">
                <div className="bg-yellow-500/10 w-fit p-2 rounded-lg text-yellow-400 group-hover:bg-yellow-500/20 mb-2">
                   <Wallet size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Sobres</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide">Presupuestos</p>
                </div>
             </Card>

             <Card onClick={() => setView('reports')} className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group">
                <div className="bg-purple-500/10 w-fit p-2 rounded-lg text-purple-400 group-hover:bg-purple-500/20 mb-2">
                   <PieIcon size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Stats</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide">Gráficas</p>
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
            const overAmount = b.spent - b.limit;
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
        <h1 className="text-2xl font-bold text-white">Gastos Fijos</h1>
        <p className="text-slate-400 text-sm -mt-4">Marca el check cuando hayas realizado el pago.</p>

        <div className="space-y-3">
          {userData.recurring.length === 0 && (
            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No hay gastos fijos configurados.
            </div>
          )}
          {userData.recurring.map(r => (
            <div key={r.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${r.isPaid ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-900 border-slate-700'}`}>
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => toggleRecurringPaid(r.id)}
                   className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${r.isPaid ? 'bg-green-500 border-green-500 text-slate-900' : 'border-slate-600 hover:border-yellow-400 hover:bg-slate-800'}`}>
                   {r.isPaid && <Check size={18} strokeWidth={4} />}
                 </button>
                 <div>
                   <p className={`font-bold ${r.isPaid ? 'text-slate-500 line-through decoration-2' : 'text-white'}`}>{r.name}</p>
                   <p className="text-xs text-slate-500">{r.category} • Día {r.dayOfMonth}</p>
                 </div>
              </div>
              <span className={`font-mono font-bold text-lg ${r.isPaid ? 'text-slate-500' : 'text-white'}`}>
                {formatCurrency(r.amount)}
              </span>
            </div>
          ))}
          
          <button 
            onClick={() => setIsRecurringModalOpen(true)}
            className="w-full py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4"
          >
             <Plus size={16} />
             <span>Agregar Nuevo Gasto Fijo</span>
          </button>
        </div>
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

    if(userData.goals.some(g => g.currentAmount === 0)) {
        alerts.push({ type: 'info', title: 'Metas sin fondos', msg: 'No has aportado a tus metas este mes.' });
    }

    const unpaidCount = userData.recurring.filter(r => !r.isPaid).length;
    if(unpaidCount > 0) {
       alerts.push({ type: 'warning', title: 'Pagos Pendientes', msg: `Tienes ${unpaidCount} gastos fijos marcados como no pagados.` });
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

  const ReportsView = () => {
    if (!userData) return null;
    
    // 1. Data for Variable Expenses (Budgets)
    const barData = userData.budgets.map(b => ({
      name: b.name,
      Presupuesto: b.limit,
      Gasto: b.spent,
    }));

    // 2. NEW: Data for Fixed Expenses Progress
    const totalFixed = userData.recurring.reduce((acc, r) => acc + r.amount, 0);
    const paidFixed = userData.recurring.filter(r => r.isPaid).reduce((acc, r) => acc + r.amount, 0);
    const pendingFixed = totalFixed - paidFixed;

    // Data structure for the Fixed Expenses Chart
    const fixedData = [
      { name: 'Pagado', value: paidFixed, color: '#34D399' }, // Emerald/Green
      { name: 'Pendiente', value: pendingFixed, color: '#475569' } // Slate/Gray
    ];

    return (
      <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-white">Reportes</h1>

        {/* --- NEW SECTION: Fixed Expenses Chart --- */}
        <Card className="p-4">
          <h3 className="text-white mb-4 font-bold text-sm">Progreso de Gastos Fijos (Pagos)</h3>
          
          <div className="flex justify-between items-center px-4 mb-2">
            <div className="text-center">
               <p className="text-[10px] text-slate-400 uppercase">Total</p>
               <p className="text-white font-mono font-bold">{formatCurrency(totalFixed)}</p>
            </div>
            <div className="text-center">
               <p className="text-[10px] text-green-400 uppercase">Pagado</p>
               <p className="text-green-400 font-mono font-bold">{formatCurrency(paidFixed)}</p>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie
                    data={fixedData}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {fixedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                   contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
               </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* --- EXISTING SECTIONS: Variable Expenses --- */}
        <h2 className="text-xl font-bold text-white mt-8 mb-2">Gastos Extraordinarios (Sobres)</h2>
        
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
          <h3 className="text-white mb-4 font-bold text-sm">Distribución por Categoría (Variables)</h3>
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
                 localStorage.removeItem('finflow_2026_db');
                 window.location.reload();
              }} className="text-red-400 text-sm">Borrar Datos</button>
            </div>
         </Card>
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
           <h2 className="text-lg font-bold text-white">Nuevo Sobre / Meta</h2>
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
           <Input autoFocus placeholder="Nombre (ej: Seguro Auto)" value={name} onChange={e => setName(e.target.value)} />
           <Input type="number" placeholder="Monto Mensual" value={amount} onChange={e => setAmount(e.target.value)} />
           <Input type="number" placeholder="Día de pago (1-31)" value={day} onChange={e => setDay(e.target.value)} />
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
              <CreditCard size={20} />
              <span className="text-[10px]">Fijos</span>
            </button>
            <button onClick={() => setView('reports')} className={`flex flex-col items-center gap-1 p-2 ${view === 'reports' ? 'text-yellow-400' : 'text-slate-500'}`}>
              <PieIcon size={20} />
              <span className="text-[10px]">Stats</span>
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
