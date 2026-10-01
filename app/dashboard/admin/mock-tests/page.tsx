'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Check,
  ChevronRight,
  Edit3,
  FileQuestion,
  FolderTree,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const IMAGE_BUCKET = 'mock-test-images';
const VIDEO_BUCKET = 'mock-test-solutions';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const TEST_TYPES = [
  ['full_length', 'Full Length Mock'],
  ['sectional', 'Section Test'],
  ['chapter', 'Chapter Test'],
  ['topic', 'Topic Test'],
  ['previous_year', 'Previous Year Paper'],
  ['memory_based', 'Memory Based'],
  ['practice', 'Practice Test'],
  ['daily_quiz', 'Daily Quiz'],
] as const;

const LANGUAGES = [
  ['english', 'English'],
  ['hindi', 'Hindi'],
  ['bilingual', 'Bilingual'],
  ['multilingual', 'Multilingual'],
] as const;

const DIFFICULTIES = [
  ['easy', 'Easy'],
  ['medium', 'Medium'],
  ['hard', 'Hard'],
  ['mixed', 'Mixed'],
] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  published: 'bg-sky-50 text-sky-700 border-sky-200',
  unpublished: 'bg-slate-100 text-slate-600 border-slate-200',
};

const labelStatus = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Exam = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  status: string;
  display_order: number;
};

type Category = {
  id: string;
  exam_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  status: string;
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

type Test = {
  id: string;
  title: string;
  description: string | null;
  exam_name: string;
  category: string;
  exam_id: string | null;
  category_id: string | null;
  test_type: string;
  difficulty: string;
  total_questions: number;
  total_marks: number;
  negative_marks: number;
  language: string;
  instructions: string | null;
  time_limit_minutes: number;
  attempt_limit: number;
  is_free: boolean;
  price: number;
  status: string;
  is_featured: boolean;
  short_description: string | null;
  display_order: number;
  published_at?: string | null;
};

type SeriesTestLink = {
  id: string;
  series_id: string;
  test_id: string;
  display_order: number;
};

type Section = {
  id: string;
  test_id: string;
  name: string;
  description: string | null;
  question_count: number;
  marks: number;
  time_limit_minutes: number | null;
  display_order: number;
};

type Question = {
  id: string;
  test_id: string;
  question_order: number;
  question_text: string;
  options: string[];
  explanation: string | null;
  image_url: string | null;
  points: number;
  solution_video_url: string | null;
  section_id: string | null;
  question_bank_id: string | null;
  difficulty: string | null;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
  language: string | null;
  is_previous_year: boolean;
  exam_year: number | null;
  exam_shift: string | null;
};

type BankQuestion = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number | null;
  explanation: string | null;
  image_url: string | null;
  solution_video_url: string | null;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
  difficulty: string;
  language: string | null;
  is_previous_year: boolean;
  exam_name: string | null;
  exam_year: number | null;
  exam_shift: string | null;
};

type AnswerKey = {
  question_id: string;
  correct_answer: number;
};

type DialogType =
  | 'exam'
  | 'category'
  | 'series'
  | 'test'
  | 'section'
  | 'question'
  | 'bank'
  | null;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const asNumber = (value: string, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const fileExtension = (file: File) =>
  file.name.split('.').pop()?.toLowerCase() || 'bin';

const storageFileName = (file: File) => {
  const base =
    file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'file';

  return `${crypto.randomUUID()}-${base}.${fileExtension(file)}`;
};

const getStoragePath = (url: string | null, bucket: string) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
};

