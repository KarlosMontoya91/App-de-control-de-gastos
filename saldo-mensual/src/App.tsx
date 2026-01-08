import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Wallet,
  Plus,
  Home,
  Settings,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  User,
  Calendar,
  Info,
  Camera,
  AlertTriangle,
  Pencil,
  X,
  Save,
  Cloud,
  Loader2,
  Target,
  Zap,
  Trash2,
  History,
  TrendingUp,
  LogOut,
} from "lucide-react";

// IMPORTANTE: Instalar firebase con: npm install firebase
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  type Firestore,
} from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAhPIj_-AP_njmo4Kr9CAAqG_AgnNLxP3Y",
  authDomain: "saldomensual.firebaseapp.com",
  projectId: "saldomensual",
  storageBucket: "saldomensual.firebasestorage.app",
  messagingSenderId: "739648175352",
  appId: "1:739648175352:web:9352a43c86e6c66be34f0d",
  measurementId: "G-R411NL76MC",
};

// Inicializar Firebase
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} catch (e) {
  console.warn("Firebase no está configurado correctamente.", e);
}

// --- TYPES & DATA MODEL ---
type Frequency = "quincenal" | "mensual" | "semanal";
type TransactionType = "expense" | "income";
type TimeFilter = "week" | "month" | "year";

type View =
  | "onboarding"
  | "dashboard"
  | "budget"
  | "recurring"
  | "alerts"
  | "reports"
  | "settings"
  | "goals";

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  note: string;
  type: TransactionType;
}

interface RecurringHistoryItem {
  month: string; // YYYY-MM
  spent: number;
  limit: number;
}

interface RecurringExpense {
  id: string;
  name: string;
  amount: number; // Tope / Presupuesto
  spent: number; // Acumulado actual
  category: string;
  dayOfMonth: number; // Día de corte/reinicio
  isPaid?: boolean;
  lastResetDate?: string; // YYYY-MM del último reinicio
  history?: RecurringHistoryItem[];
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

// --- UTILS ---
const generateId = () => Math.random().toString(36).slice(2, 11);

const formatCurrency = (amount: number, currency = "MXN") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    Number.isFinite(amount) ? amount : 0
  );

const DEFAULT_CATEGORIES = [
  { name: "Vivienda", color: "#60A5FA" },
  { name: "Alimentos", color: "#34D399" },
  { name: "Transporte", color: "#F87171" },
  { name: "Entretenimiento", color: "#A78BFA" },
  { name: "Servicios", color: "#FBBF24" },
  { name: "Salud", color: "#F472B6" },
  { name: "Otros", color: "#94A3B8" },
];

const COLORS = [
  "#60A5FA",
  "#34D399",
  "#F87171",
  "#A78BFA",
  "#FBBF24",
  "#F472B6",
  "#94A3B8",
  "#FB923C",
  "#A3E635",
];

// --- UI COMPONENTS ---
const Card = ({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-slate-900 border border-slate-800 rounded-xl shadow-sm ${className}`}
  >
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) => {
  const base =
    "px-4 py-3 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-yellow-400 text-slate-950 hover:bg-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.3)]",
    secondary:
      "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700",
    ghost:
      "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50",
    danger:
      "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all placeholder:text-slate-600 ${
      props.className || ""
    }`}
  />
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">
    {children}
  </label>
);

