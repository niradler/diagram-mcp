import { z } from 'zod'

export const RenderDiagramRequestSchema = z.object({
    mermaidCode: z.string().min(1, 'Mermaid code is required'),
    format: z.enum(['svg', 'png', 'jpg', 'pdf']).default('svg'),
    theme: z.enum(['default', 'dark', 'forest']).default('default'),
    backgroundColor: z.string().optional(),
    filePath: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    quality: z.number().min(1).max(100).default(90).optional(),
})

// Keep the old schema for backward compatibility if needed
export const ConvertToImageRequestSchema = RenderDiagramRequestSchema

export type RenderDiagramRequest = z.infer<typeof RenderDiagramRequestSchema>
export type ConvertToImageRequest = z.infer<typeof ConvertToImageRequestSchema>

export interface DiagramResult {
    success: boolean
    data?: string
    error?: string
    format: string
    size?: {
        width: number
        height: number
    }
} 