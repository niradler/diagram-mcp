import { z } from 'zod'
import { RenderDiagramRequestSchema } from '../types.js'
import { MermaidService } from '../mermaid-service.js'

const mermaidService = new MermaidService()

export const renderDiagramTool = {
    name: 'render_diagram',
    description: 'Render a Mermaid diagram to SVG, PNG, or PDF format',
    inputSchema: RenderDiagramRequestSchema,
    execute: async (params: z.infer<typeof RenderDiagramRequestSchema>) => {
        try {
            const result = await mermaidService.renderDiagram(params)

            if (!result.success) {
                throw new Error(result.error || 'Failed to render diagram')
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