const ProgressBar = ({
  value,
  max,
  colorOverride,
  isGoal = false,
}: {
  value: number;
  max: number;
  colorOverride?: string;
  isGoal?: boolean;
}) => {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

  let colorClass = "bg-green-500";
  if (!colorOverride) {
    if (isGoal) colorClass = percentage < 50 ? "bg-yellow-400" : "bg-green-500";
    else {
      if (percentage > 100) colorClass = "bg-red-500";
      else if (percentage > 85) colorClass = "bg-yellow-400";
      if (value > safeMax) colorClass = "bg-red-500";
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

// --- ERROR BOUNDARY (para que NO quede blanco) ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string; stack?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: String(err?.message || err) };
  }

  componentDidCatch(error: any) {
    // eslint-disable-next-line no-console
    console.error("APP ERROR:", error);
    this.setState({ stack: String(error?.stack || "") });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
          <div className="max-w-md mx-auto space-y-3">
            <h1 className="text-xl font-bold text-red-400">
              La app tronó (pero ya no queda en blanco)
            </h1>
            <p className="text-slate-300 text-sm">
              Copia este error y me lo pasas si vuelve a salir:
            </p>
            <pre className="text-xs bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-auto whitespace-pre-wrap">
              {this.state.message}
              {"\n\n"}
              {this.state.stack}
            </pre>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Recargar
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- SPLASH SCREEN ---
const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-out fade-out duration-700 delay-[1s] fill-mode-forwards pointer-events-none">
      <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-yellow-400 p-5 rounded-3xl mb-6 shadow-[0_0_50px_rgba(250,204,21,0.4)]">
          <Wallet size={64} className="text-slate-950" strokeWidth={2} />
        </div>
        <h1 className="text-5xl font-bold text-white tracking-tighter mb-2">
          Saldo<span className="text-yellow-400">Mensual</span>
        </h1>
        <p className="text-slate-400 text-sm tracking-[0.3em] uppercase opacity-80">
          Nube & Multiplataforma
        </p>
      </div>
    </div>
  );
};

// --- LOGIN SCREEN ---
const LoginScreen = () => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) {
      setError("Error de configuración: Firebase no inicializado.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError("Error al iniciar sesión: " + message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center mb-8">
          <div className="bg-yellow-400 p-4 rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.2)]">
            <Wallet size={48} className="text-slate-950" strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white tracking-tight">
          Bienvenido
        </h1>
        <p className="text-slate-400">
          Inicia sesión para sincronizar tus gastos en todos tus dispositivos.
        </p>

        <div className="space-y-4 pt-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuar con Google
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
            {error}
            <div className="text-[11px] text-slate-400 mt-2">
              Tip: Si estás en GitHub Pages, asegúrate de agregar tu dominio en:
              Firebase Console → Authentication → Settings → Authorized domains.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---
export default function FinanceApp() {
  const preventInvalidNumberKeys = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
  };

  const sanitizeAmount = (value: string) => {
    let v = value.replace(/-/g, "").replace(/[^0-9.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    return v;
  };

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [view, setView] = useState<View>("dashboard");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Edit Recurring
  const [editingRecurring, setEditingRecurring] =
    useState<RecurringExpense | null>(null);
  const [historyRecurring, setHistoryRecurring] =
    useState<RecurringExpense | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Edit Goal
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [isConfirmingDeleteGoal, setIsConfirmingDeleteGoal] = useState(false);

  // Partial Payment Recurring
  const [payRecurringId, setPayRecurringId] = useState<string | null>(null);
  const [payRecurringAmount, setPayRecurringAmount] = useState("");

  // Goal deposit
  const [goalDepositId, setGoalDepositId] = useState<string | null>(null);
  const [goalDepositAmount, setGoalDepositAmount] = useState("");

  // Reports filter
  const [generalChartFilter, setGeneralChartFilter] =
    useState<TimeFilter>("month");

  // --- FIREBASE AUTH & DATA LOADING ---
  useEffect(() => {
    if (!auth) {
      setLoadingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          await loadUserData(firebaseUser);
        } else {
          setCurrentUser(null);
        }
        setLoadingAuth(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeProfile = (raw: any, uid: string): UserProfile => {
    const cfg = raw?.config ?? {};
    return {
      id: uid,
      config: {
        hasCompletedOnboarding: Boolean(cfg.hasCompletedOnboarding),
        name: cfg.name ?? "Usuario",
        avatar: cfg.avatar ?? undefined,
        monthlyIncome: Number(cfg.monthlyIncome ?? 0),
        payFrequency: (cfg.payFrequency ?? "quincenal") as Frequency,
        currency: cfg.currency ?? "MXN",
        savingsRulePercent: Number(cfg.savingsRulePercent ?? 10),
      },
      transactions: Array.isArray(raw?.transactions) ? raw.transactions : [],
      recurring: Array.isArray(raw?.recurring) ? raw.recurring : [],
      budgets: Array.isArray(raw?.budgets) ? raw.budgets : [],
      goals: Array.isArray(raw?.goals) ? raw.goals : [],
    };
  };

  const loadUserData = async (firebaseUser: FirebaseUser) => {
    if (!db) return;
    setLoadingData(true);

    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);

      onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const raw = docSnap.data();
          let profile = normalizeProfile(raw, firebaseUser.uid);
          profile = checkRecurringResets(profile);
          setCurrentUser(profile);

          if (!profile.config.hasCompletedOnboarding) {
            setView("onboarding");
            setShowSplash(false);
          }
        } else {
          const newProfile: UserProfile = {
            id: firebaseUser.uid,
            config: {
              hasCompletedOnboarding: false,
              name: firebaseUser.displayName || "Usuario",
              avatar: firebaseUser.photoURL || undefined,
              monthlyIncome: 0,
              payFrequency: "quincenal",
              currency: "MXN",
              savingsRulePercent: 10,
            },
            transactions: [],
            recurring: [],
            budgets: [],
            goals: [],
          };

          setDoc(userDocRef, newProfile);
          setCurrentUser(newProfile);
          setView("onboarding");
          setShowSplash(false);
        }

        setLoadingData(false);
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error loading data:", error);
      setLoadingData(false);
    }
  };

  const saveUserToDb = async (updatedProfile: UserProfile) => {
    if (!db || !auth?.currentUser) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, updatedProfile, { merge: true });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error saving to DB:", e);
    }
  };

  const checkRecurringResets = (profile: UserProfile): UserProfile => {
    if (!db || !auth?.currentUser) return profile;

    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    let hasChanges = false;

    const updatedRecurring = profile.recurring.map((r) => {
      const lastReset = r.lastResetDate || "";
      let shouldReset = false;

      if (!lastReset) {
        hasChanges = true;
        return { ...r, lastResetDate: currentMonthStr };
      }

      if (lastReset !== currentMonthStr) {
        if (today.getDate() >= r.dayOfMonth) shouldReset = true;
      }

      if (shouldReset) {
        hasChanges = true;
        const historyItem: RecurringHistoryItem = {
          month: lastReset,
          spent: r.spent,
          limit: r.amount,
        };
        const newHistory = [...(r.history || []), historyItem];

        return {
          ...r,
          spent: 0,
          isPaid: false,
          lastResetDate: currentMonthStr,
          history: newHistory,
        };
      }
      return r;
    });

    if (hasChanges) {
      const newProfile = { ...profile, recurring: updatedRecurring };
      setDoc(doc(db, "users", auth.currentUser.uid), newProfile, {
        merge: true,
      });
      return newProfile;
    }

    return profile;
  };

  const handleLogout = () => {
    if (!auth) return;
    signOut(auth);
    setView("dashboard");
    setShowSplash(true);
  };

  // --- ACTIONS ---
  const addTransaction = (t: Omit<Transaction, "id">) => {
    if (!currentUser) return;
    const newT = { ...t, id: generateId() };
    const updatedTransactions = [newT, ...currentUser.transactions];

    let updatedBudgets = [...currentUser.budgets];
    if (t.type === "expense") {
      updatedBudgets = updatedBudgets.map((b) =>
        b.name === t.category ? { ...b, spent: b.spent + t.amount } : b
      );
    }

    const updatedUser = {
      ...currentUser,
      transactions: updatedTransactions,
      budgets: updatedBudgets,
    };

    saveUserToDb(updatedUser);
    setView("dashboard");
    setIsModalOpen(false);
  };

  const addRecurringPayment = (id: string, amount: number) => {
    if (!currentUser) return;
    const updatedRecurring = currentUser.recurring.map((r) => {
      if (r.id === id) {
        const newSpent = r.spent + amount;
        return { ...r, spent: newSpent, isPaid: newSpent >= r.amount };
      }
      return r;
    });
    saveUserToDb({ ...currentUser, recurring: updatedRecurring });
    setPayRecurringId(null);
    setPayRecurringAmount("");
  };

  const editRecurringExpense = (
    id: string,
    name: string,
    amount: number,
    day: number
  ) => {
    if (!currentUser) return;
    const updatedRecurring = currentUser.recurring.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          name,
          amount,
          dayOfMonth: day,
          isPaid: r.spent >= amount,
        };
      }
      return r;
    });
    saveUserToDb({ ...currentUser, recurring: updatedRecurring });
    setEditingRecurring(null);
  };

  const deleteRecurringExpense = (id: string) => {
    if (!currentUser) return;
    const updatedRecurring = currentUser.recurring.filter((r) => r.id !== id);
    saveUserToDb({ ...currentUser, recurring: updatedRecurring });
    setEditingRecurring(null);
    setIsConfirmingDelete(false);
  };

  const editGoal = (id: string, name: string, target: number) => {
    if (!currentUser) return;
    const updatedGoals = currentUser.goals.map((g) => {
      if (g.id === id) return { ...g, name, targetAmount: target };
      return g;
    });
    saveUserToDb({ ...currentUser, goals: updatedGoals });
    setEditingGoal(null);
  };

  const deleteGoal = (id: string) => {
    if (!currentUser) return;
    const updatedGoals = currentUser.goals.filter((g) => g.id !== id);
    saveUserToDb({ ...currentUser, goals: updatedGoals });
    setEditingGoal(null);
    setIsConfirmingDeleteGoal(false);
  };

  const addGoalDeposit = (id: string, amount: number) => {
    if (!currentUser) return;
    const updatedGoals = currentUser.goals.map((g) => {
      if (g.id === id) return { ...g, currentAmount: g.currentAmount + amount };
      return g;
    });
    saveUserToDb({ ...currentUser, goals: updatedGoals });
    setGoalDepositId(null);
    setGoalDepositAmount("");
  };

  const updateBudgetLimit = (id: string, newLimit: number) => {
    if (!currentUser) return;
    const updatedBudgets = currentUser.budgets.map((b) =>
      b.id === id ? { ...b, limit: newLimit } : b
    );
    saveUserToDb({ ...currentUser, budgets: updatedBudgets });
  };

  const addBudgetCategory = (name: string, limit: number) => {
    if (!currentUser) return;
    const color = COLORS[currentUser.budgets.length % COLORS.length];
    const newBudget: BudgetCategory = {
      id: generateId(),
      name,
      limit,
      spent: 0,
      color,
    };
    saveUserToDb({
      ...currentUser,
      budgets: [...currentUser.budgets, newBudget],
    });
    setIsCategoryModalOpen(false);
  };

  const addRecurringExpense = (name: string, amount: number, day: number) => {
    if (!currentUser) return;

    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    const newRecurring: RecurringExpense = {
      id: generateId(),
      name,
      amount,
      spent: 0,
      category: "Servicios",
      dayOfMonth: day,
      isPaid: false,
      lastResetDate: currentMonthStr,
      history: [],
    };

    saveUserToDb({
      ...currentUser,
      recurring: [...currentUser.recurring, newRecurring],
    });
    setIsRecurringModalOpen(false);
  };

  const addGoal = (name: string, target: number) => {
    if (!currentUser) return;
    const newGoal: SavingsGoal = {
      id: generateId(),
      name,
      targetAmount: target,
      currentAmount: 0,
    };
    saveUserToDb({ ...currentUser, goals: [...currentUser.goals, newGoal] });
    setIsGoalModalOpen(false);
  };

  const finishOnboarding = (formData: Partial<UserProfile>) => {
    if (!currentUser) return;

    const recurringTotal =
      formData.recurring?.reduce((sum, item) => sum + (item.amount || 0), 0) ||
      0;

    const disposable = (formData.config?.monthlyIncome || 0) - recurringTotal;
    const budgetPerCategory = Math.floor(
      (disposable * 0.9) / DEFAULT_CATEGORIES.length
    );

    const initialBudgets = DEFAULT_CATEGORIES.map((cat) => ({
      id: generateId(),
      name: cat.name,
      limit: budgetPerCategory > 0 ? budgetPerCategory : 1000,
      spent: 0,
      color: cat.color,
    }));

    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    const initRecurring = (formData.recurring || []).map((r) => ({
      ...r,
      lastResetDate: currentMonthStr,
      history: [],
    })) as RecurringExpense[];

    const income = formData.config?.monthlyIncome || 0;

    const finalProfile: UserProfile = {
      ...currentUser,
      config: {
        ...currentUser.config,
        ...(formData.config || {}),
        hasCompletedOnboarding: true,
        name: formData.config?.name || currentUser.config.name,
      },
      recurring: initRecurring,
      budgets: initialBudgets,
      goals: [
        {
          id: generateId(),
          name: "Fondo de Emergencia",
          targetAmount: income * 3,
          currentAmount: 0,
        },
      ],
      transactions: currentUser.transactions,
      id: currentUser.id,
    };

    saveUserToDb(finalProfile);
    setView("dashboard");
  };

  // --- MODALS ---
  const AddTransactionModal = () => {
    if (!currentUser) return null;

    const [type, setType] = useState<TransactionType>("expense");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState(
      currentUser.budgets?.[0]?.name || "Otros"
    );
    const [note, setNote] = useState("");
    const [date, setDate] = useState(() =>
      new Date().toISOString().slice(0, 10)
    );
    const [error, setError] = useState("");

    const parsedAmount = Number(amount);
    const isValid =
      Number.isFinite(parsedAmount) && parsedAmount > 0 && category.trim();

    const handleSave = () => {
      setError("");
      if (!isValid) {
        setError("Ingresa un monto mayor a 0 y una categoría válida.");
        return;
      }

      addTransaction({
        type,
        amount: parsedAmount,
        category: category.trim(),
        note: note.trim(),
        date,
      });
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Nuevo movimiento</h2>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setType("expense")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border ${
                type === "expense"
                  ? "bg-red-500/15 border-red-500/30 text-red-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Gasto
            </button>
            <button
              onClick={() => setType("income")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border ${
                type === "income"
                  ? "bg-green-500/15 border-green-500/30 text-green-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Ingreso
            </button>
          </div>

          <div>
            <Label>Monto (sin signo)</Label>
            <Input
              inputMode="decimal"
              placeholder="Ej: 250"
              value={amount}
              onKeyDown={preventInvalidNumberKeys}
              onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
            />
            <p className="text-[10px] text-slate-500 mt-1">
              No uses “-”. El tipo (Gasto/Ingreso) define el signo.
            </p>
          </div>

          <div>
            <Label>Categoría</Label>
            <select
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {currentUser.budgets.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Nota (opcional)</Label>
            <Input
              placeholder="Ej: Super / Gasolina / etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="flex-1" disabled={!isValid} onClick={handleSave}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const AddCategoryModal = () => {
    const [name, setName] = useState("");
    const [limit, setLimit] = useState("");
    const parsedLimit = Number(limit);

    const valid =
      name.trim().length >= 2 &&
      Number.isFinite(parsedLimit) &&
      parsedLimit > 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Nuevo Sobre</h2>
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div>
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mascotas"
            />
          </div>

          <div>
            <Label>Límite mensual</Label>
            <Input
              inputMode="decimal"
              value={limit}
              onKeyDown={preventInvalidNumberKeys}
              onChange={(e) => setLimit(sanitizeAmount(e.target.value))}
              placeholder="Ej: 1500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!valid}
              onClick={() => addBudgetCategory(name.trim(), parsedLimit)}
            >
              Crear
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const AddGoalModal = () => {
    const [name, setName] = useState("");
    const [target, setTarget] = useState("");

    const parsedTarget = Number(target);
    const valid =
      name.trim().length >= 2 &&
      Number.isFinite(parsedTarget) &&
      parsedTarget > 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Nueva Meta</h2>
            <button
              onClick={() => setIsGoalModalOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div>
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Viaje / Fondo / iPhone"
            />
          </div>

          <div>
            <Label>Monto meta</Label>
            <Input
              inputMode="decimal"
              value={target}
              onKeyDown={preventInvalidNumberKeys}
              onChange={(e) => setTarget(sanitizeAmount(e.target.value))}
              placeholder="Ej: 15000"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsGoalModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!valid}
              onClick={() => addGoal(name.trim(), parsedTarget)}
            >
              Crear
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const AddRecurringModal = () => {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [day, setDay] = useState("1");

    const parsedAmount = Number(amount);
    const parsedDay = Number(day);

    const valid =
      name.trim().length >= 2 &&
      Number.isFinite(parsedAmount) &&
      parsedAmount > 0 &&
      Number.isFinite(parsedDay) &&
      parsedDay >= 1 &&
      parsedDay <= 31;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Nuevo Gasto Fijo</h2>
            <button
              onClick={() => setIsRecurringModalOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div>
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Internet"
            />
          </div>

          <div>
            <Label>Tope / Presupuesto</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onKeyDown={preventInvalidNumberKeys}
              onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
              placeholder="Ej: 899"
            />
          </div>

          <div>
            <Label>Día de corte (1-31)</Label>
            <Input
              inputMode="numeric"
              value={day}
              onChange={(e) => setDay(sanitizeAmount(e.target.value))}
              placeholder="Ej: 10"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsRecurringModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!valid}
              onClick={() => addRecurringExpense(name.trim(), parsedAmount, parsedDay)}
            >
              Crear
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // --- SUB-VIEWS ---
  const OnboardingWizard = () => {
    const [step, setStep] = useState(1);

    const [name, setName] = useState(currentUser?.config?.name || "");
    const [income, setIncome] = useState(
      String(currentUser?.config?.monthlyIncome || "")
    );

    const [recName, setRecName] = useState("");
    const [recAmount, setRecAmount] = useState("");

    const [recurringDraft, setRecurringDraft] = useState<
      Array<Pick<RecurringExpense, "id" | "name" | "amount" | "spent" | "category" | "dayOfMonth">>
    >([]);

    const parsedIncome = Number(income);
    const recurringTotal = recurringDraft.reduce((s, r) => s + r.amount, 0);
    const estimatedAvailable = (Number.isFinite(parsedIncome) ? parsedIncome : 0) - recurringTotal;

    const canGoNext = recurringDraft.length >= 3;

    const addRec = () => {
      const amt = Number(recAmount);
      if (!recName.trim() || !Number.isFinite(amt) || amt <= 0) return;
      setRecurringDraft((prev) => [
        ...prev,
        {
          id: generateId(),
          name: recName.trim(),
          amount: amt,
          spent: 0,
          category: "Servicios",
          dayOfMonth: 1,
        },
      ]);
      setRecName("");
      setRecAmount("");
    };

    const finish = () => {
      const formData: Partial<UserProfile> = {
        config: {
          ...(currentUser?.config as UserConfig),
          name: name.trim() || "Usuario",
          monthlyIncome: Number.isFinite(parsedIncome) ? parsedIncome : 0,
        },
        recurring: recurringDraft as any,
      };
      finishOnboarding(formData);
    };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Saldo<span className="text-yellow-400">Mensual</span>
            </h1>
            <p className="text-slate-400">Configuración Inicial</p>
          </div>

          <Card className="p-6 space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  1. Datos Básicos
                </h2>

                <Input
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ingreso Mensual Neto"
                  value={income}
                  onKeyDown={preventInvalidNumberKeys}
                  onChange={(e) => setIncome(sanitizeAmount(e.target.value))}
                />

                <Button className="w-full mt-4" onClick={() => setStep(2)}>
                  Siguiente
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  2. Gastos Fijos (Estimados)
                </h2>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recurringDraft.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800"
                    >
                      <span className="text-white text-sm">{r.name}</span>
                      <span className="text-white font-mono text-sm">
                        {formatCurrency(r.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Ej: Netflix"
                    className="text-sm"
                    value={recName}
                    onChange={(e) => setRecName(e.target.value)}
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="$ Tope"
                    className="text-sm"
                    value={recAmount}
                    onKeyDown={preventInvalidNumberKeys}
                    onChange={(e) => setRecAmount(sanitizeAmount(e.target.value))}
                  />
                </div>

                <Button variant="secondary" className="w-full py-2 text-sm" onClick={addRec}>
                  + Agregar
                </Button>

                <Button className="w-full mt-4" disabled={!canGoNext} onClick={() => setStep(3)}>
                  Siguiente
                </Button>

                {!canGoNext && (
                  <p className="text-xs text-yellow-400 mt-2">
                    Agrega mínimo 3 gastos fijos para continuar.
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-semibold text-white">3. Resumen</h2>
                <div className="bg-slate-800/50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Ingreso Mensual</span>
                    <span className="text-white font-medium">
                      {formatCurrency(Number.isFinite(parsedIncome) ? parsedIncome : 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-3">
                    <span className="text-slate-400">Gastos Fijos (Est.)</span>
                    <span className="text-red-400 font-medium">
                      -{formatCurrency(recurringTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-yellow-400 font-bold">Disponible p/ Gastos</span>
                    <span className="text-yellow-400 font-bold text-lg">
                      {formatCurrency(estimatedAvailable)}
                    </span>
                  </div>
                </div>

                <Button className="w-full mt-6" onClick={finish}>
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
    if (!currentUser) return null;

    const variableSpent = currentUser.transactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + t.amount, 0);

    const totalIncomeExtra = currentUser.transactions
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + t.amount, 0);

    const fixedSpent = currentUser.recurring.reduce((acc, r) => acc + r.spent, 0);

    const currentBalance =
      currentUser.config.monthlyIncome + totalIncomeExtra - fixedSpent - variableSpent;

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        saveUserToDb({
          ...currentUser,
          config: { ...currentUser.config, avatar: reader.result as string },
        });
      };
      reader.readAsDataURL(file);
    };

    return (
      <div className="space-y-6 pb-24 animate-in fade-in">
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-4">
            <div className="relative group w-14 h-14">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center shadow-lg">
                {currentUser.config.avatar ? (
                  <img
                    src={currentUser.config.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} className="text-slate-400" />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-all z-10 backdrop-blur-sm">
                <Camera size={18} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>

            <div>
              <h1 className="text-xl font-bold text-white leading-tight">
                Hola, {currentUser.config.name}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-slate-400 text-xs flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date().toLocaleDateString("es-MX", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <div className="flex items-center gap-1 bg-green-900/30 px-2 py-0.5 rounded-full border border-green-500/30">
                  <Cloud size={10} className="text-green-400" />
                  <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider">
                    En Línea
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setView("settings")}
            className="p-2 bg-slate-900 rounded-full border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Ajustes"
          >
            <Settings size={20} />
          </button>
        </div>

        <Card className="p-6 bg-gradient-to-br from-yellow-500 to-amber-600 border-none relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <p className="text-yellow-900 font-medium mb-1 text-sm uppercase tracking-wider opacity-80">
              Disponible Real
            </p>
            <h2 className="text-4xl font-bold text-slate-900 tracking-tighter">
              {formatCurrency(currentBalance, currentUser.config.currency)}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 text-slate-900/80 text-xs font-bold">
              <span className="bg-white/20 px-2 py-1 rounded">
                Ingresos:{" "}
                {formatCurrency(
                  currentUser.config.monthlyIncome + totalIncomeExtra,
                  currentUser.config.currency
                )}
              </span>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card
            onClick={() => setView("recurring")}
            className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group"
          >
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

          <Card
            onClick={() => setView("goals")}
            className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="bg-green-500/10 w-fit p-2 rounded-lg text-green-400 group-hover:bg-green-500/20 mb-2">
              <Target size={20} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Metas</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-wide">
                Ahorros
              </p>
            </div>
          </Card>

          <Card
            onClick={() => setView("budget")}
            className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="bg-yellow-500/10 w-fit p-2 rounded-lg text-yellow-400 group-hover:bg-yellow-500/20 mb-2">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Sobres</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-wide">
                Gastos Variables
              </p>
            </div>
          </Card>

          <Card
            onClick={() => setView("reports")}
            className="p-4 flex flex-col justify-between h-28 hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="bg-purple-500/10 w-fit p-2 rounded-lg text-purple-400 group-hover:bg-purple-500/20 mb-2">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Análisis</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-wide">
                Reportes
              </p>
            </div>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h3 className="text-lg font-bold text-white">Movimientos Recientes</h3>
            <button
              onClick={() => setView("reports")}
              className="text-xs text-yellow-400"
            >
              Ver reporte
            </button>
          </div>

          <div className="space-y-2">
            {currentUser.transactions.length === 0 ? (
              <div className="text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-lg text-sm bg-slate-900/50">
                No hay movimientos recientes
              </div>
            ) : (
              currentUser.transactions.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl items-center"
                >
                  <div className="flex gap-3 items-center">
                    <div
                      className={`p-2 rounded-full h-fit ${
                        t.type === "expense"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {t.type === "expense" ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownLeft size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{t.category}</p>
                      <p className="text-slate-500 text-xs">
                        {t.note || new Date(t.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono font-bold ${
                      t.type === "expense" ? "text-white" : "text-green-400"
                    }`}
                  >
                    {t.type === "expense" ? "-" : "+"}
                    {formatCurrency(t.amount, currentUser.config.currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const BudgetView = () => {
    if (!currentUser) return null;

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState("");

    const startEditing = (b: BudgetCategory) => {
      setEditingId(b.id);
      setEditAmount(String(b.limit));
    };

    const saveEdit = (id: string) => {
      const n = Number(editAmount);
      if (Number.isFinite(n) && n > 0) {
        updateBudgetLimit(id, n);
        setEditingId(null);
      }
    };

    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Presupuestos (Sobres)</h1>
            <p className="text-slate-400 text-sm">
              Control de gastos variables por categoría
            </p>
          </div>
          <Button onClick={() => setIsCategoryModalOpen(true)} className="h-10 px-3">
            <Plus size={18} /> Nuevo
          </Button>
        </div>

        <div className="space-y-4">
          {currentUser.budgets.map((b) => {
            const safeLimit = b.limit > 0 ? b.limit : 1;
            const percent = (b.spent / safeLimit) * 100;
            const isOver = b.spent > b.limit;
            const isNearLimit = percent > 85 && !isOver;
            const isEditing = editingId === b.id;

            let statusColor = "bg-green-500";
            if (isOver) statusColor = "bg-red-500";
            else if (isNearLimit) statusColor = "bg-yellow-400";

            return (
              <Card
                key={b.id}
                className="p-4 relative overflow-visible transition-all hover:border-slate-700"
              >
                {isOver && !isEditing && (
                  <div className="absolute -top-2 -right-2 group z-10">
                    <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg border-2 border-slate-900 animate-bounce cursor-help">
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-white font-bold text-lg">{b.name}</h3>
                    <p
                      className={`text-xs ${
                        isOver
                          ? "text-red-400 font-bold"
                          : isNearLimit
                          ? "text-yellow-400"
                          : "text-slate-400"
                      }`}
                    >
                      {isOver
                        ? "Excedido"
                        : isNearLimit
                        ? "Cerca del límite"
                        : "En orden"}
                    </p>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="number"
                          className="w-24 bg-slate-800 border border-slate-600 text-white px-2 py-1 rounded text-sm text-right"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                        />
                        <button
                          onClick={() => saveEdit(b.id)}
                          className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                          title="Guardar"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <div>
                          <span
                            className={`text-sm font-mono ${
                              isOver ? "text-red-400 font-bold" : "text-slate-300"
                            }`}
                          >
                            {formatCurrency(b.spent, currentUser.config.currency)}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {" "}
                            / {formatCurrency(b.limit, currentUser.config.currency)}
                          </span>
                        </div>
                        <button
                          onClick={() => startEditing(b)}
                          className="text-slate-600 hover:text-yellow-400 transition-colors p-1"
                          title="Editar límite"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <ProgressBar value={b.spent} max={b.limit} colorOverride={statusColor} />
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const RecurringView = () => {
    if (!currentUser) return null;

    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Gastos Fijos & Servicios</h1>
            <p className="text-slate-400 text-sm">
              Controla pagos como Gasolina, Luz o Renta.
            </p>
          </div>
          <Button onClick={() => setIsRecurringModalOpen(true)} className="h-10 px-3">
            <Plus size={18} /> Nuevo
          </Button>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-2 items-start text-xs text-blue-300">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            Los gastos se reinician automáticamente después de su día de corte mensual,
            guardando el historial.
          </p>
        </div>

        <div className="space-y-4">
          {currentUser.recurring.length === 0 && (
            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No hay gastos fijos configurados.
            </div>
          )}

          {currentUser.recurring.map((r) => {
            const isFull = r.spent >= r.amount && r.amount > 0;

            return (
              <Card key={r.id} className="p-4 relative">
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => setHistoryRecurring(r)}
                    className="p-1.5 text-slate-500 hover:text-blue-400 rounded hover:bg-slate-800"
                    title="Historial"
                  >
                    <History size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingRecurring(r);
                      setIsConfirmingDelete(false);
                    }}
                    className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-slate-800"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                <div className="flex justify-between items-start mb-2 pr-16">
                  <div className="flex gap-3">
                    <div
                      className={`p-2 rounded-lg h-fit ${
                        isFull
                          ? "bg-green-500/10 text-green-500"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isFull ? <Check size={20} /> : <Zap size={20} />}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{r.name}</h3>
                      <p className="text-xs text-slate-400">Corte día {r.dayOfMonth}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-mono font-bold">
                      {formatCurrency(r.spent, currentUser.config.currency)}
                    </p>
                    <p className="text-xs text-slate-500">
                      de {formatCurrency(r.amount, currentUser.config.currency)}
                    </p>
                  </div>
                </div>

                <ProgressBar value={r.spent} max={r.amount} />

                <div className="mt-3 flex justify-between items-center">
                  <p
                    className={`text-xs font-bold ${
                      isFull
                        ? r.spent > r.amount
                          ? "text-red-500"
                          : "text-green-500"
                        : "text-slate-500"
                    }`}
                  >
                    {isFull
                      ? r.spent > r.amount
                        ? `Excedido por ${formatCurrency(
                            r.spent - r.amount,
                            currentUser.config.currency
                          )}`
                        : "Completado"
                      : `Restan ${formatCurrency(
                          r.amount - r.spent,
                          currentUser.config.currency
                        )}`}
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
        </div>
      </div>
    );
  };

  const GoalsView = () => {
    if (!currentUser) return null;

    const safeMax = (n: number) => (Number.isFinite(n) && n > 0 ? n : 1);

    return (
      <div className="space-y-6 pb-24 animate-in fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Metas</h1>
            <p className="text-slate-400 text-sm">
              Crea metas, abona y monitorea tu progreso.
            </p>
          </div>

          <Button onClick={() => setIsGoalModalOpen(true)} className="h-10 px-3">
            <Plus size={18} />
            Nueva
          </Button>
        </div>

        {currentUser.goals.length === 0 ? (
          <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            Aún no tienes metas. Crea la primera con <b>Nueva</b>.
          </div>
        ) : (
          <div className="space-y-4">
            {currentUser.goals.map((g) => {
              const max = safeMax(g.targetAmount);
              const pct = Math.min(100, Math.max(0, (g.currentAmount / max) * 100));
              const remaining = Math.max(0, g.targetAmount - g.currentAmount);
              const completed = g.currentAmount >= g.targetAmount && g.targetAmount > 0;

              return (
                <Card key={g.id} className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="text-white font-bold truncate">{g.name}</h3>

                      <p className="text-xs text-slate-400 mt-1">
                        {completed ? (
                          <span className="text-green-400 font-bold">Meta lograda 🎉</span>
                        ) : (
                          <>
                            Restan{" "}
                            <span className="text-yellow-400 font-bold">
                              {formatCurrency(remaining, currentUser.config.currency)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setGoalDepositId(g.id);
                          setGoalDepositAmount("");
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg flex items-center gap-1 transition-colors"
                        title="Abonar"
                      >
                        <Plus size={12} /> Abonar
                      </button>

                      <button
                        onClick={() => {
                          setEditingGoal(g);
                          setIsConfirmingDeleteGoal(false);
                        }}
                        className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={() => {
                          setEditingGoal(g);
                          setIsConfirmingDeleteGoal(true);
                        }}
                        className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>{formatCurrency(g.currentAmount, currentUser.config.currency)}</span>
                      <span>Meta: {formatCurrency(g.targetAmount, currentUser.config.currency)}</span>
                    </div>

                    <ProgressBar value={g.currentAmount} max={max} isGoal />
                    <p className="text-[10px] text-slate-500 mt-2">
                      Progreso:{" "}
                      <span className="text-slate-300 font-bold">{pct.toFixed(0)}%</span>
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const AlertsView = () => {
    if (!currentUser) return null;

    const overBudgets = currentUser.budgets.filter((b) => b.spent > b.limit);
    const nearBudgets = currentUser.budgets.filter((b) => b.spent / (b.limit || 1) > 0.85 && b.spent <= b.limit);
    const unpaidRecurring = currentUser.recurring.filter((r) => (r.amount || 0) > 0 && (r.spent || 0) < (r.amount || 0));

    return (
      <div className="space-y-4 pb-24">
        <h1 className="text-2xl font-bold text-white">Alertas</h1>
        <p className="text-slate-400 text-sm">Avisos por sobres y pagos.</p>

        {overBudgets.length === 0 && nearBudgets.length === 0 && unpaidRecurring.length === 0 ? (
          <Card className="p-4">
            <p className="text-slate-300 text-sm">Sin alertas por ahora.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {overBudgets.map((b) => (
              <Card key={b.id} className="p-4 border-red-500/30">
                <p className="text-red-400 font-bold text-sm">Sobre excedido: {b.name}</p>
                <p className="text-slate-300 text-xs mt-1">
                  Excedido por{" "}
                  <b className="text-white">
                    {formatCurrency(b.spent - b.limit, currentUser.config.currency)}
                  </b>
                </p>
              </Card>
            ))}

            {nearBudgets.map((b) => (
              <Card key={b.id} className="p-4 border-yellow-400/30">
                <p className="text-yellow-400 font-bold text-sm">Cerca del límite: {b.name}</p>
                <p className="text-slate-300 text-xs mt-1">
                  Te queda{" "}
                  <b className="text-white">
                    {formatCurrency(b.limit - b.spent, currentUser.config.currency)}
                  </b>
                </p>
              </Card>
            ))}

            {unpaidRecurring.map((r) => (
              <Card key={r.id} className="p-4 border-blue-500/30">
                <p className="text-blue-300 font-bold text-sm">Pago pendiente: {r.name}</p>
                <p className="text-slate-300 text-xs mt-1">
                  Restan{" "}
                  <b className="text-white">
                    {formatCurrency(r.amount - r.spent, currentUser.config.currency)}
                  </b>
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ReportsView = () => {
    if (!currentUser) return null;

    const currency = currentUser.config.currency;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6); // últimos 7 días

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const minDate = useMemo(() => {
      if (generalChartFilter === "week") return startOfWeek;
      if (generalChartFilter === "month") return startOfMonth;
      return startOfYear;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generalChartFilter]);

    const txFiltered = currentUser.transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= minDate && d <= now;
    });

    const expenses = txFiltered.filter((t) => t.type === "expense");
    const incomes = txFiltered.filter((t) => t.type === "income");

    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncomeExtra = incomes.reduce((s, t) => s + t.amount, 0);

    const fixedSpent = currentUser.recurring.reduce((s, r) => s + (r.spent || 0), 0);
    const fixedLimit = currentUser.recurring.reduce((s, r) => s + (r.amount || 0), 0);

    const available =
      currentUser.config.monthlyIncome + totalIncomeExtra - fixedSpent - totalExpenses;

    // Pie: gastos por categoría (variables)
    const categoryMap = new Map<string, number>();
    for (const e of expenses) {
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
    }
    const pieData = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Barra: top categorías vs límite (si existe en budgets)
    const budgetByName = new Map(currentUser.budgets.map((b) => [b.name, b]));
    const barBudget = currentUser.budgets
      .map((b) => ({
        name: b.name,
        spent: b.spent,
        limit: b.limit,
      }))
      .sort((a, b) => (b.spent / (b.limit || 1)) - (a.spent / (a.limit || 1)))
      .slice(0, 7);

    // Serie: gastos diarios (variables)
    const daily = new Map<string, { date: string; expenses: number; incomes: number }>();
    const toKey = (d: Date) => d.toISOString().slice(0, 10);

    for (const t of txFiltered) {
      const key = t.date || toKey(new Date());
      const cur = daily.get(key) || { date: key, expenses: 0, incomes: 0 };
      if (t.type === "expense") cur.expenses += t.amount;
      else cur.incomes += t.amount;
      daily.set(key, cur);
    }

    const trendData = Array.from(daily.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60);

    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Análisis</h1>
            <p className="text-slate-400 text-sm">Resumen + gráficas.</p>
          </div>

          <select
            className="bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm"
            value={generalChartFilter}
            onChange={(e) => setGeneralChartFilter(e.target.value as TimeFilter)}
            title="Filtro"
          >
            <option value="week">7 días</option>
            <option value="month">Este mes</option>
            <option value="year">Este año</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-slate-400 text-xs">Gastos (variables)</p>
            <p className="text-white font-bold">
              {formatCurrency(totalExpenses, currency)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-slate-400 text-xs">Ingresos extra</p>
            <p className="text-white font-bold">
              {formatCurrency(totalIncomeExtra, currency)}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-slate-400 text-xs">Fijos pagados</p>
            <p className="text-white font-bold">
              {formatCurrency(fixedSpent, currency)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Tope total: {formatCurrency(fixedLimit, currency)}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-slate-400 text-xs">Disponible (estimado)</p>
            <p className="text-white font-bold">
              {formatCurrency(available, currency)}
            </p>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-bold">Gasto por categoría</p>
            <p className="text-xs text-slate-500">
              Top {pieData.length}
            </p>
          </div>

          <div style={{ width: "100%", height: 220 }}>
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Aún no hay gastos en este periodo.
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip
                    formatter={(v: any) => formatCurrency(Number(v), currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-white font-bold mb-2">Sobres: gasto vs límite</p>

          <div style={{ width: "100%", height: 260 }}>
            {barBudget.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No hay sobres configurados.
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={barBudget}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    formatter={(v: any, name: any) => {
                      if (name === "spent") return [formatCurrency(Number(v), currency), "Gastado"];
                      return [formatCurrency(Number(v), currency), "Límite"];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="limit" />
                  <Bar dataKey="spent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-white font-bold mb-2">Tendencia (ingresos vs gastos)</p>

          <div style={{ width: "100%", height: 260 }}>
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Sin datos para graficar.
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    formatter={(v: any) => formatCurrency(Number(v), currency)}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="incomes" />
                  <Area type="monotone" dataKey="expenses" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-slate-300 text-sm">
            Movimientos en periodo:{" "}
            <span className="text-white font-bold">{txFiltered.length}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Nota: Los “fijos” se toman de tu pantalla de Fijos (acumulado actual), no de movimientos diarios.
          </p>
        </Card>
      </div>
    );
  };

  const SettingsView = () => {
    if (!currentUser) return null;

    const [name, setName] = useState(currentUser.config.name || "");
    const [income, setIncome] = useState(String(currentUser.config.monthlyIncome || ""));
    const [currency, setCurrency] = useState(currentUser.config.currency || "MXN");
    const [savings, setSavings] = useState(String(currentUser.config.savingsRulePercent ?? 10));
    const [saving, setSaving] = useState(false);

    const save = async () => {
      const parsedIncome = Number(income);
      const parsedSavings = Number(savings);

      const updated: UserProfile = {
        ...currentUser,
        config: {
          ...currentUser.config,
          name: name.trim() || "Usuario",
          monthlyIncome: Number.isFinite(parsedIncome) ? parsedIncome : 0,
          currency: currency || "MXN",
          savingsRulePercent: Number.isFinite(parsedSavings) ? parsedSavings : 10,
        },
      };

      setSaving(true);
      await saveUserToDb(updated);
      setSaving(false);
      setView("dashboard");
    };

    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Ajustes</h1>
            <p className="text-slate-400 text-sm">Tu configuración principal.</p>
          </div>
        </div>

        <Card className="p-4 space-y-3">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label>Ingreso mensual</Label>
            <Input
              inputMode="decimal"
              value={income}
              onKeyDown={preventInvalidNumberKeys}
              onChange={(e) => setIncome(sanitizeAmount(e.target.value))}
            />
          </div>

          <div>
            <Label>Moneda</Label>
            <select
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-3"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div>
            <Label>% ahorro sugerido</Label>
            <Input
              inputMode="decimal"
              value={savings}
              onKeyDown={preventInvalidNumberKeys}
              onChange={(e) => setSavings(sanitizeAmount(e.target.value))}
              placeholder="Ej: 10"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Solo es una regla sugerida (no mueve dinero automáticamente).
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setView("dashboard")}
              disabled={saving}
            >
              Volver
            </Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Guardar
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <p className="text-slate-400 text-xs">Sesión</p>
          <Button variant="danger" onClick={handleLogout}>
            <LogOut size={18} /> Salir
          </Button>
        </Card>
      </div>
    );
  };

  // --- MAIN RENDER STATES ---
  if (loadingAuth || loadingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="text-yellow-400 animate-spin mb-4" size={48} />
        <p className="text-slate-400 animate-pulse">Sincronizando con la nube...</p>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen />;
  if (view === "onboarding") return <OnboardingWizard />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-yellow-400/30">
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

        <div className="max-w-md mx-auto min-h-screen bg-slate-950 shadow-2xl relative">
          <main className="p-4 pt-8">
            {view === "dashboard" && <Dashboard />}
            {view === "budget" && <BudgetView />}
            {view === "recurring" && <RecurringView />}
            {view === "goals" && <GoalsView />}
            {view === "alerts" && <AlertsView />}
            {view === "reports" && <ReportsView />}
            {view === "settings" && <SettingsView />}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 safe-area-bottom">
            <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
              <button
                onClick={() => setView("dashboard")}
                className={`flex flex-col items-center gap-1 p-2 ${
                  view === "dashboard" ? "text-yellow-400" : "text-slate-500"
                }`}
              >
                <Home size={20} />
                <span className="text-[10px]">Inicio</span>
              </button>

              <button
                onClick={() => setView("budget")}
                className={`flex flex-col items-center gap-1 p-2 ${
                  view === "budget" ? "text-yellow-400" : "text-slate-500"
                }`}
              >
                <Wallet size={20} />
                <span className="text-[10px]">Sobres</span>
              </button>

              <div className="relative -top-5">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-14 h-14 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  title="Nuevo movimiento"
                >
                  <Plus size={28} strokeWidth={3} />
                </button>
              </div>

              <button
                onClick={() => setView("recurring")}
                className={`flex flex-col items-center gap-1 p-2 ${
                  view === "recurring" ? "text-yellow-400" : "text-slate-500"
                }`}
              >
                <Zap size={20} />
                <span className="text-[10px]">Fijos</span>
              </button>

              <button
                onClick={() => setView("reports")}
                className={`flex flex-col items-center gap-1 p-2 ${
                  view === "reports" ? "text-yellow-400" : "text-slate-500"
                }`}
              >
                <TrendingUp size={20} />
                <span className="text-[10px]">Análisis</span>
              </button>
            </div>
          </nav>

          {isModalOpen && <AddTransactionModal />}
          {isCategoryModalOpen && <AddCategoryModal />}
          {isRecurringModalOpen && <AddRecurringModal />}
          {isGoalModalOpen && <AddGoalModal />}

          {/* Modal: Abonar a meta */}
          {goalDepositId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">Abonar a meta</h2>

                <Input
                  autoFocus
                  inputMode="decimal"
                  placeholder="Monto ($)"
                  value={goalDepositAmount}
                  onKeyDown={preventInvalidNumberKeys}
                  onChange={(e) => setGoalDepositAmount(sanitizeAmount(e.target.value))}
                />

                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setGoalDepositId(null)}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const n = Number(goalDepositAmount);
                      if (Number.isFinite(n) && n > 0) addGoalDeposit(goalDepositId, n);
                    }}
                  >
                    Abonar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Editar meta */}
          {editingGoal && !isConfirmingDeleteGoal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Editar meta</h2>
                  <button onClick={() => setEditingGoal(null)} className="text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={editingGoal.name}
                    onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Monto meta</Label>
                  <Input
                    inputMode="decimal"
                    value={String(editingGoal.targetAmount ?? "")}
                    onKeyDown={preventInvalidNumberKeys}
                    onChange={(e) =>
                      setEditingGoal({
                        ...editingGoal,
                        targetAmount: Number(sanitizeAmount(e.target.value)),
                      })
                    }
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setEditingGoal(null)}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() =>
                      editGoal(
                        editingGoal.id,
                        editingGoal.name.trim(),
                        Number(editingGoal.targetAmount)
                      )
                    }
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Confirmar eliminar meta */}
          {editingGoal && isConfirmingDeleteGoal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">¿Eliminar meta?</h2>
                <p className="text-slate-400 text-sm">
                  Se eliminará <b className="text-white">{editingGoal.name}</b>. Esta acción no se puede deshacer.
                </p>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setIsConfirmingDeleteGoal(false);
                      setEditingGoal(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={() => deleteGoal(editingGoal.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Pago parcial gasto fijo */}
          {payRecurringId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">Registrar Pago</h2>
                <Input
                  autoFocus
                  inputMode="decimal"
                  placeholder="Monto ($)"
                  value={payRecurringAmount}
                  onKeyDown={preventInvalidNumberKeys}
                  onChange={(e) => setPayRecurringAmount(sanitizeAmount(e.target.value))}
                />
                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setPayRecurringId(null)}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const n = Number(payRecurringAmount);
                      if (Number.isFinite(n) && n > 0) addRecurringPayment(payRecurringId, n);
                    }}
                  >
                    Registrar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Editar gasto fijo */}
          {editingRecurring && !isConfirmingDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Editar gasto fijo</h2>
                  <button onClick={() => setEditingRecurring(null)} className="text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={editingRecurring.name}
                    onChange={(e) => setEditingRecurring({ ...editingRecurring, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Tope / Presupuesto</Label>
                  <Input
                    inputMode="decimal"
                    value={String(editingRecurring.amount)}
                    onKeyDown={preventInvalidNumberKeys}
                    onChange={(e) =>
                      setEditingRecurring({ ...editingRecurring, amount: Number(sanitizeAmount(e.target.value)) })
                    }
                  />
                </div>

                <div>
                  <Label>Día de corte (1-31)</Label>
                  <Input
                    inputMode="numeric"
                    value={String(editingRecurring.dayOfMonth)}
                    onChange={(e) =>
                      setEditingRecurring({ ...editingRecurring, dayOfMonth: Number(sanitizeAmount(e.target.value)) })
                    }
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setEditingRecurring(null)}>
                    Cancelar
                  </Button>

                  <Button
                    className="flex-1"
                    onClick={() =>
                      editRecurringExpense(
                        editingRecurring.id,
                        editingRecurring.name.trim(),
                        Number(editingRecurring.amount),
                        Number(editingRecurring.dayOfMonth)
                      )
                    }
                  >
                    Guardar
                  </Button>
                </div>

                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  <Trash2 size={18} /> Eliminar
                </Button>
              </div>
            </div>
          )}

          {/* Modal: Confirmar eliminar gasto fijo */}
          {editingRecurring && isConfirmingDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">¿Eliminar gasto fijo?</h2>
                <p className="text-slate-400 text-sm">
                  Se eliminará <b className="text-white">{editingRecurring.name}</b>. Esta acción no se puede deshacer.
                </p>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setIsConfirmingDelete(false);
                      setEditingRecurring(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => deleteRecurringExpense(editingRecurring.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Historial gasto fijo */}
          {historyRecurring && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    Historial: {historyRecurring.name}
                  </h2>
                  <button onClick={() => setHistoryRecurring(null)} className="text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  {(historyRecurring.history || []).length === 0 ? (
                    <div className="text-slate-500 text-sm">
                      Aún no hay historial guardado. Se agrega cuando reinicia el mes.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-auto pr-1">
                      {(historyRecurring.history || [])
                        .slice()
                        .reverse()
                        .map((h, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-slate-950 border border-slate-800 rounded-lg p-3">
                            <span className="text-slate-300">{h.month}</span>
                            <span className="text-white font-mono">
                              {formatCurrency(h.spent, currentUser.config.currency)} / {formatCurrency(h.limit, currentUser.config.currency)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div style={{ width: "100%", height: 220 }}>
                  {(historyRecurring.history || []).length > 0 && (
                    <ResponsiveContainer>
                      <BarChart data={(historyRecurring.history || []).slice(-8)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RechartsTooltip
                          formatter={(v: any) => formatCurrency(Number(v), currentUser.config.currency)}
                        />
                        <Legend />
                        <Bar dataKey="limit" />
                        <Bar dataKey="spent" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
