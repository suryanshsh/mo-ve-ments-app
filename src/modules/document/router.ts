import { publicProcedure, router } from '@/lib/trpc/server'
import { z } from 'zod'
import { extractText, isAllowedExtension } from '@/lib/documents/parser'
import { chunkText } from '@/lib/documents/chunker'
import { TRPCError } from '@trpc/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const documentRouter = router({
  upload: publicProcedure
    .input(
      z.object({
        base64: z.string(),
        filename: z.string(),
        presentationId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
      }

      // Validate extension
      if (!isAllowedExtension(input.filename)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File type not allowed. Accepted: pdf, docx, txt, csv, md',
        })
      }

      // Decode base64 and validate size
      const buffer = Buffer.from(input.base64, 'base64')
      if (buffer.length > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File exceeds maximum size of 10MB',
        })
      }

      // Upload to Supabase Storage
      const filePath = `${user.id}/${input.presentationId}/${input.filename}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, buffer, {
          contentType: 'application/octet-stream',
          upsert: true,
        })

      if (uploadError) {
        console.error('[document.upload] Storage upload error:', uploadError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Upload failed: ${uploadError.message}`,
        })
      }

      // Extract text
      const extractedText = await extractText(buffer, input.filename)

      // Chunk the text
      const chunks = chunkText(extractedText)

      // Insert into database
      const { data, error: insertError } = await supabase
        .from('source_documents')
        .insert({
          presentation_id: input.presentationId,
          filename: input.filename,
          file_path: filePath,
          file_size: buffer.length,
          extracted_text: extractedText,
          chunks,
        })
        .select()
        .single()

      if (insertError) {
        console.error('[document.upload] DB insert error:', insertError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Database insert failed: ${insertError.message}`,
        })
      }

      return data
      } catch (err) {
        console.error('[document.upload] Unhandled error:', err)
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
