"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPublicCommunityFeed,
  getRelativeTime,
  isPostLiked,
  togglePostLike,
} from "@/features/community/api/communityApi";

export function useCommunityFeed(supabase, userId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likeUi, setLikeUi] = useState({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchPublicCommunityFeed(supabase);
      setPosts(rows);
      const next = {};
      rows.forEach((p) => {
        const liked = isPostLiked(userId, p.id);
        next[p.id] = {
          liked,
          count: (Number(p.likeCount) || 0) + (liked ? 1 : 0),
        };
      });
      setLikeUi(next);
    } catch {
      setError("Could not load community stories.");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const postsWithMeta = useMemo(() => {
    return posts.map((p) => ({
      ...p,
      relativeTime: getRelativeTime(p.createdAt),
      likeDisplay: likeUi[p.id]?.count ?? (Number(p.likeCount) || 0),
      userLiked: likeUi[p.id]?.liked ?? false,
    }));
  }, [posts, likeUi]);

  function onToggleLike(postId, baseLikeCount) {
    const { liked, displayCount } = togglePostLike(userId, postId, baseLikeCount);
    setLikeUi((u) => ({
      ...u,
      [postId]: { liked, count: displayCount },
    }));
  }

  return {
    posts: postsWithMeta,
    loading,
    error,
    refresh,
    onToggleLike,
  };
}

