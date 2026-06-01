import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { accountApi } from "../api/accountApi";
import { useAuth } from "./AuthContext";

const DEFAULT_EXPENSE_CATEGORIES = [
  { accountId: "", name: "Ăn uống", iconName: "Pizza", color: "red" },
  { accountId: "", name: "Di chuyển", iconName: "Car", color: "blue" },
  { accountId: "", name: "Mua sắm", iconName: "ShoppingBag", color: "purple" },
];

const DEFAULT_INCOME_SOURCES = [
  {
    accountId: "",
    name: "Lương",
    iconName: "BriefcaseBusiness",
    color: "green",
  },
  { accountId: "", name: "Đầu tư", iconName: "TrendingUp", color: "purple" },
  { accountId: "", name: "Thu nhập phụ", iconName: "Wallet", color: "orange" },
];

const DEFAULT_TAGS = [
  { id: "1", name: "Quan trọng", color: "red" },
  { id: "2", name: "Cần thiết", color: "blue" },
  { id: "3", name: "Không cần thiết", color: "gray" },
  { id: "4", name: "DuLich", color: "emerald" },
  { id: "5", name: "KinhDoanh", color: "orange" },
  { id: "6", name: "GiaDinh", color: "purple" },
  { id: "7", name: "GiaoDuc", color: "indigo" },
  { id: "8", name: "KhuyenMai", color: "pink" },
];

const DEFAULT_OBJECT_GROUPS = [
  { id: "1", name: "Công ty ABC", type: "company", role: "payer", notes: "" },
  { id: "2", name: "Nguyễn Văn A", type: "person", role: "payee", notes: "" },
  { id: "3", name: "Shopee", type: "company", role: "payee", notes: "" },
];

function load(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}
const CategoriesContext = createContext(null);

export function CategoriesProvider({ children }) {
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeSources, setIncomeSources] = useState([]);

  const { user } = useAuth();

  // ── Clear cached categories when user logs out ─────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const [expenseRes, incomeRes, liabilityRes] = await Promise.all([
          accountApi.getByType(5),
          accountApi.getByType(4),
          accountApi.getByType(2),
        ]);
        const allExpenseCategories = [
          ...(expenseRes.items ?? []),
          ...(liabilityRes.items ?? []),
        ];

        const allIncomeCategories = [...(incomeRes.items ?? [])];
        setExpenseCategories(
          allExpenseCategories.length > 0
            ? allExpenseCategories
            : [DEFAULT_EXPENSE_CATEGORIES],
        );
        setIncomeSources(
          allIncomeCategories.length > 0
            ? allIncomeCategories
            : [DEFAULT_INCOME_SOURCES],
        );
      } catch (err) {
        setExpenseCategories(
          load("expense_categories", DEFAULT_EXPENSE_CATEGORIES),
        );
        setIncomeSources(load("income_sources", DEFAULT_INCOME_SOURCES));
      }
    };

    useEffect(() => {
      fetchCategories();
    }, [fetchCategories]);

    const [tags, setTags] = useState(() => load("app_tags", DEFAULT_TAGS));
    const [objectGroups, setObjectGroups] = useState(() =>
      load("app_object_groups", DEFAULT_OBJECT_GROUPS),
    );

    useEffect(() => {
      localStorage.setItem(
        "expense_categories",
        JSON.stringify(expenseCategories),
      );
    }, [expenseCategories]);
    useEffect(() => {
      localStorage.setItem("income_sources", JSON.stringify(incomeSources));
    }, [incomeSources]);
    useEffect(() => {
      localStorage.setItem("app_tags", JSON.stringify(tags));
    }, [tags]);
    useEffect(() => {
      localStorage.setItem("app_object_groups", JSON.stringify(objectGroups));
    }, [objectGroups]);

    const addExpenseCategory = (cat) =>
      setExpenseCategories((prev) => [
        ...prev,
        { ...cat, id: Date.now().toString() },
      ]);
    const updateExpenseCategory = (id, upd) =>
      setExpenseCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...upd } : c)),
      );
    const deleteExpenseCategory = (id) =>
      setExpenseCategories((prev) => prev.filter((c) => c.id !== id));

    const addIncomeSource = (src) =>
      setIncomeSources((prev) => [
        ...prev,
        { ...src, id: Date.now().toString() },
      ]);
    const updateIncomeSource = (id, upd) =>
      setIncomeSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...upd } : s)),
      );
    const deleteIncomeSource = (id) =>
      setIncomeSources((prev) => prev.filter((s) => s.id !== id));

    const addTag = (tag) =>
      setTags((prev) => [...prev, { ...tag, id: Date.now().toString() }]);
    const updateTag = (id, upd) =>
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...upd } : t)));
    const deleteTag = (id) =>
      setTags((prev) => prev.filter((t) => t.id !== id));

    const addObjectGroup = (obj) =>
      setObjectGroups((prev) => [
        ...prev,
        { ...obj, id: Date.now().toString() },
      ]);
    const updateObjectGroup = (id, upd) =>
      setObjectGroups((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...upd } : o)),
      );
    const deleteObjectGroup = (id) =>
      setObjectGroups((prev) => prev.filter((o) => o.id !== id));

    return (
      <CategoriesContext.Provider
        value={{
          expenseCategories,
          addExpenseCategory,
          updateExpenseCategory,
          deleteExpenseCategory,
          incomeSources,
          addIncomeSource,
          updateIncomeSource,
          deleteIncomeSource,
          tags,
          addTag,
          updateTag,
          deleteTag,
          objectGroups,
          addObjectGroup,
          updateObjectGroup,
          deleteObjectGroup,
        }}
      >
        {children}
      </CategoriesContext.Provider>
    );
  });

  export const useCategories = () => {
    const ctx = useContext(CategoriesContext);
    if (!ctx)
      throw new Error("useCategories must be used within CategoriesProvider");
    return ctx;
  };
}
