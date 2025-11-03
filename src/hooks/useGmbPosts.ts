"use client"

import { useState, useCallback } from "react"

export interface GmbPost {
  name: string
  languageCode: string
  summary: string
  createTime: string
  updateTime: string
  topicType: "STANDARD" | "EVENT" | "OFFER" | "PRODUCT"
  callToAction?: {
    actionType: "BOOK" | "ORDER" | "SHOP" | "LEARN_MORE" | "SIGN_UP" | "CALL"
    url?: string
  }
  media?: {
    mediaFormat: "PHOTO" | "VIDEO"
    sourceUrl: string
    thumbnailUrl?: string
    googleUrl?: string
  }[]
  state?: {
    value: "LIVE" | "EXPIRED" | "DELETED"
    expireTime?: string
  }
}

export interface CreatePostData {
  postContent: string
  actionButton?: string | null
  actionLink?: string | null
  callPhone?: string | null
  account: string | null
  location: string | null
  accessToken: string | null
  image_url?: string
  file?: File
}


export interface UpdatePostData {
  summary?: string
  callToAction?: {
    actionType: "book-a-visit" | "place-an-order" | "shop" | "read-more" | "sign-up" | "call"
    url?: string
  } | null
  media?: string // 'remove' to remove all images
  image_url?: string // New image URL
  file?: File // New file to upload
}

export interface GmbPostsResponse {
  success: boolean
  data?: {
    localPosts?: GmbPost[]
    nextPageToken?: string
    totalSize?: number
  }
  message?: string
  error?: string
}

export function useGmbPosts() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(
    async (
      accessToken: string,
      account: string,
      location: string,
      pageSize = 10,
      pageToken?: string,
    ): Promise<GmbPostsResponse> => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          accessToken,
          account,
          location,
          pageSize: pageSize.toString(),
        })

        if (pageToken) {
          params.append("pageToken", pageToken)
        }

        const response = await fetch(`/api/gmb/posts?${params.toString()}`)
        const result: GmbPostsResponse = await response.json()

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch posts")
        }

        return result
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const createPost = useCallback(async (postData: CreatePostData): Promise<GmbPostsResponse> => {
    setLoading(true)
    setError(null)

    try {
      let body: any
      const headers: any = {}

      if (postData.file) {
        // Use FormData for file upload
        const formData = new FormData()
        formData.append("file", postData.file)

        // Add other fields
        Object.entries(postData).forEach(([key, value]) => {
          if (key !== "file" && value !== undefined) {
            formData.append(key, String(value))
          }
        })

        body = formData
        // Don't set Content-Type header, let the browser set it for multipart/form-data
      } else {
        // Use JSON for URL-based image
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(postData)
      }

      const response = await fetch("/api/gmb/posts", {
        method: "POST",
        headers,
        body,
      })

      const result: GmbPostsResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Failed to create post")
      }

      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePost = useCallback(
    async (
      accessToken: string,
      account: string,
      location: string,
      postName: string,
      updateData: UpdatePostData,
    ): Promise<GmbPostsResponse> => {
      setLoading(true)
      setError(null)

      try {
        // Function to convert GMB action type to backend schema format
        const convertToSchemaActionType = (actionType: string): string => {
          switch (actionType) {
            case 'BOOK':
              return 'book-a-visit';
            case 'ORDER':
              return 'place-an-order';
            case 'SHOP':
              return 'shop';
            case 'LEARN_MORE':
              return 'read-more';
            case 'SIGN_UP':
              return 'sign-up';
            case 'CALL':
              return 'call';
            case 'RESERVE':
              return 'reserve';
            case 'GET_QUOTE':
              return 'get-quote';
            case 'APPOINTMENT':
              return 'appointment';
            // Handle if already in schema format
            case 'book-a-visit':
            case 'place-an-order':
            case 'shop':
            case 'read-more':
            case 'sign-up':
            case 'call':
            case 'reserve':
            case 'get-quote':
            case 'appointment':
              return actionType;
            default:
              throw new Error(`Invalid actionType: ${actionType}`);
          }
        };

        // Convert the updateData to match backend schema
        const convertedUpdateData = { ...updateData };

        if (convertedUpdateData.callToAction && convertedUpdateData.callToAction.actionType) {
          convertedUpdateData.callToAction = {
            ...convertedUpdateData.callToAction,
            actionType: convertToSchemaActionType(convertedUpdateData.callToAction.actionType)
          };
        }

        const params = new URLSearchParams({
          accessToken,
          account,
          location,
          postName,
        })

        let body: any
        const headers: any = {}

        if (convertedUpdateData.file) {
          // Use FormData for file upload
          const formData = new FormData()
          formData.append("file", convertedUpdateData.file)

          // Add other fields
          Object.entries(convertedUpdateData).forEach(([key, value]) => {
            if (key !== "file" && value !== undefined) {
              if (typeof value === "object") {
                formData.append(key, JSON.stringify(value))
              } else {
                formData.append(key, String(value))
              }
            }
          })

          body = formData
        } else {
          // Use JSON
          headers["Content-Type"] = "application/json"
          body = JSON.stringify(convertedUpdateData)
        }

        const response = await fetch(`/api/gmb/posts?${params.toString()}`, {
          method: "PATCH",
          headers,
          body,
        })

        const result: GmbPostsResponse = await response.json()

        if (!response.ok) {
          throw new Error(result.message || "Failed to update post")
        }

        return result
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const deletePost = useCallback(
    async (accessToken: string, account: string, location: string, postName: string): Promise<GmbPostsResponse> => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          accessToken,
          account,
          location,
          postName,
        })

        const response = await fetch(`/api/gmb/posts?${params.toString()}`, {
          method: "DELETE",
        })

        const result: GmbPostsResponse = await response.json()

        if (!response.ok) {
          throw new Error(result.message || "Failed to delete post")
        }

        return result
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    loading,
    error,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
  }
}
