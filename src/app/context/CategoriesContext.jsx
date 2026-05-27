import { createContext, useContext, useState, useEffect } from 'react';

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: '1', label: 'Ăn uống',           iconName: 'Coffee',      color: 'orange'  },
  { id: '2', label: 'Mua sắm',            iconName: 'ShoppingBag', color: 'pink'    },
  { id: '3', label: 'Di chuyển',          iconName: 'Car',         color: 'blue'    },
  { id: '4', label: 'Giải trí',           iconName: 'Music',       color: 'purple'  },
  { id: '5', label: 'Hóa đơn & Tiện ích', iconName: 'Zap',         color: 'yellow'  },
  { id: '6', label: 'Nhà cửa',            iconName: 'Home',        color: 'green'   },
  { id: '7', label: 'Sức khỏe',           iconName: 'Heart',       color: 'red'     },
  { id: '8', label: 'Khác',               iconName: 'Wallet',      color: 'slate'   },
];

const DEFAULT_INCOME_SOURCES = [
  { id: '1', label: 'Lương'          },
  { id: '2', label: 'Thưởng'         },
  { id: '3', label: 'Freelance'      },
  { id: '4', label: 'Kinh doanh'     },
  { id: '5', label: 'Đầu tư'         },
  { id: '6', label: 'Cho vay thu lại'},
  { id: '7', label: 'Khác'           },
];

const DEFAULT_TAGS = [
  { id: '1', name: 'DuLich',    color: 'blue'    },
  { id: '2', name: 'KinhDoanh', color: 'emerald' },
  { id: '3', name: 'GiaDinh',   color: 'orange'  },
  { id: '4', name: 'GiaoDuc',   color: 'purple'  },
  { id: '5', name: 'KhuyenMai', color: 'pink'    },
];

const DEFAULT_OBJECT_GROUPS = [
  { id: '1', name: 'Công ty ABC',  type: 'company', role: 'payer',  notes: '' },
  { id: '2', name: 'Nguyễn Văn A', type: 'person',  role: 'payee', notes: '' },
  { id: '3', name: 'Shopee',       type: 'company', role: 'payee', notes: '' },
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
  const [expenseCategories, setExpenseCategories] = useState(() => load('expense_categories', DEFAULT_EXPENSE_CATEGORIES));
  const [incomeSources,     setIncomeSources]     = useState(() => load('income_sources',     DEFAULT_INCOME_SOURCES));
  const [tags,              setTags]              = useState(() => load('app_tags',            DEFAULT_TAGS));
  const [objectGroups,      setObjectGroups]      = useState(() => load('app_object_groups',   DEFAULT_OBJECT_GROUPS));

  useEffect(() => { localStorage.setItem('expense_categories', JSON.stringify(expenseCategories)); }, [expenseCategories]);
  useEffect(() => { localStorage.setItem('income_sources',     JSON.stringify(incomeSources));     }, [incomeSources]);
  useEffect(() => { localStorage.setItem('app_tags',           JSON.stringify(tags));              }, [tags]);
  useEffect(() => { localStorage.setItem('app_object_groups',  JSON.stringify(objectGroups));      }, [objectGroups]);

  const addExpenseCategory    = (cat)     => setExpenseCategories(prev => [...prev, { ...cat, id: Date.now().toString() }]);
  const updateExpenseCategory = (id, upd) => setExpenseCategories(prev => prev.map(c => c.id === id ? { ...c, ...upd } : c));
  const deleteExpenseCategory = (id)      => setExpenseCategories(prev => prev.filter(c => c.id !== id));

  const addIncomeSource    = (src)     => setIncomeSources(prev => [...prev, { ...src, id: Date.now().toString() }]);
  const updateIncomeSource = (id, upd) => setIncomeSources(prev => prev.map(s => s.id === id ? { ...s, ...upd } : s));
  const deleteIncomeSource = (id)      => setIncomeSources(prev => prev.filter(s => s.id !== id));

  const addTag    = (tag)      => setTags(prev => [...prev, { ...tag, id: Date.now().toString() }]);
  const updateTag = (id, upd)  => setTags(prev => prev.map(t => t.id === id ? { ...t, ...upd } : t));
  const deleteTag = (id)       => setTags(prev => prev.filter(t => t.id !== id));

  const addObjectGroup    = (obj)      => setObjectGroups(prev => [...prev, { ...obj, id: Date.now().toString() }]);
  const updateObjectGroup = (id, upd)  => setObjectGroups(prev => prev.map(o => o.id === id ? { ...o, ...upd } : o));
  const deleteObjectGroup = (id)       => setObjectGroups(prev => prev.filter(o => o.id !== id));

  return (
    <CategoriesContext.Provider value={{
      expenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
      incomeSources,     addIncomeSource,    updateIncomeSource,    deleteIncomeSource,
      tags,              addTag,             updateTag,             deleteTag,
      objectGroups,      addObjectGroup,     updateObjectGroup,     deleteObjectGroup,
    }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export const useCategories = () => {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
};
