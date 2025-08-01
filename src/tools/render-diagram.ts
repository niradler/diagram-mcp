import { z } from 'zod'
import assert from 'assert'
import { RenderMermaidRequestSchema } from '../types.js'
import { MermaidService } from '../services/mermaid-service.js'
import { handleRenderOutput } from '../utils/render-utils.js'
import { logger } from '../config.js'

const mermaidService = new MermaidService()

export const renderMermaidTool = {
    name: 'render_mermaid',
    description: `Render a Mermaid diagram to SVG, PNG, JPG, or PDF format with comprehensive styling and output options.
Output options:
- "link" (default): Returns a localhost URL for easy viewing (always show the user the link he can view the diagram in a browser)
- "filepath": Saves to disk and returns the file path
- "raw": Returns base64 data for images or raw SVG string

Examples:
- Basic SVG: Just provide mermaidCode for raw SVG data
- Localhost image: Set format='png' with output='link' (default) to get a localhost URL
- Save to disk: Set output='filepath' to save and get file path
- Base64 image: Set output='raw' to get base64 data for <img> tags
- Custom styling: Use theme, backgroundColor, and dimension options for tailored appearance`,
    inputSchema: RenderMermaidRequestSchema,
    execute: async (params: z.infer<typeof RenderMermaidRequestSchema> & { quality?: number }) => {
        try {
            assert(params, 'Parameters are required')
            assert(params.mermaidCode, 'Mermaid code is required')
            assert(params.mermaidCode.trim().length > 0, 'Mermaid code cannot be empty')
            assert(['svg', 'png', 'jpg', 'pdf'].includes(params.format), `Invalid format: ${params.format}`)
            assert(['default', 'base', 'dark', 'forest', 'neutral', 'null'].includes(params.theme), `Invalid theme: ${params.theme}`)

            if (params.quality !== undefined) {
                assert(params.quality >= 1 && params.quality <= 100, `Quality must be between 1 and 100, got: ${params.quality}`)
            }

            if (params.width !== undefined) {
                assert(params.width > 0, `Width must be positive, got: ${params.width}`)
            }

            if (params.height !== undefined) {
                assert(params.height > 0, `Height must be positive, got: ${params.height}`)
            }

            if (params.fontSize !== undefined) {
                assert(params.fontSize > 0, `Font size must be positive, got: ${params.fontSize}`)
            }

            if (params.maxTextSize !== undefined) {
                assert(params.maxTextSize > 0, `Max text size must be positive, got: ${params.maxTextSize}`)
            }

            const result = await mermaidService.renderDiagram(params)
            assert(result, 'Mermaid service returned null result')
            assert(typeof result.success === 'boolean', 'Result must have success boolean property')

            if (!result.success) {
                assert(result.error, 'Failed result must have error message')
                logger.info({ error: result.error, format: result.format }, 'Mermaid diagram rendering failed')
                return {
                    success: false,
                    error: result.error || 'Failed to render Mermaid diagram',
                    format: result.format
                }
            }

            assert(result.data, 'Successful result must have data')
            assert(result.format, 'Result must have format')

            return await handleRenderOutput({
                data: result.data,
                format: result.format,
                output: params.output,
                width: params.width,
                height: params.height,
                size: result.size
            })
        } catch (error) {
            assert(error, 'Error must be provided')
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            logger.info({ error: errorMessage, format: params.format }, 'Mermaid diagram rendering failed with exception')
            return {
                success: false,
                error: `Failed to render Mermaid diagram: ${errorMessage}`,
                format: params.format
            }
        }
    }
}

// Keep backward compatibility
export const renderDiagramTool = renderMermaidTool 