// Browser -> Supabase Storage local-file upload.
// The File is selected from the admin computer; it is not stored as a local path.
// After upload, the public URL is saved in the question row.
async function uploadFile(file: File, bucket: string, folder: string) {
  const image = bucket === IMAGE_BUCKET;
  const allowed = image ? IMAGE_TYPES : VIDEO_TYPES;
  const max = image ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

  if (!allowed.includes(file.type)) {
    throw new Error(
      image
        ? 'Use JPG, PNG, WEBP or GIF image.'
        : 'Use MP4, WebM or MOV video.',
    );
  }

  if (file.size > max) {
    throw new Error(
      image ? 'Image must be 10 MB or smaller.' : 'Video must be 100 MB or smaller.',
    );
  }

  const path = `${folder}/${storageFileName(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path, bucket };
}

async function removeFile(bucket: string, path: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn(`Storage cleanup failed: ${path}`, error.message);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminMockTestsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [exams, setExams] = useState<Exam[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [links, setLinks] = useState<SeriesTestLink[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);

  const [examId, setExamId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [testId, setTestId] = useState('');
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<DialogType>(null);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editExamId, setEditExamId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editSeriesId, setEditSeriesId] = useState('');

  const [examForm, setExamForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon_url: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const [seriesForm, setSeriesForm] = useState({
    title: '',
    slug: '',
    description: '',
    image_url: '',
    is_free: true,
    price: '0',
    mrp: '0',
    discount_active: false,
    display_order: '0',
  });

  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    short_description: '',
    test_type: 'full_length',
    difficulty: 'mixed',
    time_limit_minutes: '60',
    attempt_limit: '1',
    total_questions: '0',
    total_marks: '0',
    negative_marks: '0',
    language: 'bilingual',
    instructions: '',
    is_free: true,
    price: '0',
    is_featured: false,
    display_order: '0',
  });

  const [sectionForm, setSectionForm] = useState({
    name: '',
    description: '',
    question_count: '0',
    marks: '0',
    time_limit_minutes: '',
    display_order: '0',
  });

  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '0',
    explanation: '',
    image_url: '',
    points: '1',
    section_id: '',
    difficulty: 'medium',
    subject: '',
    topic: '',
    subtopic: '',
    language: 'bilingual',
    is_previous_year: false,
    exam_year: '',
    exam_shift: '',
    solution_video_url: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [videoPreview, setVideoPreview] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  const imagePreviewRef = useRef('');
  const videoPreviewRef = useRef('');

  /* ------------------------------ Auth guard ----------------------------- */

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      router.replace('/login');
    }
  }, [authLoading, profile?.role, router, user]);

  /* ------------------------------ Lookups -------------------------------- */

  const fetchAll = useCallback(async () => {
    setPageLoading(true);

    const [
      examsResult,
      categoriesResult,
      seriesResult,
      testsResult,
      linksResult,
      bankResult,
    ] = await Promise.all([
      supabase.from('mock_exams').select('*').order('display_order').order('name'),
      supabase
        .from('mock_test_categories')
        .select('*')
        .order('display_order')
        .order('name'),
      supabase
        .from('mock_test_series')
        .select('*')
        .order('display_order')
        .order('created_at', { ascending: false }),
      supabase
        .from('mock_tests')
        .select('*')
        .order('display_order')
        .order('created_at', { ascending: false }),
      supabase
        .from('mock_test_series_tests')
        .select('id,series_id,test_id,display_order')
        .order('display_order'),
      supabase
        .from('question_bank')
        .select(
          'id,question_text,options,correct_answer,explanation,image_url,solution_video_url,subject,topic,subtopic,difficulty,language,is_previous_year,exam_name,exam_year,exam_shift',
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
    ]);

    const errors = [
      examsResult.error,
      categoriesResult.error,
      seriesResult.error,
      testsResult.error,
      linksResult.error,
      bankResult.error,
    ].filter(Boolean);

    if (errors.length) {
      toast.error(errors[0]?.message || 'Could not load mock-test data.');
    }

    setExams((examsResult.data || []) as Exam[]);
    setCategories((categoriesResult.data || []) as Category[]);
    setSeries((seriesResult.data || []) as Series[]);
    setTests((testsResult.data || []) as Test[]);
    setLinks((linksResult.data || []) as SeriesTestLink[]);
    setBankQuestions((bankResult.data || []) as BankQuestion[]);
    setPageLoading(false);
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin') void fetchAll();
  }, [fetchAll, profile?.role]);

  /* ------------------------------ Derived -------------------------------- */

  const selectedExam = useMemo(
    () => exams.find((item) => item.id === examId) || null,
    [exams, examId],
  );

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId) || null,
    [categories, categoryId],
  );

  const selectedSeries = useMemo(
    () => series.find((item) => item.id === seriesId) || null,
    [series, seriesId],
  );

  const selectedTest = useMemo(
    () => tests.find((item) => item.id === testId) || null,
    [tests, testId],
  );

  const visibleCategories = useMemo(
    () => categories.filter((item) => item.exam_id === examId),
    [categories, examId],
  );

  const visibleSeries = useMemo(
    () =>
      series.filter(
        (item) =>
          (!examId || item.exam_id === examId) &&
          (!categoryId || item.category_id === categoryId),
      ),
    [series, examId, categoryId],
  );

  const visibleTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const linkedIds = seriesId
      ? new Set(
          links
            .filter((item) => item.series_id === seriesId)
            .map((item) => item.test_id),
        )
      : null;

    return tests.filter((test) => {
      if (linkedIds && !linkedIds.has(test.id)) return false;
      if (!q) return true;
      return `${test.title} ${test.exam_name} ${test.category} ${test.test_type}`
        .toLowerCase()
        .includes(q);
    });
  }, [tests, links, seriesId, search]);

  const filteredBankQuestions = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    const result = q
      ? bankQuestions.filter((item) =>
          `${item.question_text} ${item.subject || ''} ${item.topic || ''} ${item.exam_name || ''}`
            .toLowerCase()
            .includes(q),
        )
      : bankQuestions;

    return result.slice(0, 100);
  }, [bankQuestions, bankSearch]);

  const answerMap = useMemo(
    () => new Map(answerKeys.map((item) => [item.question_id, item.correct_answer])),
    [answerKeys],
  );

  const testQuestionCount = questions.length;
  const testMarks = questions.reduce((sum, item) => sum + Number(item.points || 0), 0);

  /* ------------------------------ Media ---------------------------------- */

  const clearMedia = useCallback(() => {
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    if (videoPreviewRef.current) URL.revokeObjectURL(videoPreviewRef.current);
    imagePreviewRef.current = '';
    videoPreviewRef.current = '';
    setImageFile(null);
    setVideoFile(null);
    setImagePreview('');
    setVideoPreview('');
  }, []);

  useEffect(() => clearMedia, [clearMedia]);

  const setImage = (file: File | null) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error('Use JPG, PNG, WEBP or GIF image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be 10 MB or smaller.');
      return;
    }

    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    const preview = URL.createObjectURL(file);
    imagePreviewRef.current = preview;
    setImageFile(file);
    setImagePreview(preview);
  };

  const setVideo = (file: File | null) => {
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type)) {
      toast.error('Use MP4, WebM or MOV video.');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error('Video must be 100 MB or smaller.');
      return;
    }

    if (videoPreviewRef.current) URL.revokeObjectURL(videoPreviewRef.current);
    const preview = URL.createObjectURL(file);
    videoPreviewRef.current = preview;
    setVideoFile(file);
    setVideoPreview(preview);
  };

  /* ------------------------------ Test data ------------------------------ */

  const loadTest = useCallback(async (id: string) => {
    setTestId(id);
    setStep(5);

    const [sectionsResult, questionsResult] = await Promise.all([
      supabase
        .from('mock_test_sections')
        .select('*')
        .eq('test_id', id)
        .order('display_order'),
      supabase
        .from('mock_test_questions')
        .select('*')
        .eq('test_id', id)
        .order('question_order'),
    ]);

    if (sectionsResult.error || questionsResult.error) {
      toast.error(
        sectionsResult.error?.message ||
          questionsResult.error?.message ||
          'Could not load test data.',
      );
      return;
    }

    const loadedQuestions = (questionsResult.data || []) as Question[];
    const ids = loadedQuestions.map((item) => item.id);

    let loadedKeys: AnswerKey[] = [];
    if (ids.length) {
      const { data, error } = await supabase
        .from('mock_test_answer_keys')
        .select('question_id,correct_answer')
        .in('question_id', ids);

      if (error) {
        toast.error(error.message);
      } else {
        loadedKeys = (data || []) as AnswerKey[];
      }
    }

    setSections((sectionsResult.data || []) as Section[]);
    setQuestions(loadedQuestions);
    setAnswerKeys(loadedKeys);
  }, []);

  const resetQuestion = useCallback(() => {
    clearMedia();
    setQuestionForm({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '0',
      explanation: '',
      image_url: '',
      points: '1',
      section_id: sections[0]?.id || '',
      difficulty: 'medium',
      subject: '',
      topic: '',
      subtopic: '',
      language: 'bilingual',
      is_previous_year: false,
      exam_year: '',
      exam_shift: '',
      solution_video_url: '',
    });
  }, [clearMedia, sections]);

  const resetSection = () =>
    setSectionForm({
      name: '',
      description: '',
      question_count: '0',
      marks: '0',
      time_limit_minutes: '',
      display_order: String(sections.length),
    });

  /* ------------------------------ Create/edit ---------------------------- */

  const openDialog = (type: Exclude<DialogType, null>) => setDialog(type);

  const createExam = async () => {
    if (!examForm.name.trim()) return toast.error('Enter exam name.');
    setSaving(true);

    const { data, error } = await supabase
      .from('mock_exams')
      .insert({
        name: examForm.name.trim(),
        slug: examForm.slug.trim() || slugify(examForm.name),
        description: examForm.description.trim() || null,
        icon_url: examForm.icon_url.trim() || null,
        status: 'published',
        created_by: user?.id,
      })
      .select()
      .single();

    setSaving(false);
    if (error) return toast.error(error.message);

    toast.success('Exam created.');
    setDialog(null);
    setExamForm({ name: '', slug: '', description: '', icon_url: '' });
    await fetchAll();
    if (data?.id) {
      setExamId(data.id);
      setCategoryId('');
      setSeriesId('');
      setStep(2);
    }
  };

  const createCategory = async () => {
    if (!examId || !categoryForm.name.trim()) {
      return toast.error('Select an exam and enter category name.');
    }
    setSaving(true);

    const { data, error } = await supabase
      .from('mock_test_categories')
      .insert({
        exam_id: examId,
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || slugify(categoryForm.name),
        description: categoryForm.description.trim() || null,
        status: 'published',
      })
      .select()
      .single();

    setSaving(false);
    if (error) return toast.error(error.message);

    toast.success('Category created.');
    setDialog(null);
    setCategoryForm({ name: '', slug: '', description: '' });
    await fetchAll();
    if (data?.id) {
      setCategoryId(data.id);
      setSeriesId('');
      setStep(3);
    }
  };

  const createSeries = async () => {
    if (!examId || !seriesForm.title.trim()) {
      return toast.error('Select an exam and enter series title.');
    }

    const price = asNumber(seriesForm.price);
    const mrp = Math.max(0, asNumber(seriesForm.mrp));
    if (!seriesForm.is_free && price <= 0) {
      return toast.error('Enter a valid paid price.');
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('mock_test_series')
      .insert({
        exam_id: examId,
        category_id: categoryId || null,
        title: seriesForm.title.trim(),
        slug: seriesForm.slug.trim() || slugify(seriesForm.title),
        description: seriesForm.description.trim() || null,
        image_url: seriesForm.image_url.trim() || null,
        is_free: seriesForm.is_free,
        price: seriesForm.is_free ? 0 : price,
        mrp,
        discount_active: seriesForm.discount_active,
        display_order: asNumber(seriesForm.display_order),
        status: 'published',
        created_by: user?.id,
      })
      .select()
      .single();

    setSaving(false);
    if (error) return toast.error(error.message);

    toast.success('Test series created.');
    setDialog(null);
    setSeriesForm({
      title: '',
      slug: '',
      description: '',
      image_url: '',
      is_free: true,
      price: '0',
      mrp: '0',
      discount_active: false,
      display_order: '0',
    });
    await fetchAll();
    if (data?.id) {
      setSeriesId(data.id);
      setStep(4);
    }
  };

  const openCreateTest = () => {
    if (!examId || !categoryId || !seriesId) {
      return toast.error('Select Exam, Category and Test Series first.');
    }
    setEditingTest(null);
    setEditExamId('');
    setEditCategoryId('');
    setEditSeriesId('');
    setTestForm({
      title: '',
      description: '',
      short_description: '',
      test_type: 'full_length',
      difficulty: 'mixed',
      time_limit_minutes: '60',
      attempt_limit: '1',
      total_questions: '0',
      total_marks: '0',
      negative_marks: '0',
      language: 'bilingual',
      instructions: '',
      is_free: true,
      price: '0',
      is_featured: false,
      display_order: '0',
    });
    openDialog('test');
  };

  const openEditTest = (test: Test) => {
    const link = links
      .filter((item) => item.test_id === test.id)
      .sort((a, b) => a.display_order - b.display_order)[0];
    const linkedSeries = series.find((item) => item.id === link?.series_id);

    setEditingTest(test);
    setEditExamId(test.exam_id || linkedSeries?.exam_id || examId);
    setEditCategoryId(test.category_id || linkedSeries?.category_id || categoryId);
    setEditSeriesId(link?.series_id || seriesId);
    setTestForm({
      title: test.title,
      description: test.description || '',
      short_description: test.short_description || '',
      test_type: test.test_type || 'full_length',
      difficulty: test.difficulty || 'mixed',
      time_limit_minutes: String(test.time_limit_minutes || 60),
      attempt_limit: String(test.attempt_limit || 1),
      total_questions: String(test.total_questions || 0),
      total_marks: String(test.total_marks || 0),
      negative_marks: String(test.negative_marks || 0),
      language: test.language || 'bilingual',
      instructions: test.instructions || '',
      is_free: test.is_free,
      price: String(test.price || 0),
      is_featured: test.is_featured,
      display_order: String(test.display_order || 0),
    });
    openDialog('test');
  };

  const saveTest = async () => {
    const targetExamId = editingTest ? editExamId : examId;
    const targetCategoryId = editingTest ? editCategoryId : categoryId;
    const targetSeriesId = editingTest ? editSeriesId : seriesId;

    if (!targetExamId || !targetCategoryId || !targetSeriesId) {
      return toast.error('Select Exam, Category and Test Series.');
    }
    if (!testForm.title.trim()) return toast.error('Enter test title.');

    const duration = asNumber(testForm.time_limit_minutes);
    const attempts = asNumber(testForm.attempt_limit);
    const price = asNumber(testForm.price);
    if (duration < 1) return toast.error('Time must be at least 1 minute.');
    if (attempts < 1) return toast.error('Attempts must be at least 1.');
    if (!testForm.is_free && price <= 0) return toast.error('Enter a valid paid test price.');

    const targetExam = exams.find((item) => item.id === targetExamId);
    const targetCategory = categories.find((item) => item.id === targetCategoryId);
    const targetSeries = series.find((item) => item.id === targetSeriesId);
    if (!targetExam || !targetCategory || !targetSeries) {
      return toast.error('Selected hierarchy could not be found.');
    }
    if (targetSeries.exam_id && targetSeries.exam_id !== targetExamId) {
      return toast.error('Selected series belongs to another exam.');
    }
    if (targetSeries.category_id && targetSeries.category_id !== targetCategoryId) {
      return toast.error('Selected series belongs to another category.');
    }

    setSaving(true);
    const payload = {
      title: testForm.title.trim(),
      description: testForm.description.trim() || null,
      short_description: testForm.short_description.trim() || null,
      exam_name: targetExam.name,
      category: targetCategory.name,
      exam_id: targetExamId,
      category_id: targetCategoryId,
      test_type: testForm.test_type,
      difficulty: testForm.difficulty,
      total_questions: Math.max(0, asNumber(testForm.total_questions)),
      total_marks: Math.max(0, asNumber(testForm.total_marks)),
      negative_marks: Math.max(0, asNumber(testForm.negative_marks)),
      language: testForm.language,
      instructions: testForm.instructions.trim() || null,
      time_limit_minutes: Math.min(600, duration),
      attempt_limit: Math.min(100, attempts),
      is_free: testForm.is_free,
      price: testForm.is_free ? 0 : price,
      is_featured: testForm.is_featured,
      display_order: asNumber(testForm.display_order),
    };

    let id = editingTest?.id || '';

    if (editingTest) {
      const { error } = await supabase.from('mock_tests').update(payload).eq('id', editingTest.id);
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    } else {
      const { data, error } = await supabase
        .from('mock_tests')
        .insert({ ...payload, created_by: user?.id, status: 'draft' })
        .select()
        .single();
      if (error || !data) {
        setSaving(false);
        return toast.error(error?.message || 'Could not create test.');
      }
      id = data.id;
    }

    const { data: currentLinks, error: linksError } = await supabase
      .from('mock_test_series_tests')
      .select('id,series_id,test_id,display_order')
      .eq('test_id', id);

    if (linksError) {
      setSaving(false);
      return toast.error(linksError.message);
    }

    const targetLink = currentLinks?.find((item) => item.series_id === targetSeriesId);
    if (!targetLink || (currentLinks?.length || 0) !== 1) {
      const { error: removeError } = await supabase
        .from('mock_test_series_tests')
        .delete()
        .eq('test_id', id);
      if (removeError) {
        setSaving(false);
        return toast.error(removeError.message);
      }

      const { error: linkError } = await supabase.from('mock_test_series_tests').insert({
        series_id: targetSeriesId,
        test_id: id,
        display_order: asNumber(testForm.display_order),
      });
      if (linkError) {
        setSaving(false);
        return toast.error(linkError.message);
      }
    } else {
      const { error } = await supabase
        .from('mock_test_series_tests')
        .update({ display_order: asNumber(testForm.display_order) })
        .eq('id', targetLink.id);
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    }

    setSaving(false);
    setDialog(null);
    setEditingTest(null);
    setExamId(targetExamId);
    setCategoryId(targetCategoryId);
    setSeriesId(targetSeriesId);
    toast.success(editingTest ? 'Mock test updated.' : 'Mock test created.');
    await fetchAll();
    await loadTest(id);
  };

  /* ------------------------------ Sections ------------------------------- */

  const openCreateSection = () => {
    if (!testId) return toast.error('Select a test first.');
    setEditingSection(null);
    resetSection();
    openDialog('section');
  };

  const openEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionForm({
      name: section.name,
      description: section.description || '',
      question_count: String(section.question_count),
      marks: String(section.marks),
      time_limit_minutes: section.time_limit_minutes ? String(section.time_limit_minutes) : '',
      display_order: String(section.display_order),
    });
    openDialog('section');
  };

  const saveSection = async () => {
    if (!testId || !sectionForm.name.trim()) return toast.error('Enter section name.');
    setSaving(true);

    const payload = {
      test_id: testId,
      name: sectionForm.name.trim(),
      description: sectionForm.description.trim() || null,
      question_count: Math.max(0, asNumber(sectionForm.question_count)),
      marks: Math.max(0, asNumber(sectionForm.marks)),
      time_limit_minutes: sectionForm.time_limit_minutes
        ? Math.max(1, asNumber(sectionForm.time_limit_minutes))
        : null,
      display_order: asNumber(sectionForm.display_order, sections.length),
    };

    const result = editingSection
      ? await supabase.from('mock_test_sections').update(payload).eq('id', editingSection.id)
      : await supabase.from('mock_test_sections').insert(payload);

    setSaving(false);
    if (result.error) return toast.error(result.error.message);

    setDialog(null);
    setEditingSection(null);
    toast.success(editingSection ? 'Section updated.' : 'Section created.');
    await loadTest(testId);
  };

  const deleteSection = async (section: Section) => {
    if (!window.confirm(`Delete section "${section.name}"?`)) return;
    setSaving(true);
    const { error } = await supabase.from('mock_test_sections').delete().eq('id', section.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Section deleted.');
    await loadTest(testId);
  };

  /* ------------------------------ Questions ------------------------------ */

  const openCreateQuestion = () => {
    if (!testId) return toast.error('Select a test first.');
    resetQuestion();
    openDialog('question');
  };

  const addQuestion = async () => {
    if (!testId || !questionForm.question_text.trim()) {
      return toast.error('Enter question text.');
    }

    const options = questionForm.options.map((item) => item.trim()).filter(Boolean);
    const correct = asNumber(questionForm.correct_answer, -1);
    if (options.length < 2) return toast.error('Add at least two options.');
    if (correct < 0 || correct >= options.length) return toast.error('Select a valid correct answer.');

    setSaving(true);
    let uploadedImage: Awaited<ReturnType<typeof uploadFile>> | null = null;
    let uploadedVideo: Awaited<ReturnType<typeof uploadFile>> | null = null;

    try {
      const nextOrder = questions.length
        ? Math.max(...questions.map((item) => item.question_order)) + 1
        : 1;

      if (imageFile) {
        uploadedImage = await uploadFile(imageFile, IMAGE_BUCKET, `tests/${testId}/questions`);
      }
      if (videoFile) {
        uploadedVideo = await uploadFile(videoFile, VIDEO_BUCKET, `tests/${testId}/solutions`);
      }

      const { data: inserted, error } = await supabase
        .from('mock_test_questions')
        .insert({
          test_id: testId,
          question_order: nextOrder,
          question_text: questionForm.question_text.trim(),
          options,
          explanation: questionForm.explanation.trim() || null,
          image_url: uploadedImage?.url || questionForm.image_url.trim() || null,
          points: Math.max(1, asNumber(questionForm.points, 1)),
          solution_video_url: uploadedVideo?.url || questionForm.solution_video_url.trim() || null,
          section_id: questionForm.section_id || null,
          difficulty: questionForm.difficulty,
          subject: questionForm.subject.trim() || null,
          topic: questionForm.topic.trim() || null,
          subtopic: questionForm.subtopic.trim() || null,
          language: questionForm.language,
          is_previous_year: questionForm.is_previous_year,
          exam_year: questionForm.exam_year ? asNumber(questionForm.exam_year) : null,
          exam_shift: questionForm.exam_shift.trim() || null,
        })
        .select('id')
        .single();

      if (error || !inserted) throw new Error(error?.message || 'Could not add question.');

      const { error: keyError } = await supabase.from('mock_test_answer_keys').upsert({
        question_id: inserted.id,
        correct_answer: correct,
        updated_at: new Date().toISOString(),
      });

      if (keyError) {
        await supabase.from('mock_test_questions').delete().eq('id', inserted.id);
        throw new Error(keyError.message);
      }

      setDialog(null);
      clearMedia();
      toast.success('MCQ added successfully.');
      await loadTest(testId);
    } catch (error) {
      if (uploadedImage) await removeFile(uploadedImage.bucket, uploadedImage.path);
      if (uploadedVideo) await removeFile(uploadedVideo.bucket, uploadedVideo.path);
      toast.error(error instanceof Error ? error.message : 'Could not add question.');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (question: Question) => {
    if (!window.confirm('Delete this MCQ and its answer key?')) return;
    setSaving(true);

    try {
      const imagePath = getStoragePath(question.image_url, IMAGE_BUCKET);
      const videoPath = getStoragePath(question.solution_video_url, VIDEO_BUCKET);

      const { error: answerError } = await supabase
        .from('mock_test_answers')
        .delete()
        .eq('question_id', question.id);
      if (answerError) throw answerError;

      const { error: keyError } = await supabase
        .from('mock_test_answer_keys')
        .delete()
        .eq('question_id', question.id);
      if (keyError) throw keyError;

      const { error: deleteError } = await supabase
        .from('mock_test_questions')
        .delete()
        .eq('id', question.id);
      if (deleteError) throw deleteError;

      await Promise.all([
        removeFile(IMAGE_BUCKET, imagePath),
        removeFile(VIDEO_BUCKET, videoPath),
      ]);

      toast.success('MCQ deleted.');
      await loadTest(testId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete MCQ.');
    } finally {
      setSaving(false);
    }
  };

  const importBankQuestions = async () => {
    if (!testId || !selectedBankIds.length) {
      return toast.error('Select questions from the question bank.');
    }

    const selected = bankQuestions.filter((item) => selectedBankIds.includes(item.id));
    if (!selected.length) return;

    setSaving(true);
    let order = questions.length
      ? Math.max(...questions.map((item) => item.question_order)) + 1
      : 1;
    let imported = 0;

    try {
      for (const bank of selected) {
        const { data: inserted, error } = await supabase
          .from('mock_test_questions')
          .insert({
            test_id: testId,
            question_order: order++,
            question_text: bank.question_text,
            options: bank.options || [],
            explanation: bank.explanation,
            image_url: bank.image_url,
            points: 1,
            solution_video_url: bank.solution_video_url,
            section_id: null,
            question_bank_id: bank.id,
            difficulty: bank.difficulty || 'medium',
            subject: bank.subject,
            topic: bank.topic,
            subtopic: bank.subtopic,
            language: bank.language || 'english',
            is_previous_year: bank.is_previous_year,
            exam_year: bank.exam_year,
            exam_shift: bank.exam_shift,
          })
          .select('id')
          .single();

        if (error || !inserted) {
          toast.error(error?.message || `Could not import ${bank.question_text.slice(0, 30)}...`);
          continue;
        }

        if (bank.correct_answer !== null) {
          const { error: keyError } = await supabase.from('mock_test_answer_keys').upsert({
            question_id: inserted.id,
            correct_answer: bank.correct_answer,
            updated_at: new Date().toISOString(),
          });
          if (keyError) {
            await supabase.from('mock_test_questions').delete().eq('id', inserted.id);
            toast.error(keyError.message);
            continue;
          }
        }

        imported += 1;
      }

      setSelectedBankIds([]);
      setBankSearch('');
      setDialog(null);
      toast.success(`${imported} question(s) imported.`);
      await loadTest(testId);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ Test delete ---------------------------- */

  const deleteTest = async (test: Test) => {
    const confirmed = window.confirm(
      `Delete "${test.title}"?\n\nThis permanently removes the test, questions, answer keys, attempts, results, purchases and series links. Uploaded question images and solution videos created by this page are also removed.`,
    );
    if (!confirmed) return;

    setSaving(true);

    try {
      const [{ data: testQuestions, error: questionFetchError }, { data: attempts, error: attemptFetchError }] =
        await Promise.all([
          supabase
            .from('mock_test_questions')
            .select('id,image_url,solution_video_url')
            .eq('test_id', test.id),
          supabase.from('mock_test_attempts').select('id').eq('test_id', test.id),
        ]);

      if (questionFetchError) throw questionFetchError;
      if (attemptFetchError) throw attemptFetchError;

      const questionIds = (testQuestions || []).map((item) => item.id);
      const attemptIds = (attempts || []).map((item) => item.id);

      if (attemptIds.length) {
        const { error } = await supabase
          .from('mock_test_section_results')
          .delete()
          .in('attempt_id', attemptIds);
        if (error) throw error;

        const { error: rankingError } = await supabase
          .from('mock_test_rankings')
          .delete()
          .in('attempt_id', attemptIds);
        if (rankingError) throw rankingError;

        const { error: answersError } = await supabase
          .from('mock_test_answers')
          .delete()
          .in('attempt_id', attemptIds);
        if (answersError) throw answersError;
      }

      if (questionIds.length) {
        const { error } = await supabase
          .from('mock_test_answers')
          .delete()
          .in('question_id', questionIds);
        if (error) throw error;

        const { error: keyError } = await supabase
          .from('mock_test_answer_keys')
          .delete()
          .in('question_id', questionIds);
        if (keyError) throw keyError;
      }

      const { error: purchaseError } = await supabase
        .from('mock_test_purchases')
        .delete()
        .eq('test_id', test.id);
      if (purchaseError) throw purchaseError;

      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .update({ mock_test_id: null })
        .eq('mock_test_id', test.id);
      if (transactionError) throw transactionError;

      // Questions can reference sections, so remove questions before sections.
      const { error: questionDeleteError } = await supabase
        .from('mock_test_questions')
        .delete()
        .eq('test_id', test.id);
      if (questionDeleteError) throw questionDeleteError;

      const { error: sectionDeleteError } = await supabase
        .from('mock_test_sections')
        .delete()
        .eq('test_id', test.id);
      if (sectionDeleteError) throw sectionDeleteError;

      const { error: seriesLinkDeleteError } = await supabase
        .from('mock_test_series_tests')
        .delete()
        .eq('test_id', test.id);
      if (seriesLinkDeleteError) throw seriesLinkDeleteError;

      if (attemptIds.length) {
        const { error } = await supabase
          .from('mock_test_attempts')
          .delete()
          .in('id', attemptIds);
        if (error) throw error;
      }

      const { error: testDeleteError } = await supabase
        .from('mock_tests')
        .delete()
        .eq('id', test.id);
      if (testDeleteError) throw testDeleteError;

      const imagePaths = (testQuestions || [])
        .map((item) => getStoragePath(item.image_url, IMAGE_BUCKET))
        .filter((path): path is string => Boolean(path) && path.startsWith(`tests/${test.id}/questions/`));
      const videoPaths = (testQuestions || [])
        .map((item) => getStoragePath(item.solution_video_url, VIDEO_BUCKET))
        .filter((path): path is string => Boolean(path) && path.startsWith(`tests/${test.id}/solutions/`));

      await Promise.all([
        imagePaths.length ? supabase.storage.from(IMAGE_BUCKET).remove(imagePaths) : Promise.resolve(),
        videoPaths.length ? supabase.storage.from(VIDEO_BUCKET).remove(videoPaths) : Promise.resolve(),
      ]);

      if (testId === test.id) {
        setTestId('');
        setSections([]);
        setQuestions([]);
        setAnswerKeys([]);
        setStep(4);
      }

      toast.success('Mock test deleted successfully.');
      await fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete mock test.');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ Status --------------------------------- */

  const updateTestStatus = async (test: Test, status: string) => {
    if (status === 'published') {
      const count = test.id === testId ? questions.length : test.total_questions;
      if (!count) return toast.error('Add at least one question before publishing.');
    }

    setSaving(true);
    const { error } = await supabase
      .from('mock_tests')
      .update({
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', test.id);
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success(`Test ${labelStatus(status)}.`);
    await fetchAll();
  };

  const publishSeries = async () => {
    if (!seriesId) return;
    setSaving(true);
    const { error } = await supabase
      .from('mock_test_series')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', seriesId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Test series published.');
    await fetchAll();
  };

  /* ------------------------------ Navigation ---------------------------- */

  const selectExam = (id: string) => {
    setExamId(id);
    setCategoryId('');
    setSeriesId('');
    setTestId('');
    setStep(2);
  };

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setSeriesId('');
    setTestId('');
    setStep(3);
  };

  const selectSeries = (id: string) => {
    setSeriesId(id);
    setTestId('');
    setStep(4);
  };

  /* ------------------------------ Loading ------------------------------- */

  if (authLoading || (profile?.role === 'admin' && pageLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') return null;

  const editCategories = categories.filter((item) => item.exam_id === editExamId);
  const editSeries = series.filter(
    (item) =>
      (!editExamId || item.exam_id === editExamId) &&
      (!editCategoryId || !item.category_id || item.category_id === editCategoryId),
  );

  return (
    <DashboardShell role="admin">
      <div className="min-h-full bg-[#f5f7fb]">
        <header className="border-b bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-7">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                <ShieldCheck className="h-4 w-4" />
                LearnPathshala Mock Exams
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Mock Test Control Center</h1>
              <p className="mt-1 text-sm text-slate-500">
                Exam → Category → Series → Mock Test → Sections → MCQs
              </p>
            </div>
            <Button variant="outline" onClick={() => void fetchAll()} disabled={pageLoading || saving}>
              <RefreshCw className={`mr-2 h-4 w-4 ${pageLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        <main className="space-y-5 p-5 lg:p-7">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="grid gap-2 md:grid-cols-5">
                {[
                  ['1', 'Exam', FolderTree],
                  ['2', 'Category', Layers3],
                  ['3', 'Test Series', BookOpen],
                  ['4', 'Mock Test', FileQuestion],
                  ['5', 'MCQs & Sections', Settings2],
                ].map(([number, label, Icon]) => (
                  <button
                    key={String(number)}
                    type="button"
                    onClick={() => setStep(Number(number))}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      step === Number(number)
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step === Number(number) ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {number}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] text-slate-400">Step {number}</span>
                      <span className="block truncate text-sm font-semibold text-slate-800">{label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {step === 1 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>1. Exams</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Create the top-level exam structure.</p>
                </div>
                <Button onClick={() => openDialog('exam')}>
                  <Plus className="mr-2 h-4 w-4" /> Create Exam
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {exams.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => selectExam(exam.id)}
                      className={`rounded-xl border p-4 text-left transition ${examId === exam.id ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                          <FolderTree className="h-5 w-5" />
                        </div>
                        <Badge variant="outline">{labelStatus(exam.status)}</Badge>
                      </div>
                      <h3 className="mt-4 font-bold text-slate-900">{exam.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{exam.description || 'No description'}</p>
                    </button>
                  ))}
                </div>
                {!exams.length && <EmptyState text="No exams yet. Create your first exam." />}
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>2. Categories</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{selectedExam?.name || 'Select an exam first.'}</p>
                </div>
                <Button disabled={!examId} onClick={() => openDialog('category')}>
                  <Plus className="mr-2 h-4 w-4" /> Create Category
                </Button>
              </CardHeader>
              <CardContent>
                {!examId ? (
                  <EmptyState text="Select an exam from Step 1 first." />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visibleCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => selectCategory(category.id)}
                        className={`rounded-xl border p-4 text-left transition ${categoryId === category.id ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="rounded-lg bg-violet-50 p-2 text-violet-600"><Layers3 className="h-5 w-5" /></div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                        <h3 className="mt-4 font-bold text-slate-900">{category.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{category.description || 'Test category'}</p>
                      </button>
                    ))}
                  </div>
                )}
                {examId && !visibleCategories.length && <EmptyState text="No categories for this exam yet." />}
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>3. Test Series</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{selectedExam?.name} → {selectedCategory?.name}</p>
                </div>
                <Button disabled={!examId} onClick={() => openDialog('series')}>
                  <Plus className="mr-2 h-4 w-4" /> Create Test Series
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-2">
                  {visibleSeries.map((item) => {
                    const count = links.filter((link) => link.series_id === item.id).length;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectSeries(item.id)}
                        className={`rounded-2xl border p-5 text-left transition ${seriesId === item.id ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><BookOpen className="h-6 w-6" /></div>
                            <div>
                              <h3 className="font-bold text-slate-900">{item.title}</h3>
                              <p className="mt-1 text-sm text-slate-500">{item.description || 'Mock test series'}</p>
                            </div>
                          </div>
                          <Badge className={item.is_free ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
                            {item.is_free ? 'FREE' : `₹${item.price}`}
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>{count} tests</span><span>•</span><span>{labelStatus(item.status)}</span>
                          {item.discount_active && <><span>•</span><span>Discount Active</span></>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!visibleSeries.length && <EmptyState text="No test series found. Create one first." />}
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>4. Mock Tests</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{selectedSeries?.title || 'Select a test series'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {seriesId && selectedSeries?.status !== 'published' && (
                    <Button variant="outline" onClick={() => void publishSeries()} disabled={saving}>Publish Series</Button>
                  )}
                  <Button onClick={openCreateTest} disabled={!seriesId}>
                    <Plus className="mr-2 h-4 w-4" /> Create Mock Test
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-10" placeholder="Search mock tests..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div className="space-y-3">
                  {visibleTests.map((test) => (
                    <div key={test.id} className={`rounded-xl border p-4 ${testId === test.id ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <button type="button" onClick={() => void loadTest(test.id)} className="flex min-w-0 flex-1 gap-4 text-left">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FileQuestion className="h-5 w-5" /></div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900">{test.title}</h3>
                              <Badge variant="outline">{labelStatus(test.test_type)}</Badge>
                              <Badge className={STATUS_STYLES[test.status] || STATUS_STYLES.draft}>{labelStatus(test.status)}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {test.total_questions || 0} Questions • {test.total_marks || 0} Marks • {test.time_limit_minutes} Min • {test.language}
                            </p>
                          </div>
                        </button>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditTest(test)}><Edit3 className="mr-1.5 h-4 w-4" /> Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => void updateTestStatus(test, test.status === 'published' ? 'unpublished' : 'published')} disabled={saving}>
                            {test.status === 'published' ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => void deleteTest(test)} disabled={saving}>
                            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {!visibleTests.length && <EmptyState text={seriesId ? 'No mock tests in this series yet.' : 'Select a test series first.'} />}
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <div className="space-y-5">
              {!selectedTest ? (
                <Card><CardContent className="p-8"><EmptyState text="Select a mock test from Step 4 to manage its sections and MCQs." /></CardContent></Card>
              ) : (
                <>
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle>{selectedTest.title}</CardTitle>
                          <Badge className={STATUS_STYLES[selectedTest.status] || STATUS_STYLES.draft}>{labelStatus(selectedTest.status)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{selectedSeries?.title || 'Test Series'} · {testQuestionCount} MCQs · {testMarks} marks</p>
                      </div>
                      <Button variant="outline" onClick={() => void loadTest(selectedTest.id)} disabled={saving}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <Metric label="MCQs" value={testQuestionCount} />
                        <Metric label="Marks" value={testMarks} />
                        <Metric label="Duration" value={`${selectedTest.time_limit_minutes} min`} />
                        <Metric label="Attempts" value={selectedTest.attempt_limit} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Sections</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">Optional sections for sectional tests and detailed analysis.</p>
                      </div>
                      <Button onClick={openCreateSection}><Plus className="mr-2 h-4 w-4" /> Add Section</Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sections.map((section) => (
                        <div key={section.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{section.display_order + 1}. {section.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{section.question_count} questions · {section.marks} marks{section.time_limit_minutes ? ` · ${section.time_limit_minutes} min` : ''}</p>
                            {section.description && <p className="mt-1 text-sm text-slate-500">{section.description}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="icon" variant="outline" onClick={() => openEditSection(section)}><Edit3 className="h-4 w-4" /></Button>
                            <Button size="icon" variant="outline" className="border-red-200 text-red-600" onClick={() => void deleteSection(section)} disabled={saving}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                      {!sections.length && <EmptyState text="No sections yet. Add them if you need sectional analysis." />}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>MCQ Questions</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">Add manually or import existing questions from the Question Bank.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => { setSelectedBankIds([]); setBankSearch(''); openDialog('bank'); }}>
                          <BookOpen className="mr-2 h-4 w-4" /> Question Bank
                        </Button>
                        <Button onClick={openCreateQuestion}><Plus className="mr-2 h-4 w-4" /> Add MCQ</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {questions.map((question) => {
                        const section = sections.find((item) => item.id === question.section_id);
                        const correct = answerMap.get(question.id);
                        return (
                          <div key={question.id} className="rounded-xl border p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600">{question.question_order}</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  {question.question_bank_id && <Badge variant="outline">Question Bank</Badge>}
                                  {section && <Badge variant="outline">{section.name}</Badge>}
                                  {question.subject && <Badge variant="outline">{question.subject}</Badge>}
                                  {question.solution_video_url && <Badge className="bg-emerald-50 text-emerald-700"><Video className="mr-1 h-3 w-3" /> Solution</Badge>}
                                </div>
                                <p className="mt-2 font-medium leading-6 text-slate-800">{question.question_text}</p>
                                {question.image_url && <img src={question.image_url} alt="Question" className="mt-3 max-h-56 rounded-lg border object-contain" />}
                                <div className="mt-3 grid gap-2 md:grid-cols-2">
                                  {question.options.map((option, index) => (
                                    <div key={`${question.id}-${index}`} className={`rounded-lg border px-3 py-2 text-sm ${correct === index ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'}`}>
                                      <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>{option}
                                      {correct === index && <Check className="ml-2 inline h-4 w-4" />}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                  <span>{question.points} mark</span><span>•</span><span>{question.difficulty || 'medium'}</span>
                                  {question.topic && <><span>•</span><span>{question.topic}</span></>}
                                  {question.is_previous_year && <><span>•</span><span>PYQ {question.exam_year || ''}</span></>}
                                </div>
                                {question.explanation && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><strong>Explanation:</strong> {question.explanation}</p>}
                              </div>
                              <Button size="icon" variant="ghost" className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => void deleteQuestion(question)} disabled={saving}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {!questions.length && <EmptyState text="No MCQs yet. Add one manually or import from the Question Bank." />}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Exam */}
      <Dialog open={dialog === 'exam'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Create Exam</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="Exam Name" value={examForm.name} onChange={(value) => setExamForm((x) => ({ ...x, name: value }))} placeholder="SSC CGL" />
            <Field label="Slug" value={examForm.slug} onChange={(value) => setExamForm((x) => ({ ...x, slug: value }))} placeholder="ssc-cgl" />
            <Textarea value={examForm.description} onChange={(e) => setExamForm((x) => ({ ...x, description: e.target.value }))} placeholder="Describe this exam. Categories are created in Step 2." rows={3} />
            <Field label="Icon URL" value={examForm.icon_url} onChange={(value) => setExamForm((x) => ({ ...x, icon_url: value }))} placeholder="https://..." />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button onClick={() => void createExam()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Exam</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category */}
      <Dialog open={dialog === 'category'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Create Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="Category Name" value={categoryForm.name} onChange={(value) => setCategoryForm((x) => ({ ...x, name: value }))} placeholder="Tier 1 / Prelims" />
            <Field label="Slug" value={categoryForm.slug} onChange={(value) => setCategoryForm((x) => ({ ...x, slug: value }))} placeholder="tier-1" />
            <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm((x) => ({ ...x, description: e.target.value }))} placeholder="Category description" rows={3} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button onClick={() => void createCategory()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Category</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Series */}
      <Dialog open={dialog === 'series'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Create Test Series</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Series Title" value={seriesForm.title} onChange={(value) => setSeriesForm((x) => ({ ...x, title: value }))} placeholder="SSC CGL Tier 1 Test Series 2026" /></div>
            <Field label="Slug" value={seriesForm.slug} onChange={(value) => setSeriesForm((x) => ({ ...x, slug: value }))} placeholder="ssc-cgl-tier-1-2026" />
            <Field label="Display Order" type="number" value={seriesForm.display_order} onChange={(value) => setSeriesForm((x) => ({ ...x, display_order: value }))} />
            <div className="sm:col-span-2"><Textarea value={seriesForm.description} onChange={(e) => setSeriesForm((x) => ({ ...x, description: e.target.value }))} placeholder="Series description" rows={3} /></div>
            <Field label="Image URL" value={seriesForm.image_url} onChange={(value) => setSeriesForm((x) => ({ ...x, image_url: value }))} placeholder="https://..." />
            <Field label="Price" type="number" value={seriesForm.price} onChange={(value) => setSeriesForm((x) => ({ ...x, price: value }))} disabled={seriesForm.is_free} />
            <Field label="MRP" type="number" value={seriesForm.mrp} onChange={(value) => setSeriesForm((x) => ({ ...x, mrp: value }))} />
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={seriesForm.is_free} onChange={(e) => setSeriesForm((x) => ({ ...x, is_free: e.target.checked }))} /> Free Series</label>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={seriesForm.discount_active} onChange={(e) => setSeriesForm((x) => ({ ...x, discount_active: e.target.checked }))} /> Discount Active</label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button onClick={() => void createSeries()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Series</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test */}
      <Dialog open={dialog === 'test'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{editingTest ? 'Edit Mock Test' : 'Create Mock Test'}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            {editingTest && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-slate-900">Move Test</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="Exam" type="select" value={editExamId} options={exams.map((item) => [item.id, item.name])} onChange={(value) => { setEditExamId(value); setEditCategoryId(''); setEditSeriesId(''); }} />
                  <Field label="Category" type="select" value={editCategoryId} options={editCategories.map((item) => [item.id, item.name])} disabled={!editExamId} onChange={(value) => { setEditCategoryId(value); setEditSeriesId(''); }} />
                  <Field label="Series" type="select" value={editSeriesId} options={editSeries.map((item) => [item.id, item.title])} disabled={!editCategoryId} onChange={setEditSeriesId} />
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Title *" value={testForm.title} onChange={(value) => setTestForm((x) => ({ ...x, title: value }))} placeholder="SSC CGL Full Mock Test 01" /></div>
              <div className="sm:col-span-2"><Textarea value={testForm.short_description} onChange={(e) => setTestForm((x) => ({ ...x, short_description: e.target.value }))} placeholder="Short description" rows={2} /></div>
              <Field label="Test Type" type="select" value={testForm.test_type} options={TEST_TYPES} onChange={(value) => setTestForm((x) => ({ ...x, test_type: value }))} />
              <Field label="Difficulty" type="select" value={testForm.difficulty} options={DIFFICULTIES} onChange={(value) => setTestForm((x) => ({ ...x, difficulty: value }))} />
              <Field label="Duration (minutes)" type="number" value={testForm.time_limit_minutes} onChange={(value) => setTestForm((x) => ({ ...x, time_limit_minutes: value }))} />
              <Field label="Attempt Limit" type="number" value={testForm.attempt_limit} onChange={(value) => setTestForm((x) => ({ ...x, attempt_limit: value }))} />
              <Field label="Total Questions" type="number" value={testForm.total_questions} onChange={(value) => setTestForm((x) => ({ ...x, total_questions: value }))} />
              <Field label="Total Marks" type="number" value={testForm.total_marks} onChange={(value) => setTestForm((x) => ({ ...x, total_marks: value }))} />
              <Field label="Negative Marks" type="number" value={testForm.negative_marks} onChange={(value) => setTestForm((x) => ({ ...x, negative_marks: value }))} />
              <Field label="Language" type="select" value={testForm.language} options={LANGUAGES} onChange={(value) => setTestForm((x) => ({ ...x, language: value }))} />
              <Field label="Price" type="number" value={testForm.price} disabled={testForm.is_free} onChange={(value) => setTestForm((x) => ({ ...x, price: value }))} />
              <Field label="Display Order" type="number" value={testForm.display_order} onChange={(value) => setTestForm((x) => ({ ...x, display_order: value }))} />
              <div className="flex items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={testForm.is_free} onChange={(e) => setTestForm((x) => ({ ...x, is_free: e.target.checked }))} /> Free Test</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={testForm.is_featured} onChange={(e) => setTestForm((x) => ({ ...x, is_featured: e.target.checked }))} /> Featured</label>
              </div>
              <div className="sm:col-span-2"><Textarea value={testForm.description} onChange={(e) => setTestForm((x) => ({ ...x, description: e.target.value }))} placeholder="Full description" rows={3} /></div>
              <div className="sm:col-span-2"><Textarea value={testForm.instructions} onChange={(e) => setTestForm((x) => ({ ...x, instructions: e.target.value }))} placeholder="Instructions shown before the test" rows={4} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button onClick={() => void saveTest()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Save className="mr-2 h-4 w-4" />{editingTest ? 'Update Test' : 'Create Test'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section */}
      <Dialog open={dialog === 'section'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editingSection ? 'Edit Section' : 'Add Section'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Section Name" value={sectionForm.name} onChange={(value) => setSectionForm((x) => ({ ...x, name: value }))} placeholder="Quantitative Aptitude" /></div>
            <Field label="Question Count" type="number" value={sectionForm.question_count} onChange={(value) => setSectionForm((x) => ({ ...x, question_count: value }))} />
            <Field label="Marks" type="number" value={sectionForm.marks} onChange={(value) => setSectionForm((x) => ({ ...x, marks: value }))} />
            <Field label="Time Limit (minutes)" type="number" value={sectionForm.time_limit_minutes} onChange={(value) => setSectionForm((x) => ({ ...x, time_limit_minutes: value }))} />
            <Field label="Display Order" type="number" value={sectionForm.display_order} onChange={(value) => setSectionForm((x) => ({ ...x, display_order: value }))} />
            <div className="sm:col-span-2"><Textarea value={sectionForm.description} onChange={(e) => setSectionForm((x) => ({ ...x, description: e.target.value }))} placeholder="Section description" rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button onClick={() => void saveSection()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Section</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question */}
      <Dialog open={dialog === 'question'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Add MCQ</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div><Label>Question *</Label><Textarea className="mt-2" value={questionForm.question_text} onChange={(e) => setQuestionForm((x) => ({ ...x, question_text: e.target.value }))} placeholder="Enter the question..." rows={4} /></div>
            <div>
              <Label>Question Image (Local Upload)</Label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"><Upload className="h-4 w-4" /> Upload Image<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setImage(e.target.files?.[0] || null)} /></label>
                {imageFile && <span className="text-xs text-slate-500">{imageFile.name}</span>}
              </div>
              {imagePreview && <img src={imagePreview} alt="Preview" className="mt-3 max-h-48 rounded-lg border object-contain" />}
              <p className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP or GIF • maximum 10 MB. The selected file is uploaded to Supabase Storage when you add the MCQ.</p>
              <div className="mt-2"><Field label="or Image URL" value={questionForm.image_url} onChange={(value) => setQuestionForm((x) => ({ ...x, image_url: value }))} placeholder="https://..." /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {questionForm.options.map((option, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <Label>Option {String.fromCharCode(65 + index)}</Label>
                  <Input className="mt-2" value={option} onChange={(e) => setQuestionForm((x) => ({ ...x, options: x.options.map((item, i) => i === index ? e.target.value : item) }))} placeholder={`Option ${String.fromCharCode(65 + index)}`} />
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Correct Answer" type="select" value={questionForm.correct_answer} options={questionForm.options.map((option, index) => [String(index), `${String.fromCharCode(65 + index)}${option ? ` — ${option.slice(0, 25)}` : ''}`])} onChange={(value) => setQuestionForm((x) => ({ ...x, correct_answer: value }))} />
              <Field label="Marks" type="number" value={questionForm.points} onChange={(value) => setQuestionForm((x) => ({ ...x, points: value }))} />
              <Field label="Difficulty" type="select" value={questionForm.difficulty} options={DIFFICULTIES.filter(([value]) => value !== 'mixed')} onChange={(value) => setQuestionForm((x) => ({ ...x, difficulty: value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Section" type="select" value={questionForm.section_id} options={[['', 'No Section'], ...sections.map((item) => [item.id, item.name])]} onChange={(value) => setQuestionForm((x) => ({ ...x, section_id: value }))} />
              <Field label="Language" type="select" value={questionForm.language} options={LANGUAGES} onChange={(value) => setQuestionForm((x) => ({ ...x, language: value }))} />
              <Field label="Subject" value={questionForm.subject} onChange={(value) => setQuestionForm((x) => ({ ...x, subject: value }))} placeholder="Maths" />
              <Field label="Topic" value={questionForm.topic} onChange={(value) => setQuestionForm((x) => ({ ...x, topic: value }))} placeholder="Percentage" />
              <Field label="Subtopic" value={questionForm.subtopic} onChange={(value) => setQuestionForm((x) => ({ ...x, subtopic: value }))} placeholder="Profit & Loss" />
              <Field label="Exam Year" type="number" value={questionForm.exam_year} onChange={(value) => setQuestionForm((x) => ({ ...x, exam_year: value }))} placeholder="2026" />
              <Field label="Exam Shift" value={questionForm.exam_shift} onChange={(value) => setQuestionForm((x) => ({ ...x, exam_shift: value }))} placeholder="Shift 1" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={questionForm.is_previous_year} onChange={(e) => setQuestionForm((x) => ({ ...x, is_previous_year: e.target.checked }))} /> Previous Year Question</label>
            <div><Label>Explanation</Label><Textarea className="mt-2" value={questionForm.explanation} onChange={(e) => setQuestionForm((x) => ({ ...x, explanation: e.target.value }))} placeholder="Explain the answer..." rows={4} /></div>
            <div>
              <Label>Solution Video (Local Upload)</Label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"><Video className="h-4 w-4" /> Upload Video<input hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setVideo(e.target.files?.[0] || null)} /></label>
                {videoFile && <span className="text-xs text-slate-500">{videoFile.name}</span>}
              </div>
              {videoPreview && <video className="mt-3 max-h-56 rounded-lg border" controls src={videoPreview} />}
              <p className="mt-2 text-xs text-slate-500">MP4, WebM or MOV • maximum 100 MB. The selected file is uploaded to Supabase Storage when you add the MCQ.</p>
              <div className="mt-2"><Field label="or Video URL" value={questionForm.solution_video_url} onChange={(value) => setQuestionForm((x) => ({ ...x, solution_video_url: value }))} placeholder="https://..." /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { clearMedia(); setDialog(null); }}>Cancel</Button>
            <Button onClick={() => void addQuestion()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Uploading & Saving...' : 'Add MCQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question bank */}
      <Dialog open={dialog === 'bank'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Import from Question Bank</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-10" value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} placeholder="Search question, subject, topic or exam..." /></div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{selectedBankIds.length} selected</span><Button variant="ghost" size="sm" onClick={() => setSelectedBankIds([])}>Clear</Button></div>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto">
              {filteredBankQuestions.map((item) => {
                const selected = selectedBankIds.includes(item.id);
                return (
                  <button key={item.id} type="button" onClick={() => setSelectedBankIds((ids) => selected ? ids.filter((id) => id !== item.id) : [...ids, item.id])} className={`w-full rounded-xl border p-4 text-left ${selected ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex gap-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300'}`}>{selected && <Check className="h-3.5 w-3.5" />}</span><div className="min-w-0 flex-1"><p className="font-medium text-slate-800">{item.question_text}</p><p className="mt-1 text-xs text-slate-500">{item.subject || 'No subject'} · {item.topic || 'No topic'} · {item.difficulty}</p></div></div>
                  </button>
                );
              })}
              {!filteredBankQuestions.length && <EmptyState text="No matching questions found." />}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button onClick={() => void importBankQuestions()} disabled={saving || !selectedBankIds.length}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import {selectedBankIds.length || ''} Questions</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Small UI components                                                        */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  options = [],
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'select';
  options?: readonly (readonly [string, string])[] | string[][];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {type === 'select' ? (
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
        >
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>{optionLabel}</option>
          ))}
        </select>
      ) : (
        <Input type={type} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm text-slate-500">{text}</p>
    </div>
  );
}
