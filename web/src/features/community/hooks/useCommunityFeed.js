"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchMyPostsFromApi,
  fetchPublicCommunityFeed,
  getRelativeTime,
  isPostLiked,
  togglePostLike,
  togglePostLikeApi,
} from "@/features/community/api/communityApi";
import { sortCommunityFeedRows } from "@/lib/community/communityFeedSort";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} userId
 * @param {{ feedScope?: 'public' | 'mine', sessionKind?: string, isAuthenticated?: boolean, authLoading?: boolean, sort?: string }} [options]
 */
export function useCommunityFeed(supabase, userId, options = {}) {
  const {
    feedScope = "public",
    sessionKind = "none",
    isAuthenticated = false,
    authLoading = false,
    sort = "connections_first",
  } = options;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likeUi, setLikeUi] = useState({});

  const refresh = useCallback(async () => {
    // Public feed is membership-gated (401 when signed out). Wait for session,
    // then skip the request for guests so browsers don't log resource errors.
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setPosts([]);
      setLikeUi({});
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      let rows = [];
      if (feedScope === "mine" && sessionKind === "workos") {
        rows = await fetchMyPostsFromApi();
      } else {
        rows = await fetchPublicCommunityFeed(supabase, { sort });
      }
      setPosts(rows);
      const next = {};
      rows.forEach((p) => {
        const liked =
          sessionKind === "workos" && p.viewerHasLiked != null ? p.viewerHasLiked : isPostLiked(userId, p.id);
        next[p.id] = {
          liked,
          count: Number(p.likeCount) || 0,
        };
      });
      setLikeUi(next);
    } catch {
      setError("Could not load community stories.");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, feedScope, isAuthenticated, authLoading, sessionKind, sort]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const postsWithMeta = useMemo(() => {
    const sorted = sortCommunityFeedRows(posts, { chronological: sort === "chronological" });
    return sorted.map((p) => ({
      ...p,
      relativeTime: getRelativeTime(p.createdAt),
      likeDisplay: likeUi[p.id]?.count ?? (Number(p.likeCount) || 0),
      userLiked: likeUi[p.id]?.liked ?? false,
    }));
  }, [posts, likeUi, sort]);

  const onToggleLike = useCallback(
    async (postId, baseLikeCount) => {
      if (sessionKind === "workos") {
        const res = await togglePostLikeApi(postId);
        if (res.ok) {
          setLikeUi((u) => ({
            ...u,
            [postId]: { liked: res.liked, count: res.likeCount },
          }));
        }
        return;
      }
      const { liked, displayCount } = togglePostLike(userId, postId, baseLikeCount);
      setLikeUi((u) => ({
        ...u,
        [postId]: { liked, count: displayCount },
      }));
    },
    [sessionKind, userId],
  );

  return {
    posts: postsWithMeta,
    loading,
    error,
    refresh,
    onToggleLike,
  };
}
