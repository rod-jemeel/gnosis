/**
 * Tags API
 *
 * API methods for document tag operations.
 */

import { get, post, del } from './client'
import { Tag, TagListResponse, CreateTagRequest, AssignTagRequest } from '../types'

/**
 * List all tags for the workspace
 */
export async function listTags(): Promise<TagListResponse> {
  return get<TagListResponse>('/v1/tags')
}

/**
 * Create a new tag
 */
export async function createTag(data: CreateTagRequest): Promise<Tag> {
  return post<Tag>('/v1/tags', data)
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<void> {
  await del(`/v1/tags/${id}`)
}

/**
 * Get tags for a document
 */
export async function getDocumentTags(documentId: string): Promise<TagListResponse> {
  return get<TagListResponse>(`/v1/documents/${documentId}/tags`)
}

/**
 * Assign a tag to a document
 */
export async function assignTag(documentId: string, tagId: string): Promise<void> {
  await post(`/v1/documents/${documentId}/tags`, { tagId } as AssignTagRequest)
}

/**
 * Remove a tag from a document
 */
export async function removeTag(documentId: string, tagId: string): Promise<void> {
  await del(`/v1/documents/${documentId}/tags/${tagId}`)
}
