import { publicProcedure, router } from '@/lib/trpc/server'
import { z } from 'zod'
import { chunkText } from '@/lib/documents/chunker'
import { TRPCError } from '@trpc/server'
import { sanitizeDocumentContent } from '@/middleware/security'
import { sanitizeFilename, validateFile } from '@/lib/documents/file-validator'

const MAX_DECODED_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_BASE64_LENGTH = Math.ceil(MAX_DECODED_FILE_SIZE_BYTES / 3) * 4 + 16
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/

const getContentType = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'pdf':
      return 'application/pdf'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'csv':
      return 'text/csv'
    case 'md':
      return 'text/markdown'
    default:
      return 'text/plain'
  }
}

const validateBase64Payload = (base64: string) => {
  if (base64.length > MAX_BASE64_LENGTH) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'File is too large. Maximum upload size is 10MB.',
    })
  }

  if (!BASE64_PATTERN.test(base64) || base64.length % 4 !== 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid file upload',
    })
  }
}

export const documentRouter = router({
  upload: publicProcedure
    .input(
      z.object({
        base64: z.string().max(MAX_BASE64_LENGTH, 'File is too large. Maximum upload size is 10MB.'),
        filename: z.string(),
        presentationId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx
      let uploadedFilePath: string | null = null

      try {
        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
        }

        const safeFilename = sanitizeFilename(input.filename)
        validateBase64Payload(input.base64)

        const { data: presentation, error: presentationError } = await supabase
          .from('presentations')
          .select('id')
          .eq('id', input.presentationId)
          .eq('user_id', user.id)
          .single()

        if (presentationError || !presentation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Presentation not found' })
        }

        const buffer = Buffer.from(input.base64, 'base64')
        const validation = validateFile(buffer, safeFilename)

        if (!validation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: validation.error ?? 'Invalid file upload',
          })
        }

        // Upload to Supabase Storage
        const filePath = `${user.id}/${input.presentationId}/${safeFilename}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, buffer, {
            contentType: getContentType(safeFilename),
            upsert: true,
          })

        if (uploadError) {
          console.error('[document.upload] Storage upload error:', {
            message: uploadError.message,
            name: uploadError.name,
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Upload failed: ${uploadError.message}`,
          })
        }

        uploadedFilePath = filePath

        const { extractText } = await import('@/lib/documents/parser')

        // Extract text
        const extractedText = sanitizeDocumentContent(await extractText(buffer, safeFilename))

        // Chunk the text
        const chunks = chunkText(extractedText)

        // Insert into database
        const { data, error: insertError } = await supabase
          .from('source_documents')
          .insert({
            presentation_id: input.presentationId,
            filename: safeFilename,
            file_path: filePath,
            file_size: buffer.length,
            extracted_text: extractedText,
            chunks,
          })
          .select()
          .single()

        if (insertError) {
          console.error('[document.upload] DB insert error:', {
            message: insertError.message,
            code: insertError.code,
          })
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Database insert failed: ${insertError.message}`,
          })
        }

        return data
      } catch (err) {
        if (uploadedFilePath) {
          await supabase.storage.from('documents').remove([uploadedFilePath]).catch(() => undefined)
        }

        console.error('[document.upload] Unhandled error:', {
          message: err instanceof Error ? err.message : 'Unknown upload error',
          name: err instanceof Error ? err.name : typeof err,
        })
        throw err
      }
    }),

  list: publicProcedure
    .input(z.object({ presentationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error } = await supabase
        .from('source_documents')
        .select('*')
        .eq('presentation_id', input.presentationId)
        .order('uploaded_at', { ascending: false })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      return data
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      // Fetch the record to get file_path
      const { data: doc, error: fetchError } = await supabase
        .from('source_documents')
        .select('file_path')
        .eq('id', input.id)
        .single()

      if (fetchError || !doc) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path])

      if (storageError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Storage delete failed: ${storageError.message}`,
        })
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('source_documents')
        .delete()
        .eq('id', input.id)

      if (deleteError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Database delete failed: ${deleteError.message}`,
        })
      }

      return { success: true }
    }),
})
