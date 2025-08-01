import { z } from 'zod'

const OutputTypeEnum = z.enum(['link', 'filepath', 'raw'])

// Mermaid specific schema
export const RenderMermaidRequestSchema = z.object({
    mermaidCode: z.string().min(1, 'Mermaid code is required'),
    format: z.enum(['svg', 'png', 'jpg', 'pdf']).default('svg'),
    theme: z.enum(['default', 'base', 'dark', 'forest', 'neutral', 'null']).default('default'),
    backgroundColor: z.string().optional(),
    filePath: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    quality: z.number().min(1).max(100).default(90).optional(),
    output: OutputTypeEnum.default('link').optional(),
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
    darkMode: z.boolean().optional(),
    htmlLabels: z.boolean().optional(),
    maxTextSize: z.number().optional(),
    flowchart: z.object({
        useMaxWidth: z.boolean().optional(),
        htmlLabels: z.boolean().optional(),
        curve: z.enum(['linear', 'basis', 'bumpX', 'bumpY', 'cardinal', 'catmullRom', 'monotoneX', 'monotoneY', 'natural', 'step', 'stepAfter', 'stepBefore']).optional(),
    }).optional(),
    sequence: z.object({
        showSequenceNumbers: z.boolean().optional(),
        mirrorActors: z.boolean().optional(),
        rightAngles: z.boolean().optional(),
        wrap: z.boolean().optional(),
    }).optional(),
})

// Plotly specific schema
export const RenderPlotlyRequestSchema = z.object({
    plotlyCode: z.string().min(1, 'Plotly code is required'),
    format: z.enum(['svg', 'png', 'jpg', 'pdf']).default('svg'),
    backgroundColor: z.string().optional(),
    filePath: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    quality: z.number().min(1).max(100).default(90).optional(),
    output: OutputTypeEnum.default('link').optional(),
    responsive: z.boolean().optional(),
    displayModeBar: z.boolean().optional(),
    modeBarButtonsToRemove: z.array(z.string()).optional(),
    displaylogo: z.boolean().optional(),
})

// Keep the old schema for backward compatibility
export const RenderDiagramRequestSchema = RenderMermaidRequestSchema
export const ConvertToImageRequestSchema = RenderMermaidRequestSchema

export type RenderMermaidRequest = z.infer<typeof RenderMermaidRequestSchema>
export type RenderPlotlyRequest = z.infer<typeof RenderPlotlyRequestSchema>
export type RenderDiagramRequest = z.infer<typeof RenderDiagramRequestSchema>
export type ConvertToImageRequest = z.infer<typeof ConvertToImageRequestSchema>
export type OutputType = z.infer<typeof OutputTypeEnum>

export interface DiagramResult {
    success: boolean
    data?: string
    error?: string
    format: string
    size?: {
        width: number
        height: number
    }
    output_type?: OutputType
} 