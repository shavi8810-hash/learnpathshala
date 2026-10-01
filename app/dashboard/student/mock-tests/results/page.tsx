'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Award,
  TrendingUp,
  Trophy,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Target,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';

type Attempt = {
  id: string;
  test_id: string;
  attempt_number: number;
  score: number;
  total_points: number;
  percentage: number;
  submitted_at: string | null;
  mock_tests?: {
    title: string;
    exam_name: string;
    category: string;
  } | null;
};

type Ranking = {
  id: string;
  name: string;
  bestPercent: number;
  totalScore: number;
  attempts: number;
};

export default function StudentMockTestResultsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

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
      const { data: attemptData, error: attemptError } = await supabase
        .from('mock_test_attempts')
        .select('id, test_id, attempt_number, score, total_points, percentage, submitted_at, mock_tests(title, exam_name, category)')
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (attemptError) throw attemptError;

      setAttempts((attemptData || []) as Attempt[]);

      const { data: allAttempts, error: rankingError } = await supabase
        .from('mock_test_attempts')
        .select(
          'student_id, percentage, score, total_points, profiles!mock_test_attempts_student_id_fkey(full_name)',
        )
        .not('submitted_at', 'is', null)
        .order('percentage', { ascending: false });

      if (rankingError) {
        console.error('Ranking fetch error:', rankingError);
        setRankings([]);
      } else {
        const studentMap: Record<string, Ranking> = {};

        (allAttempts || []).forEach((a: any) => {
          const pct = Number(a.percentage || 0);

          if (!studentMap[a.student_id]) {
            studentMap[a.student_id] = {
              id: a.student_id,
              name: a.profiles?.full_name || 'Unknown',
              bestPercent: pct,
              totalScore: Number(a.score || 0),
              attempts: 1,
            };
          } else {
            studentMap[a.student_id].bestPercent = Math.max(
              studentMap[a.student_id].bestPercent,
              pct,
            );
            studentMap[a.student_id].totalScore += Number(a.score || 0);
            studentMap[a.student_id].attempts += 1;
          }
        });

        const ranked = Object.values(studentMap)
          .sort(
            (a, b) =>
              b.bestPercent - a.bestPercent ||
              b.totalScore - a.totalScore ||
              a.name.localeCompare(b.name),
          )
          .slice(0, 20);

        setRankings(ranked);
      }
    } catch (error) {
      console.error('Results fetch error:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const myRankIndex = useMemo(
    () => rankings.findIndex((r) => r.id === user?.id),
    [rankings, user?.id],
  );

  const myBest = attempts.length
    ? Math.max(...attempts.map((a) => Number(a.percentage || 0)))
    : 0;

  const avgScore = attempts.length
    ? Math.round(
        attempts.reduce((sum, a) => sum + Number(a.percentage || 0), 0) /
          attempts.length,
      )
    : 0;

  const passedCount = attempts.filter((a) => Number(a.percentage || 0) >= 70).length;

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <DashboardShell role="student">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href="/dashboard/student/mock-tests">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Mock Tests
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">My Performance & Rankings</h1>
          <p className="text-sm text-slate-500">
            Track your attempts, scores and leaderboard position.
          </p>
        </div>

        <Link href="/dashboard/student/mock-tests">
          <Button className="bg-sky-500 text-white hover:bg-sky-600">
            Take Another Test
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Tests Taken</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{attempts.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
                <TrendingUp className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Best Score</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{myBest}%</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Average</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{avgScore}%</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Your Rank</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {myRankIndex >= 0 ? `#${myRankIndex + 1}` : '-'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <Trophy className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <span className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Passed: <strong>{passedCount}</strong>
          </span>
          <span className="flex items-center gap-2 text-slate-600">
            <Clock className="h-4 w-4 text-sky-500" />
            Attempts: <strong>{attempts.length}</strong>
          </span>
          <span className="text-slate-500">
            Leaderboard shows the top 20 students by best percentage.
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-sky-500" />
              Recent Attempts
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {attempts.length === 0 ? (
                <div className="py-8 text-center">
                  <Award className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">
                    No attempts yet. Take a mock test to see your results here.
                  </p>
                </div>
              ) : (
                attempts.map((a) => {
                  const pct = Number(a.percentage || 0);
                  const passed = pct >= 70;

                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          passed ? 'bg-emerald-100' : 'bg-amber-100'
                        }`}
                      >
                        <Award
                          className={`h-5 w-5 ${
                            passed ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {a.mock_tests?.title || 'Test'}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {a.mock_tests?.exam_name || 'General'} ·{' '}
                          {a.mock_tests?.category || 'General'}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          Attempt {a.attempt_number}
                          {a.submitted_at
                            ? ` · ${new Date(a.submitted_at).toLocaleDateString()}`
                            : ''}
                        </div>
                      </div>

                      <Badge
                        className={
                          passed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }
                      >
                        {pct}%
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {rankings.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No rankings yet. Be the first to take a test!
                </p>
              ) : (
                rankings.map((r, i) => {
                  const isMe = r.id === user?.id;
                  const medal =
                    i === 0
                      ? 'bg-amber-100 text-amber-700'
                      : i === 1
                        ? 'bg-slate-100 text-slate-600'
                        : i === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-50 text-slate-500';

                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 rounded-xl p-3 ${
                        isMe
                          ? 'bg-sky-50 ring-1 ring-sky-200'
                          : 'border border-slate-100'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${medal}`}
                      >
                        {i + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {r.name}{' '}
                          {isMe && (
                            <span className="text-xs font-medium text-sky-600">(You)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.attempts} attempt{r.attempts === 1 ? '' : 's'} · {r.totalScore} pts
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={
                          r.bestPercent >= 70
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }
                      >
                        {r.bestPercent}%
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
