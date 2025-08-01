import { writeFile } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod'
import { RenderDiagramRequestSchema } from '../types.js'
import { MermaidService } from '../mermaid-service.js'

const mermaidService = new MermaidService()

export const renderDiagramTool = {
    name: 'render_diagram',
    description: 'Render a Mermaid diagram to SVG, PNG, JPG, or PDF format with quality control for image formats',
    inputSchema: z.object({
        mermaidCode: z.string().min(1, 'Mermaid code is required'),
        format: z.enum(['svg', 'png', 'jpg', 'pdf']).default('svg'),
        theme: z.enum(['default', 'dark', 'forest']).default('default'),
        backgroundColor: z.string().optional(),
        filePath: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        quality: z.number().min(1).max(100).default(90).optional(),
    }),
    execute: async (params: z.infer<typeof RenderDiagramRequestSchema> & { quality?: number }) => {
        try {
            const result = await mermaidService.renderDiagram(params)

            if (!result.success) {
                throw new Error(result.error || 'Failed to render diagram')
            }

            if (params.filePath) {
                const fullPath = params.filePath

                // For SVG and PDF, we need to write the data to file
                // For PNG/JPG, Puppeteer already saves to disk when filePath is provided
                if (params.format === 'svg' || params.format === 'pdf') {
                    await writeFile(fullPath, result.data || '')
                }
            }

            return {
                success: true,
                data: result.data,
                format: result.format,
                size: result.size
            }
        } catch (error) {
            throw new Error(`Failed to render diagram: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
} 