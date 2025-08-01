import { z } from 'zod'
import assert from 'assert'
import { RenderPlotlyRequestSchema } from '../types.js'
import { PlotlyService } from '../services/plotly-service.js'
import { handleRenderOutput } from '../utils/render-utils.js'
import { logger } from '../config.js'

const plotlyService = new PlotlyService()

export const renderPlotlyTool = {
    name: 'render_plotly',
    description: `Render a Plotly chart to SVG, PNG, JPG, or PDF format with comprehensive styling and output options.
Output options:
- "link" (default): Returns a localhost URL for easy viewing
- "filepath": Saves to disk and returns the file path
- "raw": Returns base64 data for images or raw SVG string

Examples:
- Basic chart: Provide plotlyCode with Plotly.newPlot() call
- Localhost image: Set format='png' with output='link' (default) to get a localhost URL
- Save to disk: Set output='filepath' to save and get file path
- Base64 image: Set output='raw' to get base64 data for <img> tags
- Custom styling: Use backgroundColor, width, height, and plotlyConfig options

Plotly Code Example:
Plotly.newPlot('plotly-chart', [{
  x: [1, 2, 3, 4, 5],
  y: [1, 2, 4, 8, 16],
  type: 'scatter'
}], {
  margin: { t: 0 }
});`,
    inputSchema: RenderPlotlyRequestSchema,
    execute: async (params: z.infer<typeof RenderPlotlyRequestSchema> & { quality?: number }) => {
        try {
            assert(params, 'Parameters are required')
            assert(params.plotlyCode, 'Plotly code is required')
            assert(params.plotlyCode.trim().length > 0, 'Plotly code cannot be empty')
            assert(['svg', 'png', 'jpg', 'pdf'].includes(params.format), `Invalid format: ${params.format}`)

            if (params.quality !== undefined) {
                assert(params.quality >= 1 && params.quality <= 100, `Quality must be between 1 and 100, got: ${params.quality}`)
            }

            if (params.width !== undefined) {
                assert(params.width > 0, `Width must be positive, got: ${params.width}`)
            }

            if (params.height !== undefined) {
                assert(params.height > 0, `Height must be positive, got: ${params.height}`)
            }

            const result = await plotlyService.renderPlotly(params)
            assert(result, 'Plotly service returned null result')
            assert(typeof result.success === 'boolean', 'Result must have success boolean property')

            if (!result.success) {
                assert(result.error, 'Failed result must have error message')
                logger.info({ error: result.error, format: result.format }, 'Plotly chart rendering failed')
                return {
                    success: false,
                    error: result.error || 'Failed to render Plotly chart',
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
            logger.info({ error: errorMessage, format: params.format }, 'Plotly chart rendering failed with exception')
            return {
                success: false,
                error: `Failed to render Plotly chart: ${errorMessage}`,
                format: params.format
            }
        }
    }
} 