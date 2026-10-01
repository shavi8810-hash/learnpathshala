'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  ClipboardCheck,
  Clock,
  Award,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  BookOpen,
  IndianRupee,
  BarChart3,
  Sparkles,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';

type MockTest = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  exam_name: string;
  category: string;
  is_free: boolean;
  price: number;
  attempt_limit: number;
  time_limit_minutes: number;
  total_marks?: number | null;
};

type Attempt = {
  id: string;
  test_id: string;
  percentage: number | null;
  attempt_number: number | null;
  submitted_at: string | null;
};

type SeriesMap = Record<string, string>;
type CountMap = Record<string, number>;

export default function StudentMockTestsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [tests, setTests] = useState<MockTest[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [seriesMap, setSeriesMap] = useState<SeriesMap>({});
  const [questionCounts, setQuestionCounts] = useState<CountMap>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [freeOnly, setFreeOnly] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) {
      router.push('/login');
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (profile?.role === 'student' && user) {
      fetchData();
    }
  }, [profile, user]);

  const fetchData = async () => {
    if (!user) return;

    setDataLoading(true);

    try {
      const [
        { data: testData, error: testError },
        { data: attemptData, error: attemptError },
        { data: purchaseData },
      ] = await Promise.all([
        supabase
          .from('mock_tests')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('mock_test_attempts')
          .select('id, test_id, percentage, attempt_number, submitted_at')
          .eq('student_id', user.id)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('mock_test_purchases')
          .select('test_id, payment_status')
          .eq('student_id', user.id)
          .eq('payment_status', 'success'),
      ]);

      if (testError) throw testError;
      if (attemptError) throw attemptError;

      const loadedTests = (testData || []) as MockTest[];
      setTests(loadedTests);

      const attemptMap: Record<string, Attempt[]> = {};
      (attemptData || []).forEach((a: Attempt) => {
        if (!attemptMap[a.test_id]) attemptMap[a.test_id] = [];
        attemptMap[a.test_id].push(a);
      });
      setAttempts(attemptMap);

      setPurchased(new Set((purchaseData || []).map((p: any) => p.test_id)));

      if (loadedTests.length > 0) {
        const testIds = loadedTests.map((t) => t.id);

        const [{ data: questionData }, { data: relationData }] = await Promise.all([
          supabase
            .from('mock_test_questions')
            .select('id, test_id')
            .in('test_id', testIds),
          supabase
            .from('mock_test_series_tests')
            .select('test_id, series_id')
            .in('test_id', testIds),
        ]);

        const counts: CountMap = {};
        (questionData || []).forEach((q: any) => {
          counts[q.test_id] = (counts[q.test_id] || 0) + 1;
        });
        setQuestionCounts(counts);

        const seriesIds = Array.from(
          new Set((relationData || []).map((r: any) => r.series_id).filter(Boolean)),
        );

        if (seriesIds.length > 0) {
          const { data: seriesData } = await supabase
            .from('mock_test_series')
            .select('id, title')
            .in('id', seriesIds);

          const map: SeriesMap = {};
          const titleById: Record<string, string> = {};
          (seriesData || []).forEach((s: any) => {
            titleById[s.id] = s.title;
          });

          (relationData || []).forEach((r: any) => {
            if (r.test_id && titleById[r.series_id]) {
              map[r.test_id] = titleById[r.series_id];
            }
          });

          setSeriesMap(map);
        } else {
          setSeriesMap({});
        }
      } else {
        setQuestionCounts({});
        setSeriesMap({});
      }
    } catch (error) {
      console.error('Mock tests fetch error:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const exams = useMemo(
    () => Array.from(new Set(tests.map((t) => t.exam_name).filter(Boolean))).sort(),
    [tests],
  );

  const categories = useMemo(
    () => Array.from(new Set(tests.map((t) => t.category).filter(Boolean))).sort(),
    [tests],
  );

  const filteredTests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tests.filter((t) => {
      const matchesSearch =
        !query ||
        t.title?.toLowerCase().includes(query) ||
        t.exam_name?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        seriesMap[t.id]?.toLowerCase().includes(query);

      const matchesExam = examFilter === 'all' || t.exam_name === examFilter;
      const matchesCategory =
        categoryFilter === 'all' || t.category === categoryFilter;
      const matchesFree = !freeOnly || t.is_free;

      return matchesSearch && matchesExam && matchesCategory && matchesFree;
    });
  }, [tests, search, examFilter, categoryFilter, freeOnly, seriesMap]);

  const totalTaken = Object.values(attempts).reduce((sum, list) => sum + list.length, 0);
  const freeCount = tests.filter((t) => t.is_free).length;
  const paidCount = tests.filter((t) => !t.is_free).length;

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <DashboardShell role="student">
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
              <Sparkles className="h-4 w-4" />
              LearnPathshala Mock Tests
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Mock Tests</h1>
            <p className="mt-1 text-sm text-slate-500">
              Practice with exam-focused tests and track your performance.
            </p>
          </div>

          <Link href="/dashboard/student/mock-tests/results">
            <Button variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              My Results
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Available</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{tests.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Free Tests</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{freeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Paid Tests</p>
            <p className="mt-1 text-2xl font-bold text-sky-600">{paidCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Attempts</p>
            <p className="mt-1 text-2xl font-bold text-violet-600">{totalTaken}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search test, exam or series..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
            >
              <option value="all">All Exams</option>
              {exams.map((exam) => (
                <option key={exam} value={exam}>{exam}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <Button
              type="button"
              variant={freeOnly ? 'default' : 'outline'}
              onClick={() => setFreeOnly((v) => !v)}
              className={freeOnly ? 'bg-sky-500 text-white hover:bg-sky-600' : ''}
            >
              <Filter className="mr-2 h-4 w-4" />
              Free Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {filteredTests.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 font-medium text-slate-700">No mock tests found</p>
            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredTests.map((t) => {
            const testAttempts = attempts[t.id] || [];
            const hasTaken = testAttempts.length > 0;
            const attemptsLeft = Math.max(0, Number(t.attempt_limit) - testAttempts.length);
            const bestScore = hasTaken
              ? Math.max(...testAttempts.map((a) => Number(a.percentage || 0)))
              : 0;
            const hasAccess = t.is_free || purchased.has(t.id);

            return (
              <Card
                key={t.id}
                className="overflow-hidden border-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100">
                        <ClipboardCheck className="h-5 w-5 text-sky-600" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-slate-900">{t.title}</h3>
                        {seriesMap[t.id] && (
                          <p className="mt-0.5 truncate text-xs font-medium text-sky-600">
                            {seriesMap[t.id]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {hasTaken && (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Taken
                        </Badge>
                      )}

                      <Badge variant="outline" className={t.is_free ? 'border-emerald-200 text-emerald-700' : 'border-sky-200 text-sky-700'}>
                        {t.is_free ? 'Free' : (
                          <span className="flex items-center">
                            <IndianRupee className="mr-0.5 h-3 w-3" />
                            {Number(t.price || 0).toFixed(0)}
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">
                    {t.description || 'Practice this exam-focused mock test and improve your preparation.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline">{t.exam_name || 'General'}</Badge>
                    <Badge variant="outline">{t.category || 'General'}</Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500">Questions</p>
                      <p className="mt-1 font-semibold text-slate-900">{questionCounts[t.id] || 0}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500">Marks</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {t.total_marks ?? questionCounts[t.id] ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500">Duration</p>
                      <p className="mt-1 flex items-center gap-1 font-semibold text-slate-900">
                        <Clock className="h-3.5 w-3.5" />
                        {t.time_limit_minutes}m
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500">Attempts</p>
                      <p className="mt-1 font-semibold text-slate-900">{t.attempt_limit}</p>
                    </div>
                  </div>

                  {hasTaken && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-slate-700">Best: {bestScore}%</span>
                      <span className="ml-auto text-xs text-slate-500">
                        {testAttempts.length}/{t.attempt_limit} used
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <Link href={`/dashboard/student/mock-tests/${t.id}`} className="flex-1">
                      <Button
                        className={`w-full ${
                          hasTaken
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-sky-500 text-white hover:bg-sky-600'
                        }`}
                        disabled={attemptsLeft <= 0}
                      >
                        {attemptsLeft <= 0
                          ? 'No Attempts Left'
                          : hasTaken
                            ? 'Retake Test'
                            : hasAccess
                              ? 'Start Test'
                              : 'View Test'}
                        {attemptsLeft > 0 && <ChevronRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </Link>

                    <Link href={`/dashboard/student/mock-tests/${t.id}`}>
                      <Button variant="outline" size="icon" title="View test">
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Link href="/dashboard/student/mock-tests/results">
          <Button variant="outline" className="w-full sm:w-auto">
            <BarChart3 className="mr-2 h-4 w-4" />
            View All Results & Rankings
          </Button>
        </Link>
      </div>
    </DashboardShell>
  );
}
