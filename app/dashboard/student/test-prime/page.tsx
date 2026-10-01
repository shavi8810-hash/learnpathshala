'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

/* =========================================================
   TYPES
========================================================= */

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
  published_at: string | null;
};

type Exam = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  icon_url?: string | null;
};

type ProductExam = {
  id: string;
  product_id: string;
  exam_id: string;
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

type ProductSeries = {
  id: string;
  product_id: string;
  series_id: string;
  display_order: number;
};

type SeriesTest = {
  id: string;
  series_id: string;
  test_id: string;
  display_order: number;
};

type MockTest = {
  id: string;
  title: string;
  status: string;
};

/* =========================================================
   HELPERS
========================================================= */

const formatPrice = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

const discountPercent = (price: number, mrp: number) => {
  if (!mrp || mrp <= price) return 0;

  return Math.round(((mrp - price) / mrp) * 100);
};

/* =========================================================
   PAGE
========================================================= */

export default function StudentTestPrimePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [productExams, setProductExams] = useState<ProductExam[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [productSeries, setProductSeries] = useState<ProductSeries[]>([]);
  const [seriesTests, setSeriesTests] = useState<SeriesTest[]>([]);
  const [tests, setTests] = useState<MockTest[]>([]);

  const [search, setSearch] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('all');

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) {
      router.push('/login');
    }
  }, [loading, user, profile, router]);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    if (profile?.role === 'student' && user) {
      loadPage();
    }
  }, [profile, user]);

  const loadPage = async () => {
    setPageLoading(true);

    try {
      const [
        productsResult,
        examsResult,
        productExamsResult,
        seriesResult,
        productSeriesResult,
        seriesTestsResult,
        testsResult,
      ] = await Promise.all([
        supabase
          .from('test_products')
          .select('*')
          .eq('status', 'published')
          .order('display_order')
          .order('created_at', { ascending: false }),

        supabase
          .from('mock_exams')
          .select('*')
          .eq('status', 'published')
          .order('display_order')
          .order('name'),

        supabase
          .from('test_product_exams')
          .select('id,product_id,exam_id,display_order')
          .order('display_order'),

        supabase
          .from('mock_test_series')
          .select('*')
          .eq('status', 'published')
          .order('display_order')
          .order('created_at', { ascending: false }),

        supabase
          .from('test_product_series')
          .select('id,product_id,series_id,display_order')
          .order('display_order'),

        supabase
          .from('mock_test_series_tests')
          .select('id,series_id,test_id,display_order')
          .order('display_order'),

        supabase
          .from('mock_tests')
          .select('id,title,status')
          .eq('status', 'published'),
      ]);

      if (productsResult.error) {
        console.error(productsResult.error);
      }

      if (examsResult.error) {
        console.error(examsResult.error);
      }

      if (productExamsResult.error) {
        console.error(productExamsResult.error);
      }

      if (seriesResult.error) {
        console.error(seriesResult.error);
      }

      if (productSeriesResult.error) {
        console.error(productSeriesResult.error);
      }

      if (seriesTestsResult.error) {
        console.error(seriesTestsResult.error);
      }

      if (testsResult.error) {
        console.error(testsResult.error);
      }

      const loadedProducts = (productsResult.data || []) as Product[];

      setProducts(loadedProducts);
      setExams((examsResult.data || []) as Exam[]);
      setProductExams(
        (productExamsResult.data || []) as ProductExam[],
      );
      setSeries((seriesResult.data || []) as Series[]);
      setProductSeries(
        (productSeriesResult.data || []) as ProductSeries[],
      );
      setSeriesTests(
        (seriesTestsResult.data || []) as SeriesTest[],
      );
      setTests((testsResult.data || []) as MockTest[]);

      if (loadedProducts.length > 0) {
        setSelectedProductId(loadedProducts[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Could not load Test Prime.');
    } finally {
      setPageLoading(false);
    }
  };

  /* =========================================================
     CURRENT PRODUCT
  ========================================================= */

  const selectedProduct = useMemo(() => {
    if (!products.length) return null;

    return (
      products.find((item) => item.id === selectedProductId) ||
      products[0]
    );
  }, [products, selectedProductId]);

  /* =========================================================
     PRODUCT EXAMS
  ========================================================= */

  const includedExamIds = useMemo(() => {
    if (!selectedProduct) return new Set<string>();

    return new Set(
      productExams
        .filter(
          (item) => item.product_id === selectedProduct.id,
        )
        .map((item) => item.exam_id),
    );
  }, [productExams, selectedProduct]);

  const includedExams = useMemo(() => {
    return exams.filter((exam) =>
      includedExamIds.has(exam.id),
    );
  }, [exams, includedExamIds]);

  /* =========================================================
     PRODUCT SERIES
  ========================================================= */

  const includedSeriesIds = useMemo(() => {
    if (!selectedProduct) return new Set<string>();

    return new Set(
      productSeries
        .filter(
          (item) => item.product_id === selectedProduct.id,
        )
        .map((item) => item.series_id),
    );
  }, [productSeries, selectedProduct]);

  const includedSeries = useMemo(() => {
    return series.filter((item) =>
      includedSeriesIds.has(item.id),
    );
  }, [series, includedSeriesIds]);

  /* =========================================================
     SERIES → TEST COUNT
  ========================================================= */

  const testCountBySeries = useMemo(() => {
    const result = new Map<string, number>();

    for (const item of seriesTests) {
      const test = tests.find(
        (testItem) => testItem.id === item.test_id,
      );

      if (!test) continue;

      result.set(
        item.series_id,
        (result.get(item.series_id) || 0) + 1,
      );
    }

    return result;
  }, [seriesTests, tests]);

  /* =========================================================
     FILTER SERIES
  ========================================================= */

  const filteredSeries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return includedSeries.filter((item) => {
      const exam = exams.find(
        (examItem) => examItem.id === item.exam_id,
      );

      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query) ||
        (exam?.name || '').toLowerCase().includes(query);

      const matchesExam =
        selectedExam === 'all' ||
        item.exam_id === selectedExam;

      return matchesSearch && matchesExam;
    });
  }, [
    includedSeries,
    exams,
    search,
    selectedExam,
  ]);

  /* =========================================================
     STATS
  ========================================================= */

  const totalTests = useMemo(() => {
    return includedSeries.reduce(
      (total, item) =>
        total + (testCountBySeries.get(item.id) || 0),
      0,
    );
  }, [includedSeries, testCountBySeries]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading ||
    pageLoading ||
    !user ||
    profile?.role !== 'student'
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  /* =========================================================
     EMPTY
  ========================================================= */

  if (!selectedProduct) {
    return (
      <DashboardShell role="student">
        <div className="mx-auto max-w-5xl px-5 py-16 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-sky-400" />

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Test Prime is coming soon
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            There is currently no published Test Prime product.
          </p>

          <Link
            href="/dashboard/student/mock-tests"
            className="mt-6 inline-block"
          >
            <Button>
              Explore Mock Tests
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const discount = discountPercent(
    selectedProduct.price,
    selectedProduct.mrp,
  );

  /* =========================================================
     UI
  ========================================================= */

  return (
    <DashboardShell role="student">
      <div className="min-h-full bg-[#f5f7fb]">
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
            <div className="mb-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                <Sparkles className="h-4 w-4" />
                LearnPathshala Test Prime
              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                All Exams. One Subscription.
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Practice competitive exams with mock tests,
                previous-year questions, detailed solutions and
                performance analysis.
              </p>
            </div>

            {/* PRODUCT SELECTOR */}

            {products.length > 1 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() =>
                      setSelectedProductId(product.id)
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selectedProduct.id === product.id
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {product.name}
                  </button>
                ))}
              </div>
            )}

            {/* HERO CARD */}

            <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white shadow-xl">
              <div className="grid gap-8 p-7 lg:grid-cols-[1fr_380px] lg:p-10">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                    <Zap className="h-3.5 w-3.5" />
                    TEST PRIME
                  </div>

                  <h2 className="mt-5 max-w-2xl text-3xl font-bold lg:text-4xl">
                    {selectedProduct.name}
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
                    {selectedProduct.short_description ||
                      'One subscription for multiple competitive exam test series.'}
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Feature
                      icon={<Trophy className="h-4 w-4" />}
                      text={`${totalTests}+ Mock Tests`}
                    />

                    <Feature
                      icon={<BookOpen className="h-4 w-4" />}
                      text={`${includedExams.length} Exams`}
                    />

                    <Feature
                      icon={<Clock3 className="h-4 w-4" />}
                      text={`${selectedProduct.validity_days} Days`}
                    />
                  </div>
                </div>

                {/* PRICE */}

                <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-lg">
                  <div className="text-sm font-semibold text-slate-500">
                    Test Prime
                  </div>

                  <div className="mt-4 flex items-end gap-3">
                    <span className="text-4xl font-bold">
                      {formatPrice(selectedProduct.price)}
                    </span>

                    {selectedProduct.mrp >
                      selectedProduct.price && (
                      <span className="pb-1 text-sm text-slate-400 line-through">
                        {formatPrice(selectedProduct.mrp)}
                      </span>
                    )}
                  </div>

                  {discount > 0 && (
                    <div className="mt-2 text-sm font-semibold text-emerald-600">
                      {discount}% OFF
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Clock3 className="h-4 w-4" />
                    Valid for {selectedProduct.validity_days}{' '}
                    days
                  </div>

                  <Link
                    href={`/dashboard/student/test-prime/checkout?product=${selectedProduct.id}`}
                    className="mt-6 block"
                  >
                    <Button className="h-12 w-full bg-sky-600 text-base font-bold text-white hover:bg-sky-700">
                      Buy Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>

                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <ShieldCheck className="h-4 w-4" />
                    Secure payment
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FEATURES
        ===================================================== */}

        <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(selectedProduct.features || [
              'Multiple Competitive Exams',
              'Mock Tests',
              'Detailed Solutions',
              'Performance Analysis',
            ]).slice(0, 4).map((feature, index) => (
              <Card
                key={`${feature}-${index}`}
                className="border-slate-200 shadow-sm"
              >
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Check className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-semibold text-slate-700">
                    {feature}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* =====================================================
            EXAMS
        ===================================================== */}

        <section className="mx-auto max-w-7xl px-5 pb-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Exams Included
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your Test Prime subscription covers these exams.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {includedExams.length} Exams
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedExam('all')}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selectedExam === 'all'
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                All Exams
              </button>

              {includedExams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedExam(exam.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selectedExam === exam.id
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {exam.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            SERIES
        ===================================================== */}

        <section className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Test Series
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose an exam and start practicing.
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search test series..."
                className="h-10 pl-10"
              />
            </div>
          </div>

          {filteredSeries.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white">
              <CardContent className="py-14 text-center">
                <Search className="mx-auto h-10 w-10 text-slate-300" />

                <h3 className="mt-4 font-semibold text-slate-800">
                  No test series found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try another search or exam.
                </p>

                {(search || selectedExam !== 'all') && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearch('');
                      setSelectedExam('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredSeries.map((item) => {
                const exam = exams.find(
                  (examItem) => examItem.id === item.exam_id,
                );

                const testCount =
                  testCountBySeries.get(item.id) || 0;

                return (
                  <Card
                    key={item.id}
                    className="group overflow-hidden border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* IMAGE */}

                    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-sky-50 to-indigo-50">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-12 w-12 text-sky-300" />
                        </div>
                      )}

                      <div className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {exam?.name || 'Competitive Exam'}
                      </div>

                      {item.is_free && (
                        <div className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                          FREE
                        </div>
                      )}
                    </div>

                    <CardContent className="p-5">
                      <h3 className="line-clamp-2 min-h-[48px] text-lg font-bold text-slate-900">
                        {item.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 min-h-[40px] text-sm text-slate-500">
                        {item.description ||
                          'Complete mock test series for competitive exam preparation.'}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {testCount} Tests
                        </span>

                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          English
                        </span>

                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Hindi
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div>
                          <div className="text-sm font-bold text-emerald-600">
                            Included
                          </div>

                          <div className="text-xs text-slate-400">
                            With Test Prime
                          </div>
                        </div>

                        <Link
                          href={`/dashboard/student/mock-tests/series/${item.slug}`}
                        >
                          <Button
                            variant="outline"
                            className="group/btn"
                          >
                            View Series
                            <ChevronRight className="ml-1 h-4 w-4 transition group-hover/btn:translate-x-0.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================
            BOTTOM CTA
        ===================================================== */}

        <section className="border-t bg-white">
          <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
            <div className="rounded-2xl bg-slate-900 p-7 text-white lg:flex lg:items-center lg:justify-between lg:p-9">
              <div>
                <h2 className="text-2xl font-bold">
                  Ready to start your preparation?
                </h2>

                <p className="mt-2 text-sm text-slate-300">
                  Get access to all the test series included in
                  {` ${selectedProduct.name}`}.
                </p>
              </div>

              <Link
                href={`/dashboard/student/test-prime/checkout?product=${selectedProduct.id}`}
                className="mt-5 block lg:mt-0"
              >
                <Button className="h-11 bg-white px-6 font-bold text-slate-900 hover:bg-slate-100">
                  Get Test Prime
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

/* =========================================================
   FEATURE COMPONENT
========================================================= */

function Feature({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm font-medium backdrop-blur">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
        {icon}
      </span>

      <span>{text}</span>
    </div>
  );
}