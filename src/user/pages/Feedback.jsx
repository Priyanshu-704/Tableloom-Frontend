import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, Star } from "lucide-react";
import { feedbackService } from "../../common/services";
import { useNotification } from "../../common/NotificationContext";
const CATEGORY_OPTIONS = [
  "food_quality",
  "service_speed",
  "staff_friendliness",
  "cleanliness",
  "value_for_money",
  "atmosphere",
  "menu_variety",
  "waiting_time",
  "order_accuracy",
];
const emptyForm = {
  ratings: {
    overall: 5,
    food: 5,
    service: 5,
    ambiance: 5,
    value: 5,
  },
  comments: "",
  categories: [],
  wouldRecommend: true,
};
const sessionIdFromStorage = () =>
  sessionStorage.getItem("sessionId") ||
  localStorage.getItem("sessionId") ||
  "";
export function Feedback() {
  const { notify } = useNotification();
  const sessionId = sessionIdFromStorage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const hasSubmittedFeedback = useMemo(
    () => feedbackList.length > 0,
    [feedbackList],
  );
  const loadFeedback = async () => {
    if (!sessionId) {
      setFeedbackList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await feedbackService.getSessionFeedback(sessionId);
      setFeedbackList(response?.data || []);
    } catch (error) {
      notify(error?.message || "Failed to load feedback", "error");
      setFeedbackList([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  const handleRatingChange = (field, value) => {
    setForm((current) => ({
      ...current,
      ratings: {
        ...current.ratings,
        [field]: value,
      },
    }));
  };
  const toggleCategory = (category) => {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  };
  const resetForm = () => {
    setForm(emptyForm);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!sessionId) {
      notify("Session not found for feedback", "error");
      return;
    }
    if (hasSubmittedFeedback) {
      notify("You have already submitted feedback for this session.", "info");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sessionId,
        ...form,
      };
      const response = await feedbackService.submitFeedback(payload);
      if (response?.success === false) {
        notify(response.message || "Failed to save feedback", "error");
        return;
      }
      notify(response?.message || "Thank you for your feedback", "success");
      resetForm();
      await loadFeedback();
    } catch (error) {
      notify(error?.message || "Failed to save feedback", "error");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 sm:px-6">
      <div className="rounded-3xl bg-linear-to-r from-sky-500 to-cyan-500 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold sm:text-3xl">Customer Feedback</h1>
        <p className="mt-2 max-w-2xl text-sm text-orange-50 sm:text-base">
          Share your dining experience once per session so our team can review
          it properly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Leave Feedback
              </h2>
              <p className="text-sm text-gray-500">
                Rate your experience and add comments.
              </p>
            </div>
            {hasSubmittedFeedback ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Feedback submitted
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Object.entries(form.ratings).map(([key, value]) => (
              <label
                key={key}
                className="rounded-2xl border border-gray-200 p-4"
              >
                <span className="block text-sm font-medium capitalize text-gray-700">
                  {key}
                </span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={value}
                  onChange={(event) =>
                    handleRatingChange(key, Number(event.target.value))
                  }
                  disabled={hasSubmittedFeedback || saving}
                  className="mt-3 w-full"
                />
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-sky-600">
                  <Star className="h-4 w-4 fill-current" />
                  {value}/5
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Feedback topics
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((category) => {
                const selected = form.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    disabled={hasSubmittedFeedback || saving}
                    className={`rounded-full px-3 py-2 text-sm ${selected ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {category.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Comments
            </label>
            <textarea
              rows={5}
              value={form.comments}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  comments: event.target.value,
                }))
              }
              disabled={hasSubmittedFeedback || saving}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50"
              placeholder="Tell us what went well and what we can improve."
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.wouldRecommend}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    wouldRecommend: event.target.checked,
                  }))
                }
                disabled={hasSubmittedFeedback || saving}
              />
              I would recommend this restaurant
            </label>
            <button
              type="submit"
              disabled={saving || hasSubmittedFeedback}
              className="rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white hover:bg-primary-700 disabled:bg-gray-400"
            >
              {saving
                ? "Saving..."
                : hasSubmittedFeedback
                  ? "Feedback Submitted"
                  : "Submit Feedback"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-5 w-5 text-primary-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Your Feedback
              </h2>
              <p className="text-sm text-gray-500">
                Submitted feedback is read-only for this session.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No feedback submitted for this session yet.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {feedbackList.map((entry) => (
                <div
                  key={entry._id}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Overall rating: {entry.ratings?.overall || "-"} / 5
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                        {entry.status || "new"}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      You have submitted feedback
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    {entry.comments || "No comment provided."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(entry.categories || []).map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                      >
                        {category.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
