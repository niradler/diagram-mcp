import { writeFile } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod'
import assert from 'assert'
import { RenderDiagramRequestSchema } from '../types.js'
import { MermaidService } from '../mermaid-service.js'
import { FileManager } from '../utils/file-manager.js'
import { config, logger } from '../config.js'

const mermaidService = new MermaidService()

export const renderDiagramTool = {
    name: 'render_diagram',
    description: `Render a Mermaid diagram to SVG, PNG, JPG, or PDF format with comprehensive styling and output options.
Output options:
- "link" (default): Returns a localhost URL for easy viewing
- "filepath": Saves to disk and returns the file path
- "raw": Returns base64 data for images or raw SVG string

Examples:
- Basic SVG: Just provide mermaidCode for raw SVG data
- Localhost image: Set format='png' with output='link' (default) to get a localhost URL
- Save to disk: Set output='filepath' to save and get file path
- Base64 image: Set output='raw' to get base64 data for <img> tags
- Custom styling: Use theme, backgroundColor, and dimension options for tailored appearance`,
    inputSchema: RenderDiagramRequestSchema,
    execute: async (params: z.infer<typeof RenderDiagramRequestSchema> & { quality?: number }) => {
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
                logger.info({ error: result.error, format: result.format }, 'Diagram rendering failed')
                return {
                    success: false,
                    error: result.error || 'Failed to render diagram',
                    format: result.format
                }
            }

            assert(result.data, 'Successful result must have data')
            assert(result.format, 'Result must have format')

            const output = params.output || 'link'
            assert(['link', 'filepath', 'raw'].includes(output), `Invalid output type: ${output}`)

            if (output === 'filepath') {
                assert(params.format, 'Format is required for filepath output')

                const filename = await FileManager.saveTempFile(result.data || '', params.format)
                assert(filename, 'FileManager.saveTempFile must return a filename')

                const filePath = join(FileManager.getTempDir(), filename)
                assert(filePath, 'File path must be generated')

                if (params.format === 'svg' || params.format === 'pdf') {
                    await writeFile(filePath, result.data || '')
                } else {
                    const fileData = Buffer.from(result.data || '', 'base64')
                    assert(fileData.length > 0, 'Base64 data must not be empty')
                    await writeFile(filePath, fileData)
                }

                logger.info({ format: result.format, output_type: 'filepath', filePath }, 'Diagram rendered successfully - filepath output')
                return {
                    success: true,
                    data: filePath,
                    format: result.format,
                    size: result.size,
                    output_type: 'filepath'
                }
            } else if (output === 'link' && (params.format === 'png' || params.format === 'jpg' || params.format === 'pdf' || params.format === 'svg')) {
                let fileData: string | Buffer = result.data || ''
                assert(fileData, 'File data is required for link output')

                if (params.format === 'png' || params.format === 'jpg' || params.format === 'pdf') {
                    fileData = Buffer.from(result.data || '', 'base64')
                    assert(fileData.length > 0, 'Base64 data must not be empty')
                } else if (params.format === 'svg') {
                    assert(fileData.startsWith('<svg'), 'SVG data must start with <svg')
                }

                const filename = await FileManager.saveTempFile(fileData, params.format)
                assert(filename, 'FileManager.saveTempFile must return a filename')

                const localhostUrl = `http://localhost:${config.serverPort}/static/${filename}`
                assert(localhostUrl, 'Localhost URL must be generated')
                assert(localhostUrl.startsWith('http://localhost:'), 'URL must be localhost')

                logger.info({ format: result.format, output_type: 'link', localhostUrl }, 'Diagram rendered successfully - link output')
                return {
                    success: true,
                    data: localhostUrl,
                    format: result.format,
                    size: result.size,
                    output_type: 'link'
                }
            } else {
                assert(result.data, 'Raw output requires data')
                logger.info({ format: result.format, output_type: 'raw' }, 'Diagram rendered successfully - raw output')
                return {
                    success: true,
                    data: result.data,
                    format: result.format,
                    size: result.size,
                    output_type: 'raw'
                }
            }
        } catch (error) {
            assert(error, 'Error must be provided')
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            logger.info({ error: errorMessage, format: params.format }, 'Diagram rendering failed with exception')
            return {
                success: false,
                error: `Failed to render diagram: ${errorMessage}`,
                format: params.format
            }
        }
    }
} 