'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  CircleDollarSign,
  Edit3,
  FolderTree,
  Layers3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

type ExamGroup = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  display_order: number;
  status: string;
};

type Exam = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  icon_url: string | null;
  status: string;
  display_order: number;
};

type Series = {
  id: string;
  exam_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_free: boolean;
  price: number;
  mrp: number;
  discount_active: boolean;
  status: string;
  display_order: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  banner_url: string | null;
  product_type: string;
  price: number;
  mrp: number;
  discount_active: boolean;
  discount_expires_at: string | null;
  validity_days: number;
  status: string;
  is_featured: boolean;
  display_order: number;
  features: string[] | null;
  created_by: string | null;
  published_at: string | null;
};

type ProductExam = {
  id: string;
  product_id: string;
  exam_id: string;
  display_order: number;
};

type ProductSeries = {
  id: string;
  product_id: string;
  series_id: string;
  display_order: number;
};

type GroupExam = {
  id: string;
  group_id: string;
  exam_id: string;
  display_order: number;
};

const PRODUCT_TYPES = [
  ['subscription', 'Subscription'],
  ['test_pass', 'Test Pass'],
  ['bundle', 'Bundle'],
];

const PRODUCT_STATUSES = [
  ['draft', 'Draft'],
  ['published', 'Published'],
  ['unpublished', 'Unpublished'],
  ['archived', 'Archived'],
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function AdminTestPrimePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<ExamGroup[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productExams, setProductExams] = useState<ProductExam[]>([]);
  const [productSeries, setProductSeries] = useState<ProductSeries[]>([]);
  const [groupExams, setGroupExams] = useState<GroupExam[]>([]);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [seriesSearch, setSeriesSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);

  const [dialog, setDialog] = useState<
    'product' | 'group' | null
  >(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    short_description: '',
    description: '',
    image_url: '',
    banner_url: '',
    product_type: 'test_pass',
    price: '299',
    mrp: '999',
    discount_active: true,
    discount_expires_at: '',
    validity_days: '365',
    status: 'draft',
    is_featured: true,
    display_order: '1',
    features: [
      'Multiple Competitive Exams',
      'Mock Tests',
      'Previous Year Questions',
      'Detailed Solutions',
      'Performance Analysis',
      'Unlimited Practice',
    ],
  });

  const [groupForm, setGroupForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon_url: '',
    display_order: '0',
    status: 'published',
  });

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) {
      router.push('/login');
    }
  }, [loading, profile, router, user]);

  const fetchAll = async () => {
    setBusy(true);

    const [
      groupsResult,
      examsResult,
      seriesResult,
      productsResult,
      productExamsResult,
      productSeriesResult,
      groupExamsResult,
    ] = await Promise.all([
      supabase
        .from('exam_groups')
        .select('*')
        .order('display_order')
        .order('name'),

      supabase
        .from('mock_exams')
        .select('*')
        .order('display_order')
        .order('name'),

      supabase
        .from('mock_test_series')
        .select('*')
        .order('display_order')
        .order('created_at', { ascending: false }),

      supabase
        .from('test_products')
        .select('*')
        .order('display_order')
        .order('created_at', { ascending: false }),

      supabase
        .from('test_product_exams')
        .select('id,product_id,exam_id,display_order')
        .order('display_order'),

      supabase
        .from('test_product_series')
        .select('id,product_id,series_id,display_order')
        .order('display_order'),

      supabase
        .from('exam_group_exams')
        .select('id,group_id,exam_id,display_order')
        .order('display_order'),
    ]);

    if (groupsResult.error) toast.error(groupsResult.error.message);
    if (examsResult.error) toast.error(examsResult.error.message);
    if (seriesResult.error) toast.error(seriesResult.error.message);
    if (productsResult.error) toast.error(productsResult.error.message);
    if (productExamsResult.error) toast.error(productExamsResult.error.message);
    if (productSeriesResult.error) toast.error(productSeriesResult.error.message);
    if (groupExamsResult.error) toast.error(groupExamsResult.error.message);

    setGroups((groupsResult.data || []) as ExamGroup[]);
    setExams((examsResult.data || []) as Exam[]);
    setSeries((seriesResult.data || []) as Series[]);
    setProducts((productsResult.data || []) as Product[]);
    setProductExams((productExamsResult.data || []) as ProductExam[]);
    setProductSeries((productSeriesResult.data || []) as ProductSeries[]);
    setGroupExams((groupExamsResult.data || []) as GroupExam[]);

    setBusy(false);
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAll();
    }
  }, [profile]);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) || null;

  const selectedProductExamIds = useMemo(
    () =>
      new Set(
        productExams
          .filter((item) => item.product_id === selectedProductId)
          .map((item) => item.exam_id),
      ),
    [productExams, selectedProductId],
  );

  const selectedProductSeriesIds = useMemo(
    () =>
      new Set(
        productSeries
          .filter((item) => item.product_id === selectedProductId)
          .map((item) => item.series_id),
      ),
    [productSeries, selectedProductId],
  );

  const selectedGroupExamIds = useMemo(
    () =>
      new Set(
        groupExams
          .filter((item) => item.group_id === selectedGroupId)
          .map((item) => item.exam_id),
      ),
    [groupExams, selectedGroupId],
  );

  const filteredExams = useMemo(() => {
    const q = examSearch.trim().toLowerCase();

    return exams.filter((exam) => {
      if (!q) return true;

      return `${exam.name} ${exam.category || ''} ${exam.slug}`
        .toLowerCase()
        .includes(q);
    });
  }, [exams, examSearch]);

  const filteredSeries = useMemo(() => {
    const q = seriesSearch.trim().toLowerCase();

    return series.filter((item) => {
      if (!q) return true;

      return `${item.title} ${item.slug} ${item.description || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [series, seriesSearch]);

  const productSeriesCount = selectedProduct
    ? productSeries.filter((item) => item.product_id === selectedProduct.id).length
    : 0;

  const productExamCount = selectedProduct
    ? productExams.filter((item) => item.product_id === selectedProduct.id).length
    : 0;

  const resetProductForm = () => {
    setProductForm({
      name: '',
      slug: '',
      short_description: '',
      description: '',
      image_url: '',
      banner_url: '',
      product_type: 'test_pass',
      price: '299',
      mrp: '999',
      discount_active: true,
      discount_expires_at: '',
      validity_days: '365',
      status: 'draft',
      is_featured: true,
      display_order: String(products.length + 1),
      features: [
        'Multiple Competitive Exams',
        'Mock Tests',
        'Previous Year Questions',
        'Detailed Solutions',
        'Performance Analysis',
        'Unlimited Practice',
      ],
    });
  };

  const openCreateProduct = () => {
    resetProductForm();
    setEditingProduct(null);
    setDialog('product');
  };

  const openEditProduct = (product: Product) => {
    const rawFeatures = Array.isArray(product.features)
      ? product.features.map(String)
      : [];

    setProductForm({
      name: product.name,
      slug: product.slug,
      short_description: product.short_description || '',
      description: product.description || '',
      image_url: product.image_url || '',
      banner_url: product.banner_url || '',
      product_type: product.product_type || 'test_pass',
      price: String(product.price ?? 0),
      mrp: String(product.mrp ?? 0),
      discount_active: product.discount_active,
      discount_expires_at: product.discount_expires_at
        ? product.discount_expires_at.slice(0, 16)
        : '',
      validity_days: String(product.validity_days ?? 365),
      status: product.status || 'draft',
      is_featured: product.is_featured,
      display_order: String(product.display_order ?? 0),
      features: rawFeatures.length
        ? rawFeatures
        : ['Multiple Competitive Exams'],
    });

    setEditingProduct(product);
    setDialog('product');
  };

  const saveProduct = async () => {
    if (!productForm.name.trim()) {
      toast.error('Enter product name.');
      return;
    }

    const price = Number(productForm.price);
    const mrp = Number(productForm.mrp);
    const validity = Number(productForm.validity_days);

    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a valid price.');
      return;
    }

    if (!Number.isFinite(mrp) || mrp < 0) {
      toast.error('Enter a valid MRP.');
      return;
    }

    if (!Number.isFinite(validity) || validity < 1) {
      toast.error('Validity must be at least 1 day.');
      return;
    }

    const features = productForm.features
      .map((feature) => feature.trim())
      .filter(Boolean);

    const status = productForm.status;

    setBusy(true);

    const payload = {
      name: productForm.name.trim(),
      slug: productForm.slug.trim() || slugify(productForm.name),
      short_description: productForm.short_description.trim() || null,
      description: productForm.description.trim() || null,
      image_url: productForm.image_url.trim() || null,
      banner_url: productForm.banner_url.trim() || null,
      product_type: productForm.product_type,
      price,
      mrp,
      discount_active: productForm.discount_active,
      discount_expires_at: productForm.discount_expires_at
        ? new Date(productForm.discount_expires_at).toISOString()
        : null,
      validity_days: Math.min(3650, Math.floor(validity)),
      status,
      is_featured: productForm.is_featured,
      display_order: Number(productForm.display_order) || 0,
      features,
      published_at:
        status === 'published'
          ? editingProduct?.published_at || new Date().toISOString()
          : null,
    };

    let productId = editingProduct?.id || '';

    if (editingProduct) {
      const { error } = await supabase
        .from('test_products')
        .update(payload)
        .eq('id', editingProduct.id);

      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('test_products')
        .insert({
          ...payload,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error || !data) {
        setBusy(false);
        toast.error(error?.message || 'Could not create product.');
        return;
      }

      productId = data.id;
    }

    setBusy(false);
    setDialog(null);

    toast.success(
      editingProduct ? 'Test product updated.' : 'Test product created.',
    );

    await fetchAll();

    if (productId) {
      setSelectedProductId(productId);
    }
  };

  const deleteProduct = async (product: Product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"?\n\nThis will remove its exam and series mappings too. Student purchase records may prevent deletion if they already reference this product.`,
    );

    if (!confirmed) return;

    setBusy(true);

    const { error } = await supabase
      .from('test_products')
      .delete()
      .eq('id', product.id);

    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (selectedProductId === product.id) {
      setSelectedProductId('');
    }

    toast.success('Test product deleted.');
    await fetchAll();
  };

  const createGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error('Enter group name.');
      return;
    }

    setBusy(true);

    const { data, error } = await supabase
      .from('exam_groups')
      .insert({
        name: groupForm.name.trim(),
        slug: groupForm.slug.trim() || slugify(groupForm.name),
        description: groupForm.description.trim() || null,
        icon_url: groupForm.icon_url.trim() || null,
        display_order: Number(groupForm.display_order) || 0,
        status: groupForm.status,
      })
      .select()
      .single();

    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Exam group created.');
    setDialog(null);
    setGroupForm({
      name: '',
      slug: '',
      description: '',
      icon_url: '',
      display_order: '0',
      status: 'published',
    });

    await fetchAll();

    if (data?.id) {
      setSelectedGroupId(data.id);
    }
  };

  const toggleGroupExam = async (exam: Exam) => {
    if (!selectedGroupId) {
      toast.error('Select an exam group first.');
      return;
    }

    const existing = groupExams.find(
      (item) =>
        item.group_id === selectedGroupId && item.exam_id === exam.id,
    );

    if (existing) {
      const { error } = await supabase
        .from('exam_group_exams')
        .delete()
        .eq('id', existing.id);

      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('exam_group_exams').insert({
        group_id: selectedGroupId,
        exam_id: exam.id,
        display_order: selectedGroupExamIds.size,
      });

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    await fetchAll();
  };

  const selectAllGroupExams = async () => {
    if (!selectedGroupId) {
      toast.error('Select an exam group first.');
      return;
    }

    const ids = filteredExams.map((exam) => exam.id);

    if (!ids.length) return;

    setSavingMappings(true);

    const rows = ids
      .filter((examId) => !selectedGroupExamIds.has(examId))
      .map((examId, index) => ({
        group_id: selectedGroupId,
        exam_id: examId,
        display_order: selectedGroupExamIds.size + index,
      }));

    if (rows.length) {
      const { error } = await supabase
        .from('exam_group_exams')
        .insert(rows);

      if (error) {
        setSavingMappings(false);
        toast.error(error.message);
        return;
      }
    }

    setSavingMappings(false);
    toast.success('Exams added to group.');
    await fetchAll();
  };

  const clearGroupExams = async () => {
    if (!selectedGroupId) return;

    const confirmed = window.confirm(
      'Remove all exams from this group?',
    );

    if (!confirmed) return;

    setSavingMappings(true);

    const { error } = await supabase
      .from('exam_group_exams')
      .delete()
      .eq('group_id', selectedGroupId);

    setSavingMappings(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Group exams cleared.');
    await fetchAll();
  };

  const toggleProductExam = async (exam: Exam) => {
    if (!selectedProductId) {
      toast.error('Select a product first.');
      return;
    }

    const existing = productExams.find(
      (item) =>
        item.product_id === selectedProductId &&
        item.exam_id === exam.id,
    );

    setSavingMappings(true);

    if (existing) {
      const { error } = await supabase
        .from('test_product_exams')
        .delete()
        .eq('id', existing.id);

      setSavingMappings(false);

      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('test_product_exams')
        .insert({
          product_id: selectedProductId,
          exam_id: exam.id,
          display_order: selectedProductExamIds.size,
        });

      setSavingMappings(false);

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    await fetchAll();
  };

  const selectAllProductExams = async () => {
    if (!selectedProductId) {
      toast.error('Select a product first.');
      return;
    }

    const ids = filteredExams.map((exam) => exam.id);

    setSavingMappings(true);

    const rows = ids
      .filter((examId) => !selectedProductExamIds.has(examId))
      .map((examId, index) => ({
        product_id: selectedProductId,
        exam_id: examId,
        display_order: selectedProductExamIds.size + index,
      }));

    if (rows.length) {
      const { error } = await supabase
        .from('test_product_exams')
        .insert(rows);

      if (error) {
        setSavingMappings(false);
        toast.error(error.message);
        return;
      }
    }

    setSavingMappings(false);
    toast.success('Exams added to Test Prime.');
    await fetchAll();
  };

  const clearProductExams = async () => {
    if (!selectedProductId) return;

    const confirmed = window.confirm(
      'Remove all exams from this product?',
    );

    if (!confirmed) return;

    setSavingMappings(true);

    const { error } = await supabase
      .from('test_product_exams')
      .delete()
      .eq('product_id', selectedProductId);

    setSavingMappings(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Product exams cleared.');
    await fetchAll();
  };

  const toggleProductSeries = async (item: Series) => {
    if (!selectedProductId) {
      toast.error('Select a product first.');
      return;
    }

    const existing = productSeries.find(
      (link) =>
        link.product_id === selectedProductId &&
        link.series_id === item.id,
    );

    setSavingMappings(true);

    if (existing) {
      const { error } = await supabase
        .from('test_product_series')
        .delete()
        .eq('id', existing.id);

      setSavingMappings(false);

      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('test_product_series')
        .insert({
          product_id: selectedProductId,
          series_id: item.id,
          display_order: selectedProductSeriesIds.size,
        });

      setSavingMappings(false);

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    await fetchAll();
  };

  const selectAllProductSeries = async () => {
    if (!selectedProductId) {
      toast.error('Select a product first.');
      return;
    }

    const ids = filteredSeries.map((item) => item.id);

    setSavingMappings(true);

    const rows = ids
      .filter((seriesId) => !selectedProductSeriesIds.has(seriesId))
      .map((seriesId, index) => ({
        product_id: selectedProductId,
        series_id: seriesId,
        display_order: selectedProductSeriesIds.size + index,
      }));

    if (rows.length) {
      const { error } = await supabase
        .from('test_product_series')
        .insert(rows);

      if (error) {
        setSavingMappings(false);
        toast.error(error.message);
        return;
      }
    }

    setSavingMappings(false);
    toast.success('Test series added to Test Prime.');
    await fetchAll();
  };

  const clearProductSeries = async () => {
    if (!selectedProductId) return;

    const confirmed = window.confirm(
      'Remove all test series from this product?',
    );

    if (!confirmed) return;

    setSavingMappings(true);

    const { error } = await supabase
      .from('test_product_series')
      .delete()
      .eq('product_id', selectedProductId);

    setSavingMappings(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Product series cleared.');
    await fetchAll();
  };

  const publishSelectedProduct = async () => {
    if (!selectedProduct) return;

    if (productExamCount === 0) {
      toast.error('Add at least one exam before publishing.');
      return;
    }

    if (productSeriesCount === 0) {
      toast.error('Add at least one test series before publishing.');
      return;
    }

    setBusy(true);

    const { error } = await supabase
      .from('test_products')
      .update({
        status: 'published',
        published_at:
          selectedProduct.published_at || new Date().toISOString(),
      })
      .eq('id', selectedProduct.id);

    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Test Prime published.');
    await fetchAll();
  };

  if (
    loading ||
    (profile?.role === 'admin' && busy && products.length === 0)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <DashboardShell role="admin">
      <div className="min-h-full bg-[#f5f7fb]">
        {/* HEADER */}
        <div className="border-b bg-white">
          <div className="px-5 py-5 lg:px-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                  <ShieldCheck className="h-4 w-4" />
                  LearnPathshala Test Products
                </div>

                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                  Test Prime Control Center
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Create one subscription that unlocks selected exams and
                  test series.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchAll}
                  disabled={busy || savingMappings}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      busy ? 'animate-spin' : ''
                    }`}
                  />
                  Refresh
                </Button>

                <Button onClick={openCreateProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Product
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 lg:p-7">
          {/* PRODUCT CARDS */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Test Products</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage Test Prime and future exam-specific passes.
                  </p>
                </div>

                <Badge variant="outline">
                  {products.length} product{products.length === 1 ? '' : 's'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {products.length === 0 ? (
                <EmptyState text="No test products yet. Create your first Test Prime product." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {products.map((product) => {
                    const examCount = productExams.filter(
                      (item) => item.product_id === product.id,
                    ).length;

                    const seriesCount = productSeries.filter(
                      (item) => item.product_id === product.id,
                    ).length;

                    const selected = selectedProductId === product.id;

                    return (
                      <div
                        key={product.id}
                        className={`rounded-2xl border p-5 transition ${
                          selected
                            ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => setSelectedProductId(product.id)}
                            className="flex min-w-0 flex-1 gap-3 text-left"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                              <Sparkles className="h-6 w-6" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-900">
                                  {product.name}
                                </h3>

                                <Badge
                                  className={
                                    product.status === 'published'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }
                                >
                                  {product.status}
                                </Badge>

                                {product.is_featured && (
                                  <Badge variant="outline">
                                    Featured
                                  </Badge>
                                )}
                              </div>

                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                {product.short_description ||
                                  'All exams. One subscription.'}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                                <span className="font-semibold text-slate-800">
                                  ₹{product.price}
                                </span>

                                {product.mrp > product.price && (
                                  <span className="line-through">
                                    ₹{product.mrp}
                                  </span>
                                )}

                                <span>
                                  {product.validity_days} days
                                </span>

                                <span>{examCount} exams</span>

                                <span>{seriesCount} series</span>
                              </div>
                            </div>
                          </button>

                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditProduct(product)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => deleteProduct(product)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={selected ? 'default' : 'outline'}
                            onClick={() =>
                              setSelectedProductId(product.id)
                            }
                          >
                            Manage Product
                          </Button>

                          {product.status !== 'published' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedProductId(product.id);
                              }}
                            >
                              <BadgeCheck className="mr-1.5 h-4 w-4" />
                              Configure & Publish
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PRODUCT MANAGEMENT */}
          {selectedProduct && (
            <>
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-6 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-100">
                        <Sparkles className="h-4 w-4" />
                        Active Product
                      </div>

                      <h2 className="mt-2 text-3xl font-bold">
                        {selectedProduct.name}
                      </h2>

                      <p className="mt-2 max-w-2xl text-sm text-sky-100">
                        {selectedProduct.description ||
                          selectedProduct.short_description ||
                          'All exams. One subscription.'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 px-5 py-4 text-right backdrop-blur">
                      <p className="text-xs text-sky-100">Price</p>
                      <p className="text-3xl font-bold">
                        ₹{selectedProduct.price}
                      </p>
                      <p className="text-xs text-sky-100">
                        {selectedProduct.validity_days} days
                      </p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Metric
                      label="Exams"
                      value={productExamCount}
                      icon={<FolderTree className="h-4 w-4" />}
                    />

                    <Metric
                      label="Test Series"
                      value={productSeriesCount}
                      icon={<BookOpen className="h-4 w-4" />}
                    />

                    <Metric
                      label="Validity"
                      value={`${selectedProduct.validity_days} days`}
                      icon={<Package className="h-4 w-4" />}
                    />

                    <Metric
                      label="Status"
                      value={selectedProduct.status}
                      icon={<BadgeCheck className="h-4 w-4" />}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button onClick={() => openEditProduct(selectedProduct)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Product
                    </Button>

                    {selectedProduct.status !== 'published' && (
                      <Button
                        onClick={publishSelectedProduct}
                        disabled={busy || savingMappings}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Publish Product
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* EXAM GROUPS */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Exam Groups</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        Create the navigation groups students will see.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setDialog('group')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Group
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  {groups.length === 0 ? (
                    <EmptyState text="No exam groups found." />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {groups.map((group) => {
                        const count = groupExams.filter(
                          (item) => item.group_id === group.id,
                        ).length;

                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() =>
                              setSelectedGroupId(
                                selectedGroupId === group.id
                                  ? ''
                                  : group.id,
                              )
                            }
                            className={`rounded-xl border p-4 text-left transition ${
                              selectedGroupId === group.id
                                ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                <Layers3 className="h-5 w-5" />
                              </div>

                              <Badge variant="outline">
                                {count} exams
                              </Badge>
                            </div>

                            <h3 className="mt-4 font-bold text-slate-900">
                              {group.name}
                            </h3>

                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {group.description || 'Exam group'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* GROUP EXAM MAPPING */}
              {selectedGroupId && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle>
                          {groups.find(
                            (group) => group.id === selectedGroupId,
                          )?.name || 'Exam Group'}
                        </CardTitle>

                        <p className="mt-1 text-sm text-slate-500">
                          Select exams that belong to this group.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={selectAllGroupExams}
                          disabled={savingMappings}
                        >
                          Select Visible
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500"
                          onClick={clearGroupExams}
                          disabled={savingMappings}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        className="pl-10"
                        placeholder="Search exams..."
                        value={examSearch}
                        onChange={(e) => setExamSearch(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      {filteredExams.map((exam) => {
                        const checked = selectedGroupExamIds.has(exam.id);

                        return (
                          <button
                            key={exam.id}
                            type="button"
                            onClick={() => toggleGroupExam(exam)}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                              checked
                                ? 'border-emerald-300 bg-emerald-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                checked
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {checked ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <FolderTree className="h-4 w-4" />
                              )}
                            </span>

                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-800">
                                {exam.name}
                              </span>
                              <span className="block truncate text-xs text-slate-400">
                                {exam.category || exam.slug}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PRODUCT EXAMS */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Exams Included in Product</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        These exams are part of {selectedProduct.name}.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectAllProductExams}
                        disabled={savingMappings}
                      >
                        Select Visible
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500"
                        onClick={clearProductExams}
                        disabled={savingMappings}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-10"
                      placeholder="Search exams to include in Test Prime..."
                      value={examSearch}
                      onChange={(e) => setExamSearch(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {filteredExams.map((exam) => {
                      const checked = selectedProductExamIds.has(exam.id);

                      return (
                        <button
                          key={exam.id}
                          type="button"
                          onClick={() => toggleProductExam(exam)}
                          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                            checked
                              ? 'border-sky-300 bg-sky-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              checked
                                ? 'bg-sky-500 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {checked ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <FolderTree className="h-4 w-4" />
                            )}
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {exam.name}
                            </span>

                            <span className="block truncate text-xs text-slate-400">
                              {exam.category || exam.slug}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {filteredExams.length === 0 && (
                    <EmptyState text="No exams found." />
                  )}
                </CardContent>
              </Card>

              {/* PRODUCT SERIES */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Test Series Included</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        Select the existing test series that Test Prime
                        unlocks.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectAllProductSeries}
                        disabled={savingMappings}
                      >
                        Select Visible
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500"
                        onClick={clearProductSeries}
                        disabled={savingMappings}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-10"
                      placeholder="Search test series..."
                      value={seriesSearch}
                      onChange={(e) => setSeriesSearch(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredSeries.map((item) => {
                      const checked = selectedProductSeriesIds.has(item.id);

                      const exam = exams.find(
                        (examItem) => examItem.id === item.exam_id,
                      );

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleProductSeries(item)}
                          className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                            checked
                              ? 'border-sky-300 bg-sky-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              checked
                                ? 'bg-sky-500 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {checked ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <BookOpen className="h-5 w-5" />
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-semibold text-slate-900">
                                {item.title}
                              </span>

                              {item.is_free && (
                                <Badge className="bg-emerald-50 text-emerald-700">
                                  FREE
                                </Badge>
                              )}

                              {item.status === 'published' && (
                                <Badge variant="outline">
                                  Published
                                </Badge>
                              )}
                            </span>

                            <span className="mt-1 block text-xs text-slate-500">
                              {exam?.name || 'All exams'} •{' '}
                              {item.description || 'Mock test series'}
                            </span>
                          </span>

                          <span className="hidden text-right sm:block">
                            <span className="block text-sm font-bold text-slate-800">
                              {item.is_free
                                ? 'Free'
                                : `₹${item.price}`}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.slug}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {filteredSeries.length === 0 && (
                    <EmptyState text="No test series found." />
                  )}
                </CardContent>
              </Card>

              {/* PUBLISH CHECKLIST */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Publish Checklist</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Checklist
                      done={Boolean(selectedProduct.name)}
                      title="Product created"
                    />

                    <Checklist
                      done={productExamCount > 0}
                      title="At least one exam selected"
                    />

                    <Checklist
                      done={productSeriesCount > 0}
                      title="At least one series selected"
                    />
                  </div>

                  <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                    <strong>How access works:</strong> after a successful
                    Test Prime payment, the student's active subscription
                    will be checked against this product. Every series
                    connected here can then be unlocked.
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* PRODUCT DIALOG */}
      <Dialog
        open={dialog === 'product'}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? 'Edit Test Product'
                : 'Create Test Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Product Name *"
                  value={productForm.name}
                  onChange={(value) =>
                    setProductForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                  placeholder="LearnPathshala Test Prime"
                />
              </div>

              <Field
                label="Slug"
                value={productForm.slug}
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    slug: value,
                  }))
                }
                placeholder="test-prime"
              />

              <Field
                label="Product Type"
                type="select"
                value={productForm.product_type}
                options={PRODUCT_TYPES}
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    product_type: value,
                  }))
                }
              />

              <Field
                label="Price"
                type="number"
                value={productForm.price}
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    price: value,
                  }))
                }
              />

              <Field
                label="MRP"
                type="number"
                value={productForm.mrp}
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    mrp: value,
                  }))
                }
              />

              <Field
                label="Validity (Days)"
                type="number"
                value={productForm.validity_days}
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    validity_days: value,
                  }))
                }
              />

              <Field
                label="Display Order"
                type="number"
                value={productForm.display_order}
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    display_order: value,
                  }))
                }
              />

              <Field
                label="Status"
                type="select"
                value={productForm.status}
                options={PRODUCT_STATUSES}
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    status: value,
                  }))
                }
              />

              <div className="sm:col-span-2 grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={productForm.discount_active}
                    onChange={(e) =>
                      setProductForm((current) => ({
                        ...current,
                        discount_active: e.target.checked,
                      }))
                    }
                  />
                  Discount Active
                </label>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={productForm.is_featured}
                    onChange={(e) =>
                      setProductForm((current) => ({
                        ...current,
                        is_featured: e.target.checked,
                      }))
                    }
                  />
                  Featured Product
                </label>
              </div>

              {productForm.discount_active && (
                <Field
                  label="Discount Expiry"
                  type="datetime-local"
                  value={productForm.discount_expires_at}
                  onChange={(value) =>
                    setProductForm((current) => ({
                      ...current,
                      discount_expires_at: value,
                    }))
                  }
                />
              )}

              <Field
                label="Image URL"
                value={productForm.image_url}
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    image_url: value,
                  }))
                }
                placeholder="https://..."
              />

              <Field
                label="Banner URL"
                value={productForm.banner_url}
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    banner_url: value,
                  }))
                }
                placeholder="https://..."
              />

              <div className="sm:col-span-2">
                <Label>Short Description</Label>
                <Input
                  className="mt-2"
                  value={productForm.short_description}
                  onChange={(e) =>
                    setProductForm((current) => ({
                      ...current,
                      short_description: e.target.value,
                    }))
                  }
                  placeholder="All exams. One subscription."
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  className="mt-2"
                  rows={5}
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((current) => ({
                      ...current,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe everything included in the subscription..."
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Features</Label>

                <div className="mt-2 space-y-2">
                  {productForm.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) =>
                          setProductForm((current) => {
                            const features = [...current.features];
                            features[index] = e.target.value;
                            return { ...current, features };
                          })
                        }
                        placeholder="Feature"
                      />

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() =>
                          setProductForm((current) => ({
                            ...current,
                            features: current.features.filter(
                              (_, featureIndex) =>
                                featureIndex !== index,
                            ),
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setProductForm((current) => ({
                        ...current,
                        features: [...current.features, ''],
                      }))
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feature
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>

            <Button onClick={saveProduct} disabled={busy}>
              {busy && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GROUP DIALOG */}
      <Dialog
        open={dialog === 'group'}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Exam Group</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Field
              label="Group Name *"
              value={groupForm.name}
              onChange={(value) =>
                setGroupForm((current) => ({
                  ...current,
                  name: value,
                }))
              }
              placeholder="Banking & Insurance Exams"
            />

            <Field
              label="Slug"
              value={groupForm.slug}
              onChange={(value) =>
                setGroupForm((current) => ({
                  ...current,
                  slug: value,
                }))
              }
              placeholder="banking-insurance"
            />

            <Field
              label="Icon URL"
              value={groupForm.icon_url}
              onChange={(value) =>
                setGroupForm((current) => ({
                  ...current,
                  icon_url: value,
                }))
              }
              placeholder="https://..."
            />

            <Field
              label="Display Order"
              type="number"
              value={groupForm.display_order}
              onChange={(value) =>
                setGroupForm((current) => ({
                  ...current,
                  display_order: value,
                }))
              }
            />

            <Field
              label="Status"
              type="select"
              value={groupForm.status}
              options={[
                ['draft', 'Draft'],
                ['published', 'Published'],
                ['unpublished', 'Unpublished'],
              ]}
              onChange={(value) =>
                setGroupForm((current) => ({
                  ...current,
                  status: value,
                }))
              }
            />

            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-2"
                rows={4}
                value={groupForm.description}
                onChange={(e) =>
                  setGroupForm((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
                placeholder="Banking, insurance and financial sector exams."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>

            <Button onClick={createGroup} disabled={busy}>
              {busy && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  options?: string[][];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
        >
          {(options || []).map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
      ) : (
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Checklist({
  done,
  title,
}: {
  done: boolean;
  title: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-4 ${
        done
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          done
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-200 text-slate-400'
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : '—'}
      </span>

      <span
        className={`text-sm font-semibold ${
          done ? 'text-emerald-800' : 'text-slate-600'
        }`}
      >
        {title}
      </span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <Package className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm text-slate-500">{text}</p>
    </div>
  );
}
